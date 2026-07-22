from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "desktop-assets"
SCALE = 4
SIZE = 512


def point(value):
    return round(value * SCALE)


def font(size, bold=False):
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), point(size))


def main():
    ASSET_DIR.mkdir(exist_ok=True)
    image = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    draw.polygon(
        [(point(76), point(320)), (point(112), point(410)), (point(400), point(410)),
         (point(436), point(320)), (point(394), point(278)), (point(118), point(278))],
        fill="#0B2421",
    )
    draw.rounded_rectangle(
        (point(76), point(250), point(436), point(384)),
        radius=point(38), fill="#21443F", outline="#4C8178", width=point(8),
    )
    draw.text((point(140), point(288)), "Tab", fill="#F8FAF9", font=font(58, bold=True))
    draw.line((point(302), point(316), point(375), point(316)), fill="#F8FAF9", width=point(14))
    draw.line((point(350), point(292), point(375), point(316), point(350), point(340)),
              fill="#F8FAF9", width=point(14), joint="curve")

    draw.rounded_rectangle((point(250), point(64), point(268), point(252)), radius=point(9), fill="#DD5B4D")
    for y, width in ((95, 112), (145, 88)):
        draw.line((point(92), point(y), point(92 + width), point(y)), fill="#8EA7A1", width=point(13))
    for y, width in ((78, 132), (132, 96), (186, 154)):
        draw.line((point(298), point(y), point(298 + width), point(y)), fill="#D79A2B", width=point(14))

    draw.line((point(222), point(72), point(246), point(96)), fill="#D79A2B", width=point(10))
    draw.line((point(222), point(96), point(246), point(72)), fill="#D79A2B", width=point(10))
    draw.polygon(
        [(point(280), point(48)), (point(290), point(67)), (point(310), point(78)),
         (point(290), point(88)), (point(280), point(108)), (point(269), point(88)),
         (point(250), point(78)), (point(269), point(67))],
        fill="#D79A2B",
    )

    image = image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    image.save(ASSET_DIR / "app-icon.png")
    image.save(ASSET_DIR / "app-icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])


if __name__ == "__main__":
    main()
