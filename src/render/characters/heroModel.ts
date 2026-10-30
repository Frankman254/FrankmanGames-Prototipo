// Humanoide del jugador y de los PNJ, hecho de formas redondeadas (cápsulas,
// elipsoides, tornos y cintas) sobre `heroRig` (src/world/rigs.ts). El aspecto
// (src/world/look.ts, de data/assets.json) elige complexión, peinado, ropa por
// capas, tocado, capa y lo que lleva en las manos; los colores salen de la
// paleta (skin, cloth, trim, hair, gear). Medidas en metros, en el espacio de
// cada articulación; las alturas de reposo del modelo están en `Y`.
import type { Vector3 } from '@babylonjs/core';
import type { Rgb } from '../../world/dayNight';
import type { CharacterLook } from '../../world/look';
import type { Part, Profile, V3, Weights } from './parts';

/** Alturas de reposo de las articulaciones (deben coincidir con `heroRig`). */
const Y = { hips: 0.8, spine: 0.91, chest: 1.12, head: 1.37, shoulder: 1.31 };
/** Centro de la cabeza respecto a su articulación (el cuello). */
const HEAD: V3 = [0.01, 0.21, 0];
const HEAD_R = 0.2;

const EYE_WHITE: Rgb = [0.96, 0.95, 0.92];
const EYE_IRIS: Rgb = [0.13, 0.11, 0.2];
const MOUTH: Rgb = [0.42, 0.16, 0.16];

const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Torso: cadera abajo, columna en medio y pecho arriba, con transición suave. */
const torsoWeights: Weights = (p: Vector3) => {
  const toSpine = smooth(0.86, 0.98, p.y);
  const toChest = smooth(1.06, 1.2, p.y);
  return [
    ['hips', 1 - toSpine],
    ['spine', toSpine * (1 - toChest)],
    ['chest', toChest],
  ];
};

/**
 * Falda o túnica: arriba va con la cadera y, al bajar, se reparte entre las dos
 * piernas según el lado (en el centro, a medias), hasta `follow` en el bajo.
 */
const skirtWeights =
  (top: number, bottom: number, follow: number): Weights =>
  (p: Vector3) => {
    const t = smooth(top, bottom, p.y) * follow;
    const side = Math.max(-1, Math.min(1, p.z / 0.11));
    return [
      ['hips', 1 - t],
      ['legL', t * (0.5 + 0.5 * side)],
      ['legR', t * (0.5 - 0.5 * side)],
    ];
  };

/** Capa: cosida al pecho por arriba; hacia el bajo la mueve su propia articulación. */
const capeWeights: Weights = (p: Vector3) => {
  const t = smooth(Y.shoulder - 0.05, Y.shoulder - 0.35, p.y);
  return [
    ['chest', 1 - t],
    ['cape', t],
  ];
};

const scaleProfile = (pr: Profile, k: number): Profile => pr.map(([r, y]) => [r * k, y] as const);

/** Complexión → grosor de torso y extremidades. */
const GIRTH = { slim: 0.88, average: 1, stout: 1.16 } as const;

