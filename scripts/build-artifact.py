#!/usr/bin/env python3
"""Đóng gói web/ thành MỘT file HTML tự chứa (để đăng làm artifact trên claude.ai).
web/ là nguồn duy nhất. Cách dùng: python3 scripts/build-artifact.py <đường dẫn file đầu ra>"""
import base64, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else root / "dist" / "arrow-travel.html")
read = lambda p: (root / p).read_text(encoding="utf-8")

html = read("web/index.html")
title = re.search(r"<title>.*?</title>", html).group(0)
fonts = "\n".join(re.findall(r'<link (?:rel="preconnect"|href="https://fonts)[^>]*>', html))
body_raw = html[html.index("<body>") + 6 : html.index('<script type="module"')].strip()
body = re.sub(r'src="(images/[^"]+)"', lambda m: 'src="data:image/jpeg;base64,%s"' % base64.b64encode((root / "web" / m.group(1)).read_bytes()).decode(), body_raw)
body = re.sub(r'<script src="[^"]*vendor[^"]*"></script>\s*', "", body)  # thư viện QR được nhúng thẳng vào script
css = read("web/style.css") + "\n" + read("web/detail.css")

def strip_module(src):
    if re.search(r"^import .*\bas\b.*;$", src, flags=re.M):
        raise SystemExit("Có import đổi tên (as ...). Bản đóng gói bỏ import nên tên đó sẽ không tồn tại. Hãy dùng đúng tên gốc.")
    src = re.sub(r"^import .*;\n", "", src, flags=re.M)
    return src.replace("export ", "")

detail = re.sub(r"^const (esc|vnd) = .*\n", "", read("src/detail.js"), flags=re.M)  # app.js tự có esc/vnd
import base64, mimetypes
def inline_images(json_text):
    def repl(m):
        path = root / "web" / m.group(1)
        mime = mimetypes.guess_type(path.name)[0] or "image/jpeg"
        return '"image": "data:%s;base64,%s"' % (mime, base64.b64encode(path.read_bytes()).decode())
    return re.sub(r'"image":\s*"(images/[^"]+)"', repl, json_text)

data_block = ("const DATA = " + inline_images(read("data/da-nang.json")) + ";\nconst RULES = " + read("data/rules.json") +
              ";\nconst OPTS = " + read("data/travel-options.json") + ";\nconst TRANSPORT = " + read("data/transport.json") + ";\nconst FLIGHTS = " + read("data/flights.json") + ";\nconst PAYMENT = " + read("data/payment.json") + ";\nconst GOOGLE = " + read("data/google.json") + ";\nconst PROMOS = " + read("data/promos.json") + ";\nconst TRAVELERS = " + read("data/travelers.json") + ";\nconst LEGAL = " + read("data/legal.json") + ";\nconst APP = " + inline_images(read("data/app.json")) + ";\nconst FEATURED = " + read("data/featured.json") + ";")
app = re.sub(r"// <DATA>.*?// </DATA>", lambda m: data_block, read("web/app.js"), flags=re.S)
vendor = read("vendor/qrcode-generator.js")
js = vendor + "\n" + "\n".join(strip_module(s) for s in [read("src/i18n-en.js"), read("src/i18n.js"), read("src/format.js"), read("src/scheduler.js"), read("src/costing.js"), read("src/transport.js"), read("src/nearby.js"), read("src/gmaps.js"), read("src/trackmap.js"), read("src/search.js"), read("src/payment.js"), read("src/google.js"), read("src/promos.js"), read("src/loyalty.js"), read("src/friends.js"), detail, read("src/hoteldetail.js"), read("web/photos.js"), app])

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(f"{title}\n{fonts}\n<style>\n{css}\n</style>\n{body}\n<script>\n{js}\n</script>\n", encoding="utf-8")
print("đã build", out, len(out.read_text(encoding='utf-8')), "ký tự")
