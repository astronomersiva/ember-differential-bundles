const fs = require('fs');
const { execSync } = require('child_process');

const mergeHtml = require('./merge-html');

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// copy files one level deep
execSync('find legacy -maxdepth 1 -type f -exec cp {} dist \\;');

// copy all items in engines-dist
if (fs.existsSync('legacy/engines-dist')) {
  fs.mkdirSync('dist/engines-dist');

  execSync('cp -r legacy/engines-dist/* dist/engines-dist');
  execSync('cp -r modern/engines-dist/* dist/engines-dist');
}

// rename assetMap to preserve both legacy and modern
if (fs.existsSync('modern/assets/assetMap.json')) {
  fs.renameSync('modern/assets/assetMap.json', 'modern/assets/assetMapModern.json');
}

execSync('cp -r legacy/assets/ dist/assets');
execSync('cp -r modern/assets/* dist/assets');

mergeHtml();
