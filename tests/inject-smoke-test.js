// Smoke-tests the injected scripts against a minimal fake DOM.
// These scripts run at document-start on every page load; a throw disables the
// feature silently, so this catches breakage without a device.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RES = path.join(__dirname, '..', 'YouTubeWrapper', 'Resources');
const read = (name) => fs.readFileSync(path.join(RES, name), 'utf8');

let failures = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log('  ok   ' + label);
  } else {
    failures++;
    console.log('  FAIL ' + label + (detail ? ' -> ' + detail : ''));
  }
}

function makeContext(overrides = {}) {
  const clicked = [];
  const listeners = [];

  class Document {}
  class Element {}

  const video = { duration: 30, currentTime: 0, paused: true, readyState: 4,
                  play() { this.paused = false; return Promise.resolve(); } };

  const skipButton = { click() { clicked.push('skip'); } };
  const adElement = {};

  const head = { children: [], appendChild(el) { this.children.push(el); } };
  const created = [];

  const document = Object.create(Document.prototype);
  Object.assign(document, {
    head,
    body: {},
    addEventListener(type, fn, capture) { listeners.push({ type, fn, capture }); },
    createElement() {
      const el = { tagName: '', attrs: {}, textContent: '',
                   setAttribute(k, v) { this.attrs[k] = v; } };
      created.push(el);
      return el;
    },
    querySelector(sel) {
      if (sel === 'video') return video;
      if (sel === '.ad-showing') return adElement;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === 'video') return [video];
      if (sel.indexOf('skip') !== -1) return [skipButton];
      return [];
    }
  });

  let observerCallback = null;
  class MutationObserver {
    constructor(cb) { observerCallback = cb; }
    observe() {}
  }

  const windowObject = {
    listeners: [],
    addEventListener(type, fn, capture) { this.listeners.push({ type, fn, capture }); },
    webkit: { messageHandlers: { audio: { postMessage(v) { windowObject.posted = v; } } } }
  };

  const context = {
    window: windowObject,
    document,
    Document,
    Element,
    MutationObserver,
    setTimeout,
    console: { log() {}, error() {} },
    ...overrides
  };
  context.window.document = document;
  context.window.MutationObserver = MutationObserver;

  return {
    context, video, clicked, listeners, head, created, windowObject,
    fireObserver() { if (observerCallback) observerCallback(); },
    hasObserver() { return observerCallback !== null; }
  };
}

function run(file, ctx) {
  vm.createContext(ctx);
  vm.runInContext(read(file), ctx, { filename: file });
}

console.log('background-play.js');
{
  const dom = makeContext();
  run('background-play.js', dom.context);
  const w = dom.windowObject;
  check('exposes __ytBg.resume', typeof w.__ytBg === 'object' && typeof w.__ytBg.resume === 'function');
  check('document stays visible', dom.context.document.hidden === false && dom.context.document.visibilityState === 'visible');
  check('suppresses visibilitychange', w.listeners.some((l) => l.type === 'visibilitychange' && l.capture === true));

  const event = { stopped: false, stopImmediatePropagation() { this.stopped = true; } };
  const handler = w.listeners.find((l) => l.type === 'visibilitychange');
  handler.fn(event);
  check('swallows the event', event.stopped === true);

  w.__ytBg.resume();
  check('resume() starts a paused video', dom.video.paused === false);

  // pause hook should report state to native
  const pauseListener = dom.listeners.find((l) => l.type === 'pause');
  check('reports pause to native', !!pauseListener);
  if (pauseListener) {
    dom.video.paused = true;
    pauseListener.fn();
    check('pause posts "paused"', w.posted === 'paused', String(w.posted));
  }
}

console.log('adblock-safe.js');
{
  const dom = makeContext();
  run('adblock-safe.js', dom.context);
  const style = dom.created.find((el) => el.attrs['data-yt-wrapper'] === 'adblock');
  check('injects a style element', !!style);
  check('style hides ad containers', !!style && style.textContent.indexOf('ytm-promoted-sparkles-web-renderer') !== -1);
  check('does not hide Shorts', !style || style.textContent.indexOf('reel-shelf') === -1);
  check('registers a mutation observer', dom.hasObserver());

  dom.fireObserver();
  setTimeout(() => {
    check('clicks the skip button', dom.clicked.length > 0);
    check('seeks past the unskippable ad', dom.video.currentTime > 29 && dom.video.currentTime < 30,
          String(dom.video.currentTime));

    console.log('adblock-aggressive.js');
    {
      const xhrProto = { open() {}, send() {} };
      const aggr = makeContext({
        XMLHttpRequest: function () {},
        Response: function (body, init) { this.body = body; this.init = init; }
      });
      aggr.context.XMLHttpRequest.prototype = xhrProto;
      run('adblock-aggressive.js', aggr.context);

      const w = aggr.windowObject;
      w.ytInitialPlayerResponse = { adPlacements: [1], playerAds: [1], adSlots: [1], videoDetails: { id: 'x' } };
      const r = w.ytInitialPlayerResponse;
      check('strips adPlacements', !('adPlacements' in r));
      check('strips playerAds', !('playerAds' in r));
      check('strips adSlots', !('adSlots' in r));
      check('keeps videoDetails', r.videoDetails && r.videoDetails.id === 'x');
    }

    console.log(failures === 0 ? '\nall checks passed' : '\n' + failures + ' check(s) failed');
    process.exit(failures === 0 ? 0 : 1);
  }, 400);
}