export function heroParts(look: CharacterLook): Part[] {
  const g = GIRTH[look.bodyType];
  const parts: Part[] = [];
  const both = (side: (s: 'L' | 'R', z: 1 | -1) => Part[]): void => {
    parts.push(...side('L', 1), ...side('R', -1));
  };
  const plate = look.outfit === 'plate';
  const robe = look.outfit === 'robe';

  // ── torso, cuello y cinturón ─────────────────────────────────────────────
  const torso: Profile = [
    [0.0, -0.08], [0.13, -0.07], [0.17, 0.0], [0.165, 0.1], [0.15, 0.2], [0.17, 0.32],
    [0.19, 0.42], [0.18, 0.48], [0.13, 0.53], [0.06, 0.57], [0.0, 0.58],
  ];
  parts.push({ joint: 'hips', slot: 'cloth', shape: { type: 'lathe', profile: scaleProfile(torso, g), tessellation: 14 }, scale: [0.72, 1, 1], weights: torsoWeights });
  parts.push({ joint: 'head', slot: 'skin', shape: { type: 'capsule', length: 0.07, radius: 0.052 * g }, at: [0, 0.02, 0] });
  if (plate) {
    // Coraza sobre el pecho, gola y un faldar de placas facetadas.
    const cuirass: Profile = [[0.168, 0.16], [0.19, 0.28], [0.207, 0.41], [0.195, 0.48], [0.145, 0.535], [0.08, 0.565]];
    parts.push({ joint: 'hips', slot: 'gear', shape: { type: 'lathe', profile: scaleProfile(cuirass, g), tessellation: 14 }, scale: [0.76, 1, 1], weights: torsoWeights });
    parts.push({ joint: 'chest', slot: 'trim', shape: { type: 'torus', diameter: 0.2 * g, thickness: 0.05, tessellation: 14 }, at: [0, 0.23, 0], scale: [0.8, 1, 1] });
    parts.push({ joint: 'chest', slot: 'trim', shape: { type: 'ellipsoid', size: [0.03, 0.12, 0.09], segments: 4 }, at: [0.16 * g, 0.12, 0], shade: 1.1 });
    const tassets: Profile = [[0.168, 0.16], [0.2, 0.06], [0.235, -0.08], [0.24, -0.13]];
    parts.push({ joint: 'hips', slot: 'gear', shape: { type: 'lathe', profile: scaleProfile(tassets, g), tessellation: 8, doubleSided: true }, scale: [0.8, 1, 1], shade: 0.85, weights: skirtWeights(Y.hips + 0.1, Y.hips - 0.15, 0.6) });
  }
  if (look.outfit === 'tunic' || look.outfit === 'apron' || plate) {
    const skirt: Profile = [[0.168, 0.07], [0.19, 0.0], [0.215, -0.1], [0.235, -0.2], [0.23, -0.23]];
    parts.push({ joint: 'hips', slot: 'cloth', shape: { type: 'lathe', profile: scaleProfile(skirt, g), tessellation: 14, doubleSided: true }, scale: [0.78, 1, 1], shade: plate ? 0.7 : 1, weights: skirtWeights(Y.hips + 0.08, Y.hips - 0.2, 0.7) });
    // Cuello en V ribeteado.
    if (!plate) parts.push({ joint: 'chest', slot: 'trim', shape: { type: 'torus', diameter: 0.17 * g, thickness: 0.028, tessellation: 12 }, at: [0.012, 0.215, 0], rot: [0, 0, -0.35], scale: [0.85, 1, 1] });
  }
  if (look.outfit === 'apron') {
    // Mandil de cuero delante, de la cintura a las rodillas.
    parts.push({ joint: 'hips', slot: 'trim', shape: { type: 'ellipsoid', size: [0.035, 0.62, 0.27 * g], segments: 6 }, at: [0.17 * g, -0.1, 0], shade: 0.75, weights: skirtWeights(Y.hips + 0.05, Y.hips - 0.25, 0.5) });
    parts.push({ joint: 'chest', slot: 'trim', shape: { type: 'ellipsoid', size: [0.03, 0.24, 0.2 * g], segments: 5 }, at: [0.145 * g, 0.02, 0], shade: 0.75 });
  }
  if (robe) {
    // Túnica larga hasta los tobillos con ribete en el bajo, y una esclavina.
    const gown: Profile = [[0.165, 0.2], [0.18, 0.05], [0.21, -0.15], [0.25, -0.4], [0.3, -0.66], [0.31, -0.71]];
    parts.push({ joint: 'hips', slot: 'cloth', shape: { type: 'lathe', profile: scaleProfile(gown, g), tessellation: 16, doubleSided: true }, scale: [0.8, 1, 1], weights: skirtWeights(Y.hips + 0.12, Y.hips - 0.45, 0.72) });
    const hem: Profile = [[0.296, -0.64], [0.312, -0.67], [0.318, -0.715], [0.305, -0.72]];
    parts.push({ joint: 'hips', slot: 'trim', shape: { type: 'lathe', profile: scaleProfile(hem, g), tessellation: 16, doubleSided: true }, scale: [0.8, 1, 1], weights: skirtWeights(Y.hips + 0.12, Y.hips - 0.45, 0.72) });
    parts.push({ joint: 'chest', slot: 'cloth', shape: { type: 'ellipsoid', size: [0.34 * g, 0.24, 0.48 * g], slice: 0.55, segments: 8 }, at: [-0.005, 0.12, 0], shade: 0.85 });
    parts.push({ joint: 'hips', slot: 'trim', shape: { type: 'ellipsoid', size: [0.025, 0.3, 0.06], segments: 4 }, at: [0.16 * g, -0.1, 0.05], weights: skirtWeights(Y.hips + 0.05, Y.hips - 0.3, 0.5) });
  }
  // Cinturón con hebilla (el mago lleva un fajín del color del ribete).
  parts.push({ joint: 'spine', slot: 'trim', shape: { type: 'torus', diameter: (robe ? 0.34 : 0.31) * g, thickness: robe ? 0.05 : 0.04, tessellation: 16 }, at: [0, -0.03, 0], scale: [robe ? 0.8 : 0.74, 1, 1], shade: robe ? 1 : 0.7 });
  if (!robe) parts.push({ joint: 'spine', slot: 'gear', shape: { type: 'box', size: [0.02, 0.055, 0.07] }, at: [0.132 * g, -0.03, 0] });
  if (!robe && !plate) parts.push({ joint: 'spine', slot: 'trim', shape: { type: 'ellipsoid', size: [0.06, 0.08, 0.08], segments: 4 }, at: [0.03, -0.07, 0.15 * g], shade: 0.6 });

  // ── brazos y manos ───────────────────────────────────────────────────────
  both((s, z) => {
    const arm = `arm${s}`;
    const fore = `fore${s}`;
    const hand = `hand${s}`;
    const out: Part[] = [
      { joint: arm, slot: 'cloth', shape: { type: 'ellipsoid', size: [0.115 * g, 0.12 * g, 0.115 * g], segments: 5 } },
      { joint: arm, slot: 'cloth', shape: { type: 'capsule', length: 0.2, radius: 0.05 * g, radiusTop: 0.058 * g }, at: [0, -0.12, 0] },
    ];
    if (robe) {
      // Manga acampanada que cubre el antebrazo, con puño ribeteado.
      out.push({ joint: fore, slot: 'skin', shape: { type: 'capsule', length: 0.18, radius: 0.04 * g, radiusTop: 0.046 * g }, at: [0, -0.11, 0] });
      const sleeve: Profile = [[0.055, 0.02], [0.07, -0.08], [0.1, -0.17], [0.112, -0.2], [0.1, -0.205]];
      out.push({ joint: fore, slot: 'cloth', shape: { type: 'lathe', profile: scaleProfile(sleeve, g), tessellation: 10, doubleSided: true } });
      out.push({ joint: fore, slot: 'trim', shape: { type: 'torus', diameter: 0.21 * g, thickness: 0.022, tessellation: 12 }, at: [0, -0.198, 0] });
    } else if (plate) {
      out.push({ joint: fore, slot: 'gear', shape: { type: 'capsule', length: 0.16, radius: 0.052 * g, radiusTop: 0.06 * g }, at: [0, -0.11, 0], shade: 0.9 });
      out.push({ joint: fore, slot: 'trim', shape: { type: 'torus', diameter: 0.14 * g, thickness: 0.03, tessellation: 12 }, at: [0, -0.18, 0] });
      out.push({ joint: fore, slot: 'gear', shape: { type: 'ellipsoid', size: [0.1, 0.08, 0.1], segments: 4 }, at: [0, 0.0, 0] });
    } else {
      out.push({ joint: fore, slot: 'skin', shape: { type: 'capsule', length: 0.18, radius: 0.04 * g, radiusTop: 0.047 * g }, at: [0, -0.11, 0] });
      const bracer: Profile = [[0.05, -0.08], [0.056, -0.12], [0.054, -0.19], [0.048, -0.2]];
      out.push({ joint: fore, slot: 'trim', shape: { type: 'lathe', profile: scaleProfile(bracer, g), tessellation: 10 }, shade: 0.8 });
    }
    // Mano: palma, dedos recogidos y pulgar (guantelete en armadura).
    const handSlot = plate ? 'gear' : 'skin';
    out.push({ joint: hand, slot: handSlot, shape: { type: 'ellipsoid', size: [0.075, 0.09, 0.06], segments: 5 }, at: [0.005, -0.04, 0] });
    out.push({ joint: hand, slot: handSlot, shape: { type: 'ellipsoid', size: [0.07, 0.055, 0.058], segments: 5 }, at: [0.022, -0.09, 0] });
    out.push({ joint: hand, slot: handSlot, shape: { type: 'capsule', length: 0.03, radius: 0.016 }, at: [0.035, -0.045, -0.02 * z], rot: [0, 0, -0.9] });
    // Hombreras: de cuero en la túnica, de placas en la armadura.
    if (plate) {
      out.push({ joint: arm, slot: 'gear', shape: { type: 'ellipsoid', size: [0.22 * g, 0.2 * g, 0.22 * g], slice: 0.55, segments: 7 }, at: [0, 0.0, 0.025 * z], rot: [-0.35 * z, 0, 0] });
      out.push({ joint: arm, slot: 'gear', shape: { type: 'ellipsoid', size: [0.2 * g, 0.16 * g, 0.2 * g], slice: 0.5, segments: 6 }, at: [0, -0.06, 0.035 * z], rot: [-0.45 * z, 0, 0], shade: 0.8 });
      out.push({ joint: arm, slot: 'trim', shape: { type: 'torus', diameter: 0.2 * g, thickness: 0.02, tessellation: 12 }, at: [0, 0.0, 0.03 * z], rot: [-0.35 * z, 0, 0] });
    } else if (look.outfit === 'tunic') {
      out.push({ joint: arm, slot: 'trim', shape: { type: 'ellipsoid', size: [0.18 * g, 0.14 * g, 0.18 * g], slice: 0.5, segments: 5 }, at: [0, 0.012, 0.03 * z], rot: [-0.45 * z, 0, 0], shade: 0.8 });
    }
    return out;
  });

  // ── piernas y botas ──────────────────────────────────────────────────────
  both((s) => {
    const leg = `leg${s}`;
    const shin = `shin${s}`;
    const foot = `foot${s}`;
    const bootSlot = plate ? 'gear' : 'trim';
    const bootShade = plate ? 0.85 : robe ? 0.55 : 0.7;
    const out: Part[] = [
      { joint: leg, slot: 'cloth', shade: 0.55, shape: { type: 'capsule', length: 0.3, radius: 0.064 * g, radiusTop: 0.084 * g }, at: [0, -0.18, 0] },
      { joint: shin, slot: 'cloth', shade: 0.55, shape: { type: 'ellipsoid', size: [0.13 * g, 0.12, 0.13 * g], segments: 5 } },
      { joint: shin, slot: 'cloth', shade: 0.55, shape: { type: 'capsule', length: 0.26, radius: 0.046 * g, radiusTop: 0.06 * g }, at: [0, -0.16, 0] },
    ];
    // Caña de la bota con vuelta arriba (más alta en armadura, zapato en la túnica larga).
    const top = robe ? -0.27 : plate ? -0.07 : -0.13;
    const boot: Profile = [[0.056, top - 0.01], [0.075, top], [0.072, top + 0.04], [0.068, top + 0.035], [0.064, -0.3], [0.066, -0.35], [0.05, -0.36]];
    out.push({ joint: shin, slot: bootSlot, shade: bootShade, shape: { type: 'lathe', profile: scaleProfile(boot, g), tessellation: 10 } });
    out.push({ joint: foot, slot: bootSlot, shade: bootShade, shape: { type: 'ellipsoid', size: [0.2, 0.1, 0.115 * g], segments: 6 }, at: [0.045, 0.05, 0] });
    out.push({ joint: foot, slot: bootSlot, shade: bootShade * 0.75, shape: { type: 'ellipsoid', size: [0.21, 0.03, 0.12 * g], segments: 5 }, at: [0.045, 0.012, 0] });
    if (plate) out.push({ joint: shin, slot: 'gear', shape: { type: 'ellipsoid', size: [0.1, 0.12, 0.12], slice: 0.6, segments: 5 }, at: [0.035, 0.0, 0], rot: [0, 0, -1.2] });
    return out;
  });

  // ── cabeza y cara ────────────────────────────────────────────────────────
  // Cabeza de torno: redonda arriba, mofletes llenos y barbilla suave.
  const head: Profile = [
    [0, -0.19], [0.07, -0.186], [0.13, -0.16], [0.172, -0.11], [0.195, -0.04], [0.2, 0.02],
    [0.19, 0.065], [0.172, 0.1], [0.14, 0.143], [0.095, 0.176], [0.045, 0.195], [0, 0.2],
  ];
  parts.push({ joint: 'head', slot: 'skin', shape: { type: 'lathe', profile: scaleProfile(head, HEAD_R / 0.2), tessellation: 18 }, at: HEAD, scale: [0.97, 1, 1] });
  parts.push({ joint: 'head', slot: 'skin', shape: { type: 'ellipsoid', size: [0.04, 0.034, 0.036], segments: 4 }, at: add(HEAD, [0.198, -0.045, 0]) });
  both((_s, z) => [
    { joint: 'head', slot: 'skin', shape: { type: 'ellipsoid', size: [0.05, 0.085, 0.04], segments: 4 }, at: add(HEAD, [-0.01, -0.01, 0.198 * z]) },
    // Ojos grandes (blanco, iris y brillo): van en `eyes` para el parpadeo.
    { joint: 'eyes', slot: 'skin', color: EYE_WHITE, shape: { type: 'ellipsoid', size: [0.03, 0.085, 0.062], segments: 5 }, at: add(HEAD, [0.176, 0.0, 0.07 * z]), rot: [0, -0.37 * z, 0] },
    { joint: 'eyes', slot: 'skin', color: EYE_IRIS, shape: { type: 'ellipsoid', size: [0.022, 0.064, 0.044], segments: 5 }, at: add(HEAD, [0.184, -0.008, 0.072 * z]), rot: [0, -0.37 * z, 0] },
    { joint: 'eyes', slot: 'skin', color: EYE_WHITE, shape: { type: 'ellipsoid', size: [0.012, 0.02, 0.015], segments: 3 }, at: add(HEAD, [0.193, 0.015, 0.062 * z]), rot: [0, -0.37 * z, 0] },
    // Cejas.
    { joint: 'head', slot: 'hair', shade: 0.8, shape: { type: 'capsule', length: 0.045, radius: 0.01, tessellation: 5 }, at: add(HEAD, [0.176, 0.07, 0.075 * z]), rot: [Math.PI / 2 + 0.2 * z, -0.35 * z, 0] },
  ]);
  // Boca: una sonrisa pequeña.
  const smile: V3[] = [];
  for (let i = 0; i <= 6; i++) {
    const zz = -0.032 + (0.064 * i) / 6;
    smile.push(add(HEAD, [0.19 - 2.9 * zz * zz, -0.1 + 4 * zz * zz, zz]));
  }
  parts.push({ joint: 'head', slot: 'skin', color: MOUTH, shape: { type: 'tube', path: smile, radius: 0.0065, tessellation: 4 } });
  if (look.beard) parts.push({ joint: 'head', slot: 'hair', shape: { type: 'ellipsoid', size: [0.2, 0.22, 0.3], segments: 6 }, at: add(HEAD, [0.11, -0.15, 0]) });

  parts.push(...hairParts(look));
  parts.push(...headgearParts(look));
  if (look.cape) parts.push(capePart(g), ...capeClasps(g));
  parts.push(...weaponParts(look));
  return parts;
}

