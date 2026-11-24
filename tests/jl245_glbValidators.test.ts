import { describe, it, expect, beforeAll } from 'vitest';
import { readdir } from 'fs/promises';
import { join } from 'path';

const projectRoot = join(import.meta.dirname, '..');
const modelsDir = join(projectRoot, 'assets', 'models');
const blenderDir = join(projectRoot, 'scripts', 'blender');

/**
 * JL-245: Cada GLB de assets/models/ tiene su scripts/blender/validar_<modelo>.py,
 * o está en una lista de excepciones con su motivo.
 *
 * Los validadores de grupo (fauna_chame, enemigos, criptas_variantes…) cubren
 * varios GLB cada uno. Esta prueba solo verifica la cobertura estática:
 * que cada GLB aparece en algún validador o en la lista de excepciones.
 */

// GLB cubiertos por validadores de grupo (no detectables por nombre de archivo)
const GROUP_COVERED = new Set([
  // validar_fauna_chame.py
  'caiman.glb', 'garza.glb',
  // validar_fauna_darien.py
  'neque.glb', 'tapir.glb',
  // validar_fauna_baru.py
  'jaguar.glb', 'jaguar_anciano.glb',
  // validar_fauna_cerropunta.py
  'pecari.glb', 'jabali.glb',
  // validar_fauna_perlas.py
  'ostra.glb', 'calamar.glb',
  // validar_fauna_perlas2.py
  'medusa.glb', 'tiburon.glb',
  // validar_fauna_espiritus.py
  'alma.glb', 'chitra.glb', 'jiron.glb',
  // validar_fauna_medusa_zancudo.py
  'zancudo.glb',
  // validar_fauna_aves.py
  'ave_gallote.glb', 'ave_tijereta.glb', 'quetzal.glb', 'buho.glb', 'pavo_griton.glb',
  // validar_enemigos.py
  'arquero.glb', 'bestia.glb', 'duende_tirapiedras.glb', 'diablillo.glb', 'copito.glb', 'brasita.glb',
  // validar_brujas_sirena.py
  'bruja_bajareque.glb', 'bruja_manglar.glb', 'bruja_perlas.glb', 'sirena_desafinada.glb',
  // validar_chamanes.py
  'chaman.glb', 'chamn_neblina.glb', 'brujo_darien.glb', 'brujo_escarchado.glb', 'curandero_huesos.glb',
  // validar_gente_del_cafe.py
  'capataz_cafetal.glb', 'recolector_cafe.glb', 'chofer_sin_frenos.glb',
  // validar_gente_del_mar.py
  'pirata_bocanas.glb', 'marinero_ahogado.glb', 'capitan_calipso.glb',
  // validar_gigantes.py
  'coloso_embalse.glb', 'yeti_baru.glb', 'vigia_crater.glb', 'ventarron.glb',
  // validar_tiradores.py
  'cerbatanero_tapon.glb', 'fresero_tirador.glb', 'trampero_matorral.glb', 'pescador_fantasma.glb',
  // validar_lobos.py
  'tigrillo_ceniza.glb', 'coyote_helada.glb', 'buho_chismoso.glb',
  // validar_ranas_cocla.py
  'rana_venenosa.glb', 'rana_ojirroja.glb', 'sapo_canaveral.glb', 'rana_dorada.glb',
  // validar_espantos_ancon.py
  'sato_jefe.glb', 'mono_titi.glb', 'gotita.glb',
  // validar_mascotas.py
  'tortuga.glb', 'perla.glb',
  // validar_aguilas_darien.py
  'aguila_negra.glb', 'aguila_ornada.glb', 'aguila_crestada.glb',
  // validar_criptas_variantes.py (BASE_CLIPS × EMISIVOS)
  'cripta_rata.glb', 'cripta_rata_cueva.glb', 'cripta_rata_huaca.glb',
  'cripta_bruto.glb', 'cripta_bruto_cueva.glb', 'cripta_bruto_huaca.glb',
  'cripta_guardian.glb', 'cripta_guardian_cueva.glb', 'cripta_guardian_huaca.glb',
  // validar_cazador_anime.py
  'cazador_anime.glb', 'cazador_f_anime.glb',
  // validar_vegetacion_lod.py también cubre vegetacion.glb
  'vegetacion.glb',
  // validar_casa_creador.py cubre las variantes de la casa
  'casa_creador_espejo.glb', 'casa_creador_espejo_interior.glb', 'casa_creador_interior.glb',
  // validar_tramos_cripta.py, validar_rompibles.py, validar_entrada_cripta.py, validar_antorchas.py
  // validan mazmorra.glb
  'mazmorra.glb',
  // validar_portero_cripta.py
  'npc_portero_cripta.glb',
  // validar_hilo_retorno.py
  'prop_hilo_retorno.glb',
]);

