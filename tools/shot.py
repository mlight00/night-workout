# 헤드리스 크롬으로 3D 자세 검수 화면을 찍는다.  python tools/shot.py 이름 "deadhang:ok:0.5:62,..." [높이]
import subprocess, sys, os, pathlib, urllib.parse
name, lst = sys.argv[1], sys.argv[2]
h = sys.argv[3] if len(sys.argv) > 3 else "760"
out = pathlib.Path(os.environ.get("TEMP", ".")) / "nwrev" / f"{name}.png"
out.parent.mkdir(exist_ok=True)
url = "http://127.0.0.1:8124/tools/review3d.html?list=" + urllib.parse.quote(lst, safe=":,.")
chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
subprocess.run([chrome, "--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars",
                "--virtual-time-budget=20000", f"--screenshot={out}", f"--window-size=1240,{h}", url], capture_output=True, timeout=180)
print(out, out.exists())