/** Peinados: casquete común, flequillo y la pieza propia de cada estilo. */
function hairParts(look: CharacterLook): Part[] {
  const style = look.hairStyle;
  if (style === 'bald') return [];
  // Bajo el yelmo no asoma pelo; bajo la capucha, sólo el flequillo.
  if (look.headgear === 'helm') return [];
  const covered = look.headgear === 'hood';
  const out: Part[] = [];
  // Casquete inclinado hacia atrás: deja la frente al aire y baja por la nuca.
  if (!covered) out.push({ joint: 'head', slot: 'hair', shape: { type: 'ellipsoid', size: [0.45, 0.455, 0.45], slice: 0.58, segments: 8 }, at: add(HEAD, [-0.012, 0.0, 0]), rot: [0, 0, 0.6] });
  // Flequillo: tres mechones sobre la frente.
  for (const [zz, tilt] of [[0, 0], [0.085, 0.35], [-0.085, -0.35]] as const) {
    out.push({ joint: 'head', slot: 'hair', shape: { type: 'ellipsoid', size: [0.09, 0.14, 0.11], segments: 5 }, at: add(HEAD, [0.155, 0.115, zz]), rot: [tilt, 0, -0.55] });
  }
  if (covered) return out;
  switch (style) {
    case 'spiky':
      // Puntas que salen del casquete hacia arriba y atrás.
      for (const [rz, rx] of [[0.25, 0], [0.85, 0], [1.45, 0], [0.55, 0.75], [0.55, -0.75], [1.15, 0.85], [1.15, -0.85], [0.0, 0.5], [0.0, -0.5]] as const) {
        const dir = tilt(rx, rz);
        out.push({ joint: 'head', slot: 'hair', shape: { type: 'cone', height: 0.2, diameter: 0.11, tessellation: 6 }, at: add(HEAD, [dir[0] * 0.22 - 0.01, dir[1] * 0.22, dir[2] * 0.22]), rot: [rx, 0, rz] });
      }
      break;
    case 'long':
      // Melena por la espalda y mechones a los lados de la cara.
      out.push({ joint: 'head', slot: 'hair', shape: { type: 'ellipsoid', size: [0.22, 0.52, 0.4], segments: 7 }, at: add(HEAD, [-0.12, -0.16, 0]), rot: [0, 0, -0.12] });
      out.push({ joint: 'head', slot: 'hair', shape: { type: 'ellipsoid', size: [0.08, 0.3, 0.07], segments: 5 }, at: add(HEAD, [0.08, -0.08, 0.185]) });
      out.push({ joint: 'head', slot: 'hair', shape: { type: 'ellipsoid', size: [0.08, 0.3, 0.07], segments: 5 }, at: add(HEAD, [0.08, -0.08, -0.185]) });
      break;
    case 'ponytail':
      out.push({ joint: 'head', slot: 'trim', shape: { type: 'torus', diameter: 0.07, thickness: 0.025, tessellation: 10 }, at: add(HEAD, [-0.21, 0.04, 0]), rot: [0, 0, Math.PI / 2 - 0.4] });
      out.push({ joint: 'head', slot: 'hair', shape: { type: 'capsule', length: 0.28, radius: 0.032, radiusTop: 0.05 }, at: add(HEAD, [-0.27, -0.1, 0]), rot: [0, 0, -0.35] });
      break;
    case 'bun':
      out.push({ joint: 'head', slot: 'hair', shape: { type: 'ellipsoid', size: [0.17, 0.16, 0.17], segments: 6 }, at: add(HEAD, [-0.14, 0.17, 0]) });
      out.push({ joint: 'head', slot: 'trim', shape: { type: 'torus', diameter: 0.13, thickness: 0.02, tessellation: 10 }, at: add(HEAD, [-0.12, 0.14, 0]), rot: [0, 0, 0.8] });
      break;
    case 'short':
      out.push({ joint: 'head', slot: 'hair', shape: { type: 'ellipsoid', size: [0.12, 0.13, 0.36], segments: 5 }, at: add(HEAD, [-0.17, -0.06, 0]) });
      break;
  }
  return out;
}

