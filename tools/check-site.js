'use strict';
// Deployment gate: missing navigation landing pages previously caused nginx 403s.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve('public');
const siteUrl = require('js-yaml').load(fs.readFileSync('_config.yml','utf8')).url;
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const required = ['index.html','tags/index.html','categories/index.html','archives/index.html','explore/index.html','journey/index.html','journey-data.json','github-projects.json','projects/index.html','music/index.html','me/index.html','bangumis/index.html','movies/index.html','link/index.html','404.html','atom.xml','sitemap.xml','search.xml','journal-index.json','css/journal.css','css/scenic.css','css/life-pages.css','js/journey.js','js/journal.js','img/journal-landscape.webp','img/journal-orbit.svg','vendor/aplayer/APlayer.min.js','vendor/aplayer/APlayer.min.css'];
for (const file of required) assert.ok(fs.statSync(path.join(root,file)).size > 0, `Empty: ${file}`);
assert.ok(read('js/journal-search.js').includes("document.addEventListener('DOMContentLoaded'"), 'Early search initialization missing');
const home = read('index.html');
for(const route of ['GPT','about','guide','library']) {
  assert.ok(!fs.existsSync(path.join(root,route,'index.html')),`Removed page returned: ${route}`);
  assert.ok(!home.includes(`href="/${route}/"`),`Removed navigation returned: ${route}`);
}
const journey = JSON.parse(read('journey-data.json'));
assert.equal(journey.posts.length,JSON.parse(read('journal-index.json')).length,'Journey and article catalog disagree');
assert.equal(journey.years.reduce((n,y)=>n+y.count,0),journey.posts.length);
assert.equal(journey.lengths.reduce((n,x)=>n+x,0),journey.posts.length);
assert.equal(journey.weekdays.reduce((n,x)=>n+x,0),journey.posts.length);
assert.equal(journey.years.reduce((n,y)=>n+y.words,0),journey.totalWords);
assert.ok(journey.totalWords>0,'Empty text statistics');
assert.ok(read('journey/index.html').includes('id="journal-journey"'),'Generated journey missing');
for(const route of ['journey','projects']) {
  assert.ok(!read(`${route}/index.html`).includes('<!-- LIFE_PAGE:'),'Unresolved page placeholder');
  assert.ok(read('sitemap.xml').includes(`/${route}/`),`Missing sitemap page: ${route}`);
}
assert.equal((read('projects/index.html').match(/class="life-project"/g)||[]).length,JSON.parse(read('github-projects.json')).projects.length);
assert.ok(read('me/index.html').includes('lang="en"'),'Bilingual about missing');
assert.ok(home.includes('journal-home-simple'), 'Simple homepage missing');
assert.ok(!home.includes('class="journal-hero"'), 'Promotional homepage returned');
for (const file of ['css/screen-diary.css','js/screen-diary.js','img/screen-placeholder.svg','admin/config.yml','admin/screen-preview.js','admin/guide.html']) assert.ok(read(file).length, `Missing screen diary asset: ${file}`);
const movies = read('movies/index.html');
const entries = require('./lib/screen-diary').loadEntries(path.resolve('content/media'));
assert.equal((movies.match(/class="screen-card"/g)||[]).length, entries.length, 'Screen diary entries missing');
assert.ok(!/<details[^>]*\sopen(?:\s|>)/.test(movies), 'Reviews should start collapsed');
for (const item of entries) if (item.poster.startsWith('/')) assert.ok(fs.existsSync(path.join(root,item.poster)), `Missing poster: ${item.poster}`);
assert.ok(home.includes('/js/journal-search.js'), 'Patched search asset not connected');
assert.ok(!home.includes('/css/commentsbar.css'), 'Envelope CSS leaked to homepage');
assert.ok(!home.includes('/css/custom.css'), 'Legacy overrides still active');
const posts = JSON.parse(read('journal-index.json'));
assert.ok(posts.length > 0, 'Empty catalog');
assert.equal(new Set(posts.map(p => p.url)).size, posts.length, 'Duplicate catalog URLs');
for (const post of posts) {
  const pathname = decodeURI(new URL(post.url,siteUrl).pathname);
  const file = path.join(root,pathname,pathname.endsWith('/') ? 'index.html' : '');
  assert.ok(file.startsWith(root + path.sep), 'Invalid article path');
  assert.ok(fs.existsSync(file), `Catalog links to missing article: ${post.url}`);
}
// All navigation links, including footer and homepage topics, must resolve locally.
let navigationLinks = 0;
const sections = home.match(/<nav\b[\s\S]*?<\/nav>|<footer\b[\s\S]*?<\/footer>|<section class="journal-home"[\s\S]*?<\/section>/g) || [];
for (const section of sections) for (const match of section.matchAll(/href="(\/(?!\/)[^"#]*)"/g)) {
  const pathname = decodeURI(new URL(match[1].replace(/&amp;/g,'&'),siteUrl).pathname);
  assert.ok(fs.existsSync(path.join(root, pathname, pathname.endsWith('/')?'index.html':'')), `Broken navigation: ${pathname}`); navigationLinks++;
}
assert.ok(read('atom.xml').includes('<entry>'), 'Empty Atom feed');
assert.ok(read('sitemap.xml').includes(siteUrl.replace(/\/$/,'')+'/'), 'Sitemap origin incorrect');
console.log(`PASS: ${required.length} required outputs, ${posts.length} article routes, ${navigationLinks} navigation links, Atom and sitemap.`);
