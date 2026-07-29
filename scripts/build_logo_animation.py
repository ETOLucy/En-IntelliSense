from __future__ import annotations

import argparse
import math
import struct
import subprocess
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH = 1920
HEIGHT = 1080
FPS = 60
DURATION = 9.0

PAPER = (245, 247, 246)
INK = (21, 63, 53)
MELON = (240, 125, 104)
RIND = (169, 207, 114)
CREAM = (255, 249, 244)
SEED = (90, 52, 42)
MUTED = (80, 101, 95)


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def span(time: float, start: float, end: float) -> float:
    return clamp((time - start) / (end - start))


def ease_out_cubic(value: float) -> float:
    return 1 - (1 - value) ** 3


def ease_in_out(value: float) -> float:
    return value * value * (3 - 2 * value)


def spring(value: float) -> float:
    value = clamp(value)
    return 1 - math.exp(-7 * value) * math.cos(11 * value)


def lerp(start: float, end: float, value: float) -> float:
    return start + (end - start) * value


def alpha_color(color: tuple[int, int, int], alpha: float) -> tuple[int, int, int, int]:
    return (*color, round(255 * clamp(alpha)))


def polyline_progress(points: list[tuple[float, float]], progress: float) -> list[tuple[float, float]]:
    if progress <= 0:
        return []
    lengths = [
        math.dist(points[index], points[index + 1])
        for index in range(len(points) - 1)
    ]
    target = sum(lengths) * clamp(progress)
    result = [points[0]]
    for index, length in enumerate(lengths):
        if target >= length:
            result.append(points[index + 1])
            target -= length
            continue
        ratio = 0 if length == 0 else target / length
        result.append(
            (
                lerp(points[index][0], points[index + 1][0], ratio),
                lerp(points[index][1], points[index + 1][1], ratio),
            )
        )
        break
    return result


def bowl_points(cx: float, cy: float, radius: float, samples: int = 48) -> list[tuple[float, float]]:
    points = [(cx - radius, cy - radius * 0.34)]
    for index in range(samples + 1):
        x = lerp(-radius, radius, index / samples)
        y = -radius * 0.34 + radius * 0.92 * math.sin(math.pi * index / samples)
        points.append((cx + x, cy + y))
    points.append((cx + radius, cy - radius * 0.34))
    return points


def draw_icon(
    layer: Image.Image,
    center: tuple[float, float],
    size: float,
    time: float,
    opacity: float = 1.0,
) -> None:
    cx, cy = center
    draw = ImageDraw.Draw(layer)
    form = spring(span(time, 0.25, 1.05))
    if form <= 0:
        return

    square = size * form
    left = cx - square / 2
    top = cy - square / 2
    radius = square * 0.22
    draw.rounded_rectangle(
        (left, top, left + square, top + square),
        radius=radius,
        fill=alpha_color(INK, opacity),
    )

    fruit_progress = ease_out_cubic(span(time, 0.78, 1.55))
    fruit_radius = size * 0.32 * fruit_progress
    fruit_cy = cy - size * 0.02
    if fruit_radius > 1:
        fruit = bowl_points(cx, fruit_cy, fruit_radius)
        draw.polygon(fruit, fill=alpha_color(MELON, opacity))

    rind_progress = ease_in_out(span(time, 1.02, 1.88))
    rind_radius = size * 0.335
    rind_path = bowl_points(cx, fruit_cy, rind_radius)[1:-1]
    rind_visible = polyline_progress(rind_path, rind_progress)
    if len(rind_visible) > 1:
        draw.line(
            rind_visible,
            fill=alpha_color(RIND, opacity),
            width=max(1, round(size * 0.055)),
            joint="curve",
        )

    write_progress = ease_in_out(span(time, 1.48, 2.42))
    w_points = [
        (cx - size * 0.245, cy - size * 0.10),
        (cx - size * 0.15, cy + size * 0.16),
        (cx, cy - size * 0.03),
        (cx + size * 0.15, cy + size * 0.16),
        (cx + size * 0.245, cy - size * 0.10),
    ]
    visible_w = polyline_progress(w_points, write_progress)
    if len(visible_w) > 1:
        draw.line(
            visible_w,
            fill=alpha_color(CREAM, opacity),
            width=max(1, round(size * 0.055)),
            joint="curve",
        )

    seed_progress = span(time, 2.05, 2.75)
    if seed_progress > 0:
        seed_x = cx
        seed_target = cy - size * 0.18
        seed_y = lerp(cy - size * 0.72, seed_target, ease_out_cubic(seed_progress))
        if seed_progress > 0.7:
            bounce = math.sin((seed_progress - 0.7) / 0.3 * math.pi) * size * 0.045
            seed_y -= bounce
        seed_width = size * 0.10
        seed_height = size * 0.075
        draw.ellipse(
            (
                seed_x - seed_width / 2,
                seed_y - seed_height / 2,
                seed_x + seed_width / 2,
                seed_y + seed_height / 2,
            ),
            fill=alpha_color(SEED, opacity),
        )


