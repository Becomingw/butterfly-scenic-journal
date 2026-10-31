/* Optional controls over a fully server-rendered, readable statistics page. */
(() => {
  if(window.journeyReady)return;window.journeyReady=true;
  let events;
  function init(){
    events?.abort();events=new AbortController();const {signal}=events;
    const root=document.querySelector('#journal-journey');if(!root)return;
    const posts=JSON.parse(root.querySelector('#journey-post-data').textContent);
    const year=root.querySelector('#journey-year'),calendars=[...root.querySelectorAll('[data-calendar]')],output=root.querySelector('#journey-day-posts');
    root.querySelector('.journey-year-control').hidden=false;
    const showYear=()=>{calendars.forEach(c=>c.hidden=c.dataset.calendar!==year.value);output.textContent='选一个亮起来的日子，回到当时。';root.querySelectorAll('[data-day]').forEach(b=>b.removeAttribute('aria-pressed'));};
    year.addEventListener('change',showYear,{signal});showYear();
    root.addEventListener('click',event=>{
      const metric=event.target.closest('[data-metric]');
      if(metric){const key=metric.dataset.metric,rows=[...root.querySelectorAll('.journey-annual')],max=Math.max(1,...rows.map(r=>Number(r.dataset[key])));root.querySelectorAll('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',String(b===metric)));rows.forEach(r=>{const value=Number(r.dataset[key]);r.querySelector('b').style.width=value/max*100+'%';r.querySelector('strong').textContent=value.toLocaleString('zh-CN')+(key==='count'?' 篇':' 字词');});}
      const day=event.target.closest('[data-day]');if(!day)return;
      root.querySelectorAll('[data-day]').forEach(b=>b.setAttribute('aria-pressed',String(b===day)));
      const matches=posts.filter(p=>p.date===day.dataset.day),heading=document.createElement('strong'),list=document.createElement('ul');
      heading.textContent=`${day.dataset.day} · ${matches.length} 篇`;
      matches.forEach(p=>{const item=document.createElement('li'),a=document.createElement('a');a.href=p.url;a.textContent=p.title;item.append(a);list.append(item);});
      output.replaceChildren(heading,list);window.pjax?.refresh(output);
    },{signal});
  }
  document.addEventListener('pjax:complete',init);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
