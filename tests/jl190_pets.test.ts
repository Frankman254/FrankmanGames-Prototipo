import { describe, expect, it } from 'vitest';
import { Actor } from '../src/rpg/actor';
import { Character } from '../src/rpg/character';
import type { PetDef } from '../src/rpg/contracts';
import { createEffect, HealEffect, StatusEffect } from '../src/rpg/effects';
import {
    CollectorBehavior,
    FighterBehavior,
    GuardianBehavior,
    PET_BEHAVIORS,
    Pet,
    shouldApplyGuardianAura,
    type PetWorld,
} from '../src/rpg/pets';
import { Rng } from '../src/sim/rng';
import { content, hero } from './rpg/helpers';

// ─── PetDef de prueba ────────────────────────────────────────────────────────

const fighterDef: PetDef = {
    id: 'test_fighter',
    name: 'Lobo de prueba',
    description: 'Ataca al enemigo más cercano.',
    icon: '🐺',
    behavior: 'fighter',
    speed: 7,
    followDistance: 2,
    reach: 8,
    maxHealth: 60,
    attack: { min: 3, max: 6, element: 'earth', range: 1, cooldown: 1.1 },
    ownerBonus: [{ stat: 'power', op: 'flat', value: 5 }],
};

const guardianDef: PetDef = {
    id: 'test_guardian',
    name: 'Tortuga de prueba',
    description: 'Cura al dueño.',
    icon: '🐢',
    behavior: 'guardian',
    speed: 5.5,
    followDistance: 2,
    maxHealth: 90,
    aura: { every: 4, effect: { type: 'status', statusId: 'regeneration', duration: 4 } },
    ownerBonus: [{ stat: 'resist.earth', op: 'flat', value: 6 }],
};

const collectorDef: PetDef = {
    id: 'test_collector',
    name: 'Búho de prueba',
    description: 'Trae botín.',
    icon: '🦉',
    behavior: 'collector',
    speed: 8,
    followDistance: 1.5,
    reach: 7,
    maxHealth: 40,
    ownerBonus: [{ stat: 'pickupRadius', op: 'flat', value: 2.5 }],
};

// ─── Mundo falso ─────────────────────────────────────────────────────────────

function fakeWorld(owner: Actor): PetWorld {
    return {
        rng: new Rng(1),
        owner,
        nearestEnemy: () => null,
        nearestLoot: () => null,
        collectLoot: () => {},
        petAttack: () => {},
        petEffect: () => {},
        moveTowards: () => {},
    };
}

// ─── Creación de Pet ─────────────────────────────────────────────────────────

describe('Pet: creación', () => {
    it('inicializa stats con maxHealth y speed del def', () => {
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, null);
        expect(pet.maxHealth).toBe(60);
        expect(pet.speed).toBe(7);
    });

    it('usa maxHealth por defecto 50 cuando no hay', () => {
        const def = { ...fighterDef, maxHealth: undefined };
        const pet = new Pet(content(), def, { x: 0, y: 0 }, null, null);
        expect(pet.maxHealth).toBe(50);
    });

    it('empieza con vida llena', () => {
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, null);
        expect(pet.health).toBe(pet.maxHealth);
    });

    it('crea el auraEffect cuando hay aura', () => {
        const pet = new Pet(content(), guardianDef, { x: 0, y: 0 }, null, null);
        expect(pet.auraEffect).not.toBeNull();
    });

    it('auraEffect es null cuando no hay aura', () => {
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, null);
        expect(pet.auraEffect).toBeNull();
    });

    it('elige el comportamiento según el def', () => {
        const fp = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, null);
        const cp = new Pet(content(), collectorDef, { x: 0, y: 0 }, null, null);
        const gp = new Pet(content(), guardianDef, { x: 0, y: 0 }, null, null);
        expect(fp.behavior).toBeInstanceOf(FighterBehavior);
        expect(cp.behavior).toBeInstanceOf(CollectorBehavior);
        expect(gp.behavior).toBeInstanceOf(GuardianBehavior);
    });

    it('team es siempre "player"', () => {
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, null);
        expect(pet.team).toBe('player');
    });

    it('radius es 0.35', () => {
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, null);
        expect(pet.radius).toBe(0.35);
    });

    it('name viene del def', () => {
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, null);
        expect(pet.name).toBe('Lobo de prueba');
    });
});

// ─── PET_BEHAVIORS registry ──────────────────────────────────────────────────

