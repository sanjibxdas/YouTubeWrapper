/* Background playback.
 *
 * WebKit does not pause a media element when the app is backgrounded or the
 * screen is locked. YouTube pauses itself, via the Page Visibility API. So the
 * fix is to make the page believe it is always visible, and to swallow the
 * events it listens for.
 *
 * Written in ES5: the iOS 12 JavaScriptCore is fine with ES6, but every other
 * injected script is ES5 and consistency avoids surprises.
 */
(function () {
  function defineGetter(target, property, getter) {
    try {
      Object.defineProperty(target, property, { get: getter, configurable: true });
    } catch (e) { /* property not configurable on this WebKit build */ }
  }

  defineGetter(Document.prototype, 'hidden', function () { return false; });
  defineGetter(Document.prototype, 'visibilityState', function () { return 'visible'; });
  defineGetter(Document.prototype, 'webkitHidden', function () { return false; });
  defineGetter(Document.prototype, 'webkitVisibilityState', function () { return 'visible'; });
  defineGetter(Document.prototype, 'hasFocus', function () { return true; });
  defineGetter(Document.prototype, 'mozHidden', function () { return false; });

  // Also on the live document: Safari has moved these between the prototype and
  // the instance across versions.
  defineGetter(document, 'hidden', function () { return false; });
  defineGetter(document, 'visibilityState', function () { return 'visible'; });

  // Only the visibility events. pagehide/freeze also fire on real navigation,
  // and swallowing those would break normal back/forward behaviour.
  var suppressed = ['visibilitychange', 'webkitvisibilitychange'];
  for (var i = 0; i < suppressed.length; i++) {
    window.addEventListener(suppressed[i], function (event) {
      event.stopImmediatePropagation();
    }, true);
  }

  function currentVideo() {
    var videos = document.querySelectorAll('video');
    for (var i = 0; i < videos.length; i++) {
      if (videos[i].readyState > 2) return videos[i];
    }
    return videos[0] || null;
  }

  // Tell the app when media is actually playing, so it only claims the audio
  // session then. Activating a .playback session at launch would interrupt
  // whatever the user was already listening to.
  function postState(playing) {
    var handler = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.audio;
    if (handler) handler.postMessage(playing ? 'playing' : 'paused');
  }

  document.addEventListener('playing', function () { postState(true); }, true);
  document.addEventListener('pause', function () { postState(false); }, true);
  document.addEventListener('ended', function () { postState(false); }, true);

  window.__ytBg = {
    resume: function () {
      var video = currentVideo();
      if (video && video.paused) {
        var attempt = video.play();
        if (attempt && typeof attempt.catch === 'function') attempt.catch(function () {});
      }
    }
  };
})();
