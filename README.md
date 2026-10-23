# YouTube Wrapper (iOS 12.5.8)

A native WKWebView container for `m.youtube.com` that runs on iOS 12 devices.
Adds ad blocking and background playback; keeps Shorts.

## Layout

```
YouTubeWrapper/Sources/     AppDelegate, RootViewController, WebViewFactory, Settings
YouTubeWrapper/Resources/   Info.plist, blocklist.json, injected JS
tools/gen_project.js        Regenerates YouTubeWrapper.xcodeproj
scripts/make-ipa.sh         Builds an unsigned .ipa
.github/workflows/          CI build
```

## Building

The project is generated, not hand-edited. After adding or removing source files,
edit `tools/gen_project.js` and regenerate:

```bash
node tools/gen_project.js
```

CI builds an unsigned `.ipa` on `macos-14` with Xcode 15.4 — the last Xcode that
can target iOS 12. Trigger the workflow with *Run workflow*, then download the
`YouTubeWrapper-ipa` artifact.

## Installing (Windows)

1. Install iTunes and iCloud from apple.com, not the Microsoft Store.
2. Install [Sideloadly](https://sideloadly.io/).
3. Drag `YouTubeWrapper.ipa` into Sideloadly, enter a free Apple ID, sign.
4. On the device: Settings → General → Profiles & Device Management → trust the profile.

A free certificate lasts 7 days; Sideloadly's daemon re-signs when the phone is
connected. Only 3 sideloaded apps may be installed at once.

## Settings

Two-finger double-tap anywhere opens the settings sheet:
safe ad blocking (on), aggressive ad blocking (off), reload.

## Notes

- `m.youtube.com` must be kept: it is what gets the ES5 bundle that iOS 12's
  WebKit can parse.
- The user agent is a full iOS 12 Safari string; the `Version/` and `Safari/`
  tokens are what avoid Google's embedded-webview sign-in rejection.
- `UIBackgroundModes: audio` is an Info.plist key, not an entitlement, so a free
  Apple ID is sufficient for background playback.
