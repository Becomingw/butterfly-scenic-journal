# 配置指南

## 基础与文章

修改 `_config.yml` 的 `url`、`title`、`author`、`timezone`；导航、社交链接、头像和文章版权在 `_config.butterfly.yml`。默认 Apache-2.0 仅适用于模板示例；你可以给自己的文章选择其他许可证。

新文章放入 `source/_posts/`，使用 YAML front matter。发布日期决定日历统计；草稿和未来文章不在当前统计中。至少保留一篇已发布文章再运行发行检查。配置使用根路径 URL；暂不支持子目录部署。

默认山景 `source/img/journal-landscape.webp` 使用 Becomingw Blog 同款图片，[来源记录](ASSETS.md)。`source/img/landscape.svg` 保留 v1.0.0 的原创替代图，两者不再是同一张图。可替换默认图片并保留文件名；头像为 `avatar.svg`。文章 front matter 的 `cover` 可覆盖单篇文章封面，后台也可直接选择图片。

## 影视手记

每部作品一个 `content/media/*.md`。参考虚构示例：`title` 必填，评分范围 0–5、步长 0.5，`published: false` 不发布。长评在正文中，初始折叠。图片可用站内路径或 HTTPS。后台与 Markdown 采用同一数据结构。

## 碎碎念

碎碎念放在 `content/moments/*.md`，前台入口为“更多 → 碎碎念”。日期使用带时区的 ISO 字符串；`published: false` 保存为不公开记录。完整字段和示例见 [MOMENTS.md](MOMENTS.md)。

## GitHub 项目

1. 在 `journal.config.json` 设置 `githubOwner`。
2. 运行 `npm run refresh:projects`，首次配置须成功访问 API，再构建。
3. 提交 `source/_data/github-projects.json` 作为离线快照。

默认匿名访问 API；可在构建环境设置 `GITHUB_TOKEN` 提高配额，不能写入配置或源代码。只取 owner 匹配的公开、非 Fork 仓库。按 Star 降序、最近推送、名称排序，最多十个，零仓库亦有效。公开不代表有开源许可证。

网络失败不会把部分分页结果当作新数据。设置 `PROJECTS_CACHE` 指向上次成功部署的 `github-projects.json`，可保留比 Git 中更新的快照；校验用户名，避免换用户后展示旧账号数据。首次换用户若 API 失败，先解决访问问题，不伪造同步成功。

## 音乐

默认读取本站 `source/music-playlist.json`，空列表不请求音乐服务。填入你有权播放的文件：

```json
[
  {
    "name": "My recording",
    "artist": "Your Name",
    "url": "/audio/my-recording.mp3",
    "cover": "/img/avatar.svg"
  }
]
```

将音频放入 `source/audio/`。也可把 `journal.config.json` 的 `music.playlistUrl` 设置为自有或获授权的兼容 JSON API（例如完整 Meting playlist URL）。它必须支持浏览器 CORS，并返回数组；音源支持 HTTPS 或本站绝对路径。配置是公开的，不放 API 密钥。页面自动加载列表，但音频必须点击才播放；PJAX 导航保留播放器。受音源授权、地区和服务可用性影响。

## Decap 后台（可选）

`/admin/` 提供文章、影视手记和碎碎念三类编辑器，包含评分、海报、文章封面、多图与 Markdown 预览。集合导航在登录后显示，仓库写权限决定谁能保存。首次运行必须配置自己的身份认证，模板占位值不能登录。

1. 在 Gitea 建博客源码仓库，并给编辑者写权限。
2. 注册 OAuth2 应用（公开客户端 / PKCE），回调 URI 为 `https://你的博客域名/admin/`。
3. 编辑 `source/admin/config.yml` 的 `repo`、`branch`、`app_id`、`api_root`、`base_url` 和 `site_url`。`app_id` 是公开客户端标识，不是 secret。
4. 让 Gitea 正确允许博客域名的 OAuth/API 请求，并配置部署流水线。
5. 登录后新建一篇测试草稿，再发布，确认提交与 Actions 构建。不同 Gitea 版本/代理的 CORS 设置需在实际部署验证。

也可按 Decap 文档切换 GitHub 等 backend 并自行配置相应 OAuth 服务。无需后台时仍可直接使用 Git 和 Markdown。评论默认关闭，可日后自行接入。

## 统计口径

数据在构建时从公开文章和碎碎念分别生成。汉字逐字计数，其他语言按词计数，排除代码、脚本、样式；图片为引用次数。日期按站点时区；连续发布按日去重。碎碎念使用原始发布时间，不统计后台备注或头像；草稿和未来记录不计入。日历可切换文章/碎碎念，点击日期列出对应记录。标签/分类可重叠。完整定义在文章历程页展开可见，原始数据为 `/journey-data.json`，碎碎念位于 `moments` 字段。

追番页目前是零记录占位，可自行维护 `source/bangumis/index.md`。统计读取 `想看 (N)`、`在看 (N)`、`已看 (N)`；不内置个人账号同步器。