// Excepciones: GLB sin validador dedicado, con motivo
const EXCEPTIONS: Record<string, string> = {
  // Héroes base (no-anime): validador heroes_cc0.py trabaja en heroes_cc0/, no en assets/models/
  'cazador.glb': 'Héroe base; validador heroes_cc0.py trabaja en subdirectorio heroes_cc0/',
  'cazador_f.glb': 'Héroe base; validador heroes_cc0.py trabaja en subdirectorio heroes_cc0/',
  'centinela.glb': 'Héroe base; validador heroes_cc0.py trabaja en subdirectorio heroes_cc0/',
  'centinela_f.glb': 'Héroe base; validador heroes_cc0.py trabaja en subdirectorio heroes_cc0/',
  'oraculo.glb': 'Héroe base; validador heroes_cc0.py trabaja en subdirectorio heroes_cc0/',
  'oraculo_f.glb': 'Héroe base; validador heroes_cc0.py trabaja en subdirectorio heroes_cc0/',
  // Héroes anime sin validador propio
  'centinela_anime.glb': 'Héroe anime; sin validador dedicado (pendiente OMP)',
  'centinela_f_anime.glb': 'Héroe anime; sin validador dedicado (pendiente OMP)',
  'oraculo_anime.glb': 'Héroe anime; sin validador dedicado (pendiente OMP)',
  'oraculo_f_anime.glb': 'Héroe anime; sin validador dedicado (pendiente OMP)',
  // Estructuras del mundo (no son personajes ni enemigos)
  'casa.glb': 'Estructura genérica del mundo; sin contrato de validación',
  'casa_dorada.glb': 'Estructura decorativa; sin contrato de validación',
  'castillo.glb': 'Estructura del editor; sin contrato de validación',
  'iglesia.glb': 'Estructura del editor; sin contrato de validación',
  // Props de mazmorra (nodos individuales exportados)
  'cofre.glb': 'Prop de mazmorra; validado por validar_tramos_cripta.py en mazmorra.glb',
  'pozo.glb': 'Prop de mazmorra; validado por validar_tramos_cripta.py en mazmorra.glb',
  'estandarte.glb': 'Prop de mazmorra; validado por validar_tramos_cripta.py en mazmorra.glb',
  'estandarte_castillo.glb': 'Prop de mazmorra; validado por validar_tramos_cripta.py en mazmorra.glb',
  'farola.glb': 'Prop de iluminación; sin contrato de validación',
  'interiores.glb': 'Kit de interiores; sin contrato de validación',
  'trapiche.glb': 'Prop decorativo; sin contrato de validación',
  // Modelos especiales
  'fantasma.glb': 'Enemigo especial; sin validador dedicado (JL-90 documenta clips faltantes)',
  'lancha.glb': 'Vehículo; sin contrato de validación',
  'montura.glb': 'Kit genérico de montura; sin clips propios',
  'objetos.glb': 'Catálogo de objetos; sin contrato de validación',
  // Enemigos sin validador de grupo
  'arquero_ventisca.glb': 'Enemigo; sin validador de grupo asignado',
  'diablo_rojo.glb': 'Enemigo; sin validador de grupo asignado',
  'hechicero_volcan.glb': 'Enemigo; sin validador de grupo asignado',
  'zorro.glb': 'Enemigo; sin validador de grupo asignado',
};

describe('JL-245: cobertura de validadores Blender para GLB', () => {
  let glbFiles: string[] = [];
  let validatorFiles: string[] = [];

  beforeAll(async () => {
    glbFiles = (await readdir(modelsDir))
      .filter((f) => f.endsWith('.glb'))
      .sort();

    validatorFiles = (await readdir(blenderDir))
      .filter((f) => f.startsWith('validar_') && f.endsWith('.py'))
      .sort();
  });

  it('tiene al menos un validador por GLB o una excepción documentada', () => {
    const uncovered: string[] = [];

    for (const glb of glbFiles) {
      const name = glb.replace('.glb', '');

      // 1. ¿Hay un validador directo?
      const directValidator = `validar_${name}.py`;
      if (validatorFiles.includes(directValidator)) {
        continue;
      }

      // 2. ¿Está en un grupo?
      if (GROUP_COVERED.has(glb)) {
        continue;
      }

      // 3. ¿Es una excepción documentada?
      if (EXCEPTIONS[glb]) {
        continue;
      }

      uncovered.push(glb);
    }

    expect(uncovered, 'GLB sin validador ni excepción').toEqual([]);
  });

  it('cada excepción existe como archivo', () => {
    for (const glb of Object.keys(EXCEPTIONS)) {
      expect(
        glbFiles.includes(glb),
        `${glb} está en EXCEPTIONS pero no existe en assets/models/`
      ).toBe(true);
    }
  });

  it('cada grupo cubierto existe como archivo', () => {
    for (const glb of GROUP_COVERED) {
      expect(
        glbFiles.includes(glb),
        `${glb} está en GROUP_COVERED pero no existe en assets/models/`
      ).toBe(true);
    }
  });

  it('la cobertura es mayoritaria', () => {
    const covered = glbFiles.length - Object.keys(EXCEPTIONS).length;
    expect(
      covered / glbFiles.length,
      `Solo ${covered}/${glbFiles.length} GLB con validador`
    ).toBeGreaterThan(0.7);
  });

  it('lista de excepciones con motivo', () => {
    // Esta prueba siempre pasa; su propósito es documentar la lista
    const summary = Object.entries(EXCEPTIONS)
      .map(([glb, motivo]) => `  ${glb}: ${motivo}`)
      .join('\n');
    expect(summary.length).toBeGreaterThan(0);
  });
});
