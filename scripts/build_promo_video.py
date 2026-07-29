from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


WIDTH = 1920
HEIGHT = 1080
BACKGROUND = "#F5F7F6"
INK = "#153F35"
MUTED = "#54635F"
MELON = "#F07D68"
RIND = "#A9CF72"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def centered(draw: ImageDraw.ImageDraw, text: str, y: int, face: ImageFont.FreeTypeFont, fill: str) -> None:
    box = draw.textbbox((0, 0), text, font=face)
    draw.text(((WIDTH - box[2]) / 2, y), text, font=face, fill=fill)


def add_logo(canvas: Image.Image, logo_path: Path, width: int, x: int, y: int) -> None:
    logo = Image.open(logo_path).convert("RGBA")
    height = round(width * logo.height / logo.width)
    logo = logo.resize((width, height), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo, (x, y))


def add_screenshot(canvas: Image.Image, screenshot_path: Path) -> None:
    source = Image.open(screenshot_path).convert("RGB")
    target_width = 1720
    target_height = round(target_width * source.height / source.width)
    source = source.resize((target_width, target_height), Image.Resampling.LANCZOS)

    shadow = Image.new("RGBA", (target_width + 48, target_height + 48), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((24, 18, target_width + 24, target_height + 18), 18, fill=(17, 44, 37, 65))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))

    x = (WIDTH - target_width) // 2
    y = 244
    canvas.alpha_composite(shadow, (x - 24, y - 18))

    mask = Image.new("L", source.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, source.width, source.height), 14, fill=255)
    canvas.paste(source, (x, y), mask)


def content_slide(
    output: Path,
    screenshot: Path,
    eyebrow: str,
    title: str,
    note: str,
    fonts: dict[str, ImageFont.FreeTypeFont],
) -> None:
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((80, 62, 280, 112), 8, fill=INK)
    draw.text((105, 70), eyebrow, font=fonts["eyebrow"], fill="white")
    draw.text((320, 56), title, font=fonts["heading"], fill=INK)
    draw.text((322, 142), note, font=fonts["body"], fill=MUTED)
    draw.rectangle((80, 204, 1840, 208), fill=RIND)
    add_screenshot(canvas, screenshot)
    canvas.convert("RGB").save(output, quality=95)


def title_slide(output: Path, logo: Path, fonts: dict[str, ImageFont.FreeTypeFont]) -> None:
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, WIDTH, 18), fill=RIND)
    add_logo(canvas, logo, 220, 850, 180)
    centered(draw, "WriteMelo", 455, fonts["brand"], INK)
    centered(draw, "写美了", 570, fonts["title"], MELON)
    centered(draw, "先理解你想表达什么，再帮你写得更自然。", 710, fonts["subtitle"], INK)
    centered(draw, "面向非英语母语者的英文写作教练", 815, fonts["body"], MUTED)
    canvas.convert("RGB").save(output, quality=95)


def summary_slide(output: Path, logo: Path, fonts: dict[str, ImageFont.FreeTypeFont]) -> None:
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), INK)
    draw = ImageDraw.Draw(canvas)
    add_logo(canvas, logo, 150, 885, 120)
    centered(draw, "从想法，到自然表达", 350, fonts["title"], "white")
    centered(draw, "补全 · 检查 · 母语解释 · 一键修改", 500, fonts["subtitle"], "#E7F0EC")
    draw.rounded_rectangle((530, 660, 1390, 780), 12, fill=MELON)
    centered(draw, "一个界面，专注完成英文写作", 685, fonts["button"], "white")
    canvas.convert("RGB").save(output, quality=95)


def end_slide(output: Path, logo: Path, fonts: dict[str, ImageFont.FreeTypeFont]) -> None:
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    add_logo(canvas, logo, 210, 855, 190)
    centered(draw, "WriteMelo · 写美了", 460, fonts["title"], INK)
    centered(draw, "英文写作，不再只改语法", 595, fonts["subtitle"], MUTED)
    draw.rounded_rectangle((650, 750, 1270, 860), 12, fill=INK)
    centered(draw, "即将登陆 Microsoft Store", 775, fonts["button"], "white")
    centered(draw, "github.com/ETOLucy/WriteMelo", 930, fonts["small"], MUTED)
    canvas.convert("RGB").save(output, quality=95)


