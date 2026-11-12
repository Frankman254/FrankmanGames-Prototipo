// PrefabRegistry — catálogo de prefabs colocables en el editor.
// Cada prefab define propiedades por defecto, esquema de validación,
// categoría y vista previa para el asset browser.
import type { ManualObjectKind, ManualObject } from '../data/dungeonFloorMap';

/** Propiedades por defecto de un prefab. */
export interface PrefabDefaults {
  /** Nombre amigable del prefab. */
  name: string;
  /** Tipo de objeto manual. */
  kind: ManualObjectKind;
  /** Categoría para el asset browser. */
  category: string;
  /** Icono para el asset browser. */
  icon: string;
  /** Escala por defecto (1.0 = tamaño estándar). */
  scale: number;
  /** Si tiene colisión por defecto. */
  collision: boolean;
  /** Propiedades específicas del tipo. */
  properties: Record<string, unknown>;
  /** Descripción corta para el inspector. */
  description: string;
}

/** Esquema de validación para las propiedades de un prefab. */
export interface PrefabSchema {
  /** Propiedades requeridas. */
  required?: string[];
  /** Rango válido para propiedades numéricas. */
  ranges?: Record<string, { min: number; max: number }>;
  /** Valores válidos para propiedades de tipo string. */
  enums?: Record<string, string[]>;
}

/** Entrada completa del registro de prefabs. */
export interface PrefabEntry extends PrefabDefaults {
  /** Esquema de validación. */
  schema: PrefabSchema;
  /** Modelo GLB opcional (ruta relativa a assets/). */
  model?: string;
  /** Si el prefab es interactivo en el juego. */
  interactive: boolean;
}

/**
 * PrefabRegistry gestiona el catálogo de prefabs disponibles
 * para colocación en el editor.
 */
export class PrefabRegistry {
  private readonly _entries: Map<ManualObjectKind, PrefabEntry> = new Map();

  constructor() {
    this._registerDefaults();
  }

  /** Registra todos los prefabs por defecto. */
  private _registerDefaults(): void {
    const defaults: PrefabEntry[] = [
      {
        name: 'Cofre',
        kind: 'chest',
        category: 'Contenedores',
        icon: '📦',
        scale: 1.0,
        collision: true,
        properties: { lootLevel: 1, locked: false },
        description: 'Cofre con botín. Abre con clic para obtener recompensas.',
        schema: {
          required: [],
          ranges: { lootLevel: { min: 1, max: 10 } },
          enums: {},
        },
        interactive: true,
      },
      {
        name: 'Barril',
        kind: 'barrel',
        category: 'Contenedores',
        icon: '🛢️',
        scale: 1.0,
        collision: true,
        properties: { breakable: true, health: 3 },
        description: 'Barril rompible. Puede contener items al romperse.',
        schema: {
          required: [],
          ranges: { health: { min: 1, max: 10 } },
          enums: {},
        },
        interactive: true,
      },
      {
        name: 'Jarra',
        kind: 'jar',
        category: 'Contenedores',
        icon: '🏺',
        scale: 0.8,
        collision: true,
        properties: { breakable: true, health: 2 },
        description: 'Jarra decorativa rompible.',
        schema: {
          required: [],
          ranges: { health: { min: 1, max: 5 } },
          enums: {},
        },
        interactive: true,
      },
      {
        name: 'Puerta',
        kind: 'door',
        category: 'Estructural',
        icon: '🚪',
        scale: 1.0,
        collision: true,
        properties: { locked: false, activation: 'click' as 'click' | 'proximity', radius: 2.0 },
        description: 'Puerta que bloquea el paso. Se abre con clic o proximidad.',
        schema: {
          required: [],
          ranges: { radius: { min: 1.0, max: 5.0 } },
          enums: { activation: ['click', 'proximity'] },
        },
        interactive: true,
      },
      {
        name: 'Antorcha',
        kind: 'torch',
        category: 'Iluminación',
        icon: '🔥',
        scale: 0.6,
        collision: false,
        properties: { lightRadius: 5.0, lightIntensity: 1.0, flicker: true },
        description: 'Fuente de luz con efecto de parpadeo.',
        schema: {
          required: [],
          ranges: { lightRadius: { min: 1.0, max: 15.0 }, lightIntensity: { min: 0.1, max: 2.0 } },
          enums: {},
        },
        interactive: false,
      },
      {
        name: 'Spawn de enemigo',
        kind: 'spawn',
        category: 'Juego',
        icon: '💀',
        scale: 0.5,
        collision: false,
        properties: { enemyKind: 'skeleton', count: 1, respawnDelay: 0 },
        description: 'Punto de aparición de enemigos. Invisible en juego.',
        schema: {
          required: [],
          ranges: { count: { min: 1, max: 10 }, respawnDelay: { min: 0, max: 3600 } },
          enums: {},
        },
        interactive: false,
      },
      {
        name: 'NPC',
        kind: 'npc',
        category: 'Juego',
        icon: '👤',
        scale: 1.0,
        collision: true,
        properties: { name: 'Guardián', dialogue: '', hostile: false },
        description: 'Personaje no jugable con diálogo opcional.',
        schema: {
          required: ['name'],
          ranges: {},
          enums: {},
        },
        interactive: true,
      },
      {
        name: 'Recurso',
        kind: 'resource',
        category: 'Juego',
        icon: '⛏️',
        scale: 0.8,
        collision: true,
        properties: { type: 'ore', amount: 10, respawnDelay: 600 },
        description: 'Recurso recolectable. Se agota y puede reaparecer.',
        schema: {
          required: ['type'],
          ranges: { amount: { min: 1, max: 100 }, respawnDelay: { min: 0, max: 3600 } },
          enums: {},
        },
        interactive: true,
      },
      {
        name: 'Decoración',
        kind: 'decoration',
        category: 'Decoración',
        icon: '🎨',
        scale: 1.0,
        collision: false,
        properties: {},
        description: 'Objeto decorativo sin interacción.',
        schema: {},
        interactive: false,
      },
      {
        name: 'Estructural',
        kind: 'structural',
        category: 'Estructural',
        icon: '🧱',
        scale: 1.0,
        collision: true,
        properties: { static: true },
        description: 'Elemento estructural fijo (muro, pilar, escalera).',
        schema: {},
        interactive: false,
      },
      {
        name: 'Zona',
        kind: 'zone',
        category: 'Juego',
        icon: '🔲',
        scale: 1.0,
        collision: false,
        properties: { name: 'Zona', effect: 'none' },
        description: 'Área con efecto especial (daño, curación, etc.).',
        schema: {
          required: ['name'],
          ranges: {},
          enums: { effect: ['none', 'damage', 'heal', 'speed', 'slow'] },
        },
        interactive: false,
      },
      {
        name: 'Desencadenador',
        kind: 'trigger',
        category: 'Juego',
        icon: '⚡',
        scale: 0.5,
        collision: false,
        properties: { action: 'open_door', target: '', once: true },
        description: 'Activador invisible que ejecuta una acción al entrar.',
        schema: {
          required: ['action'],
          ranges: {},
          enums: { action: ['open_door', 'close_door', 'spawn', 'message', 'teleport'] },
        },
        interactive: false,
      },
      {
        name: 'Entrada',
        kind: 'entrance',
        category: 'Navegación',
        icon: '⬇️',
        scale: 0.8,
        collision: false,
        properties: { fromFloor: -1 },
        description: 'Punto de entrada desde otro piso.',
        schema: {
          required: [],
          ranges: { fromFloor: { min: -1, max: 99 } },
          enums: {},
        },
        interactive: true,
      },
      {
        name: 'Salida',
        kind: 'exit',
        category: 'Navegación',
        icon: '⬆️',
        scale: 0.8,
        collision: false,
        properties: { toFloor: -1, toDungeon: '' },
        description: 'Punto de salida hacia otro piso o mazmorra.',
        schema: {
          required: [],
          ranges: { toFloor: { min: -1, max: 99 } },
          enums: {},
        },
        interactive: true,
      },
    ];

    for (const entry of defaults) {
      this._entries.set(entry.kind, entry);
    }
  }

