# 实习收获簿 · 成长坐标

一个记录实习、学习和求职过程的个人成长工作台。

在线体验：[wanwumty.dpdns.org](https://wanwumty.dpdns.org/)

## 功能

- 实习记录、人脉图谱与计算机基础学习。
- 力扣题目、代码保存、Monaco 代码编辑器与解题笔记。
- 随手记：富文本编辑、图片、表格、自动保存、Markdown / Word 导出和打印为 PDF。
- 面试公司、轮次、结果跟踪与面经收藏。
- 账号密码注册、登录和独立用户数据。

## 技术栈

React 19、TypeScript、Vinext、Vite、Cloudflare Workers、D1、R2、Drizzle ORM。

## 本地开发

需要 Node.js >= 22.13 和 npm。

```sh
npm ci
npm run dev
```

数据库绑定为 `DB`，图片存储绑定为 `BUCKET`。使用本地 Cloudflare 模拟环境前，执行数据库迁移：

```sh
npx wrangler d1 migrations apply site-creator-d1 --local --config wrangler.jsonc
```

```sh
npx tsc --noEmit
npm run build
```

## 部署说明与安全边界

本项目原运行于 Sites。导出的配置不包含原站点标识、真实数据库、图片、账号密码、部署包或 Git 历史。`.openai/hosting.json` 仅保留通用绑定名称。

自行部署需要创建自己的 D1 数据库和 R2 存储桶，在 Vite / Wrangler 配置中填写对应资源，再应用 `drizzle/` 下的迁移。不要连接原站生产资源。独立部署必须使用 HTTPS（会话使用 Secure Cookie）。

原 Sites 的 ChatGPT 登录依赖可信平台注入身份请求头，开源副本默认关闭此路径。只有可信 Sites 入口才可设置 `ENABLE_SITES_AUTH=true`，且必须在公网入口剥离客户端提供的 `oai-authenticated-*` 请求头。`mty` 是原项目保留的管理员账户键；上线前请检查 `lib/account.ts`、`lib/admin.ts` 和注册策略，建立自己的管理员初始化流程。源码公开不等于已经完成面向任意托管环境的安全审计。

不要提交 `.env*`、`.dev.vars*`、`.wrangler/`、数据库导出或用户上传内容。

## 许可

项目自有代码采用 MIT 许可。第三方依赖遵循各自许可；`public/monaco-*-worker.js` 是 Monaco 的构建产物，对应许可保留在 `public/MONACO-LICENSE.txt` 和 `public/TYPESCRIPT-LICENSE.txt`。项目不是 GenOffice 的完整集成或发行版。