/** Dirección (0, 1, 0) girada por (rx, 0, rz) como lo hace Babylon. */
function tilt(rx: number, rz: number): V3 {
  // Giro Z (alrededor del eje del rig) y después X.
  const x = -Math.sin(rz);
  const y = Math.cos(rz);
  return [x, y * Math.cos(rx), y * Math.sin(rx)];
}

function headgearParts(look: CharacterLook): Part[] {
  switch (look.headgear) {
    case 'none':
      return [];
    case 'band':
      return [{ joint: 'head', slot: 'trim', shape: { type: 'torus', diameter: 0.42, thickness: 0.03, tessellation: 16 }, at: add(HEAD, [-0.005, 0.07, 0]), rot: [0, 0, 0.35] }];
    case 'hood':
      // Capucha abierta por delante (de dos caras) y su caída sobre la espalda.
      return [
        { joint: 'head', slot: 'cloth', shape: { type: 'ellipsoid', size: [0.5, 0.5, 0.49], slice: 0.66, segments: 10, doubleSided: true }, at: add(HEAD, [-0.03, 0.01, 0]), rot: [0, 0, 1.05] },
        { joint: 'head', slot: 'trim', shape: { type: 'torus', diameter: 0.47, thickness: 0.03, tessellation: 18 }, at: add(HEAD, [0.04, -0.03, 0]), rot: [0, 0, 1.05] },
        { joint: 'head', slot: 'cloth', shade: 0.85, shape: { type: 'ellipsoid', size: [0.3, 0.34, 0.44], segments: 7 }, at: add(HEAD, [-0.14, -0.17, 0]) },
      ];
    case 'helm':
      return [
        { joint: 'head', slot: 'gear', shape: { type: 'ellipsoid', size: [0.45, 0.42, 0.45], slice: 0.55, segments: 9 }, at: add(HEAD, [0, 0.025, 0]), rot: [0, 0, 0.12] },
        { joint: 'head', slot: 'trim', shape: { type: 'torus', diameter: 0.43, thickness: 0.035, tessellation: 18 }, at: add(HEAD, [0.0, 0.03, 0]), rot: [0, 0, 0.12] },
        { joint: 'head', slot: 'gear', shape: { type: 'box', size: [0.02, 0.1, 0.03] }, at: add(HEAD, [0.215, -0.02, 0]) },
        { joint: 'head', slot: 'trim', shape: { type: 'ellipsoid', size: [0.32, 0.1, 0.035], segments: 5 }, at: add(HEAD, [-0.02, 0.23, 0]) },
      ];
  }
}

