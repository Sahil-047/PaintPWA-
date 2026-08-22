const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'hbs');
const dest = path.join(__dirname, '..', 'dist', 'hbs');

fs.cpSync(src, dest, { recursive: true });
console.log('Copied HBS templates to dist/hbs');
