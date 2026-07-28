from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "desktop-assets"
DOCS_ASSET_DIR = ROOT / "docs" / "assets"
SCALE = 4
SIZE = 512
GREEN = "#173F35"
GOLD = "#E2A63B"
CORAL = "#E56855"
PAPER = "#F7FAF8"
INK = "#17332C"
MUTED = "#60736B"


def point(value):
    return round(value * SCALE)


def font(size, bold=False):
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), point(size))


def draw_mark(draw, left=42, top=42, size=428):
    scale = size / 96

    def xy(value):
        return point(left + value * scale)

    radius = point(18 * scale)
    draw.rounded_rectangle(
        (xy(8), xy(8), xy(88), xy(88)),
        radius=radius,
        fill=GREEN,
    )
    line_width = max(1, point(9 * scale))
    draw.line((xy(31), xy(27), xy(31), xy(69)), fill=PAPER, width=line_width)
    for y, end in ((27, 61), (48, 53), (69, 61)):
        draw.line((xy(31), xy(y), xy(end), xy(y)), fill=PAPER, width=line_width)
    draw.polygon(
        [
            (xy(67), xy(33)),
            (xy(71), xy(44)),
            (xy(80), xy(48)),
            (xy(71), xy(52)),
            (xy(67), xy(61)),
            (xy(63), xy(52)),
            (xy(54), xy(48)),
            (xy(63), xy(44)),
        ],
        fill=GOLD,
    )
    radius = point(3.5 * scale)
    draw.ellipse((xy(55) - radius, xy(36) - radius, xy(55) + radius, xy(36) + radius), fill=CORAL)


def build_app_icon():
    image = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 0))
    draw_mark(ImageDraw.Draw(image))
    image = image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    image.save(ASSET_DIR / "app-icon.png")
    image.save(
        ASSET_DIR / "app-icon.ico",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

def build_store_assets():
    source = Image.open(ASSET_DIR / "app-icon.png").convert("RGBA")
    targets = {
        "StoreLogo.png": (50, 50),
        "Square44x44Logo.png": (44, 44),
        "Square150x150Logo.png": (150, 150),
    }
    store_dir = ASSET_DIR / "store"
    store_dir.mkdir(parents=True, exist_ok=True)
    for name, size in targets.items():
        source.resize(size, Image.Resampling.LANCZOS).save(store_dir / name, optimize=True)


def build_social_preview():
    width, height = 1280, 640
    image = Image.new("RGB", (width * SCALE, height * SCALE), PAPER)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(
        (point(68), point(68), point(1212), point(572)),
        radius=point(24),
        fill="#FFFFFF",
        outline="#D9E2DD",
        width=point(2),
    )
    draw_mark(draw, left=112, top=112, size=416)
    draw.text((point(570), point(214)), "En-IntelliSense", fill=INK, font=font(54, bold=True))
    draw.text((point(574), point(300)), "Context-aware English writing", fill=MUTED, font=font(25))
    draw.line((point(574), point(364), point(1080), point(364)), fill="#D9E2DD", width=point(3))
    draw.line((point(574), point(410), point(930), point(410)), fill=GOLD, width=point(8))
    image.resize((width, height), Image.Resampling.LANCZOS).save(
        DOCS_ASSET_DIR / "social-preview.png",
        optimize=True,
    )


def main():
    ASSET_DIR.mkdir(exist_ok=True)
    DOCS_ASSET_DIR.mkdir(parents=True, exist_ok=True)
    build_app_icon()
    build_store_assets()
    build_social_preview()


if __name__ == "__main__":
    main()
