'use strict';
const { stripHTML, unescapeHTML } = require('hexo-util');
const dayNumber = date => Date.parse(date+'T00:00:00Z') / 86400000;
function measure(html) {
  const clean = String(html || '').replace(/<(pre|code|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ');
  const text = unescapeHTML(stripHTML(clean.replace(/<[^>]*>/g,' ')));
  const han = (text.match(/\p{Script=Han}/gu)||[]).length;
  const words = (text.replace(/\p{Script=Han}/gu,' ').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)||[]).length;
  return { words:han+words, images:(clean.match(/<img\b/gi)||[]).length };
}
function aggregate(posts, today) {
  const sorted=posts.slice().sort((a,b)=>a.date.localeCompare(b.date)||(a.timestamp??0)-(b.timestamp??0)||a.url.localeCompare(b.url));
  const days=Object.create(null), months=Object.create(null), tags=Object.create(null), categories=Object.create(null), weekdays=Array(7).fill(0), lengths=Array(4).fill(0);
  for(const p of sorted){
    (days[p.date] ||= []).push(p);months[p.date.slice(0,7)]=(months[p.date.slice(0,7)]||0)+1;
    [...new Set(p.tags)].forEach(t=>tags[t]=(tags[t]||0)+1);
    [...new Set(p.categories)].forEach(t=>categories[t]=(categories[t]||0)+1);
    weekdays[(new Date(p.date+'T00:00:00Z').getUTCDay()+6)%7]++;
    lengths[p.words<800?0:p.words<2000?1:p.words<5000?2:3]++;
  }
  const dates=Object.keys(days);let streak=0,longestStreak=0,previous=-Infinity,streakEnd='';
  for(const date of dates){const day=dayNumber(date);streak=day===previous+1?streak+1:1;if(streak>longestStreak){longestStreak=streak;streakEnd=date;}previous=day;}
  const years=[];
  if(sorted.length) for(let y=Number(sorted[0].date.slice(0,4));y<=Number(today.slice(0,4));y++){const entries=sorted.filter(p=>p.date.startsWith(String(y)));years.push({year:y,count:entries.length,words:entries.reduce((n,p)=>n+p.words,0)});}
  const rank = obj => Object.entries(obj).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-CN'));
  const totalWords=sorted.reduce((n,p)=>n+p.words,0);
  return {posts:sorted,days,years,weekdays,lengths,tags:rank(tags),categories:rank(categories),months:rank(months),totalWords,images:sorted.reduce((n,p)=>n+p.images,0),activeDays:dates.length,spanDays:sorted.length?Math.max(1,dayNumber(today)-dayNumber(sorted[0].date)+1):0,longestStreak,streakEnd,first:sorted[0]||null,latest:sorted.at(-1)||null,longest:sorted.slice().sort((a,b)=>b.words-a.words||a.date.localeCompare(b.date))[0]||null,median:sorted.length?(()=>{const w=sorted.map(p=>p.words).sort((a,b)=>a-b);const i=Math.floor(w.length/2);return w.length%2?w[i]:(w[i-1]+w[i])/2;})():0};
}
function momentRecords(entries, renderMarkdown) {
  return entries.map(entry=>{
    const html=renderMarkdown(entry.body),measured=measure(html);
    const excerpt=unescapeHTML(stripHTML(html)).replace(/\s+/g,' ').trim();
    return {title:excerpt?excerpt.slice(0,64)+(excerpt.length>64?'…':''):(entry.images.length?'一组日常配图':'一段日子的配乐'),
      url:'/moments/#'+encodeURIComponent(entry.id),date:entry.displayDate.slice(0,10),timestamp:entry.timestamp,
      words:measured.words,images:measured.images+entry.images.length,tags:[],categories:[]};
  });
}
module.exports={measure,aggregate,momentRecords};
