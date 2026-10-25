#!/usr/bin/env node
/*
 * 站点自检 —— 把 AGENTS.md 里的规则变成可执行的检查。
 *
 *   node tools/check.mjs
 *
 * 退出码：0 = 通过（可能带提醒），1 = 有错误。
 * 零依赖，Node 18+ 即可。
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COLOR = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const paint = (code) => (s) => (COLOR ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const red = paint("31");
const green = paint("32");
const yellow = paint("33");
const dim = paint("2");
const bold = paint("1");

const problems = [];
const notes = [];
const blocks = [];
let data = null;
let pageCount = 0;

const at = (...p) => path.join(ROOT, ...p);
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const has = (p) => fs.existsSync(p);
const read = (p) => fs.readFileSync(p, "utf8");

function block(name) {
  const b = { name, msgs: [], summary: "" };
  blocks.push(b);
  return {
    fail(m) {
      b.msgs.push({ level: "error", text: m });
      problems.push(`${name} · ${m}`);
    },
    warn(m) {
      b.msgs.push({ level: "warn", text: m });
      notes.push(`${name} · ${m}`);
    },
    done(summary) {
      b.summary = summary;
    },
  };
}

/* ---------------- 1. 基础文件 ---------------- */
{
  const b = block("基础文件");
  for (const f of ["index.html", "demos.js", "AGENTS.md", "README.md", "assets/katex/katex.min.js", "assets/katex/katex.min.css"]) {
    if (!has(at(f))) b.fail(`缺少 ${f}`);
  }
  if (!has(at(".nojekyll"))) b.warn("缺少 .nojekyll，GitHub Pages 会走 Jekyll 构建，_template/ 会被忽略");
  b.done("入口、数据源、KaTeX 齐全");
}

/* ---------------- 2. demos.js ---------------- */
{
  const b = block("demos.js");
  try {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(read(at("demos.js")), sandbox, { filename: "demos.js", timeout: 3000 });
    data = sandbox.window.DEMOS;
  } catch (e) {
    b.fail("解析失败：" + e.message);
  }

  if (data) {
    if (!data.site || !String(data.site.title || "").trim()) b.fail("site.title 为空，首页没有站名");
    if (!String((data.site || {}).repo || "").trim()) b.warn("site.repo 为空，页脚不会出现源码链接");

    if (!Array.isArray(data.demos) || data.demos.length === 0) {
      b.fail("demos 数组为空");
    } else {
      const seen = new Map();
      const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      const GRADES = ["高一", "高二", "高三"];

      data.demos.forEach((d, i) => {
        if (!d || typeof d !== "object") {
          b.fail(`第 ${i + 1} 条不是对象`);
          return;
        }
        const who = d.slug ? d.slug : `第${i + 1}条`;

        if (!d.slug) b.fail(`[${who}] 缺少 slug`);
        else if (!SLUG.test(d.slug)) b.fail(`[${who}] slug 只能用小写字母、数字、连字符`);
        else if (d.slug === "_template") b.fail("模板不是正式演示，不要登记进 demos.js");

        if (!String(d.title || "").trim()) b.fail(`[${who}] 缺少标题 title`);

        for (const [k, label] of [["topic", "知识点"], ["grade", "年级"], ["book", "课本"]]) {
          if (typeof d[k] !== "string" || !d[k].trim()) {
            b.fail(`[${who}] 缺少${label}标签 ${k}（索引页三行筛选要靠它，漏了这条演示会在筛选里失踪）`);
          }
        }

        if (d.slug && d.path !== `demos/${d.slug}/`) {
          b.fail(`[${who}] path 应为 "demos/${d.slug}/"，实际是 ${JSON.stringify(d.path)}`);
        }
        if (d.path && !String(d.path).endsWith("/")) b.fail(`[${who}] path 必须以 / 结尾`);

        if (d.slug && !has(at("demos", String(d.slug), "index.html"))) {
          b.fail(`[${who}] 找不到 demos/${d.slug}/index.html（首页卡片点进去会 404）`);
        }

        for (const key of [d.slug, d.path]) {
          if (!key) continue;
          if (seen.has(key)) b.fail(`[${who}] 与第 ${seen.get(key) + 1} 条重复：${key}`);
          else seen.set(key, i);
        }

        if (d.level !== undefined && ![1, 2, 3].includes(d.level)) {
          b.warn(`[${who}] level 应为 1~3，实际 ${JSON.stringify(d.level)}`);
        }
        if (d.tags !== undefined && !Array.isArray(d.tags)) b.warn(`[${who}] tags 应为数组`);
        if (d.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(d.date))) {
          b.warn(`[${who}] date 应写成 YYYY-MM-DD，实际 ${JSON.stringify(d.date)}`);
        }
        if (d.grade && !GRADES.includes(d.grade)) {
          b.warn(`[${who}] 年级「${d.grade}」不在高一/高二/高三里，筛选行会排得不好看`);
        }
      });

      b.done(`${data.demos.length} 条演示`);
    }
  }
}

