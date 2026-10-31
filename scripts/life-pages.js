'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {escapeHTML}=require('hexo-util');
const {measure,aggregate,momentRecords}=require('../tools/lib/journey');
const {loadEntries}=require('../tools/lib/screen-diary');
const {loadEntries:loadMoments}=require('../tools/lib/moments');
const {validSnapshot,owner}=require('../tools/refresh-projects');
const esc=value=>escapeHTML(String(value??''));
const num=value=>Number(value).toLocaleString('zh-CN');
const box=(title,body,extra='')=>`<section class="life-box ${extra}"><h2>${title}</h2>${body}</section>`;
const link=p=>p?`<a href="${esc(p.url)}">${esc(p.title)}</a>`:'还没有文章';
const metric=(value,label,detail)=>`<div class="journey-metric"><strong>${value}</strong><span>${label}</span><small>${detail}</small></div>`;
// Ordinary source pages supply canonical URLs/sitemap entries; inject their built
// content only when Hexo renders the final HTML, after generators have completed.
const pageContent={};
hexo.extend.filter.register('after_render:html',html=>html.replace(/<!-- LIFE_PAGE:(journey|projects) -->/g,(_,name)=>{
  if(!pageContent[name])throw new Error(`Missing generated life page: ${name}`);
  return pageContent[name];
}));
function bars(rows,max,unit='篇') {return rows.map(([label,value,url])=>`<${url?'a':'div'} class="journey-bar"${url?` href="${esc(url)}"`:''}><span>${esc(label)}</span><i aria-hidden="true"><b style="width:${max?value/max*100:0}%"></b></i><strong>${num(value)} <small>${unit}</small></strong></${url?'a':'div'}>`).join('');}
function calendar(year,s,today,source='posts') {
  const unit=source==='moments'?'条':'篇',label=source==='moments'?'碎碎念':'文章';
  const count=s.posts.filter(p=>p.date.startsWith(String(year))).length;
  return `<section class="journey-calendar" data-calendar="${year}" data-calendar-source="${source}"><h3>${year} <small>· ${count} ${unit}${label}</small></h3><div class="journey-months">${Array.from({length:12},(_,m)=>{
    const offset=(new Date(Date.UTC(year,m,1)).getUTCDay()+6)%7,total=new Date(Date.UTC(year,m+1,0)).getUTCDate();
    const prefix=`${year}-${String(m+1).padStart(2,'0')}`;
    const monthly=s.posts.filter(p=>p.date.startsWith(prefix)).length;
    return `<div class="journey-month"><div><strong>${m+1} 月</strong><small>${monthly} ${unit}</small></div><div class="journey-days">${'一二三四五六日'.split('').map(d=>`<small>${d}</small>`).join('')}${'<span class="day-pad"></span>'.repeat(offset)}${Array.from({length:total},(_,d)=>{const date=prefix+'-'+String(d+1).padStart(2,'0'),n=s.days[date]?.length||0;return n?`<button type="button" data-day="${date}" data-level="${Math.min(n,3)}" aria-label="${date}，${n} ${unit}${label}" title="${date} · ${n} ${unit}${label}">${d+1}</button>`:`<span class="${date>today?'day-future':''}" title="${date}${date>today?' · 尚未到来':' · 没有发布'+label}">${d+1}</span>`;}).join('')}</div></div>`;
  }).join('')}</div></section>`;
}
hexo.extend.generator.register('life-pages',function(locals){
  const zone=hexo.config.timezone||'UTC';
  const now=new Date();
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const posts=locals.posts.toArray().filter(p=>p.published!==false&&p.date.valueOf()<=now.valueOf()).map(p=>({title:p.title,url:'/'+p.path.replace(/^\/+/,''),date:p.date.clone().tz(zone).format('YYYY-MM-DD'),tags:p.tags.toArray().map(t=>t.name),categories:p.categories.toArray().map(c=>c.name),...measure(p.content)}));
  const s=aggregate(posts,today);
  const moments=loadMoments(path.join(hexo.base_dir,'content/moments'),{zone,now:now.valueOf()});
  const ms=aggregate(momentRecords(moments,text=>hexo.render.renderSync({text,engine:'md'})),today);
  const musicCount=moments.filter(entry=>entry.music).length;
  const media=loadEntries(path.join(hexo.base_dir,'content/media'));
  const rated=media.filter(m=>m.rating!==null),mean=rated.length?(rated.reduce((n,m)=>n+m.rating,0)/rated.length).toFixed(1):'—';
  const bangumi=fs.readFileSync(path.join(hexo.source_dir,'bangumis/index.md'),'utf8');
  const bangumiCounts=['想看','在看','已看'].map(label=>[label,Number(bangumi.match(new RegExp(label+' \\((\\d+)\\)'))?.[1]||0)]);
  const currentYear=Number(today.slice(0,4)),defaultYear=s.latest?Number(s.latest.date.slice(0,4)):currentYear;
  const years=s.years.length?s.years:[{year:currentYear,count:0,words:0}];
  const calendarYears=[...new Set([...years,...ms.years].map(y=>y.year))].sort((a,b)=>b-a);
  const momentDefaultYear=ms.latest?Number(ms.latest.date.slice(0,4)):currentYear;
  const momentYears=ms.years.length?ms.years:[{year:currentYear,count:0,words:0}];
  const momentAnnual=bars(momentYears.map(y=>[String(y.year),y.count,ms.posts.filter(p=>p.date.startsWith(String(y.year))).at(-1)?.url]),Math.max(1,...momentYears.map(y=>y.count)),'条');
  const momentMetric=(value,label,note)=>`<div class="journey-moment-metric"><strong>${num(value)}</strong><span>${label}</span><small>${note}</small></div>`;
  const momentSection=`<section class="life-box journey-moment-box"><div class="journey-section-heading"><h2>长文之外的小日常</h2><a href="/moments/">翻翻碎碎念 ↗</a></div><div class="journey-moment-metrics">${momentMetric(moments.length,'条公开碎碎念','随手记下的生活片段')}${momentMetric(ms.totalWords,'字词的零碎心情','按正文统计，不计后台备注')}${momentMetric(ms.activeDays,'个留下念头的日子','同一天多条只算一天')}${momentMetric(ms.images,'次配图出现',`${musicCount} 条记录附有配乐`)}</div><div class="journey-moment-detail"><div><h3>每年的小事</h3>${momentAnnual}</div><div class="journey-moment-coordinates"><h3>日常的几个坐标</h3><p><small>第一条 · ${ms.first?.date||'待记录'}</small>${ms.first?link(ms.first):'<span>等待第一条碎碎念。</span>'}</p><p><small>最近一条 · ${ms.latest?.date||'待记录'}</small>${ms.latest?link(ms.latest):'<span>日子慢慢过，故事慢慢写。</span>'}</p><p><small>最长连续记录</small><span>${ms.longestStreak} 天${ms.streakEnd?' · 截至 '+ms.streakEnd:''}</span></p></div></div><p class="life-note">碎碎念单独统计；按原始发布时间归入年份。${currentYear} 年截至 ${today}，点击年份或坐标可回到对应记录。</p></section>`;
  const bestWeek=Math.max(...s.weekdays),bestWeekdays=s.weekdays.map((n,i)=>n===bestWeek?'周'+'一二三四五六日'[i]:'').filter(Boolean).join('、');
  const longest=s.longest;
  const annual=years.map(y=>`<${y.count?'a':'div'} class="journey-bar journey-annual"${y.count?` href="/explore/?year=${y.year}"`:''} data-count="${y.count}" data-words="${y.words}"><span>${y.year}</span><i aria-hidden="true"><b style="width:${y.count/Math.max(1,...years.map(y=>y.count))*100}%"></b></i><strong>${y.count} <small>篇</small></strong></${y.count?'a':'div'}>`).join('');
  const topics=s.tags.slice(0,16).map(([tag,n])=>`<a href="/explore/?q=${encodeURIComponent(tag)}" class="journey-tag" style="--weight:${n/Math.max(1,s.tags[0]?.[1]||1)}">${esc(tag)} <small>${n}</small></a>`).join('');
  const milestones=`<div class="journey-milestones"><article><small>第一篇 · ${s.first?.date||'待记录'}</small><h3>从这里开始</h3>${link(s.first)}</article><article><small>最近一篇 · ${s.latest?.date||'待记录'}</small><h3>故事还在继续</h3>${link(s.latest)}</article><article><small>${num(longest?.words||0)} 字词 · 约 ${Math.ceil((longest?.words||0)/400)} 分钟</small><h3>最舍不得收笔的一篇</h3>${link(longest)}</article></div>`;
  const content=`<div id="journal-journey"><header class="life-intro"><span class="life-kicker">THE STORY SO FAR</span><h2>日子走过，文字留下。</h2><p>把零散的记录放在一起，看看这些年，好奇心都去了哪里。</p><small>内容快照 · ${today} · 随每次发布与每日构建自动更新</small></header>
  <div class="journey-metrics">${metric(s.posts.length,'篇公开文章',s.first?`始于 ${s.first.date}`:'等待第一篇')}${metric(num(s.totalWords),'字词留在这里',`一口气读完约 ${(s.totalWords/400/60).toFixed(1)} 小时`)}${metric(num(s.spanDays),'天的记录跨度','第一篇至统计日，含首尾')}${metric(s.activeDays,'个落笔的日子','同一天多篇只算一天')}${metric(s.tags.length,'个兴趣标签',`${s.categories.length} 个分类`)}${metric(num(s.images),'次图片出现','文章正文中的图片引用')}</div>
  <div class="life-grid">${box('每一年，都有自己的节奏',`<div class="journey-switch" role="group" aria-label="年度统计指标"><button type="button" data-metric="count" aria-pressed="true">文章篇数</button><button type="button" data-metric="words" aria-pressed="false">文字体量</button></div><div class="journey-bars" aria-live="polite">${annual}</div><p class="life-note">点击年份，读读那一年写下的东西。${currentYear} 年统计截至 ${today}。</p>`)}${box('文字里的小发现',`<div class="journey-facts"><p><strong>${esc(s.months[0]?.[0]||'—')}</strong><span>最热闹的月份，留下 ${s.months[0]?.[1]||0} 篇文章${s.months.filter(x=>x[1]===s.months[0]?.[1]).length>1?'（并列时取最早月份）':''}。</span></p><p><strong>${s.longestStreak} 天</strong><span>最长连续发布记录${s.streakEnd?'，截至 '+s.streakEnd:''}。</span></p><p><strong>${num(s.median)} 字词</strong><span>一篇文章的中位体量；长短都有自己的位置。</span></p><p><strong>${esc(s.posts.length?bestWeekdays:'—')}</strong><span>最常发布文章的星期，${bestWeek} 篇${s.weekdays.filter(n=>n===bestWeek).length>1?'（并列）':''}。</span></p></div>`)}</div>
  ${momentSection}
  ${box('把写过的日子点亮',`<div class="journey-calendar-tools"><div class="journey-switch journey-source-switch" role="group" aria-label="日历内容" hidden><button type="button" data-journey-source="posts" data-default-year="${defaultYear}" aria-pressed="true">文章</button><button type="button" data-journey-source="moments" data-default-year="${momentDefaultYear}" aria-pressed="false">碎碎念</button></div><label class="journey-year-control" hidden>年份 <select id="journey-year" class="j-input">${calendarYears.map(year=>`<option value="${year}"${year===defaultYear?' selected':''}>${year}</option>`).join('')}</select></label></div><p class="life-note journey-calendar-hint">每一格都是一天。点击有颜色的日期，打开那天的记录；切换内容时默认展示最近有记录的年份。</p><div class="journey-legend"><span>当天发布数</span><i data-level="0"></i>0 <i data-level="1"></i>1 <i data-level="2"></i>2 <i data-level="3"></i>3+</div>${calendarYears.map(year=>calendar(year,s,today)+calendar(year,ms,today,'moments')).join('')}<div id="journey-day-posts" class="journey-day-posts" role="status" aria-live="polite">选一个亮起来的日子，回到当时。</div>`, 'journey-calendar-box')}
  <div class="life-grid">${box('好奇心的形状',`<div class="journey-tags">${topics||'<p>还没有标签。</p>'}</div><p class="life-note">最常出现的 ${Math.min(16,s.tags.length)} 个标签；数字为使用该标签的文章数，一篇可以有多个标签。</p>`)}${box('常走的几条路',bars(s.categories.slice(0,7).map(([name,n])=>[name,n,'/explore/?category='+encodeURIComponent(name)]),s.categories[0]?.[1]||1)+`<p class="life-note">前 ${Math.min(7,s.categories.length)} 个分类；含层级分类，一篇可能计入多类。</p>`)}</div>
  <div class="life-grid">${box('读一篇，需要多长的停留？',bars(['随手一记 · < 800','慢慢展开 · 800–1,999','认真长谈 · 2,000–4,999','长篇存档 · ≥ 5,000'].map((name,i)=>[name,s.lengths[i]]),Math.max(...s.lengths,1))+`<p class="life-note">按正文字词量分组。短文与长文，都是生活的不同切片。</p>`)}${box('一周的写作节拍',bars(s.weekdays.map((n,i)=>['周'+'一二三四五六日'[i],n]),Math.max(...s.weekdays,1))+`<p class="life-note">按文章发布日期统计（${esc(zone)}），不是实际写作时长。</p>`)}</div>
  ${box('屏幕之外，也有故事',`<div class="journey-life"><a href="/movies/"><strong>${media.length}</strong><span>部作品有了手记</span><small>${rated.length} 部已评分 · 均分 ${mean} / 5</small></a><a href="/bangumis/"><strong>${bangumiCounts.reduce((n,x)=>n+x[1],0)}</strong><span>条追番记录</span><small>${bangumiCounts.map(([k,n])=>k+' '+n).join(' · ')}</small></a><a href="/music/"><span class="journey-music-symbol" aria-hidden="true">♫</span><span>给这些日子配一首歌</span><small>去音乐角落听听 →</small></a></div><p class="life-note">影视与追番分别统计，不做跨清单去重；追番状态来自已同步的本地清单。</p>`)}
  ${box('几个值得回头看的坐标',milestones)}
  ${box('翻一翻这些年',years.slice().reverse().map(y=>`<details class="journey-timeline"><summary>${y.year}<span>${y.count} 篇 · ${num(y.words)} 字词</span></summary><ul>${s.posts.filter(p=>p.date.startsWith(String(y.year))).slice().reverse().map(p=>`<li><time datetime="${p.date}">${p.date.slice(5)}</time>${link(p)}</li>`).join('')||'<li>这一年暂时没有公开文章。</li>'}</ul></details>`).join(''))}
  <details class="journey-method"><summary>这些数字是怎样算出来的？</summary><p>统计对象是已发布、发布日期不晚于构建时间的文章，不含独立页面、草稿和影视长评。字词量为汉字逐字计数与其他语言的词数之和，去掉 HTML 标签、代码块、行内代码、脚本与样式；不等同于字节数。阅读时间按每分钟 400 字词估算。图片统计为正文图片引用次数，重复图片也计数。</p><p>日历、连续记录与星期均按 ${esc(zone)} 的发布日期计算；迁移时保留的日期也会影响分布。分类与标签可重叠，不能相加当作文章总数。这里展示内容记录，不推测访客、阅读量或实际写作耗时。</p><p>每次 Gitea Actions 发布重新统计；每日定时构建也会更新。<a href="/journey-data.json">下载本次统计 JSON</a></p></details>
  <details class="journey-method"><summary>碎碎念统计口径</summary><p>碎碎念统计同样排除未公开和未来时间的记录，按 ${esc(zone)} 归日；字词量采用与文章相同的口径，配图为正文图片与配图库的引用次数，头像不计入。同一图片重复使用会重复计数；文章和碎碎念的数量、字词及活跃日期各自统计。</p></details>
  <script type="application/json" id="journey-post-data">${JSON.stringify(s.posts.map(({title,url,date})=>({title,url,date}))).replace(/</g,'\\u003c')}</script><script type="application/json" id="journey-moment-data">${JSON.stringify(ms.posts.map(({title,url,date})=>({title,url,date}))).replace(/</g,'\\u003c')}</script></div>`;
  const snapshot=JSON.parse(fs.readFileSync(path.join(hexo.source_dir,'_data/github-projects.json'),'utf8'));
  if(!validSnapshot(snapshot)) throw new Error('Invalid GitHub snapshot');
  const fetched=snapshot.fetchedAt ? new Intl.DateTimeFormat('zh-CN',{timeZone:zone,dateStyle:'medium',timeStyle:'short'}).format(new Date(snapshot.fetchedAt)) : '尚未同步，请配置 githubOwner 并运行 npm run refresh:projects';
  const stale=now-new Date(snapshot.fetchedAt)>48*3600000;
  const projects=`<div class="life-projects"><header class="life-intro"><span class="life-kicker">MADE WITH CURIOSITY</span><h2>一些动手做出来的小东西。</h2><p>从一个念头开始，慢慢变成可以分享的东西。这里是我的 GitHub 项目一览。</p></header><div class="project-snapshot"><span>公开原创仓库 TOP ${snapshot.projects.length}</span><small>最近同步：${fetched} · ${esc(zone)}${stale&&snapshot.fetchedAt?' · 当前使用保留快照':''}</small></div><div class="life-project-grid">${snapshot.projects.map((r,i)=>`<article class="life-project"><div class="project-top"><span>${String(i+1).padStart(2,'0')}</span><small>★ ${num(r.stars)} · Fork ${num(r.forks)}</small></div><h3><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)} ↗</a></h3><p>${esc(r.description||'还没有写下介绍，去仓库看看吧。')}</p><div class="project-topics">${r.topics.slice(0,3).map(t=>`<span>${esc(t)}</span>`).join('')}</div><footer><span>${esc(r.language||'未标注语言')}${r.license?' · '+esc(r.license):''}${r.archived?' · 已归档':''}</span><small>代码更新 ${r.pushedAt.slice(0,10)}</small></footer></article>`).join('')}</div><details class="journey-method"><summary>自动刷新与排序规则</summary><p>从 GitHub 分页读取 ${esc(owner)} 的公开、非 Fork 仓库，按 Star 数降序排列；并列时优先最近推送，再按名称排序，取前 10 个。已归档仓库保留并标注；公开不等于具备开源许可证，请以各仓库为准。</p><p>部署工作流可在每次发布及每日北京时间 06:20 自动刷新。GitHub 暂时不可用时保留最近成功快照，并显示真实同步时间。代码更新日期按 UTC 显示。</p></details><a class="j-button" href="https://github.com/${esc(owner)}?tab=repositories" target="_blank" rel="noopener">逛逛全部 ${snapshot.totalOriginal} 个原创仓库 ↗</a></div>`;
  pageContent.journey=content;pageContent.projects=projects;
  return [
    {path:'journey-data.json',data:JSON.stringify({generatedAt:now.toISOString(),timezone:zone,...s,moments:{count:moments.length,totalWords:ms.totalWords,images:ms.images,musicCount,activeDays:ms.activeDays,longestStreak:ms.longestStreak,streakEnd:ms.streakEnd,first:ms.first,latest:ms.latest,years:ms.years,entries:ms.posts},media:{count:media.length,rated:rated.length,mean:mean==='—'?null:Number(mean)},bangumi:Object.fromEntries(bangumiCounts)})},
    {path:'github-projects.json',data:JSON.stringify(snapshot)}
  ];
});
