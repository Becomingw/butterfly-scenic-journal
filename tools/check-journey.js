'use strict';
const assert=require('node:assert/strict');
const {measure,aggregate,momentRecords}=require('./lib/journey');
const {normalize:normalizeMoment}=require('./lib/moments');
const {selectProjects,validSnapshot,refresh,owner}=require('./refresh-projects');
assert.deepEqual(measure('<p>你好 world &amp; hello</p><pre>代码 excluded</pre><code>inline</code><img src="x">'),{words:4,images:1});
const post=(date,words,url)=>({date,words,url,title:url,tags:['生活','生活'],categories:['日常'],images:1});
const s=aggregate([post('2024-03-01',800,'/c'),post('2024-02-29',5000,'/b'),post('2024-02-28',799,'/a'),post('2024-02-29',2000,'/d')],'2025-01-01');
assert.equal(s.longestStreak,3,'Leap-day continuity');assert.equal(s.activeDays,3);assert.equal(s.streakEnd,'2024-03-01');
assert.deepEqual(s.lengths,[1,1,1,1]);assert.equal(s.totalWords,8599);assert.equal(s.median,1400);assert.deepEqual(s.tags,[['生活',4]]);
assert.equal(s.years[1].count,0,'Include empty current year');assert.equal(aggregate([],'2026-01-01').spanDays,0);
const momentOptions={now:Date.parse('2025-01-02T00:00:00Z'),zone:'Asia/Shanghai'};
const sample={title:'Internal note must not be counted',date:'2024-12-31T20:00:00Z',_content:'<p>你好 world</p><code>excluded</code><img src="/inline.jpg">',images:[{url:'/gallery.jpg'}]};
const publicMoments=[normalizeMoment(sample,'z-first',momentOptions),normalizeMoment({...sample,date:'2025-01-01T08:00:00Z'},'a-latest',momentOptions),normalizeMoment({...sample,published:false},'private',momentOptions),normalizeMoment({...sample,date:'2099-01-01T00:00:00Z'},'future',momentOptions)].filter(Boolean);
const momentStats=aggregate(momentRecords(publicMoments,text=>text),'2025-01-02');
assert.equal(momentStats.posts.length,2);assert.equal(momentStats.activeDays,1);assert.equal(momentStats.years[0].year,2025);assert.equal(momentStats.totalWords,6);assert.equal(momentStats.images,4);
assert.equal(momentStats.posts[0].date,'2025-01-01');assert.ok(momentStats.posts.every(p=>p.url.startsWith('/moments/#')&&!p.title.includes('Internal note')));
assert.equal(momentStats.first.url,'/moments/#z-first');assert.equal(momentStats.latest.url,'/moments/#a-latest');
assert.equal(momentRecords([{id:'photo',displayDate:'2025-01-01 08:00',body:'',images:[{url:'/photo.jpg'}]}],()=> '')[0].title,'一组日常配图');
const built=JSON.parse(require('node:fs').readFileSync('public/journey-data.json','utf8'));
assert.equal(built.moments.count,built.moments.entries.length);assert.equal(built.moments.activeDays,new Set(built.moments.entries.map(p=>p.date)).size);
assert.equal(built.moments.years.reduce((n,y)=>n+y.count,0),built.moments.count);assert.equal(built.moments.entries.reduce((n,p)=>n+p.words,0),built.moments.totalWords);
console.log('PASS: moments timezone/year boundary, same-day grouping, draft/future exclusion, word/image counts and snapshot totals.');
const repo=(name,stars,pushed,fork=false)=>({name,stargazers_count:stars,pushed_at:pushed,fork,owner:{login:owner},html_url:`https://github.com/${owner}/${name}`,forks_count:0});
const projects=selectProjects([repo('fork',99,'2026-01-01',true),repo('a',1,'2025-01-01'),repo('b',2,'2024-01-01'),repo('c',1,'2026-01-01')]);
assert.deepEqual(projects.map(r=>r.name),['b','c','a']);assert.ok(validSnapshot({owner,totalOriginal:3,fetchedAt:'2026-01-01',projects}));
assert.equal(validSnapshot({owner,totalOriginal:3,fetchedAt:'bad',projects}),false);
assert.ok(validSnapshot({owner,totalOriginal:0,fetchedAt:null,projects:[]}));
console.log('PASS: mixed-language text, excluded code, leap days, same-day posts, empty years, bucket boundaries, repository ranking.');
// Exercise pagination and partial-failure recovery without touching the real snapshot.
(async()=>{
  const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'blog-project-check-')),output=path.join(temp,'snapshot.json'),cache=path.join(temp,'deployed.json');
  try {
    let requests=0;
    await refresh({output,request:async url=>{requests++;const page=new URL(url).searchParams.get('page');return {ok:true,json:async()=>page==='1'?Array.from({length:100},(_,i)=>repo('r'+i,i,'2026-01-01')):[repo('last-page-winner',999,'2026-01-01')]};}});
    const snapshot=JSON.parse(fs.readFileSync(output));assert.equal(requests,2);assert.equal(snapshot.totalOriginal,101);assert.equal(snapshot.projects[0].name,'last-page-winner');assert.equal(snapshot.projects.length,10);
    const previous={...snapshot,fetchedAt:'2025-01-01T00:00:00Z'},deployed={...snapshot,fetchedAt:'2026-01-01T00:00:00Z'};
    fs.writeFileSync(output,JSON.stringify(previous));fs.writeFileSync(cache,JSON.stringify(deployed));
    await refresh({output,cache,request:async url=>new URL(url).searchParams.get('page')==='1'?{ok:true,json:async()=>Array.from({length:100},(_,i)=>repo('partial'+i,1,'2026-01-01'))}:{ok:false,status:503}});
    assert.deepEqual(JSON.parse(fs.readFileSync(output)),deployed,'Failed second page must not publish partial results or a new timestamp');
    console.log('PASS: all GitHub pages, top10 cap, latest deployed fallback and unchanged freshness on failure.');
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
