'use strict';
const config = require('../journal.config.json');
const fs = require('node:fs');
const path = require('node:path');
hexo.extend.generator.register('journal-settings', () => [{
  path: 'js/journal-settings.js',
  data: `window.SCENIC_JOURNAL=${JSON.stringify({music:config.music}).replace(/</g,'\\u003c')};`
}, ...['LICENSE','NOTICE'].map(name=>({path:name+'.txt',data:fs.readFileSync(path.join(hexo.base_dir,name),'utf8')})), {
  path:'licenses/hexo.txt', data:fs.readFileSync(path.join(path.dirname(require.resolve('hexo/package.json')),'LICENSE'),'utf8')
}, {
  path:'licenses/butterfly.txt', data:fs.readFileSync(path.join(path.dirname(require.resolve('hexo-theme-butterfly/package.json')),'LICENSE'),'utf8')
}]);
