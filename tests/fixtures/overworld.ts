/**
 * Fixture compartido: overworld cacheado a nivel de proceso para evitar
 * reconstruir el mundo en cada archivo de prueba. buildOverworld() tarda
 * ~680 ms; con ~27 llamadas dispersas, los tests gastaban ~18 s solo en esto.
 *
 * Usa globalThis para que el cache sobreviva entre módulos de vitest.
 *
 * Uso: importa { overworld, worldData } en lugar de llamar a
 * buildOverworld(loadWorldData()) en cada archivo.
 */
import { loadGameData, type GameData } from '../../src/data';
import { loadWorldData } from '../../src/data/worldData';
import { buildOverworld, withOverworldZone, type Overworld } from '../../src/world/overworld';

const g = globalThis as any;

export function worldData(): ReturnType<typeof loadWorldData> {
    if (!g.__fg_wd) g.__fg_wd = loadWorldData();
    return g.__fg_wd;
}

export function overworld(): Overworld {
    if (!g.__fg_ow) g.__fg_ow = buildOverworld(worldData());
    return g.__fg_ow;
}

export function gameData(): GameData {
    if (!g.__fg_data) g.__fg_data = loadGameData();
    return g.__fg_data;
}

export function withOverworldGameData(): GameData {
    if (!g.__fg_big) g.__fg_big = withOverworldZone(gameData(), overworld());
    return g.__fg_big;
}
