const xml = (value) =>
    String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');

const number = (value, digits = 1) => Number(value).toFixed(digits);
const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const mdCode = (value) => `${String.fromCharCode(96)}${value}${String.fromCharCode(96)}`;

function csvCell(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function chart(rows) {
    const width = 1000;
    const height = 700;
    const left = 92;
    const right = 960;
    const plotWidth = right - left;
    const fpsTop = 90;
    const fpsBottom = 300;
    const heapTop = 405;
    const heapBottom = 615;
    const fpsMax = Math.max(10, Math.ceil(Math.max(...rows.map((row) => row.fps)) / 10) * 10);
    const heaps = rows.map((row) => row.heapUsedMB);
    const heapPad = Math.max(5, (Math.max(...heaps) - Math.min(...heaps)) * 0.15);
    const heapMin = Math.max(0, Math.floor((Math.min(...heaps) - heapPad) / 10) * 10);
    const heapMax = Math.max(heapMin + 10, Math.ceil((Math.max(...heaps) + heapPad) / 10) * 10);
    const x = (index) => left + (index / (rows.length - 1)) * plotWidth;
    const fpsY = (value) => fpsBottom - (value / fpsMax) * (fpsBottom - fpsTop);
    const heapY = (value) => heapBottom - ((value - heapMin) / (heapMax - heapMin)) * (heapBottom - heapTop);
    const zoneColors = ['#e7f2ff', '#eaf7ed', '#fff1e5'];
    const bands = [];
    let first = 0;
    for (let index = 1; index <= rows.length; index++) {
        if (index < rows.length && rows[index].zoneId === rows[first].zoneId) continue;
        const x1 = x(first);
        const x2 = x(index - 1);
        const bandX = first === 0 ? left : (x(first - 1) + x1) / 2;
        const bandRight = index === rows.length ? right : (x2 + x(index)) / 2;
        const bandColor = zoneColors[(bands.length / 3) % zoneColors.length];
        bands.push(
            `<rect x="${number(bandX)}" y="${fpsTop}" width="${number(bandRight - bandX)}" height="${fpsBottom - fpsTop}" fill="${bandColor}"/>`,
            `<rect x="${number(bandX)}" y="${heapTop}" width="${number(bandRight - bandX)}" height="${heapBottom - heapTop}" fill="${bandColor}"/>`,
            `<text x="${number((bandX + bandRight) / 2)}" y="76" text-anchor="middle" class="zone">${xml(rows[first].zoneName)}</text>`,
        );
        first = index;
    }

    const fpsGrid = Array.from({ length: 5 }, (_, index) => {
        const value = (fpsMax * index) / 4;
        const y = fpsY(value);
        return `<line x1="${left}" x2="${right}" y1="${number(y)}" y2="${number(y)}" class="grid"/><text x="${left - 12}" y="${number(y + 4)}" text-anchor="end" class="tick">${number(value, 0)}</text>`;
    }).join('');
    const heapGrid = Array.from({ length: 5 }, (_, index) => {
        const value = heapMin + ((heapMax - heapMin) * index) / 4;
        const y = heapY(value);
        return `<line x1="${left}" x2="${right}" y1="${number(y)}" y2="${number(y)}" class="grid"/><text x="${left - 12}" y="${number(y + 4)}" text-anchor="end" class="tick">${number(value, 0)}</text>`;
    }).join('');
    const xTicks = rows
        .filter((row) => row.minute === 1 || row.minute % 5 === 0)
        .map((row) => {
            const px = x(row.minute - 1);
            return `<line x1="${number(px)}" x2="${number(px)}" y1="${fpsBottom}" y2="${fpsBottom + 5}" class="axis"/><text x="${number(px)}" y="${fpsBottom + 22}" text-anchor="middle" class="tick">${row.minute}</text><line x1="${number(px)}" x2="${number(px)}" y1="${heapBottom}" y2="${heapBottom + 5}" class="axis"/><text x="${number(px)}" y="${heapBottom + 22}" text-anchor="middle" class="tick">${row.minute}</text>`;
        })
        .join('');
    const fpsPoints = rows.map((row, index) => `${number(x(index))},${number(fpsY(row.fps))}`).join(' ');
    const heapPoints = rows.map((row, index) => `${number(x(index))},${number(heapY(row.heapUsedMB))}`).join(' ');
    const separators = [9, 19]
        .map((index) => {
            const px = (x(index) + x(index + 1)) / 2;
            return `<line x1="${number(px)}" x2="${number(px)}" y1="${fpsTop}" y2="${fpsBottom}" class="separator"/><line x1="${number(px)}" x2="${number(px)}" y1="${heapTop}" y2="${heapBottom}" class="separator"/>`;
        })
        .join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">JL-332: FPS y memoria V8 durante 30 minutos</title>
<desc id="desc">FPS medio y heap V8 utilizado, muestreados cada minuto mientras se camina por tres zonas.</desc>
<style>text{font-family:Arial,sans-serif;fill:#17212b}.title{font-size:23px;font-weight:700}.subtitle{font-size:14px;fill:#53616d}.axis{stroke:#394957;stroke-width:1}.grid{stroke:#d9e0e5;stroke-width:1}.separator{stroke:#6f7d88;stroke-width:1;stroke-dasharray:4 4}.tick{font-size:12px;fill:#46535e}.zone{font-size:13px;font-weight:700}.label{font-size:14px;font-weight:700}.legend{font-size:13px}</style>
<text x="${left}" y="32" class="title">Sesión larga — 30 minutos de paseo</text>
<text x="${left}" y="54" class="subtitle">Una muestra por minuto de caminata activa · cambios de zona entre bloques</text>
${bands.join('')}
${fpsGrid}
${heapGrid}
${separators}
<line x1="${left}" x2="${right}" y1="${fpsBottom}" y2="${fpsBottom}" class="axis"/><line x1="${left}" x2="${left}" y1="${fpsTop}" y2="${fpsBottom}" class="axis"/>
<line x1="${left}" x2="${right}" y1="${heapBottom}" y2="${heapBottom}" class="axis"/><line x1="${left}" x2="${left}" y1="${heapTop}" y2="${heapBottom}" class="axis"/>
<polyline points="${fpsPoints}" fill="none" stroke="#1769aa" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
${rows.map((row, index) => `<circle cx="${number(x(index))}" cy="${number(fpsY(row.fps))}" r="3" fill="#1769aa"/>`).join('')}
<polyline points="${heapPoints}" fill="none" stroke="#ce5b16" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
${rows.map((row, index) => `<circle cx="${number(x(index))}" cy="${number(heapY(row.heapUsedMB))}" r="3" fill="#ce5b16"/>`).join('')}
${xTicks}
<text x="${left}" y="${fpsTop - 12}" class="label">FPS medio por minuto</text><text x="${left - 56}" y="${(fpsTop + fpsBottom) / 2}" transform="rotate(-90 ${left - 56} ${(fpsTop + fpsBottom) / 2})" text-anchor="middle" class="tick">fotogramas/s (escala 0–${number(fpsMax, 0)})</text>
<text x="${left}" y="${heapTop - 12}" class="label">Heap V8 utilizado</text><text x="${left - 56}" y="${(heapTop + heapBottom) / 2}" transform="rotate(-90 ${left - 56} ${(heapTop + heapBottom) / 2})" text-anchor="middle" class="tick">MiB (escala ${number(heapMin, 0)}–${number(heapMax, 0)})</text>
<line x1="${right - 235}" x2="${right - 205}" y1="665" y2="665" stroke="#1769aa" stroke-width="3"/><text x="${right - 198}" y="669" class="legend">FPS</text><line x1="${right - 135}" x2="${right - 105}" y1="665" y2="665" stroke="#ce5b16" stroke-width="3"/><text x="${right - 98}" y="669" class="legend">Heap V8 usado</text>
</svg>
`;
}

export function buildJl332Report(rows, metadata) {
    if (!Array.isArray(rows) || rows.length !== 30)
        throw new Error(`JL-332 exige 30 muestras, recibidas: ${rows?.length ?? 'ninguna'}`);
    rows.forEach((row, index) => {
        if (row.minute !== index + 1) throw new Error(`Minuto fuera de orden en la muestra ${index + 1}`);
        for (const key of ['fps', 'heapUsedMB', 'heapTotalMB', 'walkMeters', 'intervalSeconds']) {
            if (!Number.isFinite(row[key])) throw new Error(`Métrica ${key} no válida en minuto ${row.minute}`);
        }
    });
    const zones = [...new Set(rows.map((row) => row.zoneId))];
    if (zones.length !== 3 || zones.some((zoneId) => rows.filter((row) => row.zoneId === zoneId).length !== 10))
        throw new Error('JL-332 exige tres zonas con diez muestras cada una');

    const fps = rows.map((row) => row.fps);
    const heap = rows.map((row) => row.heapUsedMB);
    const totalWalkSeconds = rows.reduce((sum, row) => sum + row.intervalSeconds, 0);
    const tableRows = rows
        .map(
            (row) =>
                `| ${row.minute} | ${String(row.zoneName).replaceAll('|', '\\|')} | ${number(row.fps, 1)} | ${number(row.p95FrameMs, 1)} | ${number(row.heapUsedMB, 1)} | ${number(row.heapTotalMB, 1)} | ${number(row.walkMeters, 1)} | ${number(row.x, 1)}, ${number(row.y, 1)} |`,
        )
        .join('\n');
    const csvRows = [
        [
            'minuto',
            'zona_id',
            'zona',
            'fps_medio',
            'p95_frame_ms',
            'heap_v8_usado_mib',
            'heap_v8_total_mib',
            'heap_v8_limite_mib',
            'metros_caminados',
            'intervalo_s',
            'zona_actual_id',
            'x',
            'y',
            'fotogramas',
            'ordenes_de_caminar',
        ],
        ...rows.map((row) => [
            row.minute,
            row.zoneId,
            row.zoneName,
            number(row.fps, 3),
            number(row.p95FrameMs, 3),
            number(row.heapUsedMB, 3),
            number(row.heapTotalMB, 3),
            number(row.heapLimitMB, 3),
            number(row.walkMeters, 3),
            number(row.intervalSeconds, 3),
            row.currentZoneId,
            number(row.x, 3),
            number(row.y, 3),
            row.frames,
            row.pathCommands,
        ]),
    ]
        .map((row) => row.map(csvCell).join(','))
        .join('\n');
    const report = `# JL-332 — sesión larga en Electron

## Recorrido y método

Partida de QA en Electron durante **${number(totalWalkSeconds / 60, 1)} min de caminata activa**, con diez muestras de un minuto en cada zona: Villa Raspadura, Pedasol y Chitrí. Entre bloques se viajó con las Piedras Pintadas; ese tiempo de carga no se cuenta como paseo. El personaje caminó por rutas repetidas mediante ${mdCode('World.commandMove()')} hacia puntos caminables dentro de las zonas seguras. No se modificaron el juego ni sus datos productivos.

FPS es el promedio de intervalos de ${mdCode('requestAnimationFrame')} de cada minuto; p95 es la latencia de fotograma del mismo intervalo. La memoria es el heap JavaScript V8 del renderer (${mdCode('performance.memory')}), no el RSS total del proceso Electron, memoria de GPU ni memoria nativa. Heap usado: media ${number(average(heap), 1)} MiB, mínimo ${number(Math.min(...heap), 1)} MiB, máximo ${number(Math.max(...heap), 1)} MiB y cambio de minuto 1 a 30 ${number(heap.at(-1) - heap[0], 1)} MiB. FPS: media ${number(average(fps), 1)}, mínimo ${number(Math.min(...fps), 1)} y máximo ${number(Math.max(...fps), 1)}.

- Inicio: ${metadata.startedAt}
- Fin: ${metadata.finishedAt}
- Resolución del renderer: ${metadata.resolution}
- Navegador: ${metadata.userAgent}
- Zonas verificadas en ${mdCode('World.currentZone')}: ${zones.join(', ')}
- Capturas: ${metadata.screenshots.map(mdCode).join(', ')}

## Tabla minuto a minuto

| Minuto | Zona | FPS medio | p95 fotograma (ms) | Heap V8 usado (MiB) | Heap V8 total (MiB) | Caminado (m) | Posición x, y |
|---:|---|---:|---:|---:|---:|---:|---:|
${tableRows}

Gráfico: [${mdCode('jl332-grafico.svg')}](jl332-grafico.svg). Datos completos: [${mdCode('jl332-resultados.json')}](jl332-resultados.json) y [${mdCode('jl332-datos.csv')}](jl332-datos.csv). Resultado del arnés: [${mdCode('resultado.json')}](resultado.json).
`;
    return { markdown: report, csv: `${csvRows}\n`, svg: chart(rows), totalWalkSeconds };
}
