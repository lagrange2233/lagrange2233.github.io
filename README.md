# 高中数学 · 动态演示

用纯静态页面托管的高中数学可交互演示站。

- 线上地址：**https://lagrange2233.github.io/**
- 仓库：https://github.com/lagrange2233/lagrange2233.github.io

> 仓库名用的是 `<用户名>.github.io` 这种「用户主页仓库」，所以站点在域名**根路径**下（不是 `/子路径/`）。
> 站内全部使用相对路径，从根路径换成自定义域名不需要改代码。

## 目录结构

```
site/                     ← 这个目录就是网站根目录（也是 git 仓库根目录）
├── index.html            首页：卡片索引 + 三行筛选 + 搜索
├── demos.js              演示清单（全站唯一数据源，加演示只改这里）
├── AGENTS.md             建站规范 —— 规则的唯一真相源，改规则改这里
├── README.md             本文件，讲"怎么做"
├── .nojekyll             关闭 Jekyll，否则 _template/ 这类下划线目录会被吞掉
├── assets/katex/         KaTeX 本地副本：css + js + 20 个 woff2 字体
├── demos/
│   ├── circle-3points/   一个演示一个文件夹，入口统一叫 index.html
│   └── chord-min/
├── _template/            新演示模板，复制改名即可开始
└── tools/
    ├── check.mjs         站点自检（三类标签、断链、外链、体积…）
    └── extract-katex.py  从离线单文件版里抽取 KaTeX 资源（升级/替换时用）
```

## 本地预览

不要直接双击 `index.html`（部分浏览器对本地文件有额外限制）。在 `site` 目录起一个静态服务：

```bash
cd site
python -m http.server 8080
```

然后访问 http://localhost:8080 。

## 部署状态（已完成）

已经推到 `lagrange2233/lagrange2233.github.io`，Pages 从 `main` 分支根目录自动构建，访问 https://lagrange2233.github.io/ 即可。

`<用户名>.github.io` 这类仓库的 Pages 是自动开启的，不需要去 Settings 里点。

以后每次更新只有三行：

```bash
cd site
git add -A && git commit -m "add: 新演示 xxx"
git push
```

约 1 分钟内自动生效；如果没变化，先 `Ctrl+F5` 强制刷新（Pages 边缘缓存有几十秒延迟）。

> 若在新机器上推送，需要先登录一次 GitHub（`git push` 会弹出浏览器授权，凭据会存进 Windows 凭据管理器）。

## 规范与自检

站点的硬性规则全部写在 **[`AGENTS.md`](AGENTS.md)** 里，那是唯一真相源。换设备、换人接手、让 AI 帮忙改，都以那份为准；本文件只讲「怎么做」。

改完东西跑一次自检：

```bash
cd site
node tools/check.mjs
```

它检查：三类标签（知识点 / 年级 / 课本）是否齐全、`demos.js` 与 `demos/` 目录是否对得上、有没有混进 CDN 外链或以 `/` 开头的绝对路径、页面体积是否超标、引用的本地文件是否存在、演示页有没有返回首页的链接。有错误时退出码为 1，只有提醒时为 0。

想让它拦住不合格的提交，装一个本地钩子（钩子不进仓库，每台设备装一次）：

```bash
printf '#!/bin/sh\nnode tools/check.mjs || exit 1\n' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## 新增一个演示

1. 复制模板：`cp -r _template demos/我的演示slug`
2. 打开 `demos/我的演示slug/index.html`，改标题、导语、`draw()` 里的绘制逻辑。
   文件内用 `① ② ③` 标出了需要修改的几处。
3. 打开 `demos.js`，在 `demos` 数组里加一条记录（复制现有那条改字段）。
   **`topic` / `grade` / `book` 三项必须填**，缺一项这条演示就会在筛选里失踪。
4. 跑 `node tools/check.mjs`，通过后再本地起服务看一眼，然后 commit + push。
5. 删掉模板里的示例内容前，先确认新页面路径是 `demos/<slug>/index.html`——首页卡片就是靠这个路径跳转的。

### demos.js 字段

| 字段 | 说明 |
|---|---|
| `topic` | **知识点**，如「解析几何」。首页筛选第一行 |
| `grade` | **年级**，如「高一」「高二」「高三」。首页筛选第二行，按这个顺序排列 |
| `book` | **课本**，如「必修一」「选择性必修二」。首页筛选第三行 |
| `title` / `subtitle` | 卡片标题与导语，都支持 `$...$` |
| `path` | 演示页相对路径，必须以 `/` 结尾 |
| `level` | 难度 1~3，卡片右上角圆点 |
| `tags` | 可选，额外关键词，只参与搜索、不显示为标签 |
| `date` | 上线日期，首页默认按它倒序 |

三类标签的取值是自由的——新写的值会自动出现在筛选条里，不用改代码。筛选是「与」关系：选了「解析几何 + 高二」就只看同时满足的；某个取值在当前条件下没有结果时，按钮会自动变灰不可点。

## 关于 KaTeX

- 全站共用 `assets/katex/` 一份副本，浏览器只下载并缓存一次，之后每个演示页几乎零额外开销。
- 页面里写 `$...$`（行内）或 `$$...$$`（独立成行）即可，由 `auto-render.min.js` 自动排版。
- 字体是独立 woff2 文件（不是 base64 内联），单个字体 5–28 KB，按需加载，首屏很快。
- 想升级 KaTeX：把官方 `dist/` 里的 `katex.min.css`、`katex.min.js`、`contrib/auto-render.min.js` 和 `fonts/` 整体覆盖到 `assets/katex/` 即可（同理，`tools/extract-katex.py` 可以从离线单文件版里重新抽取一份）。

## 以后要换域名 / 加速时

现在用的是 `github.io` 默认域名，国内（尤其学校网络）可能偏慢。等确定要换，按这个顺序做，改动很小：

1. 申请国内域名 → 在域名商解析里加一条 CNAME 指向 `lagrange2233.github.io`（`github.io` 本身不需要备案）。
2. 仓库 Settings → Pages → Custom domain 填上域名，勾选 Enforce HTTPS（证书由 GitHub 自动签发，等几分钟）。
3. 如果大陆访问仍然吃力：把域名接到 Cloudflare（免费），开代理（小云朵），源站仍指向 GitHub Pages；国内访问会有明显改善。
4. 追求国内秒开才需要考虑备案 + 国内节点（EdgeOne Pages / 腾讯云 COS），那是另一条路，前面三步不用返工。

因为站内所有链接、脚本、样式都用相对路径，换域名不需要改一行代码。
