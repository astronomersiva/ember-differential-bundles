const fs = require('fs');
const path = require('path');
const posthtml = require('posthtml')

let modernScripts = [];
function extractScripts() {
  return function(tree) {
    let html = tree.find(node => node.tag === 'html');
    let body = html.content.find(node => node.tag === 'body');

    body.content.forEach(node => {
      let isScript = node.tag === 'script';
      let isEmberRelated = node.attrs && node.attrs['data-for'] === 'ember';

      if (isScript && isEmberRelated) {
        modernScripts.push({
          name: node.attrs.src.split(/-\w+\./)[0],
          node
        });
      }
    });

    return tree;
  }
}

function insertScripts() {
  return function(tree) {
    let html = tree.find(node => node.tag === 'html');
    let body = html.content.find(node => node.tag === 'body');

    modernScripts.forEach(script => {
      let index = body.content.findIndex(node => {
        return script.name === (node.attrs && node.attrs.src && node.attrs.src.split(/-\w+\./)[0]);
      });

      body.content.splice(index, 0, '<LEGACY>');
      body.content.splice(index + 2, 0, '</LEGACY>\n');
      body.content.splice(index + 3, 0, '<MODERN>');
      body.content.splice(index + 4, 0, script.node);
      body.content.splice(index + 5, 0, '</MODERN>\n');

    });

    return tree;
  }
}

function isAssetManifestNode(node) {
  let isMeta = node.tag === 'meta';
  let name = (node.attrs && node.attrs.name) || '';
  let isAssetManifest = name && name.endsWith('config/asset-manifest');

  return isMeta && isAssetManifest;
}

let modernAssetManifest;
function extractMeta() {
  return function(tree) {
    let html = tree.find(node => node.tag === 'html');
    let head = html.content.find(node => node.tag === 'head');

    let assetManifest = head.content.find(node => {
      return isAssetManifestNode(node);
    });

    modernAssetManifest = assetManifest;

    return tree;
  }
}

function injectMeta() {
  return function(tree) {
    let html = tree.find(node => node.tag === 'html');
    let head = html.content.find(node => node.tag === 'head');

    let assetManifestIndex = head.content.findIndex(node => {
      return isAssetManifestNode(node);
    });

    head.content.splice(assetManifestIndex, 0, '<MODERN>');
    head.content.splice(assetManifestIndex + 1, 0, modernAssetManifest);
    head.content.splice(assetManifestIndex + 2, 0, '</MODERN>\n');
    head.content.splice(assetManifestIndex + 3, 0, '<LEGACY>');
    head.content.splice(assetManifestIndex + 5, 0, '</LEGACY>\n');

    return tree;
  }
}

module.exports = function() {
  const legacyHtmlPath = path.join(process.cwd(), 'legacy/index.html');
  const modernHtmlPath = path.join(process.cwd(), 'modern/index.html');

  const legacyHtml = fs.readFileSync(legacyHtmlPath).toString();
  const modernHtml = fs.readFileSync(modernHtmlPath).toString();

  // process modern html
  posthtml()
    .use(extractScripts())
    .use(extractMeta())
    .process(modernHtml, { sync: true })
    .html;

  const processedLegacyHtml = posthtml()
    .use(insertScripts())
    .use(injectMeta())
    .process(legacyHtml, { sync: true })
    .html;

  fs.writeFileSync(
    path.join(process.cwd(), 'dist/index.html'),
    processedLegacyHtml.replace(/&quot;/g, '\'')
  );
}
