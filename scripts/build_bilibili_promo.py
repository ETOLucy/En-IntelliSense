from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH = 1920
HEIGHT = 1080
BACKGROUND = "#F5F7F6"
INK = "#153F35"
MUTED = "#54635F"
MELON = "#F07D68"
RIND = "#A9CF72"


def load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def center_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    face: ImageFont.FreeTypeFont,
    color: str,
) -> None:
    bounds = draw.textbbox((0, 0), text, font=face)
    draw.text(((WIDTH - bounds[2]) / 2, y), text, font=face, fill=color)


def make_card(
    output: Path,
    logo_path: Path,
    eyebrow: str,
    title: str,
    subtitle: str,
    footer: str,
    fonts: dict[str, ImageFont.FreeTypeFont],
    dark: bool = False,
) -> None:
    background = INK if dark else BACKGROUND
    primary = "white" if dark else INK
    secondary = "#E7F0EC" if dark else MUTED
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), background)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, WIDTH, 18), fill=RIND)

    logo = Image.open(logo_path).convert("RGBA")
    logo.thumbnail((170, 170), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo, ((WIDTH - logo.width) // 2, 150))

    center_text(draw, eyebrow, 365, fonts["eyebrow"], MELON)
    center_text(draw, title, 445, fonts["title"], primary)
    center_text(draw, subtitle, 590, fonts["subtitle"], secondary)
    draw.rounded_rectangle((560, 765, 1360, 870), radius=8, fill=MELON if dark else INK)
    center_text(draw, footer, 788, fonts["button"], "white")
    canvas.convert("RGB").save(output, quality=95)


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the WriteMelo Bilibili voiceover-ready promo.")
    parser.add_argument("--ffmpeg", type=Path, required=True)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("dist/WriteMelo-Bilibili-AI-voice-ready.mp4"),
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    work = root / "build" / "bilibili-promo"
    work.mkdir(parents=True, exist_ok=True)
    output = args.output if args.output.is_absolute() else root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)

    regular = Path("C:/Windows/Fonts/msyh.ttc")
    bold = Path("C:/Windows/Fonts/msyhbd.ttc")
    fonts = {
        "eyebrow": load_font(bold, 34),
        "title": load_font(bold, 70),
        "subtitle": load_font(regular, 38),
        "button": load_font(bold, 34),
    }
    logo = root / "desktop-assets" / "app-icon.png"

    make_card(
        work / "idea.png",
        logo,
        "主包突发奇想",
        "代码能自动补全，英语为什么不行？",
        "于是，主包做了 WriteMelo",
        "像代码补全一样写英语",
        fonts,
    )
    make_card(
        work / "v1.png",
        logo,
        "第一版",
        "朴素实用，自备 AI 模型",
        "目前更适合熟悉 API 的程序员朋友",
        "后续会继续降低使用门槛",
        fonts,
        dark=True,
    )
    make_card(
        work / "future.png",
        logo,
        "继续更新",
        "面向普通英语学习者",
        "加入更多实用功能，好好优化和打磨",
        "让英文写作真正开箱即用",
        fonts,
    )
    make_card(
        work / "store.png",
        logo,
        "Windows 应用商店",
        "现已提交，正在审核",
        "等待正式上架",
        "github.com/ETOLucy/WriteMelo",
        fonts,
        dark=True,
    )

    ffmpeg = str(args.ffmpeg.resolve())
    logo_video = root / "dist" / "WriteMelo-logo-animation.mp4"
    ui_video = root / "build" / "promo-video" / "ui-demo.mp4"
    if not logo_video.exists() or not ui_video.exists():
        raise FileNotFoundError("Existing logo animation or UI demonstration video is missing.")

    command = [
        ffmpeg,
        "-y",
        "-i",
        str(logo_video),
        "-loop",
        "1",
        "-t",
        "4",
        "-i",
        str(work / "idea.png"),
        "-i",
        str(ui_video),
        "-loop",
        "1",
        "-t",
        "6",
        "-i",
        str(work / "v1.png"),
        "-loop",
        "1",
        "-t",
        "6",
        "-i",
        str(work / "future.png"),
        "-loop",
        "1",
        "-t",
        "8",
        "-i",
        str(work / "store.png"),
        "-f",
        "lavfi",
        "-t",
        "63",
        "-i",
        "anullsrc=r=48000:cl=stereo",
        "-filter_complex",
        (
            "[0:v]scale=1920:1080,setsar=1,fps=30,trim=0:9,setpts=PTS-STARTPTS[v0];"
            "[1:v]scale=1920:1080,setsar=1,fps=30,trim=0:4,setpts=PTS-STARTPTS[v1];"
            "[2:v]scale=1920:1080,setsar=1,fps=30,setpts=1.55*PTS,trim=0:29.45,setpts=PTS-STARTPTS[v2];"
            "[3:v]scale=1920:1080,setsar=1,fps=30,trim=0:6,setpts=PTS-STARTPTS[v3];"
            "[4:v]scale=1920:1080,setsar=1,fps=30,trim=0:6,setpts=PTS-STARTPTS[v4];"
            "[5:v]scale=1920:1080,setsar=1,fps=30,trim=0:8,setpts=PTS-STARTPTS[v5];"
            "[v0][v1][v2][v3][v4][v5]concat=n=6:v=1:a=0,format=yuv420p[outv]"
        ),
        "-map",
        "[outv]",
        "-map",
        "6:a",
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
        str(output.resolve()),
    ]
    run(command)
    print(output.resolve())


if __name__ == "__main__":
    main()
