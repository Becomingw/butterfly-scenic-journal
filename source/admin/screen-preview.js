/* Decap supplies React through createElement/createClass for preview extensions. */
if (window.CMS && window.createClass && window.h) {
  CMS.registerPreviewStyle('/admin/screen-preview.css?v=20261101c');
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
