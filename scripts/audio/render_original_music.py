#!/usr/bin/env python3
"""Render deterministic original FrankmanGames music stems with NumPy.

This is an asset generator, not runtime game code. It uses no external samples.
"""

from __future__ import annotations

import math
import argparse
import wave
from pathlib import Path

import numpy as np


SAMPLE_RATE = 44_100
BPM = 74
BEATS_PER_BAR = 4
BARS = 16
BEAT = 60.0 / BPM
DURATION = BARS * BEATS_PER_BAR * BEAT
FRAMES = round(DURATION * SAMPLE_RATE)
ROOT_MIDI = 57  # A3
SCALE = (0, 2, 4, 5, 7, 9, 10)  # Mixolydian
OUTPUT = Path(__file__).parents[2] / "assets" / "audio" / "music" / "los_santos"
RNG = np.random.default_rng(6121)

PROFILES = {
    "los_santos": {
        "bpm": 74,
        "bars": 16,
        "root": 57,
        "scale": (0, 2, 4, 5, 7, 9, 10),
        "seed": 6121,
        "progression": (0, 3, 6, 4),
        "motifs": (
            (0, 2, 4, 2, 1, 4, 3, 2),
            (3, 5, 4, 2, 3, 1, 0, 1),
            (6, 4, 2, 1, 0, 2, 4, 5),
            (4, 3, 1, 0, 2, 1, 0, 6),
        ),
        "air_degrees": (4, 6, 3, 0),
        "pad": 1.0,
        "pluck": 1.0,
        "melody": 1.0,
        "drum": 1.0,
        "shaker": 1.0,
        "air": 1.0,
    },
    "iguanera": {
        "bpm": 56,
        "bars": 12,
        "root": 55,
        "scale": (0, 2, 4, 7, 9),
        "seed": 4127,
        "progression": (0, 3, 1, 4),
        "motifs": (
            (0, 2, 4, 2, 1, 2, 3, 2),
            (3, 4, 2, 1, 0, 1, 2, 4),
            (1, 3, 4, 3, 2, 0, 1, 2),
            (4, 2, 1, 0, 2, 1, 0, 4),
        ),
        "air_degrees": (4, 3, 1),
        "pad": 0.82,
        "pluck": 1.18,
        "melody": 0.88,
        "drum": 0.42,
        "shaker": 0.62,
        "air": 1.28,
    },
    "herrera": {
        "bpm": 66,
        "bars": 12,
        "root": 48,
        "scale": (0, 2, 3, 5, 7, 9, 10),
        "seed": 7039,
        "progression": (0, 5, 6, 3),
        "motifs": (
            (0, 2, 3, 1, 0, 5, 3, 2),
            (5, 3, 2, 0, 1, 3, 2, 1),
            (6, 5, 3, 2, 0, 2, 3, 5),
            (3, 1, 0, 6, 5, 3, 2, 0),
        ),
        "air_degrees": (3, 5, 0),
        "pad": 1.12,
        "pluck": 0.72,
        "melody": 0.82,
        "drum": 1.18,
        "shaker": 0.72,
        "air": 0.64,
    },
    "veraguas": {
        "bpm": 62,
        "bars": 12,
        "root": 50,
        "scale": (0, 2, 3, 7, 9),
        "seed": 8213,
        "progression": (0, 2, 4, 1),
        "motifs": (
            (0, 2, 4, 3, 1, 3, 2, 0),
            (2, 4, 3, 1, 0, 2, 1, 4),
            (4, 3, 1, 0, 2, 4, 3, 2),
            (1, 3, 4, 2, 0, 1, 2, 0),
        ),
        "air_degrees": (4, 2, 0),
        "pad": 1.24,
        "pluck": 0.78,
        "melody": 0.84,
        "drum": 0.66,
        "shaker": 0.86,
        "air": 1.22,
    },
    "cocle": {
        "bpm": 70,
        "bars": 12,
        "root": 53,
        "scale": (0, 2, 4, 7, 9, 11),
        "seed": 9337,
        "progression": (0, 4, 1, 5),
        "motifs": (
            (0, 2, 4, 3, 1, 4, 2, 1),
            (4, 5, 3, 2, 0, 2, 4, 3),
            (1, 3, 5, 4, 2, 1, 0, 2),
            (5, 3, 2, 4, 1, 0, 2, 5),
        ),
        "air_degrees": (5, 3, 1),
        "pad": 0.92,
        "pluck": 1.08,
        "melody": 0.98,
        "drum": 0.88,
        "shaker": 1.02,
        "air": 0.86,
    },
    "panama_oeste": {
        "bpm": 68,
        "bars": 12,
        "root": 52,
        "scale": (0, 2, 4, 7, 9),
        "seed": 10429,
        "progression": (0, 3, 4, 1),
        "motifs": (
            (0, 2, 4, 3, 2, 1, 3, 2),
            (3, 4, 2, 0, 1, 2, 4, 3),
            (4, 2, 1, 3, 0, 2, 3, 1),
            (1, 3, 2, 4, 3, 1, 0, 2),
        ),
        "air_degrees": (4, 1, 3),
        "pad": 0.96,
        "pluck": 1.12,
        "melody": 0.90,
        "drum": 0.92,
        "shaker": 1.16,
        "air": 0.94,
    },
    "chiriqui": {
        "bpm": 64,
        "bars": 12,
        "root": 47,
        "scale": (0, 2, 3, 5, 7, 10),
        "seed": 11717,
        "progression": (0, 4, 2, 5),
        "motifs": (
            (0, 3, 5, 4, 2, 3, 1, 0),
            (4, 2, 5, 3, 1, 2, 0, 3),
            (2, 5, 4, 1, 3, 0, 2, 4),
            (5, 3, 1, 4, 2, 0, 3, 1),
        ),
        "air_degrees": (5, 2, 4),
        "pad": 1.22,
        "pluck": 0.84,
        "melody": 0.88,
        "drum": 0.74,
        "shaker": 0.72,
        "air": 1.28,
    },
}