def reveal_text(
    canvas: Image.Image,
    text: str,
    position: tuple[int, int],
    face: ImageFont.FreeTypeFont,
    color: tuple[int, int, int],
    progress: float,
    rise: int = 26,
) -> None:
    progress = spring(progress)
    if progress <= 0:
        return
    box = face.getbbox(text)
    width = box[2] - box[0]
    height = box[3] - box[1] + 12
    text_layer = Image.new("RGBA", (width + 20, height + rise + 20), (0, 0, 0, 0))
    draw = ImageDraw.Draw(text_layer)
    y = round(lerp(rise, 0, progress))
    draw.text((8, y - box[1] + 4), text, font=face, fill=alpha_color(color, progress))
    reveal_width = max(1, min(text_layer.width, round(text_layer.width * progress)))
    cropped = text_layer.crop((0, 0, reveal_width, text_layer.height))
    canvas.alpha_composite(cropped, position)


def render_frame(
    frame_index: int,
    fonts: dict[str, ImageFont.FreeTypeFont],
) -> Image.Image:
    time = frame_index / FPS
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (*PAPER, 255))
    draw = ImageDraw.Draw(canvas)

    intro_line = ease_out_cubic(span(time, 0.0, 0.8))
    draw.rectangle((0, 0, round(WIDTH * intro_line), 14), fill=RIND)

    lockup = ease_in_out(span(time, 2.75, 3.55))
    icon_x = lerp(WIDTH / 2, 650, lockup)
    icon_y = lerp(480, 500, lockup)
    icon_size = lerp(360, 265, lockup)

    entry = span(time, 0.25, 1.25)
    icon_y -= 185 * (1 - ease_out_cubic(entry))
    icon_y -= abs(math.sin(entry * math.pi * 2.5)) * 50 * (1 - entry)

    impact = span(time, 2.35, 3.2)
    impact_wave = math.sin(impact * math.pi * 4) * (1 - impact) if impact > 0 else 0
    icon_y -= abs(impact_wave) * 28

    breathe = 1.0 + impact_wave * 0.055
    if 4.8 < time < 8.0:
        breathe += math.sin((time - 4.8) * math.pi * 1.35) * 0.012
    icon_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw_icon(icon_layer, (icon_x, icon_y), icon_size * breathe, time)
    canvas.alpha_composite(icon_layer)

    accent = ease_out_cubic(span(time, 2.8, 3.5))
    if accent > 0:
        accent_draw = ImageDraw.Draw(canvas)
        length = 150 * accent
        accent_draw.line(
            (icon_x - 215, icon_y + 180, icon_x - 215 + length, icon_y + 180),
            fill=alpha_color(MELON, 0.9 * accent),
            width=8,
        )

    reveal_text(
        canvas,
        "WriteMelo",
        (840, 365),
        fonts["brand"],
        INK,
        span(time, 3.05, 4.05),
    )
    reveal_text(
        canvas,
        "写美了",
        (848, 520),
        fonts["cn"],
        MELON,
        span(time, 3.65, 4.45),
        rise=18,
    )
    reveal_text(
        canvas,
        "先理解你想表达什么，再帮你写得更自然。",
        (560, 735),
        fonts["tagline"],
        MUTED,
        span(time, 4.25, 5.0),
        rise=18,
    )

    outro = ease_in_out(span(time, 8.2, DURATION))
    if outro > 0:
        veil = Image.new("RGBA", canvas.size, alpha_color(PAPER, outro))
        canvas.alpha_composite(veil)

    return canvas.convert("RGB")


