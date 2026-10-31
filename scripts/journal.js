'use strict';

const { stripHTML, escapeHTML } = require('hexo-util');
const text = value => stripHTML(value || '').replace(/\s+/g, ' ').trim();

// Derive a version-checked search asset without editing npm theme files.
// Waiting for window.load makes search depend on unrelated external images.
hexo.extend.generator.register('journal-search', function () {
  const fs = require('node:fs');
  const file = require.resolve('hexo-theme-butterfly/source/js/search/local-search.js');
  const source = fs.readFileSync(file, 'utf8');
  const marker = "window.addEventListener('load', () => {";
  if (source.split(marker).length !== 2) throw new Error('Review Butterfly search initialization after theme upgrade');
  return { path: 'js/journal-search.js', data: source.replace(marker, "document.addEventListener('DOMContentLoaded', () => {") };
});

// Keep theme updates npm-managed. Generate discovery data from published posts only.
hexo.extend.generator.register('journal-catalog', function (locals) {
  const posts = locals.posts.sort('-date').toArray().filter(p => p.published !== false);
  const catalog = posts.map(p => ({
    title: p.title,
    url: '/' + p.path.replace(/^\/+/, ''),
    date: p.date.clone().tz(hexo.config.timezone || 'UTC').format('YYYY-MM-DD'),
    year: p.date.clone().tz(hexo.config.timezone || 'UTC').format('YYYY'),
    categories: p.categories.toArray().map(c => c.name),
    tags: p.tags.toArray().map(t => t.name),
    excerpt: ([p.description, p.excerpt, p.content].map(text).find(value => /[\p{L}\p{N}]/u.test(value)) || '').slice(0, 160)
  }));
  return { path: 'journal-index.json', data: JSON.stringify(catalog) };
});

hexo.extend.filter.register('after_render:html', function (html) {
  // Butterfly's home layout has this container; archive/tag/category use their own UI.
  if (!html.includes('id="recent-posts"')) return html;
  const hero = `<section class="journal-home journal-home-simple" aria-label="博客简介"><div><h1>${escapeHTML(hexo.config.title)}</h1><p>${escapeHTML(hexo.config.subtitle || '')}</p></div><a class="journal-scroll" href="#recent-posts" aria-label="向下阅读最近的手记"><i class="fas fa-chevron-down" aria-hidden="true"></i></a></section>`;
  html = html.replace('</header>', '</header>' + hero);
  html = html.replace('<div class="recent-post-items">', '<div class="j-section-heading"><h2>最近的手记</h2><a href="/explore/">全部文章 →</a></div><div class="recent-post-items">');
  return html;
});
