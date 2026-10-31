'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { stripHTML } = require('hexo-util');
const yaml = require('js-yaml');
const { normalize, loadEntries, renderDiary, safeUrl } = require('./lib/screen-diary');

// Draft exclusion and optional fields matter for the CMS publishing path.
assert.equal(normalize({published:false},'private'),null);
assert.equal(normalize({title:'Pending',rating:''},'pending').rating,null);
assert.equal(normalize({title:'Zero',rating:0},'zero').rating,0);
assert.equal(normalize({title:'Half',rating:3.5},'half').rating,3.5);
for (const rating of [-1,5.5,3.2,'oops']) assert.throws(()=>normalize({title:'Invalid',rating},'invalid'));
assert.throws(()=>normalize({title:'Invalid',watched_on:'2023-02-30'},'invalid'));
assert.equal(safeUrl('javascript:alert(1)'),'');assert.equal(safeUrl('//evil.example'),'');
const escaped = renderDiary([normalize({title:'<img onerror=bad>',poster:'javascript:bad',rating:0},'escaping')],s=>s);
assert.ok(!escaped.includes('<h2><img'));assert.ok(escaped.includes('screen-placeholder.svg'));assert.ok(escaped.includes('0.0'));

const cms=yaml.load(fs.readFileSync('source/admin/config.yml','utf8')).collections.find(c=>c.name==='media');
assert.equal(cms.folder,'content/media');assert.equal(cms.create,true);
for(const name of ['title','kind','poster','watched_on','rating','status','published','body']) assert.ok(cms.fields.some(f=>f.name===name),`CMS missing ${name}`);
assert.equal(cms.fields.find(f=>f.name==='rating').max,5);
console.log('PASS: screen diary drafts, ratings, dates, metadata escaping and CMS schema.');
// Date-only watch dates must not change with the build machine's timezone.
const os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'scenic-dates-'));
try {
  fs.writeFileSync(path.join(temp,'test.md'),'---\ntitle: Test\nwatched_on: 2026-02-14\n---\nReview');
  for(const TZ of ['UTC','Asia/Shanghai','America/Los_Angeles']) {
    const result=execFileSync(process.execPath,['-e',`console.log(require('./tools/lib/screen-diary').loadEntries(${JSON.stringify(temp)})[0].watched_on)`],{env:{...process.env,TZ},encoding:'utf8'}).trim();
    assert.equal(result,'2026-02-14',TZ);
  }
} finally {fs.rmSync(temp,{recursive:true,force:true});}
console.log('PASS: date-only film dates preserved across build timezones.');
