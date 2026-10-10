# 앱 화면을 폰 크기로 찍는다.  python tools/appshot.py scene [w h speed]
import subprocess, sys, os, pathlib
scene = sys.argv[1]; w = sys.argv[2] if len(sys.argv) > 2 else "412"; h = sys.argv[3] if len(sys.argv) > 3 else "860"; sp = sys.argv[4] if len(sys.argv) > 4 else "1"
out = pathlib.Path(os.environ.get("TEMP", ".")) / "nwrev" / f"app_{scene}_{w}x{h}.png"
url = f"http://127.0.0.1:8124/tools/appshot.html?scene={scene}&w={w}&h={h}&speed={sp}"
chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
subprocess.run([chrome, "--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required",
                "--virtual-time-budget=" + (sys.argv[5] if len(sys.argv) > 5 else "15000"), f"--screenshot={out}", f"--window-size={w},{h}", url], capture_output=True, timeout=180)
print(out.name, out.exists())
