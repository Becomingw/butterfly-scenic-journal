# 冻结与升级

## v1.0.0 冻结什么

- Hexo 7.3.0 / Butterfly 5.7.0。
- `.nvmrc`：Node 22.23.4；CI 容器内 npm 10.9.9。
- Node 镜像摘要：`sha256:18a6d90fd60542269850c80ca03b29b1d9b14d6b221ac7ee8e35b0d33ef904bd`。
- 精确直接依赖和 npm lockfile；用 `npm ci`，不用无审查的 `npm update`。
- Git 标签、发行源码压缩包、SHA-256 清单。

原始设计来自作者博客的 `288ec638ec31658020ef206173ffbb8f7e6deae9` 版本；本仓库是脱敏后的新历史，原始文章、账号数据和图片不包含在发行物中。

冻结是一个可恢复的代码/设计基线。日期统计、GitHub 数据、CDN 服务和音乐权限不是时间快照。若需要像素和内容完全一致，另存构建的 `public/`，并备份可控的外部资源。

## 回滚

```sh
git clone https://github.com/Becomingw/butterfly-scenic-journal.git scenic-recovery
cd scenic-recovery
git checkout v1.0.0
nvm install
nvm use
npm ci
npm run build
npm run check
```

新建恢复目录进行预览，再通过自己的发布流水线部署。对已有博客只回退主题时，先建恢复分支，再选择恢复 `scripts/`、样式和 JS、工具以及依赖文件，逐项合并配置；不要用整个模板的 `source/` 覆盖自己后写的文章。

建议每次发布保存 Git commit、lockfile SHA、Node/npm 版本和 `public/` 压缩包。源代码备份与站点备份各留一份独立副本。

## 升级流程

1. 新建分支，明确升级目标；不要直接变更发行标签。
2. 有选择地更新精确版本及锁文件。检查上游 changelog、许可证和迁移说明。
3. `npm ci && npm run build && npm run check`。
4. 搜索初始化脚本会检查 Butterfly 源码标记；失败时重新审查 `scripts/journal.js`，不要绕过断言。
5. 验证首页、搜索、探索、历程日历、影视折叠、音乐、PJAX、后台预览和手机/暗色布局。
6. 在自己的 staging 站验证 CMS 登录、音源和发布，记录变化并创建新标签。