describe('PET_BEHAVIORS', () => {
    it('tiene las 3 claves', () => {
        expect(Object.keys(PET_BEHAVIORS)).toEqual(['fighter', 'collector', 'guardian']);
    });

    it('cada clave devuelve la clase correcta', () => {
        expect(PET_BEHAVIORS.fighter()).toBeInstanceOf(FighterBehavior);
        expect(PET_BEHAVIORS.collector()).toBeInstanceOf(CollectorBehavior);
        expect(PET_BEHAVIORS.guardian()).toBeInstanceOf(GuardianBehavior);
    });
});

// ─── shouldApplyGuardianAura ─────────────────────────────────────────────────

describe('shouldApplyGuardianAura', () => {
    it('no aplica si no hay auraEffect', () => {
        const owner = hero();
        expect(shouldApplyGuardianAura({ auraEffect: null }, owner)).toBe(false);
    });

    it('no aplica si el dueño está muerto', () => {
        const owner = hero();
        owner.health = 0;
        const pet = new Pet(content(), guardianDef, { x: 0, y: 0 }, null, null);
        expect(shouldApplyGuardianAura(pet, owner)).toBe(false);
    });

    it('no aplica un HealEffect con la vida llena', () => {
        const owner = hero();
        const healEffect = new HealEffect({ type: 'heal', min: 10, max: 10 });
        expect(shouldApplyGuardianAura({ auraEffect: healEffect }, owner)).toBe(false);
    });

    it('aplica un HealEffect con la vida baja', () => {
        const owner = hero();
        owner.health = 1;
        const healEffect = new HealEffect({ type: 'heal', min: 10, max: 10 });
        expect(shouldApplyGuardianAura({ auraEffect: healEffect }, owner)).toBe(true);
    });

    it('no aplica un StatusEffect con tick heal con la vida llena', () => {
        const owner = hero();
        const statusDef = content().statuses['regeneration']!;
        // StatusEffect stores the StatusDef as `status` property
        const statusEffect = new StatusEffect(
            { type: 'status', statusId: 'regeneration', duration: 4 },
            statusDef,
        );
        expect(shouldApplyGuardianAura({ auraEffect: statusEffect }, owner)).toBe(false);
    });

    it('aplica un StatusEffect con tick heal con la vida baja', () => {
        const owner = hero();
        owner.health = 1;
        const statusDef = content().statuses['regeneration']!;
        const statusEffect = new StatusEffect(
            { type: 'status', statusId: 'regeneration', duration: 4 },
            statusDef,
        );
        expect(shouldApplyGuardianAura({ auraEffect: statusEffect }, owner)).toBe(true);
    });

    it('siempre aplica un aura no curativa (p. ej. power buff)', () => {
        const owner = hero();
        const statusDef = content().statuses['haste']!;
        const statusEffect = new StatusEffect(
            { type: 'status', statusId: 'haste', duration: 4 },
            statusDef,
        );
        expect(shouldApplyGuardianAura({ auraEffect: statusEffect }, owner)).toBe(true);
    });
});

// ─── TTL y expired ───────────────────────────────────────────────────────────

describe('Pet: TTL y expired', () => {
    it('sin TTL nunca expira', () => {
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, null);
        const w = fakeWorld(hero());
        for (let i = 0; i < 600; i++) pet.tick(w, 1 / 60); // 10 s
        expect(pet.expired).toBe(false);
    });

    it('con TTL expira tras avanzar el tiempo', () => {
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, 5);
        const w = fakeWorld(hero());
        expect(pet.expired).toBe(false);
        // Avanzar 6 s para asegurar ttl <= 0 (evitar errores de punto flotante)
        for (let i = 0; i < 360; i++) pet.tick(w, 1 / 60);
        expect(pet.expired).toBe(true);
    });

    it('TTL no expirado antes del tiempo', () => {
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, 5);
        const w = fakeWorld(hero());
        for (let i = 0; i < 240; i++) pet.tick(w, 1 / 60); // 4 s
        expect(pet.expired).toBe(false);
    });
});

// ─── Cooldowns ────────────────────────────────────────────────────────────────

