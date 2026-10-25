# 建站规范

> 这份文件是本站规则的**唯一真相源**。要改规则就改这里并提交，别只写在某台电脑的本地记忆里 ——
> 否则换一台设备就等于没写。
>
> 自动校验，改完跑一次：`node tools/check.mjs`

## 一句话

纯静态的高中数学动态演示站，托管在 GitHub Pages。没有后端、没有构建步骤、不需要安装任何依赖。

- 线上：https://lagrange2233.github.io/
- 仓库：https://github.com/lagrange2233/lagrange2233.github.io （仓库根 = 本目录）

## 目录

```
index.html              首页：卡片索引 + 三行筛选 + 搜索
demos.js                演示清单，全站唯一数据源
AGENTS.md               本文件，规则
README.md               给人看的部署与使用说明
.nojekyll               关闭 Jekyll，否则 _template/ 会被吞掉
.gitignore              排除 .workbuddy/ 等工具产生的本地文件
assets/katex/           KaTeX 本地副本（css + js + 20 个 woff2），全站共享
demos/<slug>/index.html 一个演示一个文件夹，入口统一叫 index.html
_template/index.html    新演示模板，复制改名即可开始
tools/check.mjs         站点自检脚本
tools/extract-katex.py  从离线单文件版里重抽 KaTeX（升级时用）
```

## 硬规则

1. **全站只用相对路径。** 禁止 `/assets/...` 这种以斜杠开头的写法，也禁止任何 `https://` 外部资源。
   理由是站点将来可能从域名根路径迁到子路径或自定义域名，绝对路径会一次性全废。
2. **一个演示 = `demos/<slug>/index.html`**，从 `_template/` 复制出来改。
   `slug` 用小写字母、数字、连字符。
3. **`demos.js` 是唯一数据源。** 首页卡片、筛选、搜索全部从它渲染，不要直接在 HTML 里写死卡片。
4. **三类标签必填：`topic` 知识点 / `grade` 年级 / `book` 课本。**
   缺任何一个，这条演示在筛选里就会"失踪"。这是最容易漏的一条。
5. **KaTeX 只有一份**，在 `assets/katex/`。页面里写 `$...$`（行内）或 `$$...$$`（独立成行），
   由 `auto-render.min.js` 自动排版。不要引 CDN。
6. **单页控制在 80KB 以内**（目标 ~50KB）。大图、GIF、视频一律不进站点，只放 README 做预览。
7. **中文排版用「」和全角标点**，公式交给 KaTeX。
8. 演示页顶部必须有返回首页的链接：`<a href="../../index.html">`（`../../` 也行）。
9. `.nojekyll` 不能删。删了之后 Pages 会用 Jekyll 构建，下划线开头的目录直接消失。
10. 类名 `empty` 已被首页的空状态容器占用（`display:none`），筛选按钮的禁用态用 `dim`。

## 新增一个演示

```bash
cd site
git pull                      # 开工前先同步，多设备改同一个仓库时尤其重要
cp -r _template demos/我的演示
# ① 改 demos/我的演示/index.html 的 <title>、<h1>、导语
# ② 重写 draw() 里的绘制逻辑
# ③ 在 demos.js 里加一条记录，topic / grade / book 三项必须填
node tools/check.mjs          # 通过再提交
git add -A && git commit -m "add: 我的演示"
git push                      # 约 20~30 秒后线上生效
```

模板文件顶部有 ① ② ③ 四步清单，照着走不会漏。

## 三类标签取值参考

取值是自由的，新写的值会自动出现在筛选条里，不用改代码。以下是已经用过的组合，优先复用：

| 知识点 | 常见年级 | 课本 |
|---|---|---|
| 解析几何（直线与圆、圆锥曲线） | 高二 / 高三 | 选择性必修一 |
| 函数与导数 | 高三 | 选择性必修二 |
| 立体几何 | 高一 | 必修二 |
| 概率统计 | 高二 | 必修二 |

同一类内容尽量用**同一个字符串**（别一会儿"解析几何"一会儿"平面解析几何"），否则筛选条会分裂成两行。

## 校验脚本查什么

`node tools/check.mjs`：

- `demos.js` 能否解析，结构是否完整
- 每条记录的三类标签是否齐全、`path` 是否与 `slug` 对应
- `demos/<slug>/index.html` 是否真的存在（防卡片点进去 404）
- `demos/` 下有没有"孤儿演示"（有目录但没登记进 `demos.js`）
- 所有页面里有没有外部资源引用、有没有绝对路径
- 演示页体积是否超标、是否漏了返回首页链接
- `_template` 有没有被误登记成正式演示

有**错误**时退出码为 1，只有**提醒**时为 0。想强制拦截，装个 pre-commit 钩子：

```bash
printf '#!/bin/sh\nnode tools/check.mjs || exit 1\n' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

钩子不进仓库，每台设备要单独装一次。

## 已知的坑

- **绝对路径在本机是能跑的**，甚至换到自定义域名也正常（因为站点在根路径）。它坏在"迁到子路径"那一刻。
  所以规则不看当前是否生效，只看将来会不会坏。
- **Pages 有边缘缓存**，改完看不到先 `Ctrl+F5`，别急着怀疑代码。
- **`github.com` 偶尔连不上**，但 `api.github.com` 和站点本身通常正常。等几分钟再 push，
  不要为此改用 force push 或重建仓库。
- **新设备首次 push** 会弹一次浏览器授权，凭据存进 Windows 凭据管理器，之后静默。凭据不要写进仓库。