/** Capa: cinta curvada por detrás, del ancho de los hombros al de las rodillas. */
function capePart(g: number): Part {
  const rows: V3[][] = [];
  const steps = 6;
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    const y = Y.shoulder + 0.03 - t * 0.95 - Y.chest; // espacio del pecho
    const half = (0.2 + t * 0.12) * g; // media anchura
    const depth = -(0.115 + 0.08 * t) * g; // se separa del cuerpo al bajar
    const row: V3[] = [];
    for (let j = 0; j <= steps; j++) {
      const a = -1 + (2 * j) / steps;
      // Curvada: el centro, más atrás; los bordes envuelven los hombros.
      row.push([depth - (1 - a * a) * 0.035 + Math.abs(a) * 0.05, y, a * half]);
    }
    rows.push(row);
  }
  return { joint: 'chest', slot: 'cloth', shade: 0.8, shape: { type: 'ribbon', rows }, weights: capeWeights };
}

/** Broches de la capa, delante de los hombros. */
function capeClasps(g: number): Part[] {
  return [1, -1].map((z) => ({ joint: 'chest', slot: 'gear', shape: { type: 'ellipsoid', size: [0.05, 0.05, 0.05], segments: 4 }, at: [0.075 * g, 0.18, 0.12 * z * g] }) as Part);
}

