// Cache-busting for GitHub Pages (which serves everything with max-age=600).
// Rewrites the version query on every JS module and stylesheet so a browser
// never pairs a fresh index.html with stale cached modules.
//
//   node tools/bump-version.js            # version = current timestamp
//   node tools/bump-version.js 20261103a  # explicit version
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const version = process.argv[2] || new Date().toISOString().replace(/\D/g, '').slice(0, 12);

const modules = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (name.endsWith('.js')) modules.push(path.relative(root, full).split(path.sep).join('/'));
  }
})(path.join(root, 'js'));
modules.sort();

// index.html: import map entries for every module + versioned CSS and entry script
const indexPath = path.join(root, 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');
const imports = {
  three: 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js',
  'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/',
};
for (const m of modules) imports[`./${m}`] = `./${m}?v=${version}`;
const map = JSON.stringify({ imports }, null, 2).replace(/^/gm, '  ').trimStart();
index = index.replace(/<script type="importmap">[\s\S]*?<\/script>/, `<script type="importmap">\n  ${map}\n  </script>`);
index = index.replace(/href="css\/main\.css(\?v=[^"]*)?"/, `href="css/main.css?v=${version}"`);
index = index.replace(/src="js\/main\.js(\?v=[^"]*)?"/, `src="js/main.js?v=${version}"`);
fs.writeFileSync(indexPath, index, 'utf8');

// Resumes: stylesheet + track script
for (const name of ['resume.html', 'resume-en.html']) {
  const p = path.join(root, name);
  let html = fs.readFileSync(p, 'utf8');
  html = html.replace(/href="resume\.css(\?v=[^"]*)?"/, `href="resume.css?v=${version}"`);
  html = html.replace(/src="resume-track\.js(\?v=[^"]*)?"/, `src="resume-track.js?v=${version}"`);
  fs.writeFileSync(p, html, 'utf8');
}

console.log(`version ${version}: ${modules.length} modules mapped`);
