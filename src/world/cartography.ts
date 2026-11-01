import { Reader } from '../data/validate';

export interface CartographyDef {
  cellMeters: number;
  sectorCells: number;
  altitudeStep: number;
  sectorPrefix: string;
}

export interface WorldCoordinate {
  mapX: number;
  mapY: number;
  sectorX: number;
  sectorY: number;
  localX: number;
  localY: number;
  altitude: number;
  label: string;
}

export function parseCartography(raw: unknown): CartographyDef {
  const r = new Reader('cartography.json');
  const o = r.obj(raw);
  return {
    cellMeters: r.num(o, 'cellMeters', { min: 8, max: 128 }),
    sectorCells: r.num(o, 'sectorCells', { min: 2, max: 32, int: true }),
    altitudeStep: r.num(o, 'altitudeStep', { min: 1, max: 100 }),
    sectorPrefix: r.str(o, 'sectorPrefix'),
  };
}

/** Única proyección mundo → coordenada para HUD, mapas y guardado. */
export function worldCoordinate(x: number, y: number, height: number, worldWidth: number, worldDepth: number, def: CartographyDef): WorldCoordinate {
  const mapX = Math.floor((x - worldWidth / 2) / def.cellMeters);
  const mapY = Math.floor((y - worldDepth / 2) / def.cellMeters);
  const sectorX = Math.floor(mapX / def.sectorCells);
  const sectorY = Math.floor(mapY / def.sectorCells);
  const localX = ((mapX % def.sectorCells) + def.sectorCells) % def.sectorCells;
  const localY = ((mapY % def.sectorCells) + def.sectorCells) % def.sectorCells;
  const altitude = Math.round(height / def.altitudeStep) * def.altitudeStep;
  const signed = (n: number): string => n >= 0 ? `+${n}` : `−${Math.abs(n)}`;
  const label = `${def.sectorPrefix} ${signed(sectorX)},${signed(sectorY)} · celda ${localX + 1},${localY + 1} · cota ${signed(altitude)} m`;
  return { mapX, mapY, sectorX, sectorY, localX, localY, altitude, label };
}

export function mapCell(x: number, y: number, worldWidth: number, worldDepth: number, cellMeters: number): [number, number] {
  return [Math.floor((x - worldWidth / 2) / cellMeters), Math.floor((y - worldDepth / 2) / cellMeters)];
}
