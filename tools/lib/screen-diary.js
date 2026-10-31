'use strict';

const fs = require('node:fs');
const path = require('node:path');
const front = require('hexo-front-matter');
const { escapeHTML, stripHTML } = require('hexo-util');
const esc = value => escapeHTML(String(value ?? ''));
const kinds = ['电影', '剧集', '动画', '纪录片', '综艺', '其他'];
const statuses = ['已看', '在看', '想看'];

function safeUrl(value) {
  const url = String(value || '').trim();
  if (/^\/(?!\/)/.test(url) && !/[\\\s]/.test(url)) return url;
  try { const parsed = new URL(url); if (['https:', 'http:'].includes(parsed.protocol)) return parsed.href; } catch {}
  return '';
}

function normalize(raw, id) {
  if (raw.published === false) return null;
  if (!raw.title || typeof raw.title !== 'string') throw new Error(`${id}: title is required`);
  const rating = raw.rating === '' || raw.rating == null ? null : Number(raw.rating);
  if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > 5 || rating * 2 % 1)) throw new Error(`${id}: rating must be 0–5 in half-star steps`);
  const watched = raw.watched_on instanceof Date ? raw.watched_on.toISOString().slice(0, 10) : String(raw.watched_on || '');
  if (watched && (!/^\d{4}-\d{2}-\d{2}$/.test(watched) || Number.isNaN(Date.parse(watched)) || new Date(watched).toISOString().slice(0,10) !== watched)) throw new Error(`${id}: invalid watch date`);
  const kind = raw.kind || '电影', status = raw.status || '已看';
  if (!kinds.includes(kind) || !statuses.includes(status)) throw new Error(`${id}: unsupported kind or status`);
  const year = raw.release_year == null || raw.release_year === '' ? '' : Number(raw.release_year);
  if (year !== '' && (!Number.isInteger(year) || year < 1888 || year > 2200)) throw new Error(`${id}: invalid release year`);
  return { ...raw, id, kind, status, rating, release_year: year, watched_on: watched,
    poster: safeUrl(raw.poster) || '/img/screen-placeholder.svg', link: safeUrl(raw.link),
    genres: Array.isArray(raw.genres) ? raw.genres.map(String) : [], body: raw._content || '' };
}

function loadEntries(directory) {
  if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory).filter(name => name.endsWith('.md')).sort().map(name => normalize(front.parse(fs.readFileSync(path.join(directory, name), 'utf8'), {schema:require('js-yaml').JSON_SCHEMA}), name.slice(0, -3))).filter(Boolean).sort((a,b) => b.watched_on.localeCompare(a.watched_on) || a.id.localeCompare(b.id));
}

function renderEntry(item, renderMarkdown) {
  const id = 'film-' + encodeURIComponent(item.id);
  const meta = [item.kind, item.release_year, item.region, ...item.genres].filter(Boolean);
  const search = [item.title, item.original_title, item.director, item.cast, ...meta, stripHTML(item.body)].join(' ').toLocaleLowerCase();
  const rating = item.rating === null ? '<span class="screen-unrated">暂未评分</span>' : `<div class="screen-rating" aria-label="个人评分 ${item.rating} / 5"><span class="screen-stars" aria-hidden="true"><span>★★★★★</span><span style="width:${item.rating / 5 * 100}%">★★★★★</span></span><strong>${item.rating.toFixed(1)}<small> / 5</small></strong></div>`;
  const extra = [['导演',item.director],['主演',item.cast]].filter(([,value]) => value).map(([key,value]) => `<div><dt>${key}</dt><dd>${esc(value)}</dd></div>`).join('');
  return `<article class="screen-card" id="${id}" data-kind="${esc(item.kind)}" data-status="${esc(item.status)}" data-rating="${item.rating ?? -1}" data-date="${esc(item.watched_on)}" data-search="${esc(search)}">
    <div class="screen-overview"><div class="screen-art"><img class="screen-backdrop no-lightbox" src="${esc(item.poster)}" alt="" aria-hidden="true" loading="lazy"><a class="screen-poster-link" href="${esc(item.poster)}" data-fancybox="gallery" data-caption="${esc(item.title)}海报" aria-label="查看${esc(item.title)}海报"><img class="screen-poster" src="${esc(item.poster)}" alt="${esc(item.title)}海报" width="220" height="320" loading="lazy"></a><span class="screen-status">${esc(item.status)}</span></div>
    <div class="screen-info"><div class="screen-heading"><h2>${esc(item.title)}</h2>
    ${item.original_title ? `<p class="screen-original">${esc(item.original_title)}</p>` : ''}</div>
    <p class="screen-meta">${meta.map(esc).join(' · ')}</p><div class="screen-score"><span class="screen-score-label">我的评分</span>${rating}</div>${item.rating_note ? `<p class="screen-rating-note">${esc(item.rating_note)}</p>` : ''}
    ${extra ? `<dl class="screen-credits">${extra}</dl>` : ''}
    <div class="screen-bottom"><span>${item.watched_on ? `观看于 <time datetime="${item.watched_on}">${item.watched_on}</time>` : '还没有记录观看日期'}</span>${item.link ? `<a href="${esc(item.link)}" target="_blank" rel="noopener noreferrer">作品资料 ↗</a>` : ''}<a class="screen-permalink" href="#${id}" aria-label="${esc(item.title)}的固定链接">#</a></div></div></div>
    ${item.body.trim() ? `<details class="screen-review"><summary><span>展开观后感</span><span>收起观后感</span><small>可能含剧透</small><i aria-hidden="true">＋</i></summary><div class="screen-review-body"><div class="screen-review-label">${esc(item.title)} · 观后感</div>${renderMarkdown(item.body)}</div></details>` : '<p class="screen-no-review">观后感待补。</p>'}
  </article>`;
}

function renderDiary(entries, renderMarkdown) {
  return `<section class="screen-diary" aria-label="影视手记"><div class="screen-intro"><p>看过的故事，留下的感受。</p><span>五星制 · 只记录我的个人喜好</span></div>
    <div class="screen-controls" hidden><label class="screen-search"><i class="fas fa-search" aria-hidden="true"></i><input class="j-input" type="search" name="screen-query" aria-label="找一部作品" placeholder="搜索片名、导演、关键词"></label><label><span class="screen-sr-only">类型</span><select class="j-input" name="screen-kind"><option value="">全部类型</option>${kinds.map(k=>`<option>${k}</option>`).join('')}</select></label><label><span class="screen-sr-only">状态</span><select class="j-input" name="screen-status"><option value="">全部状态</option>${statuses.map(s=>`<option>${s}</option>`).join('')}</select></label><label><span class="screen-sr-only">排序</span><select class="j-input" name="screen-sort"><option value="newest">最近观看</option><option value="rating">评分从高到低</option><option value="oldest">最早观看</option></select></label><button type="button" class="j-tool" data-screen-reset>重置</button></div>
    <p class="screen-count" role="status">${entries.length} 部作品</p><div class="screen-list">${entries.map(e=>renderEntry(e,renderMarkdown)).join('')}</div><p class="screen-empty" hidden>没有找到匹配的作品，试试其他关键词。</p>
    <nav class="j-pager screen-pager" aria-label="影视分页" hidden><button type="button" class="j-tool" data-screen-prev>上一页</button><span></span><button type="button" class="j-tool" data-screen-next>下一页</button></nav></section>`;
}

module.exports = { normalize, safeUrl, loadEntries, renderDiary };