def midi_hz(note: float) -> float:
    return 440.0 * 2.0 ** ((note - 69.0) / 12.0)


def stereo() -> np.ndarray:
    return np.zeros((FRAMES, 2), dtype=np.float32)


def envelope(length: int, attack: float, release: float, decay: float = 0.0) -> np.ndarray:
    env = np.ones(length, dtype=np.float32)
    attack_n = min(length, max(1, round(attack * SAMPLE_RATE)))
    release_n = min(length, max(1, round(release * SAMPLE_RATE)))
    env[:attack_n] *= np.linspace(0.0, 1.0, attack_n, dtype=np.float32)
    env[-release_n:] *= np.linspace(1.0, 0.0, release_n, dtype=np.float32)
    if decay:
        env *= np.exp(-np.arange(length, dtype=np.float32) / SAMPLE_RATE * decay)
    return env


def pan(signal: np.ndarray, position: float) -> np.ndarray:
    angle = (position + 1.0) * math.pi / 4.0
    return np.column_stack((signal * math.cos(angle), signal * math.sin(angle))).astype(np.float32)


def add(buffer: np.ndarray, start: float, signal: np.ndarray, position: float = 0.0) -> None:
    start_frame = round(start * SAMPLE_RATE) % FRAMES
    stereo_signal = pan(signal, position)
    first = min(len(stereo_signal), FRAMES - start_frame)
    buffer[start_frame : start_frame + first] += stereo_signal[:first]
    if first < len(stereo_signal):
        buffer[: len(stereo_signal) - first] += stereo_signal[first:]


