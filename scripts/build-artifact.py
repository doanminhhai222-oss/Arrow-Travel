#!/usr/bin/env python3
"""Đóng gói web/ thành MỘT file HTML tự chứa (để đăng làm artifact trên claude.ai).
web/ là nguồn duy nhất. Cách dùng: python3 scripts/build-artifact.py <đường dẫn file đầu ra>"""
import pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else root / "dist" / "arrow-travel.html")
read = lambda p: (root / p).read_text(encoding="utf-8")

html = read("web/index.html")
title = re.search(r"<title>.*?</title>", html).group(0)
fonts = "\n".join(re.findall(r'<link (?:rel="preconnect"|href="https://fonts)[^>]*>', html))
body = html[html.index("<body>") + 6 : html.index('<script type="module"')].strip()
body = re.sub(r'<script src="[^"]*vendor[^"]*"></script>\s*', "", body)  # thư viện QR được nhúng thẳng vào script
css = read("web/style.css") + "\n" + read("web/detail.css")

def strip_module(src):
    src = re.sub(r"^import .*;\n", "", src, flags=re.M)
    return src.replace("export ", "")

detail = re.sub(r"^const (esc|vnd) = .*\n", "", read("src/detail.js"), flags=re.M)  # app.js tự có esc/vnd
data_block = ("const DATA = " + read("data/da-nang.json") + ";\nconst RULES = " + read("data/rules.json") +
              ";\nconst OPTS = " + read("data/travel-options.json") + ";\nconst TRANSPORT = " + read("data/transport.json") + ";\nconst FLIGHTS = " + read("data/flights.json") + ";\nconst PAYMENT = " + read("data/payment.json") + ";")
app = re.sub(r"// <DATA>.*?// </DATA>", lambda m: data_block, read("web/app.js"), flags=re.S)
vendor = read("vendor/qrcode-generator.js")
js = vendor + "\n" + "\n".join(strip_module(s) for s in [read("src/scheduler.js"), read("src/costing.js"), read("src/transport.js"), read("src/search.js"), read("src/payment.js"), detail, app])

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(f"{title}\n{fonts}\n<style>\n{css}\n</style>\n{body}\n<script>\n{js}\n</script>\n", encoding="utf-8")
print("đã build", out, len(out.read_text(encoding='utf-8')), "ký tự")
