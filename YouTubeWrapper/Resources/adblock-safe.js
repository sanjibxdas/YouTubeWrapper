/* Safe ad blocking: hide containers, click Skip, seek past unskippable ads.
 *
 * Deliberately does NOT touch Shorts. No ytm-reel-shelf-renderer hiding and no
 * /shorts/ redirect, both of which CleanTube does.
 *
 * Safari 12 CSS has no :has(), :is() or :where(). Keep every selector plain.
 * All selectors live in the arrays at the top so a YouTube DOM change is a
 * one-line fix.
 */
(function () {
  var HIDE_SELECTORS = [
    'ytm-promoted-sparkles-web-renderer',
    'ytm-promoted-video-renderer',
    'ytm-display-ad-renderer',
    'ytm-companion-slot-renderer',
    'ytm-promoted-sparkles-text-search-renderer',
    'ad-slot-renderer',
    'ytd-ad-slot-renderer',
    'ytd-display-ad-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-in-feed-ad-layout-renderer',
    '.ytp-ad-overlay-container',
    '.ytp-ad-overlay-slot',
    '.ytp-ad-progress-list',
    '.ytm-promoted-sparkles-web-renderer'
  ];

  var SKIP_SELECTORS = [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytm-skip-ad-button',
    'button[class*="skip-ad"]',
    '.ytp-ad-text.ytp-ad-skip-button-text'
  ];

  var AD_SHOWING_SELECTORS = ['.ad-showing', '.ytp-ad-player-overlay'];

  var DEBOUNCE_MS = 250;

  function injectStyle() {
    var css = [];
    for (var i = 0; i < HIDE_SELECTORS.length; i++) {
      css.push(HIDE_SELECTORS[i] + ' { display: none !important; }');
    }
    var style = document.createElement('style');
    style.setAttribute('data-yt-wrapper', 'adblock');
    style.textContent = css.join('\n');

    if (document.head) {
      document.head.appendChild(style);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        if (document.head) document.head.appendChild(style);
      });
    }
  }

  function clickSkipButtons() {
    for (var i = 0; i < SKIP_SELECTORS.length; i++) {
      var buttons = document.querySelectorAll(SKIP_SELECTORS[i]);
      for (var j = 0; j < buttons.length; j++) {
        try { buttons[j].click(); } catch (e) { /* detached node */ }
      }
    }
  }

  function adIsShowing() {
    for (var i = 0; i < AD_SHOWING_SELECTORS.length; i++) {
      if (document.querySelector(AD_SHOWING_SELECTORS[i])) return true;
    }
    return false;
  }

  function seekPastUnskippableAd() {
    if (!adIsShowing()) return;
    var video = document.querySelector('video');
    if (!video) return;
    var duration = video.duration;
    if (!duration || !isFinite(duration) || duration <= 0) return;
    if (video.currentTime < duration - 0.5) {
      try { video.currentTime = duration - 0.1; } catch (e) { /* not seekable yet */ }
    }
  }

  var pending = false;
  function sweep() {
    pending = false;
    clickSkipButtons();
    seekPastUnskippableAd();
  }

  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(sweep, DEBOUNCE_MS);
  }

  injectStyle();

  function observe() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', observe);
      return;
    }
    var observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    schedule();
  }

  observe();
})();
