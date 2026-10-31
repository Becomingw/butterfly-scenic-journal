'use strict';
const path = require('node:path');
const { loadEntries, renderDiary } = require('../tools/lib/screen-diary');

hexo.extend.tag.register('screen_diary', function () {
  const entries = loadEntries(path.join(hexo.base_dir, 'content/media'));
  return renderDiary(entries, text => hexo.render.renderSync({ text, engine: 'md' }));
});