def pad_tone(freq: float, duration: float, amplitude: float) -> np.ndarray:
    length = round(duration * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    detune = 2.0 ** (5.0 / 1200.0)
    signal = (
        np.sin(2 * np.pi * freq * t)
        + 0.55 * np.sin(2 * np.pi * freq * detune * t + 0.8)
        + 0.25 * np.sin(2 * np.pi * freq * 0.5 * t + 0.3)
        + 0.12 * np.sin(2 * np.pi * freq * 2.0 * t)
    )
    return (signal * envelope(length, 0.45, 0.8) * amplitude / 1.92).astype(np.float32)


def pluck(freq: float, duration: float, amplitude: float) -> np.ndarray:
    length = round(duration * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    signal = np.zeros(length, dtype=np.float32)
    phases = RNG.uniform(0, 2 * np.pi, 7)
    for harmonic in range(1, 8):
        weight = 1.0 / harmonic**1.25
        damping = np.exp(-t * (2.1 + harmonic * 0.55))
        signal += weight * np.sin(2 * np.pi * freq * harmonic * t + phases[harmonic - 1]) * damping
    return (signal * envelope(length, 0.004, 0.09) * amplitude / 1.7).astype(np.float32)


def marimba(freq: float, duration: float, amplitude: float) -> np.ndarray:
    length = round(duration * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    signal = (
        np.sin(2 * np.pi * freq * t) * np.exp(-t * 3.8)
        + 0.42 * np.sin(2 * np.pi * freq * 3.02 * t) * np.exp(-t * 7.0)
        + 0.17 * np.sin(2 * np.pi * freq * 5.9 * t) * np.exp(-t * 10.0)
    )
    knock = RNG.normal(0, 1, length).astype(np.float32) * np.exp(-t * 45.0) * 0.08
    return ((signal + knock) * envelope(length, 0.002, 0.08) * amplitude).astype(np.float32)


def airy_tone(freq: float, duration: float, amplitude: float) -> np.ndarray:
    length = round(duration * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    vibrato = 1.0 + 0.0025 * np.sin(2 * np.pi * 5.1 * t)
    phase = 2 * np.pi * freq * np.cumsum(vibrato) / SAMPLE_RATE
    noise = RNG.normal(0, 1, length).astype(np.float32)
    noise = np.convolve(noise, np.ones(18, dtype=np.float32) / 18.0, mode="same")
    signal = np.sin(phase) + 0.16 * np.sin(2 * phase + 0.4) + noise * 0.055
    return (signal * envelope(length, 0.12, 0.3) * amplitude / 1.2).astype(np.float32)


def low_drum(duration: float = 0.55, amplitude: float = 1.0) -> np.ndarray:
    length = round(duration * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    phase = 2 * np.pi * (76.0 * t - 24.0 * t * t)
    body = np.sin(phase) * np.exp(-t * 8.5)
    skin = RNG.normal(0, 1, length).astype(np.float32) * np.exp(-t * 25.0) * 0.18
    return ((body + skin) * envelope(length, 0.003, 0.06) * amplitude).astype(np.float32)


def wood_hit(duration: float = 0.22, amplitude: float = 1.0) -> np.ndarray:
    length = round(duration * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    signal = (
        np.sin(2 * np.pi * 390 * t)
        + 0.65 * np.sin(2 * np.pi * 610 * t)
        + 0.25 * np.sin(2 * np.pi * 970 * t)
    ) * np.exp(-t * 24.0)
    return (signal * envelope(length, 0.0015, 0.04) * amplitude / 1.9).astype(np.float32)


def shaker(duration: float = 0.16, amplitude: float = 1.0) -> np.ndarray:
    length = round(duration * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    noise = RNG.normal(0, 1, length).astype(np.float32)
    smooth = np.convolve(noise, np.ones(11, dtype=np.float32) / 11.0, mode="same")
    bright = noise - smooth
    return (bright * np.exp(-t * 26.0) * envelope(length, 0.003, 0.04) * amplitude).astype(np.float32)


def circular_reverb(source: np.ndarray, wet: float) -> np.ndarray:
    result = source.copy()
    for seconds, gain, cross in ((0.137, 0.22, 0.04), (0.223, 0.16, 0.07), (0.367, 0.11, 0.10), (0.521, 0.07, 0.13)):
        shifted = np.roll(source, round(seconds * SAMPLE_RATE), axis=0)
        swapped = shifted[:, ::-1]
        result += wet * gain * ((1.0 - cross) * shifted + cross * swapped)
    return result.astype(np.float32)


def close_loop_seam(source: np.ndarray, frames: int = 640) -> np.ndarray:
    """Corrige sólo la deriva DC final con una curva corta; conserva ritmo y mezcla."""
    result = source.copy()
    length = min(frames, len(result))
    ramp = (0.5 - 0.5 * np.cos(np.linspace(0.0, np.pi, length, dtype=np.float32)))[:, None]
    result[-length:] += ramp * (result[0] - result[-1])
    return result.astype(np.float32)


def write_wav(path: Path, audio: np.ndarray, scale: float) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(audio * scale, -1.0, 1.0)
    pcm = (pcm * 32767.0).astype("<i2")
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        handle.writeframes(pcm.tobytes())


def degree_note(degree: int, octave: int = 0) -> int:
    return ROOT_MIDI + SCALE[degree % len(SCALE)] + 12 * (octave + degree // len(SCALE))


def render(profile_name: str, profile: dict[str, object]) -> None:
    global BPM, BARS, BEAT, DURATION, FRAMES, ROOT_MIDI, SCALE, OUTPUT, RNG
    BPM = int(profile["bpm"])
    BARS = int(profile["bars"])
    BEAT = 60.0 / BPM
    DURATION = BARS * BEATS_PER_BAR * BEAT
    FRAMES = round(DURATION * SAMPLE_RATE)
    ROOT_MIDI = int(profile["root"])
    SCALE = tuple(int(value) for value in profile["scale"])
    OUTPUT = Path(__file__).parents[2] / "assets" / "audio" / "music" / profile_name
    RNG = np.random.default_rng(int(profile["seed"]))

    harmony = stereo()
    melody = stereo()
    percussion = stereo()
    base_progression = tuple(int(value) for value in profile["progression"])
    progression = tuple(base_progression[index % len(base_progression)] for index in range(BARS))
    motifs = tuple(tuple(int(value) for value in motif) for motif in profile["motifs"])
    pad_level = float(profile["pad"])
    pluck_level = float(profile["pluck"])
    melody_level = float(profile["melody"])
    drum_level = float(profile["drum"])
    shaker_level = float(profile["shaker"])
    air_level = float(profile["air"])

    for bar, degree in enumerate(progression):
        start = bar * BEATS_PER_BAR * BEAT
        chord = (degree, degree + 2, degree + 4)
        for voice, chord_degree in enumerate(chord):
            note = degree_note(chord_degree, -1 if voice == 0 else 0)
            add(harmony, start, pad_tone(midi_hz(note), 4.2 * BEAT, 0.13 * pad_level), (-0.55, 0.0, 0.55)[voice])
        bass_note = degree_note(degree, -2)
        add(harmony, start, pad_tone(midi_hz(bass_note), 3.8 * BEAT, 0.11 * pad_level), -0.08)

        arp = (degree, degree + 2, degree + 4, degree + 2, degree + 4, degree + 2, degree + 1, degree + 2)
        for step, arp_degree in enumerate(arp):
            when = start + step * BEAT / 2
            add(harmony, when, pluck(midi_hz(degree_note(arp_degree, 1)), 0.62 * BEAT, 0.075 * pluck_level), -0.42 + 0.12 * (step % 4))

        motif = motifs[bar % len(motifs)]
        for step, motif_degree in enumerate(motif):
            if (bar + step) % 5 == 0:
                continue
            when = start + step * BEAT / 2
            velocity = (0.13 if step in (0, 4) else 0.095) * melody_level
            add(melody, when, marimba(midi_hz(degree_note(motif_degree, 1)), 0.72 * BEAT, velocity), 0.36 - 0.10 * (step % 3))

        add(percussion, start, low_drum(amplitude=0.17 * drum_level), -0.12)
        add(percussion, start + 2 * BEAT, low_drum(amplitude=0.12 * drum_level), 0.12)
        for step in range(8):
            when = start + step * BEAT / 2
            base_shaker = 0.032 if step % 2 else 0.045
            add(percussion, when, shaker(amplitude=base_shaker * shaker_level), 0.55 if step % 2 else -0.55)
        add(percussion, start + BEAT, wood_hit(amplitude=0.075 * drum_level), 0.32)
        add(percussion, start + 3 * BEAT, wood_hit(amplitude=0.06 * drum_level), -0.32)

    air_bars = range(3, BARS, 4)
    air_degrees = tuple(int(value) for value in profile["air_degrees"])
    for bar, degree in zip(air_bars, air_degrees, strict=True):
        start = bar * 4 * BEAT + 2 * BEAT
        phrase = (degree + 4, degree + 3, degree + 1)
        for index, value in enumerate(phrase):
            add(melody, start + index * 0.62 * BEAT, airy_tone(midi_hz(degree_note(value, 2)), 1.05 * BEAT, 0.055 * air_level), -0.25 + index * 0.22)

    harmony = circular_reverb(harmony, 0.75)
    melody = circular_reverb(melody, 0.62)
    percussion = circular_reverb(percussion, 0.18)
    if profile_name in {"veraguas", "cocle", "panama_oeste", "chiriqui"}:
        harmony = close_loop_seam(harmony)
        melody = close_loop_seam(melody)
        percussion = close_loop_seam(percussion)
    mix = harmony + melody + percussion
    peak = float(np.max(np.abs(mix)))
    master_scale = 0.88 / max(peak, 1e-6)

    write_wav(OUTPUT / f"{profile_name}_harmony.wav", harmony, master_scale)
    write_wav(OUTPUT / f"{profile_name}_melody.wav", melody, master_scale)
    write_wav(OUTPUT / f"{profile_name}_percussion.wav", percussion, master_scale)
    write_wav(OUTPUT / f"{profile_name}_mix.wav", mix, master_scale)
    print(f"{profile_name}: {DURATION:.3f}s at {SAMPLE_RATE} Hz; peak scale {master_scale:.5f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=(*PROFILES.keys(), "all"), default="all")
    args = parser.parse_args()
    names = PROFILES.keys() if args.profile == "all" else (args.profile,)
    for name in names:
        render(name, PROFILES[name])
