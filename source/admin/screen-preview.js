/* Decap supplies React through createElement/createClass for preview extensions. */
if (window.CMS && window.createClass && window.h) {
  CMS.registerPreviewStyle('/admin/screen-preview.css?v=20261101k');
  CMS.registerPreviewTemplate('moments', createClass({
    render: function () {
      const data=this.props.entry.get('data'),rawImages=data.get('images');
      const images=rawImages?.toJS ? rawImages.toJS() : (rawImages || []);
      const avatar=data.get('avatar'),parsed=new Date(data.get('date'));
      const date=Number.isNaN(parsed.valueOf())?'时间待补':new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short'}).format(parsed);
      return h('article',{className:'preview-card preview-moment'},
        h('header',{className:'preview-moment-header'},
          avatar?h('img',{src:String(this.props.getAsset(avatar)),alt:''}):null,
          h('div',{},h('strong',{},data.get('author')||'站点作者'),h('small',{},date))),
        h('div',{className:'preview-body'},this.props.widgetFor('body')),
        images.length?h('div',{className:'preview-moment-gallery','data-count':images.length},...images.filter(image=>image?.url).map((image,i)=>h('img',{key:i,src:String(this.props.getAsset(image.url)),alt:image.alt||'碎碎念配图'}))):null,
        data.get('music_url')?h('p',{className:'preview-hint'},'已添加配乐链接，发布后可播放。'):null,
        data.get('published')===false?h('p',{className:'preview-hint'},'未公开：这条碎碎念不会出现在前台。'):null);
    }
  }));
  CMS.registerPreviewTemplate('posts', createClass({
    render: function () {
      const data=this.props.entry.get('data'),cover=data.get('cover');
      return h('article',{className:'preview-card preview-post'},
        cover?h('img',{className:'preview-post-cover',src:String(this.props.getAsset(cover)),alt:'文章封面'}):null,
        h('div',{className:'preview-info'},h('h1',{},data.get('title')||'文章标题'),
          h('p',{className:'preview-post-date'},String(data.get('date')||'')),
          data.get('summary')?h('p',{},data.get('summary')):null),
        h('div',{className:'preview-body'},this.props.widgetFor('body')));
    }
  }));
  CMS.registerPreviewTemplate('media', createClass({
    render: function () {
      const data = this.props.entry.get('data');
      const rating = data.get('rating');
      const poster = data.get('poster');
      return h('article', {className:'preview-card'},
        h('div', {className:'preview-overview'},
          h('div', {className:'preview-art'}, h('img', {src:poster ? String(this.props.getAsset(poster)) : '/img/screen-placeholder.svg',alt:'海报'})),
          h('div', {className:'preview-info'}, h('h1',{},data.get('title') || '作品名称'),
            data.get('original_title') ? h('p',{},data.get('original_title')) : null,
            h('p',{},[data.get('kind'),data.get('release_year'),data.get('region')].filter(Boolean).join(' · ')),
            h('strong',{},rating == null || rating === '' ? '暂未评分' : `${rating} / 5 ★`),
            h('p',{},data.get('rating_note') || ''),
            h('p',{},`${data.get('status') || '已看'} · ${data.get('watched_on') || '日期待补'}`))),
        h('details',{},h('summary',{},'展开观后感 · 可能含剧透'),h('div',{className:'preview-body'},this.props.widgetFor('body'))),
        data.get('published') === false ? h('p',{className:'preview-hint'},'此条记录未公开，不会出现在前台。') : null);
    }
  }));
}
