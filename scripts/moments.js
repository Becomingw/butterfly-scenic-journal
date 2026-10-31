'use strict';
const path=require('node:path');
const {loadEntries,renderTimeline}=require('../tools/lib/moments');
hexo.extend.tag.register('journal_moments',function(){
  const entries=loadEntries(path.join(hexo.base_dir,'content/moments'),{
    zone:hexo.config.timezone||'UTC',author:hexo.config.author,avatar:hexo.theme.config.avatar?.img
  });
  return renderTimeline(entries,text=>hexo.render.renderSync({text,engine:'md'}));
});
