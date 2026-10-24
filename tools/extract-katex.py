import re, os, base64, shutil

SRC = r"C:/Users/Lenovo/WorkBuddy/数学/circle-3-points-demo-offline.html"
OUT = r"C:/Users/Lenovo/WorkBuddy/数学/site/assets/katex"
FONTDIR = os.path.join(OUT, "fonts")
if os.path.isdir(FONTDIR):
    shutil.rmtree(FONTDIR)
os.makedirs(FONTDIR, exist_ok=True)

s = open(SRC, encoding="utf-8").read()

def block(start_tag_regex, tag):
    m = re.search(start_tag_regex, s)
    body_start = s.index(">", m.start()) + 1
    body_end = s.index("</%s>" % tag, body_start)
    return s[body_start:body_end]

css = block(r'<style id="katex-style">', "style")
kjs = block(r'<script id="katex-lib">', "script")
arjs = block(r'<script id="katex-auto-render">', "script")

faces = re.findall(r"@font-face\{[^}]*\}", css)
new_css = css
total = 0
made = []
for face in faces:
    fam = re.search(r'font-family:"?([A-Za-z0-9_]+)"?', face).group(1)
    style = re.search(r"font-style:(\w+)", face).group(1)
    weight = re.search(r"font-weight:(\d+)", face).group(1)
    m = re.search(r"url\(data:font/woff2;base64,([A-Za-z0-9+/=]+)\)", face)
    assert m, face[:120]
    suffix = ""
    if weight == "700":
        suffix += "Bold"
    if style == "italic":
        suffix += "Italic"
    name = fam + ("-" + suffix if suffix else "")
    raw = base64.b64decode(m.group(1))
    open(os.path.join(FONTDIR, name + ".woff2"), "wb").write(raw)
    total += len(raw)
    made.append(name)
    new_css = new_css.replace(face, '@font-face{font-family:%s;font-style:%s;font-weight:%s;src:url(fonts/%s.woff2) format("woff2")}'
                              % (fam, style, weight, name))

assert "data:font" not in new_css, "还有未替换的内联字体"
open(os.path.join(OUT, "katex.min.css"), "w", encoding="utf-8").write(new_css)
open(os.path.join(OUT, "katex.min.js"), "w", encoding="utf-8").write(kjs)
open(os.path.join(OUT, "auto-render.min.js"), "w", encoding="utf-8").write(arjs)

refs = set(re.findall(r"url\(fonts/([^)]+)\)", new_css))
files = set(os.listdir(FONTDIR))
print("fonts:", len(made), "bytes:", total)
print("css:", len(new_css.encode()), "js:", len(kjs.encode()), "ar:", len(arjs.encode()))
print("missing:", sorted(refs - files), "orphan:", sorted(files - refs))
print(sorted(files))
