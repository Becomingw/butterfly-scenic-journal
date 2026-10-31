'use strict';
// Run on every deployment and daily in Gitea Actions. Never expose an API token.
const fs = require('node:fs');
const path = require('node:path');
const owner = require('../journal.config.json').githubOwner;
if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(owner)) throw new Error('Invalid githubOwner in journal.config.json');
const defaultOutput = path.resolve(__dirname, '../source/_data/github-projects.json');

function selectProjects(repos) {
  return repos.filter(r => !r.fork && !r.private && r.owner?.login?.toLowerCase() === owner.toLowerCase())
    .sort((a,b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at) || a.name.localeCompare(b.name))
    .slice(0,10).map(r => ({ name:r.name, url:r.html_url, description:r.description || '', language:r.language || '', stars:r.stargazers_count, forks:r.forks_count, pushedAt:r.pushed_at, archived:r.archived, license:r.license?.spdx_id === 'NOASSERTION' ? '' : r.license?.spdx_id || '', topics:r.topics || [] }));
}
function validSnapshot(data) {
  return data?.owner === owner && Array.isArray(data.projects) && data.projects.length <= 10 && Number.isInteger(data.totalOriginal) && data.totalOriginal >= data.projects.length && (Number.isFinite(Date.parse(data.fetchedAt)) || (data.fetchedAt === null && data.totalOriginal === 0 && data.projects.length === 0)) && data.projects.every(r => typeof r.name === 'string' && r.url === `https://github.com/${owner}/${r.name}` && Number.isFinite(r.stars) && Number.isFinite(r.forks) && typeof r.pushedAt === 'string' && Number.isFinite(Date.parse(r.pushedAt)) && Array.isArray(r.topics));
}
async function refresh({output=defaultOutput,cache=process.env.PROJECTS_CACHE,request=fetch}={}) {
  try {
    const repos = [];
    for(let page=1;page<=30;page++) {
      const headers = { Accept:'application/vnd.github+json', 'User-Agent':'scenic-journal', 'X-GitHub-Api-Version':'2022-11-28' };
      if(process.env.GITHUB_TOKEN) headers.Authorization=`Bearer ${process.env.GITHUB_TOKEN}`;
      const response = await request(`https://api.github.com/users/${owner}/repos?type=owner&sort=full_name&per_page=100&page=${page}`, {headers,signal:AbortSignal.timeout(20000)});
      if(!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
      const batch = await response.json();
      if(!Array.isArray(batch)) throw new Error('Invalid GitHub response');
      repos.push(...batch);
      if(batch.length<100) break;
      if(page===30) throw new Error('Pagination exceeded; keeping complete previous snapshot');
    }
    const data = { owner, fetchedAt:new Date().toISOString(), totalOriginal:repos.filter(r=>!r.fork&&!r.private&&r.owner?.login?.toLowerCase()===owner.toLowerCase()).length, projects:selectProjects(repos) };
    if(!validSnapshot(data)) throw new Error('Invalid or empty project snapshot');
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output+'.tmp',JSON.stringify(data,null,2)+'\n');fs.renameSync(output+'.tmp',output);
    console.log(`Updated ${data.projects.length} projects from ${data.totalOriginal} public original repositories.`);
  } catch(error) {
    // The deployed snapshot is newer than the repository seed after scheduled runs.
    const candidates = [cache,output].filter(Boolean).flatMap(file=>{try{const data=JSON.parse(fs.readFileSync(file,'utf8'));return validSnapshot(data)?[data]:[];}catch{return [];}}).sort((a,b)=>String(b.fetchedAt||'').localeCompare(String(a.fetchedAt||'')));
    if(!candidates.length) throw error;
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(candidates[0],null,2)+'\n');
    console.warn(`${error.message}; retained project snapshot from ${candidates[0].fetchedAt}.`);
  }
}
if(require.main===module) {
  if(owner==='your-username') console.log('Set githubOwner in journal.config.json to enable GitHub refresh.');
  else refresh().catch(error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={selectProjects,validSnapshot,refresh,owner};
