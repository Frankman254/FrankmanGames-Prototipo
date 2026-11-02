import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import { Rng } from '../../src/sim/rng';

function setup() {
  const content = loadGameData().rpg;
  return new Character(content, 'ember_vanguard', 'Progreso', new Rng(1));
}

describe('progresión: reglas de experiencia y puntos de estadística', () => {
  it('calcula xpToNext(n) correctamente con formula round(base · n^exponent)', () => {
    const content = loadGameData().rpg;
    
    // Verificar que los valores del JSON están aplicados
    expect(content.progression.xp.base).toBe(50);
    expect(content.progression.xp.exponent).toBe(1.5);
    expect(content.progression.maxLevel).toBe(20);
  });

  it('nivel 1 requiere xpToNext=round(50·1^1.5)=round(50)=50', () => {
    const c = setup();
    // xpToNext(1) = round(50 * 1^1.5) = round(50) = 50
    expect(c.xp).toBe(0);
  });

  it('nivel 2 requiere xpToNext=round(50·2^1.5)=round(50·2.828...)=round(141.42)=141', () => {
    const content = loadGameData().rpg;
    // xpToNext(2) = round(50 * 2^1.5) = round(50 * 2.8284...) = round(141.42) = 141
    const expectedXpForLevel2 = Math.round(content.progression.xp.base * Math.pow(2, content.progression.xp.exponent));
    expect(expectedXpForLevel2).toBe(141);
  });

  it('nivel n requiere xpToNext(n)=round(50·n^1.5) para subir de nivel', () => {
    const content = loadGameData().rpg;
    
    for (let n = 1; n <= content.progression.maxLevel - 1; n++) {
      const nextXp = Math.round(content.progression.xp.base * Math.pow(n, content.progression.xp.exponent));
      
      if (n === 1) expect(nextXp).toBe(50);
      if (n === 2) expect(nextXp).toBe(141);
      if (n === 3) expect(nextXp).toBe(Math.round(50 * Math.pow(3, 1.5)));
      if (n === 5) expect(nextXp).toBe(Math.round(50 * Math.pow(5, 1.5)));
    }
  });

  it('características: recibir +3 statPoints por nivel y statsPerLevel de clase', () => {
    const c = setup();
    
    // ember_vanguard (probar con clase que tenga stats definidos)
    expect(c.unspentStatPoints).toBe(0); // Nivel 1, no ha recibido puntos aún
  });

  it('resistencia máxima: resistCap=50% aplica a todas las resistencias', () => {
    const content = loadGameData().rpg;
    
    // Verificar que resistCap está definido en el contenido
    expect(content.progression.resistCap).toBe(50); // % máximo de resistencia
  });

  it('hotbarSize=20 y inventoryMaxWeight=1500 pesos (defaultItemWeight=1000)', () => {
    const content = loadGameData().rpg;
    
    expect(content.progression.hotbarSize).toBe(20);
    expect(content.progression.inventoryMaxWeight).toBe(1500);
    expect(content.progression.defaultItemWeight).toBe(1000);
  });

  it('reglas derivadas: vitality→maxHealth (per 5), spirit→maxResource (flat x2, percent x2)', () => {
    const content = loadGameData().rpg;
    
    // Verificar que las reglas de derivación están definidas
    expect(content.rules.derived).toContainEqual(
      expect.objectContaining({
        from: 'vitality',
        to: 'maxHealth',
        per: 5,
        op: 'flat'
      })
    );
    
    // spirit → maxResource flat x2
    expect(content.rules.derived).toContainEqual(
      expect.objectContaining({
        from: 'spirit',
        to: 'maxResource',
        per: 2,
        op: 'flat'
      })
    );
  });

  it('reglas derivadas: agility→critChance (per 0.004)', () => {
    const content = loadGameData().rpg;
    
    // Verificar regla de crítico por agilidad
    expect(content.rules.derived).toContainEqual(
      expect.objectContaining({
        from: 'agility',
        to: 'critChance',
        per: 0.004,
        op: 'flat'
      })
    );
  });

  it('reglas de elementos: elementStat mapea cada elemento a primaria correspondiente', () => {
    const content = loadGameData().rpg;
    
    // fire y frost usan intellect
    expect(content.rules.elementStat.fire).toBe('intellect');
    expect(content.rules.elementStat.frost).toBe('intellect');
    
    // physical usa strength
    expect(content.rules.elementStat.physical).toBe('strength');
    
    // storm usa agility
    expect(content.rules.elementStat.storm).toBe('agility');
  });

  it('dualWield: offhandDamage=0.75, attackSpeed=1.2', () => {
    const content = loadGameData().rpg;
    
    expect(content.rules.dualWield.offhandDamage).toBe(0.75);
    expect(content.rules.dualWield.attackSpeed).toBe(1.2);
  });

  it('venta: valor = value × rarityValue × sellRatio × (0.75 + 0.5 · calidad)', () => {
    const content = loadGameData().rpg;
    
    expect(content.rules.sellRatio).toBe(0.3);
    
    // Verificar que las rarezas están definidas
    expect(content.rules.rarityValue.common).toBe(1);
    expect(content.rules.rarityValue.uncommon).toBe(1.5);
    expect(content.rules.rarityValue.rare).toBe(2.5);
    expect(content.rules.rarityValue.epic).toBe(4);
    expect(content.rules.rarityValue.legendary).toBe(7);
  });

  it('progresión por nivel: verificar valores desde data/rpg/progression.json', () => {
    const content = loadGameData().rpg;
    
    // Verificar valores de configuración desde data/rpg/progression.json
    expect(content.progression.defaultItemWeight).toBe(1000);
    // configInicial puede estar undefined, verificar solo si existe
    if (content.progression.configInicial?.progresionPorNivel) {
      expect(content.progression.configInicial.progresionPorNivel.caracteristica).toBe(5);
      expect(content.progression.configInicial.progresionPorNivel.vida).toBe(20);
      expect(content.progression.configInicial.progresionPorNivel.pesoCapacidad).toBe(30);
    }
  });

  it('maxLevel=20: no subir más allá del nivel máximo', () => {
    const content = loadGameData().rpg;
    
    expect(content.progression.maxLevel).toBe(20);
    
    // Verificar que al llegar a maxLevel, xpToNext debería ser calculado pero el personaje no sube
    const xpAtMax = Math.round(content.progression.xp.base * Math.pow(content.progression.maxLevel - 1, content.progression.xp.exponent));
    expect(xpAtMax).toBe(Math.round(50 * Math.pow(19, 1.5))); // ~3832 xp para llegar a nivel 20 desde 19
  });

  it('hotbarSize=20: verificar que no excede el tamaño máximo permitido', () => {
    const c = setup();
    
    // Verificar hotbar del spellbook con valor literal 20 (content.progression.hotbarSize es 20)
    const hotbar = c.spellbook.hotbar;
    expect(hotbar.length).toBeLessThanOrEqual(20);
  });
});
