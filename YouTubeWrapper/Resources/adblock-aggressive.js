/* Aggressive ad blocking: strip ad fields from the player response before the
 * player reads them. Mirrors uBlock Origin's approach.
 *
 * OFF by default. If YouTube changes the response shape, the player can break
 * outright; that is why this sits behind a toggle and safe mode still runs
 * underneath it.
 */
(function () {
  var AD_KEYS = ['adPlacements', 'playerAds', 'adSlots'];
  var PLAYER_URL = /\/youtubei\/v1\/(player|reel|next|search)/;
  var fetchedUrl = '';

  function strip(response) {
    if (!response || typeof response !== 'object') return response;
    for (var i = 0; i < AD_KEYS.length; i++) {
      try { delete response[AD_KEYS[i]]; } catch (e) { /* frozen */ }
    }
    return response;
  }

  // 1. ytInitialPlayerResponse is assigned by inline page script. Intercept the
  //    assignment so the ad fields are gone before the player reads the object.
  try {
    var stored;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      configurable: true,
      get: function () { return stored; },
      set: function (value) { stored = strip(value); }
    });
  } catch (e) { /* already defined non-configurably */ }

  // 2. XHR — the mobile web player uses this path for watch pages.
  try {
    var rawOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      fetchedUrl = String(url);
      return rawOpen.apply(this, arguments);
    };

    var rawSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function () {
      if (PLAYER_URL.test(fetchedUrl)) {
        var self = this;
        this.addEventListener('readystatechange', function () {
          if (self.readyState !== 4 || self.status !== 200) return;
          try {
            var data = JSON.parse(self.responseText);
            strip(data);
            Object.defineProperty(self, 'responseText', {
              configurable: true,
              get: function () { return JSON.stringify(data); }
            });
          } catch (e) { /* not JSON, or response already consumed */ }
        });
      }
      return rawSend.apply(this, arguments);
    };
  } catch (e) { /* prototype locked */ }

  // 3. fetch — used by newer player bootstraps.
  if (window.fetch) {
    var rawFetch = window.fetch;
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var result = rawFetch.apply(this, arguments);
      if (!PLAYER_URL.test(url)) return result;
      return result.then(function (response) {
        return response.clone().json().then(function (data) {
          strip(data);
          return new Response(JSON.stringify(data), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }).catch(function () { return response; });
      });
    };
  }
})();
