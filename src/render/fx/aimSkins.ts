// OMP-POL-12: Skins del indicador de apuntado, del puntero y de la trayectoria.
// Cada skin define cómo se dibujan tres elementos visuales:
//   1. El marcador del objetivo (aro bajo el enemigo apuntado).
//   2. La línea de trayectoria (desde el lanzador hasta el destino).
//   3. El aro de aterrizaje (donde caería el hechizo).
//
// Las skins usan solo geometría de Babylon.js (sin texturas ni modelos externos).
// Cuando lleguen los assets de Blender (modelos propios, texturas), se añadirán
// skins adicionales que los consuman; la interfaz ya las soporta.

import { Color3, Material, MeshBuilder, StandardMaterial, type Mesh, type LinesMesh, type Scene, Vector3 } from '@babylonjs/core';

/** Parámetros de una skin de apuntado. */
export interface AimSkinDef {
    /** Identificador estable (ej. 'simple', 'doble', 'brillante'). */
    id: string;
    /** Nombre visible en Opciones › Desarrollo. */
    name: string;
    /**
     * Crea el marcador del objetivo (aro bajo el enemigo).
     * Se posiciona y escala desde fuera; la función solo crea la malla.
     */
    makeTargetMarker: (scene: Scene, ok: StandardMaterial, bad: StandardMaterial) => Mesh;
    /**
     * Crea el aro de aterrizaje (donde caería el hechizo).
     * `mine` = true si es el hechizo del jugador.
     */
    makeLandingRing: (scene: Scene, mine: boolean) => Mesh;
    /**
     * Crea la línea de trayectoria (desde el lanzador hasta el destino).
     * `mine` = true si es el hechizo del jugador.
     */
    makeTrajectoryLine: (scene: Scene, from: Vector3, to: Vector3, mine: boolean) => LinesMesh;
}

/** Material estándar translúcido para efectos de apuntado. */
function ghostMat(scene: Scene, name: string, color: Color3, alpha: number): StandardMaterial {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = color;
    m.emissiveColor = color.scale(0.75);
    m.specularColor = Color3.Black();
    m.alpha = alpha;
    m.transparencyMode = Material.MATERIAL_ALPHABLEND;
    return m;
}

// ── Skin 1: Simple (la actual, de referencia) ──────────────────────────────

const simpleSkin: AimSkinDef = {
    id: 'simple',
    name: 'Simple',
    makeTargetMarker(scene) {
        return MeshBuilder.CreateTorus('aimTarget', { diameter: 1, thickness: 0.05, tessellation: 40 }, scene);
    },
    makeLandingRing(scene, mine) {
        const r = MeshBuilder.CreateTorus(
            'aimLanding',
            { diameter: 1.15, thickness: 0.06, tessellation: 32 },
            scene,
        );
        const color = mine ? new Color3(0.25, 0.85, 0.8) : new Color3(0.95, 0.5, 0.2);
        r.material = ghostMat(scene, `aimLanding_${mine ? 'mine' : 'other'}`, color, mine ? 0.48 : 0.42);
        return r;
    },
    makeTrajectoryLine(scene, from, to, mine) {
        const line = MeshBuilder.CreateDashedLines(
            'aimLine',
            { points: [from, to], dashNb: 12, dashSize: 3, gapSize: 2 },
            scene,
        );
        line.color = mine ? new Color3(0.4, 1, 0.95) : new Color3(1, 0.65, 0.3);
        return line;
    },
};

// ── Skin 2: Doble anillo ────────────────────────────────────────────────────
// Dos torus concéntricos (uno fino, otro grueso) para el marcador;
// aro de aterrizaje con doble borde; línea sólida con color más vivo.

