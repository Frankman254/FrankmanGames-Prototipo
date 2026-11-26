import { describe, expect, it } from 'vitest';
import { buildJl332Report, type Jl332Sample } from '../scripts/jl332Report.mjs';

function samples(): Jl332Sample[] {
    const zones = [
        { id: 'raspadura', name: 'Villa Raspadura' },
        { id: 'pedasol', name: 'Pedasol & Chitrí' },
        { id: 'chitri', name: 'Chitrí' },
    ];
    return Array.from({ length: 30 }, (_, index) => {
        const zone = zones[Math.floor(index / 10)]!;
        return {
            minute: index + 1,
            zoneId: zone.id,
            zoneName: zone.name,
            fps: 60 + (index % 4),
            p95FrameMs: 16.8,
            heapUsedMB: 100 + index,
            heapTotalMB: 160 + index,
            heapLimitMB: 4096,
            walkMeters: 300,
            intervalSeconds: 60,
            currentZoneId: zone.id,
            x: 10 + index,
            y: 20 + index,
            frames: 3600,
            pathCommands: 8,
        };
    });
}

const reportMetadata = {
    startedAt: '2026-11-26T00:00:00.000Z',
    finishedAt: '2026-11-26T00:30:00.000Z',
    resolution: '1920x1080',
    userAgent: 'Electron',
    screenshots: ['raspadura.jpg', 'pedasol.jpg', 'chitri.jpg'],
};

describe('informe de JL-332', () => {
    it('genera tabla, CSV y dos gráficas de 30 muestras en tres bloques de zona', () => {
        const result = buildJl332Report(samples(), reportMetadata);

        expect(result.markdown.split('\n').filter((line) => /^\| \d+ \|/.test(line))).toHaveLength(30);
        expect(result.markdown).toContain('30.0 min de caminata activa');
        expect(result.markdown).toContain('heap JavaScript V8');
        expect(result.csv.split('\n')).toHaveLength(32);
        expect(result.csv).toContain('"30","chitri","Chitrí"');
        expect(result.svg.match(/<circle /g)).toHaveLength(60);
        expect(result.svg).toContain('Pedasol &amp; Chitrí');
        expect(result.totalWalkSeconds).toBe(1800);
    });

    it('rechaza una duración distinta de 30 minutos o una distribución distinta de tres zonas', () => {
        expect(() => buildJl332Report(samples().slice(0, 29), reportMetadata)).toThrow('exige 30 muestras');
        const invalidZones = samples();
        invalidZones[20]!.zoneId = 'raspadura';
        expect(() => buildJl332Report(invalidZones, reportMetadata)).toThrow('tres zonas con diez muestras');
    });

    it('rechaza una métrica no finita antes de generar la evidencia', () => {
        const invalidMetric = samples();
        invalidMetric[4]!.heapUsedMB = Number.NaN;
        expect(() => buildJl332Report(invalidMetric, reportMetadata)).toThrow('heapUsedMB no válida en minuto 5');
    });
});