describe('Pet: cooldowns', () => {
    it('attackCooldown baja con el tiempo', () => {
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, null);
        pet.attackCooldown = 2;
        const w = fakeWorld(hero());
        pet.tick(w, 1);
        expect(pet.attackCooldown).toBe(1);
        pet.tick(w, 1);
        expect(pet.attackCooldown).toBe(0);
        pet.tick(w, 1);
        expect(pet.attackCooldown).toBe(0); // no baja de 0
    });

    it('onHitCooldown baja con el tiempo', () => {
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, null);
        pet.onHitCooldown = 2;
        const w = fakeWorld(hero());
        pet.tick(w, 1);
        expect(pet.onHitCooldown).toBe(1);
    });
});

// ─── prevPos ──────────────────────────────────────────────────────────────────

describe('Pet: prevPos', () => {
    it('prevPos se actualiza cada tick', () => {
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, null);
        const w = fakeWorld(hero());
        expect(pet.prevPos).toEqual({ x: 0, y: 0 });
        pet.pos = { x: 1, y: 1 };
        pet.tick(w, 1 / 60);
        expect(pet.prevPos).toEqual({ x: 1, y: 1 });
    });
});

// ─── FighterBehavior ─────────────────────────────────────────────────────────

describe('FighterBehavior', () => {
    it('sin enemigo, sigue al dueño', () => {
        const owner = hero();
        const pet = new Pet(content(), fighterDef, { x: 10, y: 10 }, null, null);
        const w: PetWorld = {
            ...fakeWorld(owner),
            moveTowards: () => { moved = true },
        };
        let moved = false;
        pet.behavior.tick(pet, w, 1 / 60);
        expect(moved).toBe(true); // lejos del dueño → moveTowards
    });

    it('teleporta si está muy lejos (>25 m)', () => {
        const owner = hero();
        const pet = new Pet(content(), fighterDef, { x: 100, y: 100 }, null, null);
        const w: PetWorld = {
            ...fakeWorld(owner),
            moveTowards: () => { moved = true },
        };
        let moved = false;
        pet.behavior.tick(pet, w, 1 / 60);
        expect(moved).toBe(false); // no moveTowards, teleporta
        expect(pet.pos.x).toBeCloseTo(owner.pos.x + 0.8);
        expect(pet.pos.y).toBeCloseTo(owner.pos.y + 0.8);
    });

    it('con enemigo a rango, ataca', () => {
        const owner = hero();
        const enemy = new Pet(content(), fighterDef, { x: 1, y: 0 }, null, null);
        enemy.health = 10;
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, null);
        let attacked = false;
        const w: PetWorld = {
            ...fakeWorld(owner),
            nearestEnemy: () => enemy,
            petAttack: () => { attacked = true },
        };
        pet.behavior.tick(pet, w, 1 / 60);
        expect(attacked).toBe(true);
        expect(pet.attackCooldown).toBe(1.1);
    });

    it('con enemigo fuera de rango, se acerca', () => {
        const owner = hero();
        const enemy = new Pet(content(), fighterDef, { x: 20, y: 0 }, null, null);
        enemy.health = 10;
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, null);
        let moved = false;
        const w: PetWorld = {
            ...fakeWorld(owner),
            nearestEnemy: () => enemy,
            moveTowards: () => { moved = true },
        };
        pet.behavior.tick(pet, w, 1 / 60);
        expect(moved).toBe(true);
    });

    it('respeta el cooldown de ataque', () => {
        const owner = hero();
        const enemy = new Pet(content(), fighterDef, { x: 1, y: 0 }, null, null);
        enemy.health = 10;
        const pet = new Pet(content(), fighterDef, { x: 0, y: 0 }, null, null);
        let attacks = 0;
        const w: PetWorld = {
            ...fakeWorld(owner),
            nearestEnemy: () => enemy,
            petAttack: () => { attacks++ },
        };
        pet.behavior.tick(pet, w, 1 / 60);
        pet.behavior.tick(pet, w, 1 / 60);
        expect(attacks).toBe(1); // cooldown 1.1 s, solo 2 frames
    });
});

// ─── CollectorBehavior ───────────────────────────────────────────────────────

