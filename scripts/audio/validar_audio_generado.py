#!/usr/bin/env python3
"""Control de calidad de una pieza generada con IA (GUIA_AUDIO_MCP, contrato).

Rechaza lo que no cuenta como éxito: archivo vacío, silencio, huecos largos,
recorte, duración menor de la pedida y una pista que solo repite el mismo
fragmento corto (p. ej. cuatro compases en bucle). Escribe un informe JSON.

Lee WAV PCM directamente; FLAC, MP3 y OGG los decodifica con ffmpeg.

  python3 scripts/audio/validar_audio_generado.py pieza.flac --min-seconds 20 \
      --json work/omp-audio-x/pieza.qc.json
  python3 scripts/audio/validar_audio_generado.py --selftest
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np

RATE = 22_050  # análisis; no hace falta más resolución
SILENCE_DBFS = -50.0  # ventana de 0,5 s por debajo de esto = silencio
MAX_GAP_SECONDS = 1.5  # hueco de silencio interior más largo admitido
MAX_SILENT_SHARE = 0.10
MIN_RMS_DBFS = -35.0
CLIP_LEVEL = 0.999
MAX_CLIP_SHARE = 0.001
LOOP_SIMILARITY = 0.97  # bloques casi idénticos a cualquier periodo corto
MAX_LOOP_SECONDS = 12.0  # periodos de repetición que se buscan (≤ 4 compases a ~80 BPM)


def load(path: Path) -> tuple[np.ndarray, int]:
    """Mono float32 a RATE Hz."""
    if path.suffix.lower() == ".wav":
        try:
            with wave.open(str(path), "rb") as h:
                if h.getsampwidth() == 2:
                    rate, ch = h.getframerate(), h.getnchannels()
                    x = np.frombuffer(h.readframes(h.getnframes()), dtype="<i2").astype(np.float32) / 32768.0
                    x = x.reshape(-1, ch).mean(axis=1)
                    return resample(x, rate), RATE
        except wave.Error:
            pass
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit(f"{path}: hace falta ffmpeg para leer {path.suffix}")
    raw = subprocess.run(
        [ffmpeg, "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(RATE), "-f", "f32le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype="<f4").copy(), RATE


def resample(x: np.ndarray, rate: int) -> np.ndarray:
    if rate == RATE or len(x) == 0:
        return x
    n = int(round(len(x) * RATE / rate))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def dbfs(v: float) -> float:
    return float(20 * np.log10(max(v, 1e-9)))


def loop_check(x: np.ndarray) -> dict:
    """Busca un periodo P (1–12 s) tal que toda la pista sea casi la misma cosa cada P."""
    hop = 512
    frames = len(x) // hop
    if frames < 8:
        return {"period_seconds": None, "similarity": 0.0}
    win = np.hanning(2048).astype(np.float32)
    pad = np.pad(x, (0, 2048))
    spec = np.stack([np.abs(np.fft.rfft(pad[i * hop : i * hop + 2048] * win))[:256] for i in range(frames)])
    spec = np.log1p(spec)
    spec -= spec.mean(axis=1, keepdims=True)
    norm = np.linalg.norm(spec, axis=1) + 1e-9
    best = (None, 0.0)
    fps = RATE / hop
    for lag in range(int(1.0 * fps), min(int(MAX_LOOP_SECONDS * fps), frames // 2) + 1):
        a, b = spec[:-lag], spec[lag:]
        sim = float(np.mean(np.sum(a * b, axis=1) / (norm[:-lag] * norm[lag:])))
        if sim > best[1]:
            best = (lag / fps, sim)
    return {"period_seconds": None if best[0] is None else round(best[0], 2), "similarity": round(best[1], 4)}


def analyse(x: np.ndarray, min_seconds: float) -> dict:
    seconds = len(x) / RATE
    problems: list[str] = []
    if len(x) == 0:
        return {"seconds": 0, "ok": False, "problems": ["archivo vacío"]}
    peak = float(np.max(np.abs(x)))
    rms = float(np.sqrt(np.mean(x * x)))
    w = RATE // 2
    blocks = x[: len(x) // w * w].reshape(-1, w)
    silent = np.sqrt(np.mean(blocks * blocks, axis=1)) < 10 ** (SILENCE_DBFS / 20)
    # huecos interiores (los extremos admiten entrada/salida en silencio corta)
    inner = silent.copy()
    lead = int(np.argmax(~silent)) if (~silent).any() else len(silent)
    tail = int(np.argmax(~silent[::-1])) if (~silent).any() else len(silent)
    inner[:lead] = False
    if tail:
        inner[-tail:] = False
    gap = run = 0
    for s in inner:
        run = run + 1 if s else 0
        gap = max(gap, run)
    clip_share = float(np.mean(np.abs(x) >= CLIP_LEVEL))
    loop = loop_check(x)
    if seconds + 0.05 < min_seconds:
        problems.append(f"dura {seconds:.2f} s, menos de {min_seconds} s")
    if dbfs(rms) < MIN_RMS_DBFS:
        problems.append(f"casi silencio: RMS {dbfs(rms):.1f} dBFS")
    if float(np.mean(silent)) > MAX_SILENT_SHARE:
        problems.append(f"{100 * float(np.mean(silent)):.0f} % de la pista en silencio")
    if gap * 0.5 > MAX_GAP_SECONDS:
        problems.append(f"hueco de silencio de {gap * 0.5:.1f} s")
    if lead * 0.5 > 2 or tail * 0.5 > 3:
        problems.append(f"silencio al principio ({lead * 0.5:.1f} s) o al final ({tail * 0.5:.1f} s)")
    if clip_share > MAX_CLIP_SHARE:
        problems.append(f"recorte en el {100 * clip_share:.2f} % de las muestras")
    if loop["similarity"] >= LOOP_SIMILARITY:
        problems.append(f"repite el mismo fragmento cada {loop['period_seconds']} s (similitud {loop['similarity']})")
    return {
        "seconds": round(seconds, 3),
        "peak_dbfs": round(dbfs(peak), 2),
        "rms_dbfs": round(dbfs(rms), 2),
        "silent_share": round(float(np.mean(silent)), 3),
        "longest_inner_gap_seconds": gap * 0.5,
        "clip_share": round(clip_share, 5),
        "loop": loop,
        "ok": not problems,
        "problems": problems,
    }


def selftest() -> None:
    rng = np.random.default_rng(7)
    t = np.arange(int(24 * RATE)) / RATE
    # «música» que evoluciona: notas que cambian sin periodo corto, con ruido suave
    notes = rng.integers(48, 72, size=96)
    f = 440 * 2 ** ((notes[(t * 4).astype(int) % 96] - 69) / 12)
    phase = 2 * np.pi * np.cumsum(f) / RATE
    good = (0.3 * np.sin(phase) + 0.02 * rng.standard_normal(len(t))).astype(np.float32)
    bar = good[: int(2 * RATE)]
    looped = np.tile(bar, 12)
    holed = good.copy()
    holed[int(8 * RATE) : int(11 * RATE)] = 0
    cases = {
        "buena": (good, True),
        "vacía": (np.zeros(0, np.float32), False),
        "silencio": (np.zeros(len(good), np.float32), False),
        "corta": (good[: int(10 * RATE)], False),
        "bucle de 2 s": (looped, False),
        "hueco de 3 s": (holed, False),
        "recortada": (np.clip(good * 8, -1, 1), False),
    }
    failed = []
    for name, (x, expect) in cases.items():
        r = analyse(x, 20)
        print(f"{name}: ok={r['ok']} {r['problems']}")
        if r["ok"] != expect:
            failed.append(name)
    with tempfile.TemporaryDirectory() as d:  # ruta WAV de verdad
        p = Path(d) / "x.wav"
        with wave.open(str(p), "wb") as h:
            h.setnchannels(1)
            h.setsampwidth(2)
            h.setframerate(RATE)
            h.writeframes((good * 32767).astype("<i2").tobytes())
        if not analyse(load(p)[0], 20)["ok"]:
            failed.append("lectura WAV")
    if failed:
        raise SystemExit(f"selftest: fallan {failed}")
    print("selftest: bien")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="*", type=Path)
    ap.add_argument("--min-seconds", type=float, default=20.0)
    ap.add_argument("--json", type=Path, help="informe (uno para todos los archivos)")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        selftest()
        return
    if not a.files:
        ap.error("falta al menos un archivo")
    report = {}
    for f in a.files:
        r = analyse(load(f)[0], a.min_seconds)
        report[str(f)] = r
        print(f"{f}: {'BIEN' if r['ok'] else 'RECHAZADA'} · {r['seconds']} s · RMS {r.get('rms_dbfs')} dBFS"
              + "".join(f"\n  - {p}" for p in r["problems"]))
    if a.json:
        a.json.parent.mkdir(parents=True, exist_ok=True)
        a.json.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    sys.exit(0 if all(r["ok"] for r in report.values()) else 1)


if __name__ == "__main__":
    main()
