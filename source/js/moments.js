/* One page-scoped listener set; all moments remain readable without JavaScript. */
(() => {
  if(window.journalMomentsReady)return;window.journalMomentsReady=true;
  let events;
  function init(){
    events?.abort();events=new AbortController();const {signal}=events;
    const root=document.querySelector('#journal-moments');if(!root)return;
    const cards=[...root.querySelectorAll('.moment-card')],years=[...root.querySelectorAll('[data-moment-year]')];
    const q=root.querySelector('[name=moment-q]'),filters=[...root.querySelectorAll('[data-moment-filter]')],reset=root.querySelector('[data-moment-reset]'),status=root.querySelector('.moments-status'),pager=root.querySelector('.moments-pager');
    let page=1,selectedYear='';const perPage=12;
    root.querySelector('.moments-controls').hidden=false;status.hidden=false;
    function render(){
      const query=q.value.trim().toLocaleLowerCase();
      const matches=cards.filter(c=>(!selectedYear||c.dataset.year===selectedYear)&&(!query||c.dataset.search.includes(query)));
      const pages=Math.max(1,Math.ceil(matches.length/perPage));page=Math.min(Math.max(1,page),pages);
      const shown=new Set(matches.slice((page-1)*perPage,page*perPage));cards.forEach(c=>c.hidden=!shown.has(c));
      years.forEach(y=>y.hidden=![...y.querySelectorAll('.moment-card')].some(c=>!c.hidden));
      status.textContent=`${matches.length} 条记录${matches.length?' · 第 '+page+' / '+pages+' 页':''}`;
      filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.momentFilter===selectedYear)));
      reset.disabled=!q.value&&!selectedYear&&page===1;
      root.querySelector('.moments-empty').hidden=matches.length>0||cards.length===0;
      pager.hidden=matches.length<=perPage;root.querySelector('[data-moment-page-label]').textContent=`${page} / ${pages}`;
      root.querySelector('[data-moment-page=prev]').disabled=page===1;root.querySelector('[data-moment-page=next]').disabled=page===pages;
    }
    function openHash(){
      let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
      const target=cards.find(c=>c.id===id);if(!target)return;
      q.value='';selectedYear='';page=Math.floor(cards.indexOf(target)/perPage)+1;render();
      target.scrollIntoView({block:'start'});
    }
    q.addEventListener('input',()=>{page=1;render();},{signal});
    root.addEventListener('click',event=>{
      if(event.target.closest('[data-moment-reset]')){q.value='';selectedYear='';page=1;render();q.focus();}
      const filter=event.target.closest('[data-moment-filter]');if(filter){selectedYear=filter.dataset.momentFilter;page=1;render();}
      const button=event.target.closest('[data-moment-page]');if(button){page+=button.dataset.momentPage==='next'?1:-1;render();root.querySelector('.moments-controls').scrollIntoView({block:'start'});}
    },{signal});
    window.addEventListener('hashchange',openHash,{signal});render();openHash();
  }
  document.addEventListener('pjax:complete',init);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
