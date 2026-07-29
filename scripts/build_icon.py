from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "desktop-assets"
DOCS_ASSET_DIR = ROOT / "docs" / "assets"
SCALE = 4
SIZE = 512
GREEN = "#153F35"
RIND = "#A9CF72"
CORAL = "#F07D68"
SEED = "#5A342A"
PAPER = "#FFF9F4"
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

    curve = []
    for step in range(41):
        t = step / 40
        x = 20 + (56 * t)
        y = 37 + (128 * t * (1 - t))
        curve.append((xy(x), xy(y)))
    draw.polygon([(xy(20), xy(37)), (xy(76), xy(37)), *reversed(curve)], fill=CORAL)
    draw.line(curve, fill=RIND, width=max(1, point(6 * scale)), joint="curve")

    w_points = [(xy(x), xy(y)) for x, y in ((29, 42), (35, 59), (48, 45), (61, 59), (67, 42))]
    draw.line(w_points, fill=PAPER, width=max(1, point(5.5 * scale)), joint="curve")

    draw.polygon(
        [(xy(43), xy(37)), (xy(48), xy(35)), (xy(53), xy(37)), (xy(51), xy(41)), (xy(48), xy(42)), (xy(45), xy(41))],
        fill=SEED,
    )


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
    draw.text((point(570), point(214)), "WriteMelo", fill=INK, font=font(54, bold=True))
    draw.text((point(574), point(300)), "English writing coach for non-native speakers", fill=MUTED, font=font(21))
    draw.line((point(574), point(364), point(1080), point(364)), fill="#D9E2DD", width=point(3))
    draw.line((point(574), point(410), point(930), point(410)), fill=CORAL, width=point(8))
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