const doubleSkin: AimSkinDef = {
    id: 'doble',
    name: 'Doble anillo',
    makeTargetMarker(scene) {
        // Anillo exterior grueso + anillo interior fino
        const outer = MeshBuilder.CreateTorus('aimTargetOuter', { diameter: 1, thickness: 0.06, tessellation: 36 }, scene);
        const inner = MeshBuilder.CreateTorus('aimTargetInner', { diameter: 0.7, thickness: 0.03, tessellation: 28 }, scene);
        inner.parent = outer;
        inner.position.y = 0.02; // leve separación vertical
        return outer;
    },
    makeLandingRing(scene, mine) {
        const group = MeshBuilder.CreateTorus(
            'aimLanding',
            { diameter: 1.15, thickness: 0.05, tessellation: 32 },
            scene,
        );
        const inner = MeshBuilder.CreateTorus(
            'aimLandingInner',
            { diameter: 0.85, thickness: 0.03, tessellation: 24 },
            scene,
        );
        inner.parent = group;
        inner.position.y = 0.02;
        const color = mine ? new Color3(0.3, 0.9, 0.85) : new Color3(1, 0.55, 0.25);
        group.material = ghostMat(scene, `aimLanding_${mine ? 'mine' : 'other'}`, color, mine ? 0.5 : 0.45);
        inner.material = group.material;
        return group;
    },
    makeTrajectoryLine(scene, from, to, mine) {
        const line = MeshBuilder.CreateLines('aimLine', { points: [from, to] }, scene);
        line.color = mine ? new Color3(0.5, 1, 0.9) : new Color3(1, 0.7, 0.35);
        return line;
    },
};

// ── Skin 3: Brillante (puntos en los extremos + línea punteada fina) ────────

const brightSkin: AimSkinDef = {
    id: 'brillante',
    name: 'Brillante',
    makeTargetMarker(scene) {
        // Aro delgado con brillo (emissive alto)
        const ring = MeshBuilder.CreateTorus('aimTarget', { diameter: 1, thickness: 0.04, tessellation: 48 }, scene);
        return ring;
    },
    makeLandingRing(scene, mine) {
        const r = MeshBuilder.CreateTorus(
            'aimLanding',
            { diameter: 1.2, thickness: 0.04, tessellation: 40 },
            scene,
        );
        const color = mine ? new Color3(0.4, 1, 0.95) : new Color3(1, 0.6, 0.3);
        const mat = ghostMat(scene, `aimLanding_${mine ? 'mine' : 'other'}`, color, 0.55);
        mat.emissiveColor = color.scale(1.0); // más brillo
        r.material = mat;
        return r;
    },
    makeTrajectoryLine(scene, from, to, mine) {
        const line = MeshBuilder.CreateDashedLines(
            'aimLine',
            { points: [from, to], dashNb: 20, dashSize: 1.5, gapSize: 2.5 },
            scene,
        );
        line.color = mine ? new Color3(0.6, 1, 0.95) : new Color3(1, 0.75, 0.4);
        return line;
    },
};

// ── Skin 4: Diamante (forma angular en vez de aro) ──────────────────────────

const diamondSkin: AimSkinDef = {
    id: 'diamante',
    name: 'Diamante',
    makeTargetMarker(scene) {
        // Cuadrado rotado 45° (diamante) en vez de torus
        const d = MeshBuilder.CreateBox('aimTarget', { size: 0.7 }, scene);
        d.rotation.y = Math.PI / 4;
        d.scaling.y = 0.05; // aplastado al suelo
        return d;
    },
    makeLandingRing(scene, mine) {
        const d = MeshBuilder.CreateBox('aimLanding', { size: 1.1 }, scene);
        d.rotation.y = Math.PI / 4;
        d.scaling.y = 0.04;
        const color = mine ? new Color3(0.25, 0.85, 0.8) : new Color3(0.95, 0.5, 0.2);
        d.material = ghostMat(scene, `aimLanding_${mine ? 'mine' : 'other'}`, color, mine ? 0.48 : 0.42);
        return d;
    },
    makeTrajectoryLine(scene, from, to, mine) {
        const line = MeshBuilder.CreateDashedLines(
            'aimLine',
            { points: [from, to], dashNb: 10, dashSize: 4, gapSize: 2 },
            scene,
        );
        line.color = mine ? new Color3(0.4, 1, 0.95) : new Color3(1, 0.65, 0.3);
        return line;
    },
};

/** Lista de skins disponibles (orden de Opciones). */
export const AIM_SKINS = [simpleSkin, doubleSkin, brightSkin, diamondSkin] as const;
export type AimSkinId = (typeof AIM_SKINS)[number]['id'];

/** Skin por defecto. */
export const AIM_SKIN_DEFAULT: AimSkinId = 'simple';

/** Busca la definición por id. */
export function getAimSkin(id: string): AimSkinDef {
    return AIM_SKINS.find((s) => s.id === id) ?? simpleSkin;
}

/** Verifica que un id es válido. */
export function isValidAimSkin(id: unknown): id is AimSkinId {
    return typeof id === 'string' && AIM_SKINS.some((s) => s.id === id);
}
