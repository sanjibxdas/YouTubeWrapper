#!/usr/bin/env bash
# Builds an unsigned .ipa and a jailbreak-installable .deb from the same app.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$ROOT/build"
NAME="YouTubeWrapper"

cd "$ROOT"
rm -rf "$BUILD"
mkdir -p "$BUILD"

xcodebuild \
  -project "$NAME.xcodeproj" \
  -scheme "$NAME" \
  -configuration Release \
  -sdk iphoneos \
  -archivePath "$BUILD/App.xcarchive" \
  -destination "generic/platform=iOS" \
  ARCHS=arm64 \
  ONLY_ACTIVE_ARCH=NO \
  IPHONEOS_DEPLOYMENT_TARGET=12.0 \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  DEVELOPMENT_TEAM="" \
  archive

APP="$BUILD/App.xcarchive/Products/Applications/$NAME.app"
if [ ! -d "$APP" ]; then
  echo "error: expected app bundle at $APP" >&2
  exit 1
fi

# Fail loudly if the deployment target drifted. A lower-than-supported target
# builds with only a warning, so this is the check that actually matters.
MINOS=$(/usr/libexec/PlistBuddy -c "Print :MinimumOSVersion" "$APP/Info.plist")
echo "MinimumOSVersion = $MINOS"
test "$MINOS" = "12.0"

# --- unsigned .ipa, for Sideloadly/AltStore ---
mkdir -p "$BUILD/Payload"
cp -R "$APP" "$BUILD/Payload/"
(cd "$BUILD" && zip -qry "$NAME.ipa" Payload)

# --- .deb, for Sileo/Cydia/Filza on a jailbroken device ---
# arm64 iOS refuses to launch a binary that carries no code signature at all,
# and AppSync only relaxes the signature *check* — it does not add one. ldid
# writes an ad-hoc signature, which is what the kernel requires. This must not
# be optional: without it the app installs and then dies on launch.
if ! command -v ldid >/dev/null 2>&1; then
  echo "error: ldid not found; the .deb would contain an unlaunchable binary" >&2
  exit 1
fi
ldid -S "$APP/$NAME"

node "$ROOT/tools/make-deb.js" "$APP" "$BUILD/$NAME.deb"
rm -rf "$BUILD/Payload"

ls -lh "$BUILD/$NAME.ipa" "$BUILD/$NAME.deb"