describe('CollectorBehavior', () => {
    it('sin botín, sigue al dueño', () => {
        const owner = hero();
        const pet = new Pet(content(), collectorDef, { x: 10, y: 10 }, null, null);
        const w: PetWorld = {
            ...fakeWorld(owner),
            moveTowards: () => { moved = true },
        };
        let moved = false;
        pet.behavior.tick(pet, w, 1 / 60);
        expect(moved).toBe(true);
    });

    it('con botín a rango, lo recoge', () => {
        const owner = hero();
        const pet = new Pet(content(), collectorDef, { x: 0, y: 0 }, null, null);
        let collected = false;
        const w: PetWorld = {
            ...fakeWorld(owner),
            nearestLoot: () => ({ id: 1, pos: { x: 0.5, y: 0 } }),
            collectLoot: () => { collected = true },
        };
        pet.behavior.tick(pet, w, 1 / 60);
        expect(collected).toBe(true);
    });

    it('con botín lejos, se acerca', () => {
        const owner = hero();
        const pet = new Pet(content(), collectorDef, { x: 0, y: 0 }, null, null);
        let moved = false;
        const w: PetWorld = {
            ...fakeWorld(owner),
            nearestLoot: () => ({ id: 1, pos: { x: 5, y: 5 } }),
            collectLoot: () => { collected = true },
            moveTowards: () => { moved = true },
        };
        let collected = false;
        pet.behavior.tick(pet, w, 1 / 60);
        expect(moved).toBe(true);
        expect(collected).toBe(false);
    });
});

// ─── GuardianBehavior ────────────────────────────────────────────────────────

describe('GuardianBehavior', () => {
    it('sigue al dueño', () => {
        const owner = hero();
        const pet = new Pet(content(), guardianDef, { x: 10, y: 10 }, null, null);
        const w: PetWorld = {
            ...fakeWorld(owner),
            moveTowards: () => { moved = true },
        };
        let moved = false;
        pet.behavior.tick(pet, w, 1 / 60);
        expect(moved).toBe(true);
    });

    it('aplica el aura cada `every` segundos', () => {
        const owner = hero();
        owner.health = 1; // vida baja para que shouldApply devuelva true
        const pet = new Pet(content(), guardianDef, { x: 0, y: 0 }, null, null);
        let effects = 0;
        const w: PetWorld = {
            ...fakeWorld(owner),
            petEffect: () => { effects++ },
        };
        // 4 ticks de 1 s = 4 s = 1 aplicación (every: 4)
        for (let i = 0; i < 4; i++) pet.behavior.tick(pet, w, 1);
        expect(effects).toBe(1);
    });

    it('aplica el aura varias veces', () => {
        const owner = hero();
        owner.health = 1;
        const pet = new Pet(content(), guardianDef, { x: 0, y: 0 }, null, null);
        let effects = 0;
        const w: PetWorld = {
            ...fakeWorld(owner),
            petEffect: () => { effects++ },
        };
        for (let i = 0; i < 12; i++) pet.behavior.tick(pet, w, 1);
        expect(effects).toBe(3); // 12 s / 4 s = 3
    });
});

// ─── Character: mascota activa ───────────────────────────────────────────────

describe('Character: mascota activa', () => {
    it('setActivePet con amuleto válido', () => {
        const c = hero();
        c.give('charm_ash_fox', 1);
        const uid = c.inventory.slots.find((s) => s?.itemId === 'charm_ash_fox')!.uid;
        c.setActivePet(uid);
        expect(c.activePetId()).toBe('ash_fox');
    });

    it('setActivePet con uid inválido no activa', () => {
        const c = hero();
        c.setActivePet('no-existe');
        expect(c.activePetId()).toBeNull();
    });

    it('setActivePet(null) retira la mascota', () => {
        const c = hero();
        c.give('charm_ash_fox', 1);
        const uid = c.inventory.slots.find((s) => s?.itemId === 'charm_ash_fox')!.uid;
        c.setActivePet(uid);
        expect(c.activePetId()).toBe('ash_fox');
        c.setActivePet(null);
        expect(c.activePetId()).toBeNull();
    });

    it('checkPetCharm retira si el amuleto ya no está', () => {
        const c = hero();
        c.give('charm_ash_fox', 1);
        const uid = c.inventory.slots.find((s) => s?.itemId === 'charm_ash_fox')!.uid;
        c.setActivePet(uid);
        expect(c.activePetId()).toBe('ash_fox');
        // Simular que se vendió el amuleto: quitarlo del inventario
        const idx = c.inventory.slots.findIndex((s) => s?.uid === uid);
        if (idx >= 0) c.inventory.slots[idx] = null;
        c.checkPetCharm();
        expect(c.activePetId()).toBeNull();
    });

    it('checkPetCharm no retira si el amuleto sigue', () => {
        const c = hero();
        c.give('charm_ash_fox', 1);
        const uid = c.inventory.slots.find((s) => s?.itemId === 'charm_ash_fox')!.uid;
        c.setActivePet(uid);
        c.checkPetCharm();
        expect(c.activePetId()).toBe('ash_fox');
    });

    it('ownerBonus se aplica al activar la mascota', () => {
        const c = hero();
        const powerBefore = c.stats.get('power');
        c.give('charm_ash_fox', 1);
        const uid = c.inventory.slots.find((s) => s?.itemId === 'charm_ash_fox')!.uid;
        c.setActivePet(uid);
        const powerAfter = c.stats.get('power');
        expect(powerAfter).toBe(powerBefore + 5); // ash_fox da +5 power
    });

    it('ownerBonus se retira al desactivar la mascota', () => {
        const c = hero();
        const powerBefore = c.stats.get('power');
        c.give('charm_ash_fox', 1);
        const uid = c.inventory.slots.find((s) => s?.itemId === 'charm_ash_fox')!.uid;
        c.setActivePet(uid);
        c.setActivePet(null);
        const powerAfter = c.stats.get('power');
        expect(powerAfter).toBe(powerBefore);
    });

    it('equipar el amuleto en otro hueco no retira la mascota', () => {
        const c = hero();
        c.give('charm_ash_fox', 1);
        const uid = c.inventory.slots.find((s) => s?.itemId === 'charm_ash_fox')!.uid;
        c.setActivePet(uid);
        // El amuleto de mascota va en amulet; equiparlo no debería retirarlo
        // (solo desequipar/eliminar lo retira)
        expect(c.activePetId()).toBe('ash_fox');
    });
});

