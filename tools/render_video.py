#!/usr/bin/env python3
"""
Render the RealDiag product film as a downloadable MP4.

Pipeline:
  1. For each scene, generate narration audio with edge-tts (Aria Neural).
  2. Use Playwright (headless Chromium) to capture each scene as a 1920x1080 PNG.
  3. Use ffmpeg to assemble per-scene image+audio clips and concat them into one MP4.

Output: assets/video/realdiag-product-film.mp4
"""
from __future__ import annotations

import asyncio
import json
import shutil
import subprocess
import sys
from pathlib import Path

import edge_tts
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
RENDER_HTML = ROOT / "tools" / "render.html"
OUT_DIR = ROOT / "assets" / "video"
WORK_DIR = ROOT / "tools" / ".video-build"
FINAL_MP4 = OUT_DIR / "realdiag-product-film.mp4"

# Natural-sounding female US English voice from edge-tts (free, online).
VOICE = "en-US-AriaNeural"
WIDTH, HEIGHT = 1920, 1080

# (title, narration text). Order must match render.html SCENES.
SCENES: list[tuple[str, str]] = [
    ("Opening Narrative",
     "Welcome to RealDiag. This demo shows how clinicians move from diagnostic uncertainty to structured action in minutes."),
    ("Clinical Validation",
     "RealDiag has validation across hundreds of diagnoses and clinical scenarios."),
    ("Clinical Workflow",
     "RealDiag fits directly into physician workflow and existing electronic health records."),
    ("Symptom Entry",
     "Inside RealDiag, the clinician captures structured symptoms with chip-style tagging for fast, precise input."),
    ("Symptom Search",
     "Filters for age, sex, and specialty refine the search so the differential is tailored to the patient in front of you."),
    ("Diagnostic Engine",
     "Now watch RealDiag evaluate a first seizure patient and generate a ranked differential diagnosis."),
    ("Ranked Results",
     "Results are displayed inline with matched symptoms, so clinicians can see exactly why each diagnosis was suggested."),
    ("Typical Presentation",
     "For each diagnosis, RealDiag surfaces the typical presentation along with ICD-10 and SNOMED codes for documentation."),
    ("Recommended Workup",
     "RealDiag recommends a guideline-aligned workup, including labs, imaging, and EEG timing."),
    ("Management",
     "Acute management, medications, and patient counseling are surfaced in one consolidated view."),
    ("Specialist Referral",
     "Specialist referrals are pre-triaged into emergency, urgent, and routine pathways."),
    ("Clinical Pearls",
     "High-yield clinical pearls keep critical reminders front and center at the point of care."),
    ("ROI Impact",
     "The result is faster diagnosis, fewer delays, and major cost savings."),
]

# Phonetic rewrites so neural TTS matches the in-browser pronunciation.
def for_speech(text: str) -> str:
    text = text.replace("RealDiag", "Real Dyagg")
    text = text.replace("EEG", "E E G").replace("EKG", "E K G").replace("EHR", "E H R")
    text = text.replace("ICD-10", "I C D 10")
    text = text.replace("SNOMED", "snow med")
    return text


def run(cmd: list[str]) -> None:
    print(">", " ".join(cmd))
    subprocess.run(cmd, check=True)


async def synthesize_audio(idx: int, text: str) -> Path:
    """Generate an MP3 narration file for one scene."""
    out = WORK_DIR / f"scene_{idx:02d}.mp3"
    communicate = edge_tts.Communicate(for_speech(text), VOICE, rate="-5%")
    await communicate.save(str(out))
    return out


async def render_frames() -> list[Path]:
    """Capture each scene as a 1920x1080 PNG."""
    frames: list[Path] = []
    url_base = RENDER_HTML.as_uri()
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={"width": WIDTH, "height": HEIGHT},
                                            device_scale_factor=1)
        page = await context.new_page()
        for idx, _ in enumerate(SCENES):
            url = f"{url_base}?scene={idx}"
            print(f"[frame] scene {idx:02d} -> {url}")
            await page.goto(url, wait_until="networkidle")
            # Wait for images + animations to settle.
            try:
                await page.wait_for_function("window.__sceneReady === true", timeout=10_000)
            except Exception:
                pass
            await page.wait_for_timeout(700)
            out = WORK_DIR / f"scene_{idx:02d}.png"
            await page.screenshot(path=str(out), full_page=False, omit_background=False)
            frames.append(out)
        await browser.close()
    return frames


def audio_duration(path: Path) -> float:
    """Return duration of an audio file in seconds."""
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path)
    ]).decode().strip()
    return float(out)


def build_clip(image: Path, audio: Path, out: Path, hold_extra: float = 0.6) -> float:
    """Build a single MP4 clip from image + audio. Returns clip duration."""
    dur = audio_duration(audio) + hold_extra
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-loop", "1", "-i", str(image),
        "-i", str(audio),
        "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p",
        "-r", "30",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-af", f"apad=pad_dur={hold_extra}",
        "-vf", f"scale={WIDTH}:{HEIGHT}:flags=lanczos,format=yuv420p",
        "-t", f"{dur:.3f}",
        "-shortest",
        "-movflags", "+faststart",
        str(out)
    ])
    return dur


def concat_clips(clips: list[Path], out: Path) -> None:
    list_file = WORK_DIR / "concat.txt"
    list_file.write_text("\n".join(f"file '{c.as_posix()}'" for c in clips) + "\n")
    run([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "concat", "-safe", "0", "-i", str(list_file),
        "-c", "copy",
        "-movflags", "+faststart",
        str(out)
    ])


async def main() -> None:
    if WORK_DIR.exists():
        shutil.rmtree(WORK_DIR)
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[1/3] Synthesizing narration ({len(SCENES)} scenes, voice={VOICE})...")
    audio_paths = []
    for idx, (_title, text) in enumerate(SCENES):
        audio_paths.append(await synthesize_audio(idx, text))

    print(f"[2/3] Rendering scene frames at {WIDTH}x{HEIGHT}...")
    frame_paths = await render_frames()
    assert len(frame_paths) == len(audio_paths)

    print("[3/3] Building clips and concatenating into final MP4...")
    clip_paths: list[Path] = []
    total = 0.0
    for idx, (frame, audio) in enumerate(zip(frame_paths, audio_paths)):
        clip = WORK_DIR / f"clip_{idx:02d}.mp4"
        dur = build_clip(frame, audio, clip)
        total += dur
        clip_paths.append(clip)
        print(f"  scene {idx:02d}: {dur:.2f}s  ({SCENES[idx][0]})")

    concat_clips(clip_paths, FINAL_MP4)
    size_mb = FINAL_MP4.stat().st_size / (1024 * 1024)
    print(f"\nDone. {FINAL_MP4.relative_to(ROOT)}  ({size_mb:.1f} MB, {total:.1f}s)")


if __name__ == "__main__":
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        print("ERROR: ffmpeg/ffprobe not found on PATH.", file=sys.stderr)
        sys.exit(1)
    asyncio.run(main())
