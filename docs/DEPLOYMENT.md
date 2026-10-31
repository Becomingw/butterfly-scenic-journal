# 部署

产物为 `public/`，可交给 Nginx、Caddy、对象存储静态站点或 Pages。运行顺序：

```sh
npm ci
npm run refresh:projects
npm run build
npm run check
```

默认 CI 只验证，不发布网站。自定义域名需要在 `_config.yml` 设置正确 `url`；当前版本仅支持域名根路径。静态服务器应返回正常 404，而不是把所有未知路径改写为首页。

## Gitea Actions

将 `examples/gitea-deploy.yml` 复制到 `.gitea/workflows/deploy.yml`，修改站点挂载目录。Runner 需提供 Docker，并明确允许该目录的 volume 挂载。不要挂入源码所在目录作为发布目标；示例会替换目标目录中的静态文件。

它在 main 推送、手动触发和每天 **22:20 UTC / 北京时间 06:20** 构建。直接从 Gitea 获取指定 SHA，避免依赖 GitHub checkout action 下载；认证仅在该次 fetch 内传入。刷新失败优先读取已部署快照。若尚未配置用户名，刷新命令会提示并跳过。

构建和检查完成后才替换站点文件。示例使用复制发布，复制期间不保证原子切换；如需零停机，按自己的服务器结构扩展为版本目录 + 原子 symlink 切换。部署目录不可放数据库、上传原件或其他应用数据。

可把可选 GitHub API token 注入构建步骤的 `GITHUB_TOKEN`。Gitea 内置 token 不能当作 GitHub token 使用。不要把凭据硬编码到仓库。

## GitHub Pages / 其他托管

使用平台官方静态产物发布流程即可；本站仓库的 `check.yml` 不会自动部署。GitHub Pages 请选择用户根站点或自定义域名，不要直接使用项目子路径。给自动发布工作流加入 schedule，文章历程才会在没有新文章时每天更新日期跨度。

## 离线与外部服务

首装需要 npm。正文、目录、统计和影评在构建后是静态页面；Butterfly 的部分 JS/CSS 默认从版本化 CDN 加载，CMS 也从 CDN 加载，浏览器完全离线并非本发行版保证。音乐、GitHub 刷新、CMS 登录是独立的可选网络功能。
