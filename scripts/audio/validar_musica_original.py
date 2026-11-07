#!/usr/bin/env python3
"""Valida las mezclas y stems musicales originales publicados."""

from __future__ import annotations

import argparse
import wave
from pathlib import Path

import numpy as np


ROOT = Path(__file__).parents[2]
EXPECTED_SECONDS = {
    "los_santos": 51.892,
    "iguanera": 51.429,
    "herrera": 43.636,
    "veraguas": 46.452,
    "cocle": 41.143,
    "panama_oeste": 42.353,
    "chiriqui": 45.000,
    "colon": 40.000,
    "darien": 49.655,
    "bocas": 38.919,
    "perlas": 36.000,
    "panama": 37.895,
}
STEMS = ("harmony", "melody", "percussion")


def read_wav(path: Path) -> tuple[int, np.ndarray]:
    with wave.open(str(path), "rb") as handle:
        assert handle.getnchannels() == 2, f"{path}: no es estéreo"
        assert handle.getsampwidth() == 2, f"{path}: no es PCM 16-bit"
        rate = handle.getframerate()
        audio = np.frombuffer(handle.readframes(handle.getnframes()), dtype="<i2")
    return rate, audio.reshape(-1, 2).astype(np.float32) / 32767.0


def validate(profile: str) -> None:
    folder = ROOT / "assets" / "audio" / "music" / profile
    paths = {part: folder / f"{profile}_{part}.wav" for part in (*STEMS, "mix")}
    assert all(path.is_file() for path in paths.values()), f"{profile}: faltan archivos"
    loaded = {part: read_wav(path) for part, path in paths.items()}
    rates = {rate for rate, _ in loaded.values()}
    lengths = {len(audio) for _, audio in loaded.values()}
    assert rates == {44_100}, f"{profile}: frecuencia {rates}"
    assert len(lengths) == 1, f"{profile}: stems de distinta longitud {lengths}"
    mix = loaded["mix"][1]
    seconds = len(mix) / 44_100
    assert abs(seconds - EXPECTED_SECONDS[profile]) < 0.002, (profile, seconds)
    peak = float(np.max(np.abs(mix)))
    rms = float(np.sqrt(np.mean(mix * mix)))
    seam = float(np.max(np.abs(mix[0] - mix[-1])))
    assert 0.86 <= peak <= 0.89, f"{profile}: pico {peak:.4f}"
    assert 0.08 <= rms <= 0.30, f"{profile}: RMS {rms:.4f}"
    if profile in {"veraguas", "cocle", "panama_oeste", "chiriqui", "colon", "darien", "bocas", "perlas", "panama"}:
        assert seam <= 1.0 / 32767.0, f"{profile}: salto {seam:.6f}"
    print(f"{profile}: {seconds:.3f} s, pico {peak:.3f}, RMS {rms:.3f}, salto {seam:.6f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("profiles", nargs="*", choices=EXPECTED_SECONDS)
    args = parser.parse_args()
    for selected in args.profiles or EXPECTED_SECONDS:
        validate(selected)
