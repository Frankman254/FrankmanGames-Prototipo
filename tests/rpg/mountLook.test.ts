// Diostedé: «Cambiar apariencia» elige una de las variantes de color sin tocar el objeto ni el modelo.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import { DEV_CRESTALBA_ID, DEV_DIOSTEDE_ID } from '../../src/rpg/devMount';
import { customMountColors, isCustomMountLook, MOUNT_CAMO } from '../../src/rpg/mountColor';
import { GameSession } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';

const data = loadGameData();
const palette = JSON.parse(readFileSync('data/art/diostede_variantes.json', 'utf8')) as {
    regiones: string[];
    variantes: Record<string, Record<string, unknown>>;
};
const crestalba = JSON.parse(readFileSync('data/art/crestalba_variantes.json', 'utf8')) as {
    regiones: string[];
    variantes: Record<string, Record<string, unknown>>;
};

function setup(): { s: GameSession; c: Character; uid: string } {
    const rng = new Rng(3);
    const c = Character.create(data.rpg, 'storm_weaver', 'Prueba', rng);
    const s = new GameSession(data.rpg, c, rng);
    c.give(DEV_DIOSTEDE_ID, 1);
    const uid = c.inventory.slots.find((i) => i?.itemId === DEV_DIOSTEDE_ID)!.uid;
    return { s, c, uid };
}

describe('Diostedé: apariencias', () => {
    it('ofrece las diez variantes de la paleta, todas con sus siete regiones de color', () => {
        const m = data.rpg.items[DEV_DIOSTEDE_ID]!.mount!;
        expect(m.model).toBe('diostede');
        expect(m.variants).toEqual(Object.keys(palette.variantes));
        expect(m.variants).toHaveLength(10);
        expect(m.variants).toContain(m.variant);
        for (const id of m.variants!)
            for (const r of palette.regiones)
                expect(String(palette.variantes[id]![r]), `${id}.${r}`).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('cambia la apariencia en la mochila y puesta, y rechaza las que no tiene', () => {
        const { s, c, uid } = setup();
        expect(s.setItemLook(uid, 'negro_ebano').ok).toBe(true);
        expect(c.inventory.find(uid)!.look).toBe('negro_ebano');
        expect(s.setItemLook(uid, 'arcoiris').ok).toBe(false);
        expect(s.equip(uid, 'mount').ok).toBe(true);
        expect(s.setItemLook(uid, 'blanco_perla').ok).toBe(true);
        expect(c.equipment.slots.mount!.look).toBe('blanco_perla');
        // Volver a la de por defecto no deja marca.
        expect(s.setItemLook(uid, 'turquesa_clasica').ok).toBe(true);
        expect(c.equipment.slots.mount!.look).toBeUndefined();
    });

    it('la elección se guarda y se recupera', () => {
        const { s, uid } = setup();
        s.setItemLook(uid, 'rosa_sakura');
        const save = s.save();
        const back = Character.fromSave(data.rpg, save, new Rng(4));
        expect(back.inventory.find(uid)!.look).toBe('rosa_sakura');
    });

    it('un objeto sin variantes no cambia de apariencia', () => {
        const { s, c } = setup();
        c.give('mount_horse', 1);
        const horse = c.inventory.slots.find((i) => i?.itemId === 'mount_horse')!.uid;
        expect(s.setItemLook(horse, 'negro_ebano').ok).toBe(false);
    });
});

describe('modo camuflaje y color fijo (creador, 2026-11-17)', () => {
    const base = Object.fromEntries(
        crestalba.regiones.map((r) => [r, String(crestalba.variantes['turquesa_clasica']![r])]),
    );

    it('acepta camuflaje y cualquier #rrggbb en una montura con paleta, y los guarda', () => {
        const { s, c, uid } = setup();
        expect(s.setItemLook(uid, MOUNT_CAMO).ok).toBe(true);
        expect(c.inventory.find(uid)!.look).toBe(MOUNT_CAMO);
        expect(s.setItemLook(uid, '#12ab9f').ok).toBe(true);
        expect(Character.fromSave(data.rpg, s.save(), new Rng(4)).inventory.find(uid)!.look).toBe('#12ab9f');
        expect(s.setItemLook(uid, '#12ab9').ok).toBe(false);
        expect(s.setItemLook(uid, 'rojo').ok).toBe(false);
    });

    it('una montura sin paleta no acepta ni camuflaje ni color fijo', () => {
        const { s, c } = setup();
        c.give('mount_horse', 1);
        const horse = c.inventory.slots.find((i) => i?.itemId === 'mount_horse')!.uid;
        expect(s.setItemLook(horse, MOUNT_CAMO).ok).toBe(false);
        expect(s.setItemLook(horse, '#ff0000').ok).toBe(false);
    });

    it('el camuflaje toma la ropa y el adorno del jinete; pico, cuero y herrajes no cambian', () => {
        const out = customMountColors(MOUNT_CAMO, base, { cloth: '9c2f2f', trim: '33416e' })!;
        expect(out['plumaje_secundario']).toBe('#9c2f2f');
        expect(out['mascara_facial']).not.toBe(base['mascara_facial']);
        for (const r of ['pico_garras', 'cuero_silla', 'herrajes']) expect(out[r], r).toBe(base[r]);
        for (const v of Object.values(out)) expect(v).toMatch(/^#[0-9a-f]{6}$/);
        // Sin colores del jinete no hay camuflaje: se queda la variante.
        expect(customMountColors(MOUNT_CAMO, base, null)).toBeNull();
    });

    it('el color fijo pinta el plumaje secundario y aclara el pecho; una variante no es color propio', () => {
        const out = customMountColors('#3a8fd0', base, null)!;
        expect(out['plumaje_secundario']).toBe('#3a8fd0');
        const lum = (h: string): number =>
            parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5), 16);
        expect(lum(out['pecho_cresta']!)).toBeGreaterThan(lum('#3a8fd0'));
        expect(lum(out['mascara_facial']!)).toBeLessThan(lum('#3a8fd0'));
        expect(customMountColors('rojo_carmesi', base, null)).toBeNull();
        expect(isCustomMountLook('#3a8fd0') && isCustomMountLook(MOUNT_CAMO) && !isCustomMountLook('azul')).toBe(true);
    });
});

describe('Crestalba: apariencias', () => {
    it('usa la misma geometría con diez variantes completas y estables', () => {
        const m = data.rpg.items[DEV_CRESTALBA_ID]!.mount!;
        expect(m.model).toBe('crestalba');
        expect(m.variants).toEqual(Object.keys(crestalba.variantes));
        expect(m.variants).toHaveLength(10);
        expect(m.variants).toContain(m.variant);
        for (const id of m.variants!)
            for (const r of crestalba.regiones)
                expect(String(crestalba.variantes[id]![r]), `${id}.${r}`).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('guarda una apariencia elegida para la nueva montura', () => {
        const rng = new Rng(7);
        const c = Character.create(data.rpg, 'storm_weaver', 'Prueba', rng);
        const s = new GameSession(data.rpg, c, rng);
        c.give(DEV_CRESTALBA_ID, 1);
        const uid = c.inventory.slots.find((i) => i?.itemId === DEV_CRESTALBA_ID)!.uid;
        expect(s.setItemLook(uid, 'oceano_profundo').ok).toBe(true);
        expect(Character.fromSave(data.rpg, s.save(), new Rng(8)).inventory.find(uid)!.look).toBe('oceano_profundo');
    });
});
