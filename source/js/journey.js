/* Optional controls over a fully server-rendered, readable statistics page. */
(() => {
  if(window.journeyReady)return;window.journeyReady=true;
  let events;
  function init(){
    events?.abort();events=new AbortController();const {signal}=events;
    const root=document.querySelector('#journal-journey');if(!root)return;
    const posts=JSON.parse(root.querySelector('#journey-post-data').textContent);
    const moments=JSON.parse(root.querySelector('#journey-moment-data').textContent),sources=[...root.querySelectorAll('[data-journey-source]')];
    let source='posts';
    const year=root.querySelector('#journey-year'),calendars=[...root.querySelectorAll('[data-calendar]')],output=root.querySelector('#journey-day-posts');
    root.querySelector('.journey-year-control').hidden=false;
    root.querySelector('.journey-source-switch').hidden=false;
    const showYear=()=>{calendars.forEach(c=>c.hidden=c.dataset.calendar!==year.value||c.dataset.calendarSource!==source);output.textContent=`${year.value} 年的${source==='moments'?'碎碎念':'文章'} · 选一个亮起来的日子，回到当时。`;root.querySelectorAll('[data-day]').forEach(b=>b.removeAttribute('aria-pressed'));sources.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.journeySource===source)));};
    year.addEventListener('change',showYear,{signal});showYear();
    root.addEventListener('click',event=>{
      const sourceButton=event.target.closest('[data-journey-source]');
      if(sourceButton&&sourceButton.dataset.journeySource!==source){source=sourceButton.dataset.journeySource;year.value=sourceButton.dataset.defaultYear;showYear();}
      const metric=event.target.closest('[data-metric]');
      if(metric){const key=metric.dataset.metric,rows=[...root.querySelectorAll('.journey-annual')],max=Math.max(1,...rows.map(r=>Number(r.dataset[key])));root.querySelectorAll('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',String(b===metric)));rows.forEach(r=>{const value=Number(r.dataset[key]);r.querySelector('b').style.width=value/max*100+'%';r.querySelector('strong').textContent=value.toLocaleString('zh-CN')+(key==='count'?' 篇':' 字词');});}
      const day=event.target.closest('[data-day]');if(!day)return;
      root.querySelectorAll('[data-day]').forEach(b=>b.setAttribute('aria-pressed',String(b===day)));
      const matches=(source==='moments'?moments:posts).filter(p=>p.date===day.dataset.day),heading=document.createElement('strong'),list=document.createElement('ul');
      heading.textContent=`${day.dataset.day} · ${matches.length} ${source==='moments'?'条碎碎念':'篇文章'}`;
      matches.forEach(p=>{const item=document.createElement('li'),a=document.createElement('a');a.href=p.url;a.textContent=p.title;item.append(a);list.append(item);});
      output.replaceChildren(heading,list);window.pjax?.refresh(output);
    },{signal});
  }
  document.addEventListener('pjax:complete',init);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
