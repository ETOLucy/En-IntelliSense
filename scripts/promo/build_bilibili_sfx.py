from __future__ import annotations

import argparse
import math
import random
import struct
import subprocess
import wave
from pathlib import Path


SAMPLE_RATE = 48_000
DURATION = 62.22
CHANNELS = 2


def envelope(position: float, duration: float, attack: float = 0.04, release: float = 0.15) -> float:
    if position < 0 or position >= duration:
        return 0.0
    attack_gain = min(1.0, position / max(attack, 0.001))
    release_gain = min(1.0, (duration - position) / max(release, 0.001))
    return attack_gain * release_gain


def pan_gains(pan: float) -> tuple[float, float]:
    angle = (max(-1.0, min(1.0, pan)) + 1.0) * math.pi / 4
    return math.cos(angle), math.sin(angle)


def add_tone(
    left: list[float],
    right: list[float],
    start: float,
    duration: float,
    frequency: float,
    gain: float,
    *,
    end_frequency: float | None = None,
    pan: float = 0.0,
    harmonics: tuple[tuple[float, float], ...] = (),
) -> None:
    start_sample = int(start * SAMPLE_RATE)
    sample_count = int(duration * SAMPLE_RATE)
    left_gain, right_gain = pan_gains(pan)
    phase = 0.0
    for offset in range(sample_count):
        position = offset / SAMPLE_RATE
        progress = position / duration
        current_frequency = frequency + ((end_frequency or frequency) - frequency) * progress
        phase += 2 * math.pi * current_frequency / SAMPLE_RATE
        value = math.sin(phase)
        for multiplier, amount in harmonics:
            value += math.sin(phase * multiplier) * amount
        value *= gain * envelope(position, duration)
        index = start_sample + offset
        if index >= len(left):
            break
        left[index] += value * left_gain
        right[index] += value * right_gain


def add_noise(
    left: list[float],
    right: list[float],
    start: float,
    duration: float,
    gain: float,
    *,
    pan: float = 0.0,
    seed: int = 1,
) -> None:
    rng = random.Random(seed)
    start_sample = int(start * SAMPLE_RATE)
    sample_count = int(duration * SAMPLE_RATE)
    left_gain, right_gain = pan_gains(pan)
    previous = 0.0
    for offset in range(sample_count):
        position = offset / SAMPLE_RATE
        raw = rng.uniform(-1.0, 1.0)
        previous = previous * 0.84 + raw * 0.16
        value = previous * gain * envelope(position, duration, attack=0.02, release=0.2)
        index = start_sample + offset
        if index >= len(left):
            break
        left[index] += value * left_gain
        right[index] += value * right_gain


def add_pop(left: list[float], right: list[float], start: float, pan: float = 0.0) -> None:
    add_tone(left, right, start, 0.16, 620, 0.12, end_frequency=360, pan=pan)
    add_tone(left, right, start + 0.025, 0.11, 980, 0.055, end_frequency=720, pan=pan)


def add_whoosh(left: list[float], right: list[float], start: float, duration: float = 0.55) -> None:
    add_noise(left, right, start, duration, 0.065, pan=-0.25, seed=int(start * 100))
    add_tone(left, right, start, duration, 150, 0.025, end_frequency=520, pan=0.3)


def add_chime(left: list[float], right: list[float], start: float, notes: tuple[int, ...]) -> None:
    for index, note in enumerate(notes):
        note_start = start + index * 0.1
        add_tone(
            left,
            right,
            note_start,
            0.55,
            note,
            0.065,
            pan=-0.15 + index * 0.15,
            harmonics=((2.0, 0.18),),
        )


def add_keyboard(left: list[float], right: list[float], start: float, index: int) -> None:
    pan = -0.3 if index % 2 == 0 else 0.3
    add_noise(left, right, start, 0.035, 0.055, pan=pan, seed=200 + index)
    add_tone(left, right, start, 0.045, 780, 0.018, end_frequency=520, pan=pan)


def render_sfx(output: Path) -> None:
    sample_count = math.ceil(DURATION * SAMPLE_RATE)
    left = [0.0] * sample_count
    right = [0.0] * sample_count

    # Logo: soft reveal, a small pop, then a restrained identity chime.
    add_whoosh(left, right, 0.25, 0.8)
    add_pop(left, right, 1.35)
    add_chime(left, right, 3.05, (523, 659, 784))
    add_whoosh(left, right, 8.65, 0.45)

    # Idea card into the writing workspace.
    add_pop(left, right, 9.05)
    add_whoosh(left, right, 12.65, 0.5)

    # UI demonstration. Sparse key taps preserve room for narration.
    for key_index, key_time in enumerate(
        (14.8, 15.45, 16.1, 16.75, 17.4, 18.05, 18.7, 19.35, 20.0, 20.65, 21.3)
    ):
        add_keyboard(left, right, key_time, key_index)

    add_pop(left, right, 22.35, pan=0.25)  # Suggestion appears.
    add_tone(left, right, 24.75, 0.12, 520, 0.065, end_frequency=760, pan=0.2)

    # Review scan and result.
    add_tone(left, right, 26.2, 1.7, 180, 0.022, end_frequency=430, pan=-0.2)
    add_noise(left, right, 26.2, 1.7, 0.018, pan=0.2, seed=301)
    add_pop(left, right, 28.25, pan=0.25)
    add_chime(left, right, 33.25, (587, 740, 880))  # Applied correction.

    # Settings panel and closing transition.
    add_whoosh(left, right, 35.05, 0.4)
    add_tone(left, right, 35.25, 0.12, 430, 0.04, end_frequency=610, pan=0.2)
    add_whoosh(left, right, 40.75, 0.35)

    # Closing cards.
    add_pop(left, right, 42.42)
    add_whoosh(left, right, 48.25, 0.38)
    add_pop(left, right, 48.48)
    add_whoosh(left, right, 54.25, 0.4)
    add_chime(left, right, 54.62, (523, 659))
    add_chime(left, right, 60.2, (659, 784, 1047))

    peak = max(max(abs(value) for value in left), max(abs(value) for value in right))
    scale = min(1.0, 0.38 / peak) if peak else 1.0

    output.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output), "wb") as audio:
        audio.setnchannels(CHANNELS)
        audio.setsampwidth(2)
        audio.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for left_value, right_value in zip(left, right):
            frames.extend(
                struct.pack(
                    "<hh",
                    round(max(-1.0, min(1.0, left_value * scale)) * 32767),
                    round(max(-1.0, min(1.0, right_value * scale)) * 32767),
                )
            )
        audio.writeframes(frames)


def main() -> None:
    parser = argparse.ArgumentParser(description="Add a voiceover-safe custom SFX track to the Bilibili promo.")
    parser.add_argument("--ffmpeg", type=Path, required=True)
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("dist/WriteMelo-Bilibili-AI-voice-ready.mp4"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("dist/WriteMelo-Bilibili-SFX-no-voice.mp4"),
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[2]
    input_video = args.input if args.input.is_absolute() else root / args.input
    output_video = args.output if args.output.is_absolute() else root / args.output
    audio_path = root / "build" / "bilibili-promo" / "custom-sfx.wav"
    render_sfx(audio_path)

    subprocess.run(
        [
            str(args.ffmpeg.resolve()),
            "-y",
            "-i",
            str(input_video),
            "-i",
            str(audio_path),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-af",
            "volume=0.82",
            "-movflags",
            "+faststart",
            "-shortest",
            str(output_video),
        ],
        check=True,
    )
    print(output_video.resolve())


if __name__ == "__main__":
    main()