def synthesize_melody(path: Path) -> None:
    sample_rate = 48000
    samples = [0.0] * round(DURATION * sample_rate)
    notes = [
        (0.28, 0.42, 523.25, 0.28),
        (0.78, 0.38, 659.25, 0.26),
        (1.22, 0.42, 783.99, 0.25),
        (1.72, 0.36, 880.00, 0.22),
        (2.12, 0.52, 1046.50, 0.30),
        (2.72, 0.45, 783.99, 0.24),
        (3.18, 0.70, 659.25, 0.20),
        (3.18, 0.70, 783.99, 0.17),
        (3.18, 0.70, 1046.50, 0.14),
        (4.12, 0.50, 880.00, 0.18),
        (4.62, 1.10, 1046.50, 0.19),
        (4.62, 1.10, 783.99, 0.13),
    ]
    for start, duration, frequency, amplitude in notes:
        start_index = round(start * sample_rate)
        count = round(duration * sample_rate)
        for index in range(count):
            local_time = index / sample_rate
            attack = min(1.0, local_time / 0.018)
            decay = math.exp(-4.8 * local_time / duration)
            fundamental = math.sin(2 * math.pi * frequency * local_time)
            overtone = 0.28 * math.sin(2 * math.pi * frequency * 2 * local_time)
            sparkle = 0.08 * math.sin(2 * math.pi * frequency * 3 * local_time)
            samples[start_index + index] += amplitude * attack * decay * (fundamental + overtone + sparkle)

    peak = max(max(abs(value) for value in samples), 1.0)
    with wave.open(str(path), "wb") as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        for value in samples:
            pcm = round(clamp(value / peak, -1.0, 1.0) * 32767)
            output.writeframesraw(struct.pack("<hh", pcm, pcm))


def synthesize_voice(path: Path) -> None:
    escaped = str(path.resolve()).replace("'", "''")
    script = (
        "$ErrorActionPreference='Stop';"
        "$voice=New-Object -ComObject SAPI.SpVoice;"
        "$voice.Voice=$voice.GetVoices()|Where-Object{$_.GetDescription()-like '*Huihui*'}|Select-Object -First 1;"
        "$voice.Rate=1;$voice.Volume=94;"
        "$stream=New-Object -ComObject SAPI.SpFileStream;"
        f"$stream.Open('{escaped}',3,$false);"
        "$voice.AudioOutputStream=$stream;"
        "[void]$voice.Speak('WriteMelo，写美了。先理解你想表达什么，再帮你写得更自然。');"
        "$stream.Close()"
    )
    subprocess.run(
        ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
        check=True,
    )
    if not path.exists() or path.stat().st_size < 4096:
        raise RuntimeError("Windows speech synthesis did not produce a valid voice track.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the WriteMelo motion-branding animation.")
    parser.add_argument("--ffmpeg", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("dist/WriteMelo-logo-animation.mp4"))
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    output = args.output if args.output.is_absolute() else root / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    work = root / "build" / "logo-animation"
    work.mkdir(parents=True, exist_ok=True)
    silent_video = work / "motion-silent.mp4"
    melody = work / "original-melody.wav"
    voice = work / "brand-voice.wav"

    fonts = {
        "brand": ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 132),
        "cn": ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 72),
        "tagline": ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 43),
    }

    command = [
        str(args.ffmpeg.resolve()),
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{WIDTH}x{HEIGHT}",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(silent_video.resolve()),
    ]

    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    try:
        for frame_index in range(round(DURATION * FPS)):
            process.stdin.write(render_frame(frame_index, fonts).tobytes())
    finally:
        process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError("FFmpeg failed to encode the logo animation.")

    synthesize_melody(melody)
    synthesize_voice(voice)
    mix_command = [
        str(args.ffmpeg.resolve()),
        "-y",
        "-i",
        str(silent_video.resolve()),
        "-i",
        str(melody.resolve()),
        "-i",
        str(voice.resolve()),
        "-filter_complex",
        "[1:a]volume=0.50[music];"
        "[2:a]atempo=1.25,adelay=2900|2900,volume=1.20[voice];"
        "[music][voice]amix=inputs=2:duration=longest:dropout_transition=0,"
        "alimiter=limit=0.92[audio]",
        "-map",
        "0:v",
        "-map",
        "[audio]",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-t",
        str(DURATION),
        "-movflags",
        "+faststart",
        str(output.resolve()),
    ]
    subprocess.run(mix_command, check=True)
    print(output.resolve())


if __name__ == "__main__":
    main()
