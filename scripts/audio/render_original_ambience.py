#!/usr/bin/env python3
"""Sintetiza ambientes originales, deterministas y perfectamente repetibles."""
from __future__ import annotations

import argparse
import math
import wave
from pathlib import Path

import numpy as np


RATE = 44_100
DURATION = 24.0
FRAMES = round(RATE * DURATION)
ROOT = Path(__file__).parents[2]
OUT = ROOT / "assets" / "audio" / "ambience"


def periodic_noise(rng: np.random.Generator, low: float, high: float) -> np.ndarray:
    """Ruido filtrado en frecuencia; la transformada lo hace circular/teselable."""
    source = rng.normal(0.0, 1.0, FRAMES).astype(np.float32)
    spectrum = np.fft.rfft(source)
    frequencies = np.fft.rfftfreq(FRAMES, 1.0 / RATE)
    edge = np.clip((frequencies - low) / max(low * 0.35, 1.0), 0.0, 1.0)
    fall = np.clip((high - frequencies) / max(high * 0.35, 1.0), 0.0, 1.0)
    spectrum *= np.sin(edge * math.pi / 2) * np.sin(fall * math.pi / 2)
    result = np.fft.irfft(spectrum, FRAMES).astype(np.float32)
    result /= max(float(np.max(np.abs(result))), 1e-6)
    return result


def pan(signal: np.ndarray, position: float) -> np.ndarray:
    angle = (position + 1.0) * math.pi / 4.0
    return np.column_stack((signal * math.cos(angle), signal * math.sin(angle))).astype(np.float32)


def add_wrap(buffer: np.ndarray, start: float, signal: np.ndarray, position: float) -> None:
    index = round(start * RATE) % FRAMES
    stereo = pan(signal, position)
    first = min(len(stereo), FRAMES - index)
    buffer[index:index + first] += stereo[:first]
    if first < len(stereo):
        buffer[:len(stereo) - first] += stereo[first:]


def tone(freq: float, seconds: float, amplitude: float, glide: float = 0.0) -> np.ndarray:
    length = round(seconds * RATE)
    t = np.arange(length, dtype=np.float32) / RATE
    phase = 2 * np.pi * (freq * t + glide * t * t * 0.5)
    carrier = np.sin(phase) + 0.22 * np.sin(phase * 2.01 + 0.4)
    attack = max(1, round(0.06 * RATE))
    release = max(1, round(0.14 * RATE))
    env = np.ones(length, dtype=np.float32)
    env[:attack] = np.linspace(0, 1, attack, dtype=np.float32)
    env[-release:] = np.linspace(1, 0, release, dtype=np.float32)
    return (carrier * env * amplitude / 1.22).astype(np.float32)


def droplet(rng: np.random.Generator, seconds: float = 0.42) -> np.ndarray:
    length = round(seconds * RATE)
    t = np.arange(length, dtype=np.float32) / RATE
    freq = rng.uniform(850, 1500)
    signal = np.sin(2 * np.pi * (freq * t - 160 * t * t)) * np.exp(-t * 12)
    return (signal * 0.11).astype(np.float32)


def close_seam(audio: np.ndarray, length: int = 1024) -> np.ndarray:
    result = audio.copy()
    ramp = (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, length, dtype=np.float32)))[:, None]
    result[-length:] += ramp * (result[0] - result[-1])
    return result


def coast_day() -> np.ndarray:
    rng = np.random.default_rng(18_201)
    t = np.arange(FRAMES, dtype=np.float32) / RATE
    surf = periodic_noise(rng, 35, 950)
    foam = periodic_noise(rng, 900, 5200)
    slow = 0.56 + 0.30 * np.sin(2 * np.pi * 5 * t / DURATION - 0.7) + 0.14 * np.sin(2 * np.pi * 11 * t / DURATION)
    audio = pan(surf * slow * 0.23, -0.18) + pan(foam * np.clip(slow - 0.45, 0, 1) * 0.085, 0.28)
    for index, start in enumerate((2.2, 7.6, 13.1, 19.4, 23.4)):
        call = tone(1280 + index * 90, 0.52, 0.045, glide=190)
        add_wrap(audio, start, call, -0.65 + (index % 3) * 0.62)
    return close_seam(audio)


def dry_savanna() -> np.ndarray:
    rng = np.random.default_rng(18_202)
    t = np.arange(FRAMES, dtype=np.float32) / RATE
    wind = periodic_noise(rng, 70, 1500)
    gust = 0.42 + 0.20 * np.sin(2 * np.pi * 3 * t / DURATION) + 0.12 * np.sin(2 * np.pi * 8 * t / DURATION + 1.2)
    audio = pan(wind * gust * 0.17, -0.10)
    # Insectos completamente sintéticos, afinados a ciclos enteros del bucle.
    for index, frequency in enumerate((3870, 4210, 4690)):
        gate = np.maximum(0.0, np.sin(2 * np.pi * (19 + index * 4) * t / DURATION + index)) ** 8
        chirp = np.sin(2 * np.pi * frequency * t) * gate * (0.014 + index * 0.003)
        audio += pan(chirp.astype(np.float32), (-0.7, 0.2, 0.72)[index])
    for index, start in enumerate((4.1, 10.7, 17.2, 22.5)):
        call = tone(720 + index * 55, 0.74, 0.035, glide=-65)
        add_wrap(audio, start, call, 0.68 if index % 2 else -0.58)
    return close_seam(audio)


def cloud_forest() -> np.ndarray:
    rng = np.random.default_rng(18_203)
    t = np.arange(FRAMES, dtype=np.float32) / RATE
    rain = periodic_noise(rng, 600, 9000)
    mist = periodic_noise(rng, 45, 780)
    canopy = 0.66 + 0.16 * np.sin(2 * np.pi * 4 * t / DURATION + 0.8)
    audio = pan(rain * canopy * 0.105, 0.05) + pan(mist * 0.13, -0.25)
    for index, start in enumerate(np.linspace(0.7, 23.1, 19)):
        add_wrap(audio, float(start + rng.uniform(-0.22, 0.22)), droplet(rng), float(rng.uniform(-0.85, 0.85)))
    for index, start in enumerate((3.3, 9.4, 15.8, 21.2)):
        call = tone(980 + index * 70, 1.18, 0.032, glide=42 if index % 2 else -38)
        add_wrap(audio, start, call, (-0.55, 0.58, -0.20, 0.72)[index])
    return close_seam(audio)


RECIPES = {
    "costa_dia": coast_day,
    "sabana_seca": dry_savanna,
    "bosque_nuboso": cloud_forest,
}


def write(name: str, audio: np.ndarray) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    peak = float(np.max(np.abs(audio)))
    scale = 0.72 / max(peak, 1e-6)
    pcm = (np.clip(audio * scale, -1, 1) * 32767).astype('<i2')
    path = OUT / f'{name}.wav'
    with wave.open(str(path), 'wb') as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        handle.writeframes(pcm.tobytes())
    jump = float(np.max(np.abs(pcm[0].astype(np.float32) - pcm[-1].astype(np.float32))) / 32767)
    rms = float(np.sqrt(np.mean((pcm.astype(np.float32) / 32767) ** 2)))
    print(f'{path.name}: {DURATION:.1f}s, pico 0.720, RMS {rms:.4f}, salto {jump:.6f}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', choices=(*RECIPES.keys(), 'all'), default='all')
    args = parser.parse_args()
    names = RECIPES.keys() if args.profile == 'all' else (args.profile,)
    for profile in names:
        write(profile, RECIPES[profile]())
