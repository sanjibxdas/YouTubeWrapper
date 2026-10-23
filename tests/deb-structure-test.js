// Validates the generated .deb the way a package manager reads it.
//
// This exists because a deb can parse fine with a naive reader and still be
// rejected on device: Sileo reports "Bad Deb" when a file appears before its
// parent directory, or when the ar/tar containers are malformed.
//
// Usage: node tests/deb-structure-test.js <path-to.deb>
const fs = require('fs');
const zlib = require('zlib');

const debPath = process.argv[2];
if (!debPath) {
  console.error('usage: node tests/deb-structure-test.js <file.deb>');
  process.exit(1);
}

let failures = 0;
function check(label, cond, detail) {
  if (cond) console.log('  ok   ' + label);
  else { failures++; console.log('  FAIL ' + label + (detail ? ' -> ' + detail : '')); }
}

const b = fs.readFileSync(debPath);

// ---- ar container ----
check('ar magic', b.slice(0, 8).toString('latin1') === '!<arch>\n');

const members = [];
let off = 8;
while (off + 60 <= b.length) {
  const header = b.slice(off, off + 60);
  const name = header.slice(0, 16).toString('ascii').replace(/ +$/, '');
  const size = parseInt(header.slice(48, 58).toString('ascii').replace(/ +/g, ''), 10);
  const term = header.slice(58, 60).toString('latin1');
  if (term !== '`\n') { failures++; console.log('  FAIL bad member terminator for ' + name); }
  if (!name) break;
  members.push({ name, size, data: b.slice(off + 60, off + 60 + size) });
  off += 60 + size + (size % 2);
}

check('three members', members.length === 3, 'got ' + members.length);
check('member order', members[0] && members[0].name === 'debian-binary' &&
      members[1].name === 'control.tar.gz' && members[2].name === 'data.tar.gz',
      members.map((m) => m.name).join(','));
check('no trailing bytes', off === b.length, off + ' vs ' + b.length);
check('debian-binary is 2.0', members[0] && members[0].data.toString() === '2.0\n');

// ---- tar reader ----
function tarEntries(buf) {
  const out = [];
  let p = 0;
  while (p + 512 <= buf.length) {
    const raw = buf.slice(p, p + 512);
    const name = raw.slice(0, 100).toString('utf8').replace(/\0.*$/, '');
    if (!name) break;

    let size = parseInt(raw.slice(124, 136).toString('ascii').replace(/[\0 ]/g, ''), 8);
    if (!isFinite(size)) size = 0;
    const mode = raw.slice(100, 108).toString('ascii').replace(/[\0 ]/g, '');
    const type = raw.slice(156, 157).toString('latin1');

    // Checksum must verify, or dpkg refuses the archive.
    const stored = parseInt(raw.slice(148, 156).toString('ascii').replace(/[\0 ]/g, ''), 8);
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += (i >= 148 && i < 156) ? 32 : raw[i];
    if (stored !== sum) { failures++; console.log('  FAIL tar checksum on ' + name); }

    out.push({ name, size, mode, isDir: type === '5' });
    p += 512 + Math.ceil(size / 512) * 512;
  }
  return out;
}

const controlTar = tarEntries(zlib.gunzipSync(members[1].data));
const controlEntry = controlTar.find((e) => e.name.replace(/^\.\//, '') === 'control');
check('control file present', !!controlEntry);

const controlOffset = (() => {
  const raw = zlib.gunzipSync(members[1].data);
  let p = 0;
  for (const e of controlTar) {
    if (e.name.replace(/^\.\//, '') === 'control') return p + 512;
    p += 512 + Math.ceil(e.size / 512) * 512;
  }
  return -1;
})();
const controlText = zlib.gunzipSync(members[1].data)
  .slice(controlOffset, controlOffset + (controlEntry ? controlEntry.size : 0))
  .toString('utf8');

check('control has no CR', !controlText.includes('\r'));
for (const field of ['Package:', 'Name:', 'Version:', 'Architecture:', 'Maintainer:', 'Description:']) {
  check('control has ' + field, controlText.includes(field));
}

const dataEntries = tarEntries(zlib.gunzipSync(members[2].data));

// Every file's parent directory must be declared before the file itself.
const declaredDirs = new Set();
for (const e of dataEntries) {
  const rel = e.name.replace(/^\.\//, '').replace(/\/$/, '');
  const parent = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
  if (e.isDir) {
    declaredDirs.add(rel);
    check('parent declared for dir ' + e.name,
          parent === '' || declaredDirs.has(parent), 'parent "' + parent + '" missing');
    continue;
  }
  check('parent declared for ' + e.name,
        parent === '' || declaredDirs.has(parent), 'parent "' + parent + '" missing');
}

check('installs under Applications', dataEntries.some((e) => e.name.indexOf('Applications/') !== -1));
const binary = dataEntries.find((e) => /\.app\/[^/]+$/.test(e.name) && e.mode !== '0000644');
check('app binary is executable', !!binary && binary.mode === '0000755',
      binary ? binary.mode : 'not found');

console.log(failures === 0 ? '\ndeb structure OK' : '\n' + failures + ' check(s) failed');
process.exit(failures === 0 ? 0 : 1);