  /** Obtiene un prefab por su tipo. */
  get(kind: ManualObjectKind): PrefabEntry | undefined {
    return this._entries.get(kind);
  }

  /** Obtiene todos los prefabs. */
  getAll(): PrefabEntry[] {
    return Array.from(this._entries.values());
  }

  /** Obtiene los prefabs de una categoría. */
  getByCategory(category: string): PrefabEntry[] {
    return this.getAll().filter((e) => e.category === category);
  }

  /** Obtiene las categorías disponibles. */
  getCategories(): string[] {
    const cats = new Set<string>();
    for (const e of this._entries.values()) {
      cats.add(e.category);
    }
    return Array.from(cats).sort();
  }

  /** Busca prefabs por nombre o descripción. */
  search(query: string): PrefabEntry[] {
    const q = query.toLowerCase();
    return this.getAll().filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.kind.toLowerCase().includes(q),
    );
  }

  /** Crea un objeto manual desde un prefab. */
  createObject(kind: ManualObjectKind, x: number, y: number, id: string): ManualObject {
    const entry = this._entries.get(kind);
    if (!entry) throw new Error(`Prefab desconocido: ${kind}`);

    return {
      id,
      kind,
      name: entry.name,
      position: { x, y },
      scale: entry.scale,
      collision: entry.collision,
      visible: true,
      properties: { ...entry.properties },
    };
  }

  /** Valida las propiedades de un objeto contra el esquema del prefab. */
  validateProperties(kind: ManualObjectKind, properties: Record<string, unknown>): string[] {
    const entry = this._entries.get(kind);
    if (!entry) return [`Prefab desconocido: ${kind}`];

    const errors: string[] = [];
    const schema = entry.schema;

    // Verificar propiedades requeridas
    if (schema.required) {
      for (const prop of schema.required) {
        if (!(prop in properties)) {
          errors.push(`Propiedad requerida faltante: ${prop}`);
        }
      }
    }

    // Verificar rangos
    if (schema.ranges) {
      for (const [prop, range] of Object.entries(schema.ranges)) {
        const value = properties[prop];
        if (typeof value === 'number') {
          if (value < range.min || value > range.max) {
            errors.push(`${prop}: valor ${value} fuera de rango [${range.min}, ${range.max}]`);
          }
        }
      }
    }

    // Verificar enums
    if (schema.enums) {
      for (const [prop, values] of Object.entries(schema.enums)) {
        const value = properties[prop];
        if (typeof value === 'string' && !values.includes(value)) {
          errors.push(`${prop}: valor "${value}" no válido. Opciones: ${values.join(', ')}`);
        }
      }
    }

    return errors;
  }
}

// Instancia global compartida
export const prefabRegistry = new PrefabRegistry();
