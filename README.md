# 高中数学 · 动态演示

用纯静态页面托管的高中数学可交互演示站，部署在 GitHub Pages，长期使用 `https://<用户名>.github.io/<仓库名>/` 地址。

## 目录结构

```
site/                     ← 这个目录就是网站根目录（也是 git 仓库根目录）
├── index.html            首页：卡片索引 + 专题筛选 + 搜索
├── demos.js              演示清单（全站唯一数据源，加演示只改这里）
├── .nojekyll             关闭 Jekyll，否则 _template/ 这类下划线目录会被吞掉
├── assets/katex/         KaTeX 本地副本：css + js + 20 个 woff2 字体
├── demos/
│   └── circle-3points/   一个演示一个文件夹，入口统一叫 index.html
├── _template/            新演示模板，复制改名即可开始
└── tools/extract-katex.py  从离线单文件版里抽取 KaTeX 资源（升级/替换时用）
```

## 本地预览

不要直接双击 `index.html`（部分浏览器对本地文件有额外限制）。在 `site` 目录起一个静态服务：

```bash
cd site
python -m http.server 8080
```

然后访问 http://localhost:8080 。

## 首次部署到 GitHub Pages

1. 在 GitHub 新建一个**公开**仓库（免费账号只有 public 仓库能开 Pages），名字例如 `math-demos`。
2. 在 `site` 目录初始化并推送：

```bash
cd site
git init
git add .
git commit -m "init: 演示站骨架"
git branch -M main
git remote add origin https://github.com/<用户名>/math-demos.git
git push -u origin main
```

3. 仓库 → **Settings → Pages** → Source 选 `Deploy from a branch` → Branch 选 `main`，目录选 `/(root)` → Save。
4. 等 1 分钟左右，访问 `https://<用户名>.github.io/math-demos/`。
   若仓库名正好是 `<用户名>.github.io`，则站点在根路径 `https://<用户名>.github.io/`。
   两种情况下相对路径都有效，不用改代码。

以后更新：

```bash
git add . && git commit -m "add: 新演示 xxx" && git push
```

约 1 分钟内自动生效；如果没变化，先 `Ctrl+F5` 强制刷新。

## 新增一个演示

1. 复制模板：`cp -r _template demos/我的演示slug`
2. 打开 `demos/我的演示slug/index.html`，改标题、导语、`draw()` 里的绘制逻辑。
   文件内用 `① ② ③` 标出了需要修改的几处。
3. 打开 `demos.js`，在 `demos` 数组里加一条记录（复制现有那条改字段）。
4. 本地起服务看一眼，然后 commit + push。
5. 删掉模板里的示例内容前，先确认新页面路径是 `demos/<slug>/index.html`——首页卡片就是靠这个路径跳转的。

## 关于 KaTeX

- 全站共用 `assets/katex/` 一份副本，浏览器只下载并缓存一次，之后每个演示页几乎零额外开销。
- 页面里写 `$...$`（行内）或 `$$...$$`（独立成行）即可，由 `auto-render.min.js` 自动排版。
- 字体是独立 woff2 文件（不是 base64 内联），单个字体 5–28 KB，按需加载，首屏很快。
- 想升级 KaTeX：把官方 `dist/` 里的 `katex.min.css`、`katex.min.js`、`contrib/auto-render.min.js` 和 `fonts/` 整体覆盖到 `assets/katex/` 即可（同理，`tools/extract-katex.py` 可以从离线单文件版里重新抽取一份）。

## 以后要换域名 / 加速时

现在用的是 `github.io` 默认域名，国内（尤其学校网络）可能偏慢。等确定要换，按这个顺序做，改动很小：

1. 申请国内域名 → 在域名商解析里加一条 CNAME 指向 `<用户名>.github.io`（`github.io` 本身不需要备案）。
2. 仓库 Settings → Pages → Custom domain 填上域名，勾选 Enforce HTTPS（证书由 GitHub 自动签发，等几分钟）。
3. 如果大陆访问仍然吃力：把域名接到 Cloudflare（免费），开代理（小云朵），源站仍指向 GitHub Pages；国内访问会有明显改善。
4. 追求国内秒开才需要考虑备案 + 国内节点（EdgeOne Pages / 腾讯云 COS），那是另一条路，前面三步不用返工。

因为站内所有链接、脚本、样式都用相对路径，换域名不需要改一行代码。