def encode(ffmpeg: Path, slides: list[tuple[Path, float]], output: Path) -> None:
    command = [str(ffmpeg), "-y"]
    for slide, duration in slides:
        command.extend(["-loop", "1", "-t", str(duration), "-i", str(slide)])

    total_duration = sum(duration for _, duration in slides)
    command.extend(["-f", "lavfi", "-t", str(total_duration), "-i", "anullsrc=r=48000:cl=stereo"])

    filters = []
    labels = []
    for index, (_, duration) in enumerate(slides):
        fade_out = max(0, duration - 0.45)
        filters.append(
            f"[{index}:v]scale={WIDTH}:{HEIGHT},fps=30,"
            f"fade=t=in:st=0:d=0.45,fade=t=out:st={fade_out}:d=0.45,"
            f"format=yuv420p[v{index}]"
        )
        labels.append(f"[v{index}]")
    filters.append(f"{''.join(labels)}concat=n={len(slides)}:v=1:a=0[outv]")

    command.extend(
        [
            "-filter_complex",
            ";".join(filters),
            "-map",
            "[outv]",
            "-map",
            f"{len(slides)}:a",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            "-shortest",
            str(output),
        ]
    )
    subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the WriteMelo Chinese promotional video.")
    parser.add_argument("--ffmpeg", type=Path, required=True, help="Path to ffmpeg.exe")
    parser.add_argument("--output", type=Path, default=Path("dist/WriteMelo-promo-zh-CN.mp4"))
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    assets = root / "docs" / "assets"
    frames = root / "build" / "promo-video"
    frames.mkdir(parents=True, exist_ok=True)
    output = args.output if args.output.is_absolute() else root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)

    regular = Path("C:/Windows/Fonts/msyh.ttc")
    bold = Path("C:/Windows/Fonts/msyhbd.ttc")
    if not regular.exists() or not bold.exists():
        raise FileNotFoundError("Microsoft YaHei fonts were not found.")

    fonts = {
        "brand": font(bold, 106),
        "title": font(bold, 76),
        "subtitle": font(bold, 46),
        "heading": font(bold, 54),
        "body": font(regular, 31),
        "eyebrow": font(bold, 27),
        "button": font(bold, 38),
        "small": font(regular, 26),
    }
    logo = root / "desktop-assets" / "app-icon.png"

    title_slide(frames / "01-title.png", logo, fonts)
    content_slide(
        frames / "02-writing.png",
        assets / "store-zh-cn-01-writing.png",
        "01  写作",
        "写下想法，补全自然表达",
        "结合整篇草稿理解语境，提供单词、短语和句子补全。",
        fonts,
    )
    content_slide(
        frames / "03-language.png",
        assets / "store-zh-cn-02-language.png",
        "02  解释",
        "发现问题，用母语讲清原因",
        "不只给出答案，也解释为什么这样修改更自然。",
        fonts,
    )
    content_slide(
        frames / "04-service.png",
        assets / "store-zh-cn-03-ai-service.png",
        "03  模型",
        "连接你自己的兼容模型服务",
        "模型地址、API Key 和模型 ID 由你掌控。",
        fonts,
    )
    summary_slide(frames / "05-summary.png", logo, fonts)
    end_slide(frames / "06-end.png", logo, fonts)

    slides = [
        (frames / "01-title.png", 4),
        (frames / "02-writing.png", 6),
        (frames / "03-language.png", 6),
        (frames / "04-service.png", 6),
        (frames / "05-summary.png", 4),
        (frames / "06-end.png", 4),
    ]
    encode(args.ffmpeg.resolve(), slides, output.resolve())
    print(output.resolve())


if __name__ == "__main__":
    main()
