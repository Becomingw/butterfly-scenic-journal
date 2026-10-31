'use strict';

const fs = require('node:fs');
const path = require('node:path');
const front = require('hexo-front-matter');
const yaml = require('js-yaml');
const moment = require('moment-timezone');
const {escapeHTML,stripHTML} = require('hexo-util');
const {safeUrl} = require('./screen-diary');
const esc = value => escapeHTML(String(value ?? ''));

function normalize(raw, id, {now=Date.now(), zone='Asia/Shanghai', author='Your Name', avatar=''}={}) {
  if(raw.published === false) return null;
  if(!/^[\p{L}\p{N}_-]+$/u.test(id)) throw new Error(`Invalid moment file name: ${id}`);
  const date = String(raw.date || '');
  const parsed = moment.parseZone(date, moment.ISO_8601, true);
  if(!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(date) || !parsed.isValid()) throw new Error(`${id}: date must be a valid ISO timestamp with timezone`);
  if(parsed.valueOf() > now) return null;
  if(raw.images != null && !Array.isArray(raw.images)) throw new Error(`${id}: images must be a list`);
  const images = (raw.images || []).map(image => {
    const url = safeUrl(image?.url);
    if(!url) throw new Error(`${id}: invalid image URL`);
    return {url,alt:String(image.alt || '')};
  });
  const music = raw.music_url ? safeUrl(raw.music_url) : '';
  if(raw.music_url && !music) throw new Error(`${id}: invalid music URL`);
  const body = String(raw._content || '').trim();
  if(!body && !images.length && !music) throw new Error(`${id}: empty moment`);
  return {id,title:String(raw.title||''),date:parsed.toISOString(),timestamp:parsed.valueOf(),
    displayDate:parsed.clone().tz(zone).format('YYYY-MM-DD HH:mm'),year:parsed.clone().tz(zone).format('YYYY'),
    author:String(raw.author||author),avatar:safeUrl(raw.avatar)||safeUrl(avatar),body,images,music};
}

function loadEntries(directory, options) {
  if(!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter(name=>name.endsWith('.md')).map(name=>
    normalize(front.parse(fs.readFileSync(path.join(directory,name),'utf8'),{schema:yaml.JSON_SCHEMA}),name.slice(0,-3),options)
  ).filter(Boolean).sort((a,b)=>b.timestamp-a.timestamp||a.id.localeCompare(b.id));
}

function musicBlock(url) {
  if(!url) return '';
  try {
    const parsed = new URL(url);
    if(parsed.protocol==='https:' && parsed.hostname==='music.163.com' && parsed.pathname==='/outchain/player') {
      parsed.searchParams.set('auto','0');
      return `<div class="moment-music"><iframe src="${esc(parsed.href)}" title="这条碎碎念的配乐" loading="lazy" height="86" sandbox="allow-scripts allow-same-origin allow-popups" allow="encrypted-media"></iframe><a href="${esc(parsed.href)}" target="_blank" rel="noopener">在新窗口打开配乐 ↗</a></div>`;
    }
  } catch {}
  return `<p class="moment-music"><a href="${esc(url)}" target="_blank" rel="noopener">听听这段日子的配乐 ↗</a></p>`;
}

function renderTimeline(entries, renderMarkdown) {
  const years = [...new Set(entries.map(e=>e.year))];
  const cards = year=>entries.filter(e=>e.year===year).map(e=>{
    const html=renderMarkdown(e.body);
    const searchable=stripHTML(html)+' '+e.author+' '+e.displayDate;
    return `<article class="moment-card" id="${esc(e.id)}" data-year="${e.year}" data-search="${esc(searchable.toLocaleLowerCase())}">
      <header class="moment-card-header">${e.avatar?`<img class="moment-avatar no-lightbox" src="${esc(e.avatar)}" alt="" width="42" height="42" loading="lazy">`:''}<div><strong>${esc(e.author)}</strong><a class="moment-permalink" href="#${esc(e.id)}" aria-label="${esc(e.displayDate)} 的碎碎念固定链接"><time datetime="${esc(e.date)}">${e.displayDate}</time></a></div><span class="moment-dot" aria-hidden="true"></span></header>
      <div class="moment-prose">${html}</div>
      ${e.images.length?`<div class="moment-gallery" data-count="${e.images.length}">${e.images.map((img,i)=>`<a href="${esc(img.url)}" data-fancybox="gallery-${esc(e.id)}" data-caption="${esc(img.alt)}" aria-label="查看第 ${i+1} 张配图"><img src="${esc(img.url)}" alt="${esc(img.alt||'碎碎念配图 '+(i+1))}" loading="lazy" decoding="async"></a>`).join('')}</div>`:''}
      ${musicBlock(e.music)}</article>`;
  }).join('');
  return `<div id="journal-moments"><header class="moments-intro"><span class="life-kicker">LITTLE THINGS, REAL DAYS</span><h2>一些不必写成长文的瞬间。</h2><p>零碎的念头、刚好的心情，和想留住的一小段日常。</p><small>${entries.length} 条碎碎念${entries.length?` · ${entries.at(-1).displayDate.slice(0,10)} — ${entries[0].displayDate.slice(0,10)}`:''}</small></header>
    <div class="moments-controls" hidden>
      <div class="moments-filter-row">
        <div class="moments-years" role="group" aria-label="按年份筛选"><button type="button" data-moment-filter="" aria-pressed="true">全部</button>${years.map(y=>`<button type="button" data-moment-filter="${y}" aria-pressed="false">${y}</button>`).join('')}</div>
        <label class="moments-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input name="moment-q" type="search" aria-label="搜索碎碎念" placeholder="搜索那些小事…" autocomplete="off"></label>
      </div>
      <div class="moments-filter-meta"><p class="moments-status" role="status" aria-live="polite"></p><button class="moments-reset" type="button" data-moment-reset disabled>重置筛选</button></div>
    </div>
    <div class="moments-timeline">${years.map(y=>`<section class="moment-year" data-moment-year="${y}"><h3>${y}<span>${entries.filter(e=>e.year===y).length} 条记录</span></h3><div class="moment-year-list">${cards(y)}</div></section>`).join('')||'<p class="j-empty">还没有公开的碎碎念。日子慢慢过，故事慢慢写。</p>'}</div>
    <p class="moments-empty j-empty" hidden>没有找到匹配的碎碎念，换个关键词试试。</p>
    <nav class="moments-pager" aria-label="碎碎念分页" hidden><button class="j-tool" type="button" data-moment-page="prev">上一页</button><span data-moment-page-label></span><button class="j-tool" type="button" data-moment-page="next">下一页</button></nav>
    <footer class="moments-note">小事也值得被记住。<span>发布时间按站点时区显示 · 图片可点击查看</span></footer></div>`;
}

module.exports={normalize,loadEntries,renderTimeline,musicBlock};