/* ---------------- 3. 页面 ---------------- */
let demoDirs = [];
{
  const b = block("页面");
  if (has(at("demos"))) {
    demoDirs = fs
      .readdirSync(at("demos"), { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name);
  }

  const pages = [];
  if (has(at("index.html"))) pages.push(at("index.html"));
  for (const d of demoDirs) {
    const f = at("demos", d, "index.html");
    if (has(f)) pages.push(f);
  }
  if (has(at("_template", "index.html"))) pages.push(at("_template", "index.html"));
  pageCount = pages.length;

  for (const f of pages) {
    const name = rel(f);
    const src = read(f);
    const assets = [];
    const add = (kind, url) => {
      if (url) assets.push({ kind, url });
    };

    for (const m of src.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) add("脚本", m[1]);
    for (const m of src.matchAll(/<link\b[^>]*>/gi)) {
      if (!/\brel\s*=\s*["']?stylesheet/i.test(m[0])) continue;
      const h = m[0].match(/\bhref\s*=\s*["']([^"']+)["']/i);
      if (h) add("样式", h[1]);
    }
    for (const m of src.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) add("图片", m[1]);
    for (const m of src.matchAll(/@import\s+(?:url\(\s*)?["']?([^"'\s);]+)/gi)) add("样式", m[1]);

    for (const { kind, url } of assets) {
      if (/^(?:data:|blob:|#)/i.test(url)) continue;
      if (/^(?:https?:)?\/\//i.test(url)) {
        b.fail(`${name} 的${kind}引用了外部地址 ${url}（站内禁止 CDN / 外链资源）`);
      } else if (url.startsWith("/")) {
        b.fail(`${name} 的${kind}用了绝对路径 ${url}（必须用相对路径）`);
      } else if (!has(path.resolve(path.dirname(f), url.split(/[?#]/)[0]))) {
        b.warn(`${name} 引用的 ${url} 在本机找不到，可能是断链`);
      }
    }

    for (const m of src.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
      const u = m[1];
      if (u.startsWith("/") && !u.startsWith("//")) {
        b.fail(`${name} 里有以 / 开头的站内链接 ${u}（必须用相对路径）`);
      }
    }

    const size = fs.statSync(f).size;
    if (size > 80 * 1024) b.warn(`${name} 体积 ${Math.round(size / 1024)}KB，超过 80KB 建议值`);

    if (name.startsWith("demos/")) {
      if (!/href\s*=\s*["']\.\.\/\.\.\/(?:index\.html)?["']/.test(src)) {
        b.fail(`${name} 缺少返回首页的链接（应写 href="../../index.html"）`);
      }
      if (!/<title>\s*\S[\s\S]*?<\/title>/i.test(src)) b.warn(`${name} 的 <title> 为空`);
    }
    if (name === "index.html" && !/<title>\s*\S[\s\S]*?<\/title>/i.test(src)) {
      b.warn("index.html 的 <title> 为空");
    }
  }

  b.done(`${pages.length} 个页面`);
}

/* ---------------- 4. 一致性 ---------------- */
{
  const b = block("一致性");
  const declared = new Set(data && Array.isArray(data.demos) ? data.demos.map((d) => d && d.slug) : []);

  for (const d of demoDirs) {
    if (d.startsWith("_")) continue;
    if (!has(at("demos", d, "index.html"))) {
      b.warn(`demos/${d}/ 里没有 index.html`);
      continue;
    }
    if (!declared.has(d)) {
      b.fail(`demos/${d}/ 有页面但没登记进 demos.js，首页不会出现这个演示`);
    }
  }

  const books = new Set();
  const topics = new Set();
  if (data && Array.isArray(data.demos)) {
    for (const d of data.demos) {
      if (d && d.topic) topics.add(d.topic);
      if (d && d.book) books.add(d.book);
    }
  }
  b.done(`孤儿检查 ${demoDirs.length} 个目录 · ${topics.size} 个知识点 / ${books.size} 本教材`);
}

/* ---------------- 输出 ---------------- */
const width = (s) =>
  [...String(s)].reduce((w, ch) => w + (/[\u2e80-\u9fff\uff00-\uffef]/.test(ch) ? 2 : 1), 0);
const padEndW = (s, n) => String(s) + " ".repeat(Math.max(0, n - width(s)));

console.log("");
console.log(bold("站点自检") + dim(`   ${data && data.demos ? data.demos.length : 0} 个演示 / ${pageCount} 个页面`));
console.log(dim("─".repeat(58)));

for (const b of blocks) {
  const bad = b.msgs.some((m) => m.level === "error");
  const mark = bad ? red("✗") : b.msgs.length ? yellow("!") : green("✓");
  console.log(`${mark} ${padEndW(b.name, 12)}${dim(b.summary)}`);
  for (const m of b.msgs) {
    console.log(`   ${m.level === "error" ? red("•") : yellow("•")} ${m.text}`);
  }
}

console.log(dim("─".repeat(58)));

if (problems.length) {
  console.log(red(`✗ ${problems.length} 个错误`) + (notes.length ? dim(`，${notes.length} 个提醒`) : ""));
  console.log(dim("  规则见 AGENTS.md，修完再跑一次。"));
  process.exit(1);
}

console.log(green("✓ 全部通过") + (notes.length ? dim(`，${notes.length} 个提醒`) : ""));
