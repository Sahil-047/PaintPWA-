const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pairs = [
  [path.join(root, 'src', 'hbs'), path.join(root, 'dist', 'hbs')],
  [path.join(root, 'src', 'assets'), path.join(root, 'dist', 'assets')],
];

for (const [src, dest] of pairs) {
  if (!fs.existsSync(src)) continue;
  fs.cpSync(src, dest, { recursive: true });
  console.log(`Copied ${path.basename(src)} → dist/${path.basename(dest)}`);
}
