# AWARE 完整原源码包

交付日期：2026-10-09

这是当前 AWARE 平台的完整原源码，不是截图、静态网页或编译后的部署包。源码版本：`841ee45f04d69c393530ef71d54b2106d2c965e5`。

## 已包含

- 学生登录与写作工作区、Source A / B、自动保存、字体与字号编辑。
- 选中文字后启用 Ask AI；三组原有 checkpoint / 直接跳转逻辑。
- 教师端：阅读材料管理、学生材料与组别分配、写作和活动记录查看、导出。
- 页面样式、原 logo 素材、数据库结构与 SQL 迁移文件。
- 项目依赖清单、锁定文件、完整构建与开发配置。
- 最新修改：学生端不再显示组别标签及 “READ · CONSIDER · WRITE”；教师端组别管理和三组配色、交互保持不变。

## 未包含

`node_modules`、编译产物、Git 历史、本地数据库/测试记录、运行缓存、环境密钥、临时发布凭据。解压后需要安装依赖并初始化数据库。

`.openai/hosting.json` 是原项目的非秘密配置文件，保留它是因为 `vite.config.ts` 会读取其中的数据库绑定声明。它不是发布凭据；此包没有自动部署操作。

## 运行环境与 Vercel 说明

当前版本使用 React、Vinext / Vite、Cloudflare Workers 和 Cloudflare D1，并非已经适配完成的标准 Vercel / Next.js 项目。

**不能把这个原源码包当作“导入 Vercel 即可完整运行”的版本。** 后端代码直接引用 `cloudflare:workers`、D1 和 `HTMLRewriter`。若使用 Vercel，需要适配运行环境、数据库访问和 HTML 清理实现，以及构建配置；仅增加 `vercel.json` 不够。本次按要求交付原文件，未擅自替换数据库或重新托管。

## 本地运行

使用 Node.js 22.13.0 或更高版本。在解压后的 `aware-platform` 目录执行：

```sh
npm ci
npm run build
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_broken_flatman.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_same_hercules.sql
npm run dev
```

两条 SQL 命令用于首次初始化空的本地数据库，不应对已有数据反复执行。访问终端显示的本地网址，默认是 `http://127.0.0.1:5173/`。上述步骤只在本地运行，不发布网站。

## 使用边界

原项目保留了已约定的学生/教师测试账户，正式上线前应替换测试凭据、完善账户管理和研究数据治理。

Ask AI 打开 `https://genai.eduhk.hk/`。平台记录自身的按钮点击、checkpoint 和跳转活动，不会读取外部网站的对话或回复。Source A / B 默认是示例材料，应通过教师端更换为正式研究材料。

项目内 `AWARE-NOTES.md` 说明平台功能；原有 `README.md` 主要是底层 starter 的说明，迁移时请以实际源码和本交付说明为准。
