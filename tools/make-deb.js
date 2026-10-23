// Packages a built .app into a .deb that Sileo/Cydia/Filza can install.
//
// Implemented with node:zlib instead of shelling out to dpkg-deb/ar/tar so it
// runs identically on Windows and macOS with no toolchain.
//
// Usage: node tools/make-deb.js <path-to-.app> <output.deb>
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const [, , APP_PATH, OUT_PATH] = process.argv;
if (!APP_PATH || !OUT_PATH) {
  console.error('usage: node tools/make-deb.js <app-bundle> <output.deb>');
  process.exit(1);
}
if (!fs.existsSync(APP_PATH)) {
  console.error('error: app bundle not found: ' + APP_PATH);
  process.exit(1);
}

const APP_NAME = path.basename(APP_PATH).replace(/\.app$/, '');
const PKG_ID = 'com.example.youtubewrapper';
const DISPLAY_NAME = 'Tube';
const VERSION = '1.0';
const INSTALL_PATH = 'Applications/' + APP_NAME + '.app';

// ---------- tar (ustar, POSIX) ----------

function tarHeader(name, size, mode, isDir) {
  const h = Buffer.alloc(512);
  h.write(name, 0, 100, 'utf8');
  h.write(mode.toString(8).padStart(7, '0') + '\0', 100, 8, 'ascii');
  h.write('0000000\0', 108, 8, 'ascii');          // uid
  h.write('0000000\0', 116, 8, 'ascii');          // gid
  h.write(size.toString(8).padStart(11, '0') + '\0', 124, 12, 'ascii');
  h.write(Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0', 136, 12, 'ascii');
  h.write(isDir ? '5' : '0', 156, 1, 'ascii');
  h.write('ustar\0', 257, 6, 'ascii');
  h.write('00', 263, 2, 'ascii');
  h.write('root\0', 265, 32, 'ascii');
  h.write('wheel\0', 297, 32, 'ascii');
  h.write('0000000\0', 329, 8, 'ascii');
  h.write('0000000\0', 337, 8, 'ascii');

  h.write('        ', 148, 8, 'ascii');            // checksum placeholder
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += h[i];
  h.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
  return h;
}

function pad512(buf) {
  const rem = buf.length % 512;
  return rem === 0 ? buf : Buffer.concat([buf, Buffer.alloc(512 - rem)]);
}

function walk(root, prefix, out) {
  const entries = fs.readdirSync(path.join(root, prefix), { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : 1));
  for (const entry of entries) {
    const rel = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      out.push({ name: rel + '/', size: 0, mode: 0o755, isDir: true });
      walk(root, rel, out);
    } else {
      const full = path.join(root, rel);
      const data = fs.readFileSync(full);
      // The main binary must keep its executable bit or iOS refuses to launch it,
      // and archive round-trips (zip artifacts) routinely drop it.
      const isMainBinary = path.basename(full) === APP_NAME;
      const mode = isMainBinary || (fs.statSync(full).mode & 0o111) ? 0o755 : 0o644;
      out.push({ name: rel, size: data.length, mode, isDir: false, data });
    }
  }
}

function buildTar(files) {
  const chunks = [];
  for (const f of files) {
    chunks.push(tarHeader(f.name, f.size, f.mode, f.isDir));
    if (!f.isDir) chunks.push(pad512(f.data));
  }
  chunks.push(Buffer.alloc(1024)); // end-of-archive
  return Buffer.concat(chunks);
}

// ---------- ar (Debian) ----------

function arMember(name, data) {
  const header = Buffer.alloc(60, 0x20);
  const write = (str, off, len) => header.write(str.padEnd(len, ' ').slice(0, len), off, len, 'ascii');
  write(name, 0, 16);
  write('0', 16, 12);            // mtime
  write('0', 28, 6);             // uid
  write('0', 34, 6);             // gid
  write('100644', 40, 8);        // mode
  write(String(data.length), 48, 10);
  write('`\n', 58, 2);
  const body = data.length % 2 === 0 ? data : Buffer.concat([data, Buffer.from('\n')]);
  return Buffer.concat([header, body]);
}

function buildAr(members) {
  return Buffer.concat([Buffer.from('!<arch>\n', 'ascii')].concat(members));
}

// ---------- package ----------

const entries = [];
walk(APP_PATH, '', entries);
// Entries are relative to the bundle root; prefix them with where the bundle lands.
const prefixed = entries.map((e) => Object.assign({}, e, { name: INSTALL_PATH + '/' + e.name }));

// /Applications must exist as an owned directory for the recursive copy to land.
const dataTar = buildTar(
  [{ name: 'Applications/', size: 0, mode: 0o755, isDir: true }].concat(prefixed)
);

const control = [
  'Package: ' + PKG_ID,
  'Name: ' + DISPLAY_NAME,
  'Version: ' + VERSION,
  'Architecture: iphoneos-arm',
  'Maintainer: local',
  'Section: Applications',
  'Priority: optional',
  'Depends: firmware (>= 12.0)',
  'Description: YouTube web wrapper with ad blocking and background playback.',
  ' A WKWebView container for m.youtube.com. Requires a jailbroken device',
  ' (AppSync Unified not needed: the binary is pre-signed with ldid).',
  ''
].join('\n');

const controlEntry = {
  name: 'control',
  size: Buffer.byteLength(control),
  mode: 0o644,
  isDir: false,
  data: Buffer.from(control, 'utf8')
};
const controlTar = buildTar([controlEntry]);

const deb = buildAr([
  arMember('debian-binary', Buffer.from('2.0\n', 'ascii')),
  arMember('control.tar.gz', zlib.gzipSync(controlTar, { level: 9 })),
  arMember('data.tar.gz', zlib.gzipSync(dataTar, { level: 9 }))
]);

fs.mkdirSync(path.dirname(path.resolve(OUT_PATH)), { recursive: true });
fs.writeFileSync(OUT_PATH, deb);

const files = entries.filter((e) => !e.isDir).length;
console.log('wrote ' + OUT_PATH + ' (' + (deb.length / 1048576).toFixed(1) + ' MB, ' + files + ' files)');
console.log('installs to /' + INSTALL_PATH);
