// CLA-CR1 (creador, 2026-11-22: «la complexión solo ensancha o achica horizontalmente»).
// La complexión da masa al cuerpo: cada vértice se desplaza por su normal, más en el tronco y
// los muslos que en los antebrazos, y nada en cabeza, manos y pies. Se hace con un objetivo de
// morph propio de cada copia del modelo (las copias no comparten el MorphTargetManager).
// Cuando OMP-PJ-01 traiga las shape keys `cuerpo_delgado`/`cuerpo_robusto`, se usarán ellas.
import { MorphTarget, MorphTargetManager, VertexBuffer, type AbstractMesh, type Bone, type Mesh } from '@babylonjs/core';

/** Cuánto se hincha cada hueso (0 = nada, 1 = todo). Vale para el esqueleto FG y el de UBC. */
export function boneMass(name: string): number {
    const n = name.slice(name.indexOf(':') + 1).toLowerCase();
    if (/^(hips|pelvis|spine|chest)/.test(n)) return 1;
    if (/^upperarm/.test(n)) return 0.75;
    if (/^thigh/.test(n)) return 0.6;
    if (/^(forearm|lowerarm|shin|calf)/.test(n)) return 0.4;
    if (/^(neck|clavicle)/.test(n)) return 0.4;
    return 0;
}

/** Masa de un hueso; las cadenas `fis_` (faldas, capas, pelo) toman la del primer hueso no `fis_`. */
export function chainMass(bone: Pick<Bone, 'name' | 'getParent'>): number {
    let b: Pick<Bone, 'name' | 'getParent'> | null = bone;
    while (b && b.name.slice(b.name.indexOf(':') + 1).startsWith('fis_')) b = b.getParent();
    return b ? boneMass(b.name) : 0;
}

/**
 * Posiciones desplazadas `amount` unidades por la normal, pesadas por la masa de los huesos.
 * Los vértices que comparten posición (costuras de UV) usan la normal media para no abrir grietas.
 */
export function inflatePositions(
    positions: ArrayLike<number>,
    normals: ArrayLike<number>,
    indices: ArrayLike<number>,
    weights: ArrayLike<number>,
    massOf: (boneIndex: number) => number,
    amount: number,
    extraIndices?: ArrayLike<number>,
    extraWeights?: ArrayLike<number>,
): Float32Array {
    const count = positions.length / 3;
    const out = Float32Array.from(positions);
    const key = (i: number): string =>
        `${Math.round(positions[i * 3]! * 1e4)},${Math.round(positions[i * 3 + 1]! * 1e4)},${Math.round(positions[i * 3 + 2]! * 1e4)}`;
    const avg = new Map<string, [number, number, number]>();
    for (let i = 0; i < count; i++) {
        const k = key(i);
        const a = avg.get(k) ?? [0, 0, 0];
        a[0] += normals[i * 3]!;
        a[1] += normals[i * 3 + 1]!;
        a[2] += normals[i * 3 + 2]!;
        avg.set(k, a);
    }
    for (let i = 0; i < count; i++) {
        let m = 0;
        for (let j = 0; j < 4; j++) m += (weights[i * 4 + j] ?? 0) * massOf(indices[i * 4 + j] ?? 0);
        if (extraIndices && extraWeights) {
            for (let j = 0; j < 4; j++) m += (extraWeights[i * 4 + j] ?? 0) * massOf(extraIndices[i * 4 + j] ?? 0);
        }
        if (m <= 0) continue;
        const n = avg.get(key(i))!;
        const len = Math.hypot(n[0], n[1], n[2]) || 1;
        const d = (amount * m) / len;
        out[i * 3] = positions[i * 3]! + n[0] * d;
        out[i * 3 + 1] = positions[i * 3 + 1]! + n[1] * d;
        out[i * 3 + 2] = positions[i * 3 + 2]! + n[2] * d;
    }
    return out;
}

/** Metros que gana (o pierde) el tronco para una escala de ancho `sxz` de `bodyScale`. */
export function massMeters(sxz: number): number {
    const v = sxz - 1;
    return v >= 0 ? v * 0.3 : v * 0.22;
}

/** Parte del ancho que sigue siendo escala uniforme; el resto lo pone la masa. */
export function residualWidth(sxz: number): number {
    return 1 + (sxz - 1) * 0.45;
}

/**
 * Añade a cada malla con piel un objetivo de morph con la masa ya aplicada (influencia 1).
 * `metersPerUnit(mesh)` convierte unidades locales de la malla a metros.
 */
export function applyBodyMass(meshes: readonly AbstractMesh[], meters: number, metersPerUnit: (m: AbstractMesh) => number): number {
    if (Math.abs(meters) < 1e-4) return 0;
    let done = 0;
    for (const am of meshes) {
        const mesh = am as Mesh;
        const sk = mesh.skeleton;
        if (!sk || typeof mesh.getVerticesData !== 'function') continue;
        const pos = mesh.getVerticesData(VertexBuffer.PositionKind);
        const nor = mesh.getVerticesData(VertexBuffer.NormalKind);
        const idx = mesh.getVerticesData(VertexBuffer.MatricesIndicesKind);
        const wgt = mesh.getVerticesData(VertexBuffer.MatricesWeightsKind);
        if (!pos || !nor || !idx || !wgt) continue;
        const mass = sk.bones.map((b) => chainMass(b));
        if (!mass.some((v) => v > 0)) continue;
        const unit = metersPerUnit(mesh) || 1;
        const moved = inflatePositions(
            pos,
            nor,
            idx,
            wgt,
            (b) => mass[b] ?? 0,
            meters / unit,
            mesh.getVerticesData(VertexBuffer.MatricesIndicesExtraKind) ?? undefined,
            mesh.getVerticesData(VertexBuffer.MatricesWeightsExtraKind) ?? undefined,
        );
        const mgr = mesh.morphTargetManager ?? new MorphTargetManager(mesh.getScene());
        const target = new MorphTarget('complexion', 1, mesh.getScene());
        target.setPositions(moved);
        // Si los objetivos que ya hay mueven normales o UV, este también las declara (sin cambio):
        // un objetivo sin ellas apagaría ese canal en los demás.
        const first = mgr.numTargets > 0 ? mgr.getTarget(0) : null;
        if (first?.hasNormals) target.setNormals(nor);
        if (first?.hasTangents) {
            // El búfer de tangentes lleva 4 componentes (xyz + signo); el morph, 3.
            const tan = mesh.getVerticesData(VertexBuffer.TangentKind);
            if (tan) {
                const n = pos.length / 3;
                const stride = tan.length / n;
                const t3 = new Float32Array(n * 3);
                for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) t3[i * 3 + c] = tan[i * stride + c]!;
                target.setTangents(t3);
            }
        }
        if (first?.hasUVs) {
            const uv = mesh.getVerticesData(VertexBuffer.UVKind);
            if (uv) target.setUVs(uv);
        }
        if (first?.hasUV2s) {
            const uv2 = mesh.getVerticesData(VertexBuffer.UV2Kind);
            if (uv2) target.setUV2s(uv2);
        }
        mgr.addTarget(target);
        if (!mesh.morphTargetManager) mesh.morphTargetManager = mgr;
        done++;
    }
    return done;
}