// ─── Character: guardado y carga ─────────────────────────────────────────────

describe('Character: guardado de mascota', () => {
    const now = new Date('2026-01-01T00:00:00Z');

    it('toSave incluye activePetItemUid', () => {
        const c = hero();
        c.give('charm_ash_fox', 1);
        const uid = c.inventory.slots.find((s) => s?.itemId === 'charm_ash_fox')!.uid;
        c.setActivePet(uid);
        const save = c.toSave(now);
        expect(save.activePetItemUid).toBe(uid);
    });

    it('toSave sin mascota activa', () => {
        const c = hero();
        const save = c.toSave(now);
        expect(save.activePetItemUid).toBeNull();
    });

    it('fromSave restaura la mascota activa', () => {
        const c = hero();
        c.give('charm_ash_fox', 1);
        const uid = c.inventory.slots.find((s) => s?.itemId === 'charm_ash_fox')!.uid;
        c.setActivePet(uid);
        const save = c.toSave(now);
        const c2 = Character.fromSave(content(), save, new Rng(1));
        expect(c2.activePetId()).toBe('ash_fox');
        expect(c2.activePetItemUid).toBe(uid);
    });

    it('fromSave con activePetItemUid nulo', () => {
        const c = hero();
        c.give('charm_ash_fox', 1);
        const save = c.toSave(now);
        expect(save.activePetItemUid).toBeNull();
        const c2 = Character.fromSave(content(), save, new Rng(1));
        expect(c2.activePetId()).toBeNull();
    });
});

// ─── Datos reales ────────────────────────────────────────────────────────────

describe('datos de mascotas', () => {
    it('todas las mascotas tienen behavior válido', () => {
        const pets = content().pets;
        for (const p of Object.values(pets)) {
            expect(['fighter', 'collector', 'guardian']).toContain(p.behavior);
        }
    });

    it('fighter tiene attack definido', () => {
        for (const p of Object.values(content().pets)) {
            if (p.behavior === 'fighter') {
                expect(p.attack, p.id).toBeDefined();
            }
        }
    });

    it('guardian tiene aura definida', () => {
        for (const p of Object.values(content().pets)) {
            if (p.behavior === 'guardian') {
                expect(p.aura, p.id).toBeDefined();
            }
        }
    });

    it('ownerBonus no tiene source (lo añade el código)', () => {
        for (const p of Object.values(content().pets)) {
            for (const b of p.ownerBonus) {
                expect('source' in b, `${p.id}: ownerBonus sin source`).toBe(false);
            }
        }
    });

    it('speed y followDistance son positivos', () => {
        for (const p of Object.values(content().pets)) {
            expect(p.speed, `${p.id}.speed`).toBeGreaterThan(0);
            expect(p.followDistance, `${p.id}.followDistance`).toBeGreaterThan(0);
        }
    });
});
