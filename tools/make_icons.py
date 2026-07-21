# 홈 화면 아이콘 생성. 한 번만 돌리면 된다.
#   python tools/make_icons.py
from PIL import Image, ImageDraw
from pathlib import Path

BG = (11, 15, 20)       # 앱 배경과 같은 어두운 남색
BAR = (47, 129, 247)    # 앱 강조색 파랑


def make(size: int) -> Image.Image:
    """치닝디핑 바에 매달린 사람을 단순한 도형으로."""
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    u = size / 32  # 격자 단위

    # 가로 바
    d.rounded_rectangle([4 * u, 8 * u, 28 * u, 9.6 * u], radius=0.8 * u, fill=BAR)
    # 양쪽 기둥
    d.rectangle([4 * u, 8 * u, 5.6 * u, 12 * u], fill=BAR)
    d.rectangle([26.4 * u, 8 * u, 28 * u, 12 * u], fill=BAR)
    # 매달린 팔
    d.rounded_rectangle([11 * u, 9.6 * u, 12.6 * u, 17 * u], radius=0.8 * u, fill=BAR)
    d.rounded_rectangle([19.4 * u, 9.6 * u, 21 * u, 17 * u], radius=0.8 * u, fill=BAR)
    # 머리 (양팔 사이)
    d.ellipse([14.3 * u, 11.8 * u, 17.7 * u, 15.2 * u], fill=BAR)
    # 어깨 — 팔과 몸통을 이어준다
    d.rounded_rectangle([11 * u, 15.4 * u, 21 * u, 17.2 * u], radius=0.9 * u, fill=BAR)
    # 몸통
    d.rounded_rectangle([14.2 * u, 16.6 * u, 17.8 * u, 24 * u], radius=1.2 * u, fill=BAR)
    # 다리
    d.rounded_rectangle([14.2 * u, 24 * u, 15.6 * u, 28.5 * u], radius=0.7 * u, fill=BAR)
    d.rounded_rectangle([16.4 * u, 24 * u, 17.8 * u, 28.5 * u], radius=0.7 * u, fill=BAR)
    return img


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "icons"
    out.mkdir(exist_ok=True)
    for s in (192, 512):
        make(s).save(out / f"icon-{s}.png")
        print(f"wrote icons/icon-{s}.png")