/** Arma en la mano derecha y escudo en la izquierda. */
function weaponParts(look: CharacterLook): Part[] {
  const out: Part[] = [];
  const grip: V3 = [0.01, -0.07, 0];
  const wood = { slot: 'trim' as const, shade: 0.55 };
  switch (look.weapon) {
    case 'none':
      break;
    case 'sword':
      // Puño en el eje del antebrazo girado: la hoja sale hacia delante desde el pulgar.
      out.push({ joint: 'handR', slot: 'trim', shade: 0.6, shape: { type: 'capsule', length: 0.1, radius: 0.017, tessellation: 6 }, at: grip, rot: [0, 0, Math.PI / 2] });
      out.push({ joint: 'handR', slot: 'gear', shape: { type: 'ellipsoid', size: [0.04, 0.04, 0.04], segments: 4 }, at: add(grip, [-0.07, 0, 0]) });
      out.push({ joint: 'handR', slot: 'trim', shape: { type: 'capsule', length: 0.14, radius: 0.016, tessellation: 6 }, at: add(grip, [0.065, 0, 0]), rot: [Math.PI / 2, 0, 0] });
      out.push({ joint: 'handR', slot: 'gear', shape: { type: 'lathe', profile: [[0.036, 0], [0.034, 0.5], [0.0, 0.62]], tessellation: 4 }, at: add(grip, [0.07, 0, 0]), rot: [0, 0, -Math.PI / 2], scale: [1, 1, 0.28] });
      break;
    case 'axe':
      out.push({ joint: 'handR', ...wood, shape: { type: 'capsule', length: 0.62, radius: 0.02, tessellation: 6 }, at: add(grip, [0.2, 0, 0]), rot: [0, 0, Math.PI / 2] });
      out.push({ joint: 'handR', slot: 'gear', shape: { type: 'ellipsoid', size: [0.13, 0.22, 0.035], segments: 5 }, at: add(grip, [0.44, 0.08, 0]) });
      break;
    case 'mace':
      out.push({ joint: 'handR', ...wood, shape: { type: 'capsule', length: 0.42, radius: 0.02, tessellation: 6 }, at: add(grip, [0.13, 0, 0]), rot: [0, 0, Math.PI / 2] });
      out.push({ joint: 'handR', slot: 'gear', shape: { type: 'ellipsoid', size: [0.13, 0.13, 0.13], segments: 6 }, at: add(grip, [0.38, 0, 0]) });
      for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        out.push({ joint: 'handR', slot: 'gear', shade: 0.8, shape: { type: 'cone', height: 0.07, diameter: 0.045, tessellation: 5 }, at: add(grip, [0.38, Math.cos(r) * 0.07, Math.sin(r) * 0.07]), rot: [r, 0, 0] });
      }
      break;
    case 'staff':
      // Vara larga a lo largo del brazo, con dos garfios que sujetan un cristal que brilla.
      out.push({ joint: 'handR', ...wood, shape: { type: 'capsule', length: 1.45, radius: 0.022, radiusTop: 0.028, tessellation: 6 }, at: add(grip, [0, 0.3, 0]) });
      out.push({ joint: 'handR', ...wood, shape: { type: 'cone', height: 0.18, diameter: 0.05, tessellation: 5 }, at: add(grip, [0.045, 1.08, 0]), rot: [0, 0, -0.45] });
      out.push({ joint: 'handR', ...wood, shape: { type: 'cone', height: 0.18, diameter: 0.05, tessellation: 5 }, at: add(grip, [-0.045, 1.08, 0]), rot: [0, 0, 0.45] });
      out.push({ joint: 'handR', slot: 'gear', glow: true, shape: { type: 'ellipsoid', size: [0.09, 0.15, 0.09], segments: 5 }, at: add(grip, [0, 1.13, 0]) });
      break;
    case 'wand':
      out.push({ joint: 'handR', ...wood, shape: { type: 'capsule', length: 0.3, radius: 0.012, radiusTop: 0.016, tessellation: 5 }, at: add(grip, [0.1, 0, 0]), rot: [0, 0, -Math.PI / 2] });
      out.push({ joint: 'handR', slot: 'gear', glow: true, shape: { type: 'ellipsoid', size: [0.05, 0.05, 0.05], segments: 4 }, at: add(grip, [0.27, 0, 0]) });
      break;
    case 'orb':
      out.push({ joint: 'handR', slot: 'gear', glow: true, shape: { type: 'ellipsoid', size: [0.15, 0.15, 0.15], segments: 7 }, at: add(grip, [0.06, 0.03, 0]) });
      out.push({ joint: 'handR', slot: 'trim', shape: { type: 'torus', diameter: 0.19, thickness: 0.012, tessellation: 16 }, at: add(grip, [0.06, 0.03, 0]), rot: [0.5, 0, 0.4] });
      break;
  }
  if (look.offhand === 'shield') {
    // Rodela: disco abombado hacia fuera (+Z, la izquierda), con umbo y aro de metal.
    const face: Profile = [[0, 0.05], [0.12, 0.042], [0.22, 0.018], [0.235, 0.0], [0.2, -0.012], [0, -0.014]];
    const at: V3 = [0.02, -0.07, 0.07];
    out.push({ joint: 'handL', slot: 'trim', shade: 0.8, shape: { type: 'lathe', profile: face, tessellation: 16 }, at, rot: [Math.PI / 2, 0, 0] });
    out.push({ joint: 'handL', slot: 'gear', shape: { type: 'torus', diameter: 0.46, thickness: 0.03, tessellation: 18 }, at, rot: [Math.PI / 2, 0, 0] });
    out.push({ joint: 'handL', slot: 'gear', shape: { type: 'ellipsoid', size: [0.09, 0.09, 0.05], segments: 5 }, at: add(at, [0, 0, 0.05]) });
  }
  return out;
}
