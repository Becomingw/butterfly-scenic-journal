/* Progressive enhancements: one global listener set, page-scoped PJAX lifecycle. */
(() => {
  'use strict';
  if (window.scenicJournal) return;
  window.scenicJournal = true;
  const playlistUrl = window.SCENIC_JOURNAL?.music?.playlistUrl || '/music-playlist.json';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (name, fallback) => { try { return JSON.parse(localStorage.getItem(name)) ?? fallback; } catch { return fallback; } };
  const write = (name, value) => { try { localStorage.setItem(name, JSON.stringify(value)); return true; } catch { toast('浏览器暂时无法保存，请检查存储设置'); return false; } };
  let catalogPromise, toastTimer, pageEvents, player, musicLoading = false;
  const catalog = () => catalogPromise ||= fetch('/journal-index.json').then(r => { if (!r.ok) throw new Error('catalog'); return r.json(); }).catch(e => { catalogPromise = null; throw e; });
  function toast(message) {
    let node = $('#journal-toast');
    if (!node) { node = document.createElement('div'); node.id = 'journal-toast'; node.className = 'j-toast'; node.setAttribute('role', 'status'); document.body.append(node); }
    node.textContent = message; node.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { node.hidden = true; }, 2800);
  }
  const button = (label, action, extra = '') => `<button type="button" class="j-tool" data-action="${action}" ${extra}>${label}</button>`;
  function openSearch() {
    $('#search-button .search')?.click();
  }
  function postTools() {
    const article = $('#post #article-container');
    if (!article || $('.j-toolbar')) return;
    const bar = document.createElement('div'); bar.className = 'j-toolbar'; bar.setAttribute('aria-label', '阅读工具');
    bar.innerHTML = `<span class="j-toolbar-label">阅读工具</span><a class="j-tool" href="/journey/">文章历程</a>${button('复制链接', 'copy')}${button('专注阅读', 'read')}${button('A−', 'smaller', 'aria-label="缩小正文字号"')}${button('A＋', 'larger', 'aria-label="放大正文字号"')}${button('打印', 'print')}`;
    article.before(bar);
    window.pjax?.refresh(bar);
    const size = Number(read('scenic:font', 16));
    article.style.fontSize = `${Number.isFinite(size) ? Math.max(14, Math.min(22, size)) : 16}px`;
  }
  function entry(p) {
    return `<article class="j-result"><small>${escape(p.date)} · ${escape(p.categories.join(' / ') || '手记')}</small><h3><a href="${escape(p.url)}">${escape(p.title)}</a></h3><p>${escape(p.excerpt)}</p><div class="j-result-bottom"><span>${escape(p.tags.slice(0, 3).map(t => '#' + t).join(' '))}</span><a href="${escape(p.url)}">继续阅读 →</a></div></article>`;
  }
  async function discovery(signal) {
    const root = $('#journal-explore'); if (!root) return;
    const status = $('.j-result-status', root), results = $('.j-results', root);
    try {
      const posts = await catalog(); if (signal.aborted) return;
      const q = $('[name=q]', root), category = $('[name=category]', root), year = $('[name=year]', root), sort = $('[name=sort]', root);
      const params = new URLSearchParams(location.search); q.value = params.get('q') || '';
      const categories = [...new Set(posts.flatMap(p => p.categories))].sort((a,b) => a.localeCompare(b,'zh-CN'));
      const years = [...new Set(posts.map(p => p.year))].sort().reverse();
      if (category) { category.innerHTML += categories.map(c => `<option value="${escape(c)}">${escape(c)}</option>`).join(''); category.value = categories.includes(params.get('category')) ? params.get('category') : ''; }
      if (year) { year.innerHTML += years.map(y => `<option>${escape(y)}</option>`).join(''); year.value = years.includes(params.get('year')) ? params.get('year') : ''; }
      if (sort && params.get('sort') === 'oldest') sort.value = 'oldest';
      const stats = $('#journal-stats');
      if (stats) {
        stats.innerHTML = `<div class="j-stats"><div><strong>${posts.length}</strong><span>篇文章</span></div><div><strong>${new Set(posts.flatMap(p=>p.tags)).size}</strong><span>个标签</span></div><div><strong>${years.length}</strong><span>个写作年份</span></div></div>`;
        const counts = years.map(y => posts.filter(p => p.year === y).length), max = Math.max(...counts, 1);
        stats.innerHTML += `<details><summary>看看这些年的写作足迹</summary><div class="j-year-bars">${years.map((y,i) => `<div class="j-year-row"><span>${escape(y)}</span><i style="width:${counts[i]/max*100}%" aria-hidden="true"></i><span>${counts[i]} 篇</span></div>`).join('')}</div></details>`;
      }
      let current = 1;
      const pager = $('.j-pager', root), previous = $('[data-page=prev]', root), next = $('[data-page=next]', root);
      function render() {
        const query = q.value.trim().toLocaleLowerCase();
        let matches = posts.filter(p => (!query || [p.title,p.excerpt,...p.tags,...p.categories].join(' ').toLocaleLowerCase().includes(query)) && (!category?.value || p.categories.includes(category.value)) && (!year?.value || p.year === year.value));
        if (sort?.value === 'oldest') matches = matches.slice().reverse();
        const pages = Math.max(1, Math.ceil(matches.length/10)); current = Math.min(current, pages);
        status.textContent = `找到 ${matches.length} 篇文章`;
        results.innerHTML = matches.length ? matches.slice((current-1)*10,current*10).map(entry).join('') : '<div class="j-empty">暂时没有匹配的文章，试试其他关键词或分类。 <a href="/explore/">探索文章 →</a></div>';
        previous.disabled = current === 1; next.disabled = current === pages;
        $('[data-page-label]', root).textContent = `${current} / ${pages}`; pager.hidden = matches.length <= 10;
        window.pjax?.refresh(results);
      }
      function filter() {
        current = 1;
        const query = new URLSearchParams();
        if(q.value.trim()) query.set('q',q.value.trim()); if(category?.value) query.set('category',category.value); if(year?.value) query.set('year',year.value); if(sort?.value === 'oldest') query.set('sort','oldest');
        history.replaceState(history.state, '', location.pathname + (query.size ? '?' + query : '')); render();
      }
      q.addEventListener('input', filter, {signal});
      [category,year,sort].filter(Boolean).forEach(el => el.addEventListener('change',filter,{signal}));
      previous.addEventListener('click',()=>{current--;render();root.scrollIntoView({block:'start'});},{signal});
      next.addEventListener('click',()=>{current++;render();root.scrollIntoView({block:'start'});},{signal});
      $('[data-reset]',root)?.addEventListener('click',()=>{q.value='';if(category)category.value='';if(year)year.value='';if(sort)sort.value='newest';filter();},{signal});
      render();
    } catch { if(!signal.aborted) { status.textContent = '文章索引暂时无法加载。'; results.innerHTML = '<a href="/archives/">查看时间归档 →</a>，或刷新页面重试。'; } }
  }
  function bangumi(signal) {
    const tabs = $('.bangumi-tabs'); if (!tabs || $('#journal-bangumi-search')) return;
    const field = document.createElement('label'); field.className = 'j-controls'; field.innerHTML = '<span>筛选当前清单</span><input id="journal-bangumi-search" class="j-input" type="search" placeholder="输入番名…">'; tabs.after(field);
    const pager = document.createElement('div'); pager.className = 'j-pager'; pager.innerHTML = '<button class="j-tool" type="button" data-prev>上一页</button><span aria-live="polite"></span><button class="j-tool" type="button" data-next>下一页</button>';
    const panels = $$('[id^="bangumi-item"]'); panels.at(-1)?.after(pager);
    let current = 1;
    function render() {
      const active = $('.bangumi-tab.bangumi-active'), panel = active && document.getElementById(active.dataset.panel); if(!panel) return;
      const items = $$('.bangumi-item',panel), term = $('input',field).value.trim().toLowerCase();
      const matches = items.filter(item => $('.bangumi-title',item)?.textContent.toLowerCase().includes(term));
      const pages = Math.max(1,Math.ceil(matches.length/12)); current = Math.min(current,pages);
      items.forEach(item=>{item.hidden=true;});matches.slice((current-1)*12,current*12).forEach(item=>{item.hidden=false;});
      $('span',pager).textContent = `${matches.length} 部 · ${current} / ${pages}`;
      $('[data-prev]',pager).disabled=current===1; $('[data-next]',pager).disabled=current===pages;
    }
    // Existing updater owns the status tabs; run after its handler, including PJAX revisits.
    tabs.addEventListener('click',e=>{if(e.target.closest('.bangumi-tab')) {current=1;queueMicrotask(render);}},{signal});
    $('input',field).addEventListener('input',()=>{current=1;render();},{signal});
    $('[data-prev]',pager).addEventListener('click',()=>{current--;render();tabs.scrollIntoView();},{signal});
    $('[data-next]',pager).addEventListener('click',()=>{current++;render();tabs.scrollIntoView();},{signal});render();
  }
  function tagFilter(signal) {
    const cloud = $('.tag-cloud-list'); if(!cloud || $('#journal-tag-search')) return;
    const input=document.createElement('input');input.id='journal-tag-search';input.type='search';input.className='j-input';input.placeholder='筛选标签…';input.setAttribute('aria-label','筛选标签');cloud.before(input);
    input.addEventListener('input',()=>{$$('a',cloud).forEach(a=>{a.hidden=!a.textContent.toLowerCase().includes(input.value.trim().toLowerCase());});},{signal});
  }
  function setupMusic() {
    if ($('#journal-music')) return;
    const dock=document.createElement('div');dock.id='journal-music';dock.className='j-music-dock no-destroy';
    dock.innerHTML='<section class="j-music-panel" id="journal-music-panel" aria-label="音乐播放器" hidden><header><strong>音乐角落</strong><button class="j-tool" type="button" data-action="music-close" aria-label="收起播放器">×</button></header><p data-music-status role="status">按下加载，听一首喜欢的歌。</p><div id="journal-aplayer"></div><button class="j-tool" type="button" data-action="music-load">加载歌单</button></section><button class="j-music-toggle" type="button" data-action="music" aria-controls="journal-music-panel" aria-expanded="false"><i class="fas fa-music" aria-hidden="true"></i><span>听点音乐</span></button>';
    document.body.append(dock);
  }
  function musicOpen(open) {
    const panel=$('#journal-music-panel');panel.hidden=!open;
    $('#journal-music [data-action=music]').setAttribute('aria-expanded',String(open));
    if(open)$('[data-action=music-close]',panel).focus();else $('#journal-music [data-action=music]').focus();
  }
  function loadPlayerScript() {
    if(window.APlayer)return Promise.resolve();
    return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/vendor/aplayer/APlayer.min.js';s.onload=resolve;s.onerror=()=>{s.remove();reject(new Error('播放器资源加载失败'));};document.head.append(s);});
  }
  async function loadMusic() {
    if(player||musicLoading)return;musicLoading=true;
    const status=$('[data-music-status]'), control=$('#journal-music [data-action=music-load]');control.disabled=true;status.textContent='正在加载歌单…';renderMusicList();
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);
    try {
      if(!$('#journal-aplayer-css')){const css=document.createElement('link');css.id='journal-aplayer-css';css.rel='stylesheet';css.href='/vendor/aplayer/APlayer.min.css';document.head.append(css);}
      const [response]=await Promise.all([fetch(playlistUrl,{signal:abort.signal}),loadPlayerScript()]);
      if(!response.ok)throw new Error('歌单服务暂时不可用');
      const data=await response.json();if(!Array.isArray(data)||!data.length)throw new Error('歌单暂时为空');
      const audio=data.filter(x=>typeof x.url==='string'&&(/^(https:\/\/|\/(?!\/))/.test(x.url))).map(x=>({name:x.name||x.title,artist:x.artist||x.author,url:x.url,cover:x.cover||x.pic,lrc:x.lrc}));
      if(!audio.length)throw new Error('暂无可播放曲目');
      player=new window.APlayer({container:$('#journal-aplayer'),audio,autoplay:false,preload:'none',theme:'#24786b',listFolded:true,listMaxHeight:'220px',volume:.5});
      control.hidden=true;status.textContent=`已载入 ${audio.length} 首。点击播放开始收听。`;
      player.on('play',()=>{status.textContent='正在播放';$('#journal-music [data-action=music] span').textContent='音乐播放中';});
      player.on('pause',()=>{$('#journal-music [data-action=music] span').textContent='听点音乐';});
      player.on('error',()=>{status.textContent='这首歌暂时无法播放，请换一首或检查音源。';});
      ['play','pause','listswitch'].forEach(event=>player.on(event,updateMusicList));
    } catch(error) {status.textContent=error.name==='AbortError'?'歌单加载超时，请重试。':`${error.message}，请检查歌单配置。`;control.textContent='重试加载';}
    finally{clearTimeout(timer);musicLoading=false;control.disabled=false;renderMusicList();}
  }
  function renderMusicList() {
    const root=$('#journal-music-list');if(!root)return;
    if(!player){root.innerHTML=musicLoading?'<p role="status">正在加载歌单…</p>':'<p role="status">还没有可播放的歌曲，请在 music-playlist.json 添加音源，或配置自己的歌单 API。</p><button class="j-tool" type="button" data-action="music-load">重新加载</button>';return;}
    root.innerHTML='<div class="j-track-head" aria-hidden="true"><span>#</span><span>歌曲</span><span>歌手</span><span></span></div><ol>'+player.list.audios.map((track,index)=>`<li><button type="button" class="j-track" data-action="music-track" data-index="${index}" aria-label="播放 ${escape(track.name)} · ${escape(track.artist)}"><span class="j-track-number">${String(index+1).padStart(2,'0')}</span><span class="j-track-name">${escape(track.name)}</span><span class="j-track-artist">${escape(track.artist)}</span><span class="j-track-state" aria-hidden="true">▶</span></button></li>`).join('')+'</ol>';
    updateMusicList();
  }
  function updateMusicList() {
    if(!player)return;
    $$('#journal-music-list .j-track').forEach(row=>{const index=Number(row.dataset.index),active=index===player.list.index,playing=active&&!player.audio.paused,track=player.list.audios[index];row.classList.toggle('is-active',active);row.setAttribute('aria-label',`${playing?'暂停':'播放'} ${track.name} · ${track.artist}`);$('.j-track-state',row).textContent=playing?'Ⅱ':'▶';});
  }
  function init() {
    pageEvents?.abort();pageEvents=new AbortController();const {signal}=pageEvents;
    // Read-mode body state is outside Butterfly's PJAX replacement containers.
    document.body.classList.remove('read-mode');$$('.exit-readmode').forEach(b=>b.remove());
    if(!$('.j-skip')){const a=document.createElement('a');a.className='j-skip';a.href='#content-inner';a.textContent='跳到正文';document.body.prepend(a);}
    if(!$('.j-theme-toggle')){const b=document.createElement('button');b.className='j-theme-toggle';b.type='button';b.dataset.action='theme';b.title='切换明暗主题';b.setAttribute('aria-label','切换明暗主题');b.textContent='◐';$('#menus')?.append(b);}
    if(!$('.j-reading-progress')){const p=document.createElement('div');p.className='j-reading-progress';p.setAttribute('aria-hidden','true');p.innerHTML='<span></span>';document.body.append(p);}
    postTools();discovery(signal);bangumi(signal);tagFilter(signal);setupMusic();progress();
    if($('#journal-music-list')){renderMusicList();if(!player)loadMusic();}
    $$('img').forEach(img=>{img.addEventListener('error',()=>{if(!img.dataset.jFallback){img.dataset.jFallback='1';img.src='/img/screen-placeholder.svg';}},{once:true,signal});});
  }
  function progress(){const article=$('#post #article-container'),bar=$('.j-reading-progress span');if(!bar)return;let value=0;if(article){const box=article.getBoundingClientRect();value=Math.max(0,Math.min(1,(100-box.top)/Math.max(1,box.height-innerHeight+120)));}bar.style.transform=`scaleX(${value})`;}
  let scheduled=false;window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{progress();scheduled=false;});}},{passive:true});window.addEventListener('resize',progress,{passive:true});
  document.addEventListener('click',async e=>{
    const control=e.target.closest('[data-action]');if(!control)return;
    const action=control.dataset.action;
    if(action==='theme')$('#darkmode')?.click();
    if(action==='read')$('#readmode')?.click();
    if(action==='print')window.print();
    if(action==='copy'){
      try{await navigator.clipboard.writeText(location.href);toast('链接已复制');}catch{toast('复制未成功，请从地址栏复制链接');}
    }
    if(action==='smaller'||action==='larger'){const article=$('#post #article-container');if(article){const size=Math.max(14,Math.min(22,parseFloat(getComputedStyle(article).fontSize)+(action==='larger'?1:-1)));article.style.fontSize=`${size}px`;write('scenic:font',size);}}
    if(action==='random'){try{const posts=await catalog();if(posts.length)location.assign(posts[Math.floor(Math.random()*posts.length)].url);}catch{toast('索引暂时无法加载，请稍后重试');}}
    if(action==='music')musicOpen($('#journal-music-panel').hidden);
    if(action==='music-close')musicOpen(false);
    if(action==='music-load')loadMusic();
    if(action==='music-track'&&player){const index=Number(control.dataset.index);if(index===player.list.index)player.toggle();else{player.list.switch(index);player.play();}}
    if(action==='search')openSearch();
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && !$('#journal-music-panel')?.hidden)musicOpen(false);
    if(e.isComposing||e.target.closest('input,textarea,select,[contenteditable=true]'))return;
    if(((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k')||(!e.metaKey&&!e.ctrlKey&&!e.altKey&&e.key==='/')){e.preventDefault();openSearch();}
  });
  document.addEventListener('pjax:complete',init);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
