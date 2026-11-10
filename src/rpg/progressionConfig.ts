import type { ProgressionGains, SaveData } from './contracts';
import type { RpgContent } from './content';

export const PRODUCTIVE_PROGRESSION: Readonly<ProgressionGains> = {
  statPointsPerLevel: 10,
  healthPerLevel: 20,
  inventoryWeightPerLevel: 30,
};

export function progressionGainsOf(content: RpgContent): ProgressionGains {
  const p = content.progression;
  return {
    statPointsPerLevel: p.statPointsPerLevel,
    healthPerLevel: p.healthPerLevel,
    inventoryWeightPerLevel: p.inventoryWeightPerLevel,
  };
}

export function validProgressionGains(raw: unknown): raw is ProgressionGains {
  if (!raw || typeof raw !== 'object') return false;
  const g = raw as Partial<Record<keyof ProgressionGains, unknown>>;
  return Number.isInteger(g.statPointsPerLevel) && Number(g.statPointsPerLevel) >= 0 && Number(g.statPointsPerLevel) <= 20
    && Number.isInteger(g.healthPerLevel) && Number(g.healthPerLevel) >= 0 && Number(g.healthPerLevel) <= 100
    && Number.isInteger(g.inventoryWeightPerLevel) && Number(g.inventoryWeightPerLevel) >= 0 && Number(g.inventoryWeightPerLevel) <= 1000;
}

/** Copia aislada: nunca altera el contenido compartido ni otra sesión. */
export function withProgressionGains(content: RpgContent, gains: ProgressionGains): RpgContent {
  if (!validProgressionGains(gains)) throw new Error('configuración de progresión no válida');
  return { ...content, progression: { ...content.progression, ...gains } };
}

/** Los guardados antiguos usan producción; los QA conservan su instantánea. */
export function contentForSave(content: RpgContent, save: Pick<SaveData, 'progressionGains'>): RpgContent {
  return validProgressionGains(save.progressionGains) ? withProgressionGains(content, save.progressionGains) : content;
}
