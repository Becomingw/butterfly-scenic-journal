(() => {
  'use strict';
  if (window.screenDiaryLoaded) return;
  window.screenDiaryLoaded = true;
  let controller;
  function init() {
    controller?.abort();controller = new AbortController();const {signal} = controller;
    const root = document.querySelector('.screen-diary');if (!root) return;
    const $ = selector => root.querySelector(selector);
    const list = $('.screen-list'), cards = [...list.children], query = $('[name=screen-query]'), kind = $('[name=screen-kind]'), status = $('[name=screen-status]'), sort = $('[name=screen-sort]');
    $('.screen-controls').hidden = false;
    let page = 1;const pageSize = 12;
    function render() {
      const term = query.value.trim().toLocaleLowerCase();
      const matches = cards.filter(c=>(!term || c.dataset.search.includes(term)) && (!kind.value || c.dataset.kind===kind.value) && (!status.value || c.dataset.status===status.value));
      matches.sort((a,b)=>sort.value==='rating' ? Number(b.dataset.rating)-Number(a.dataset.rating) || b.dataset.date.localeCompare(a.dataset.date) : (sort.value==='oldest'?1:-1)*a.dataset.date.localeCompare(b.dataset.date));
      const pages = Math.max(1,Math.ceil(matches.length/pageSize));page=Math.min(page,pages);
      cards.forEach(c=>{c.hidden=true;});matches.forEach((c,i)=>{list.append(c);c.hidden=i<(page-1)*pageSize || i>=page*pageSize;});
      $('.screen-count').textContent=`${matches.length} 部作品${matches.length!==cards.length ? ` / 共 ${cards.length} 部` : ''}`;
      $('.screen-empty').hidden=!!matches.length;$('.screen-pager').hidden=pages===1;
      $('.screen-pager span').textContent=`${page} / ${pages}`;$('[data-screen-prev]').disabled=page===1;$('[data-screen-next]').disabled=page===pages;
    }
    function filter(){page=1;render();}
    query.addEventListener('input',filter,{signal});[kind,status,sort].forEach(e=>e.addEventListener('change',filter,{signal}));
    $('[data-screen-reset]').addEventListener('click',()=>{query.value=kind.value=status.value='';sort.value='newest';filter();},{signal});
    $('[data-screen-prev]').addEventListener('click',()=>{page--;render();root.scrollIntoView();},{signal});
    $('[data-screen-next]').addEventListener('click',()=>{page++;render();root.scrollIntoView();},{signal});
    function revealHash() {
      const card = cards.find(c=>'#'+c.id===location.hash);if(!card)return;
      query.value=kind.value=status.value='';render();page=Math.floor([...list.children].filter(c=>cards.includes(c)).indexOf(card)/pageSize)+1;render();
      const details=card.querySelector('details');if(details)details.open=true;card.scrollIntoView({block:'start'});
    }
    window.addEventListener('hashchange',revealHash,{signal});render();revealHash();
    // External embeds are connected only when the corresponding review is expanded.
    root.querySelectorAll('.screen-review').forEach(details=>details.addEventListener('toggle',()=>{
      if(details.open)details.querySelectorAll('iframe[data-src]').forEach(frame=>{frame.src=frame.dataset.src;frame.removeAttribute('data-src');});
    },{signal}));
  }
  document.addEventListener('pjax:complete',init);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
