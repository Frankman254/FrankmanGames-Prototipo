import { NullEngine, Quaternion, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadWorldData } from '../src/data/worldData';
import { parseAnimation } from '../src/data/worldSchema';
import { Animator, crossedEvents, evaluateClip, newPose, pointInModel, quatFromEuler, type ClipDef } from '../src/world/anim';
import { ANIM_STATES, PROCEDURAL_MODELS, proceduralAnim } from '../src/world/rigs';
import animationJson from '../data/animation.json';

const wd = loadWorldData();

describe('animación por keyframes', () => {
  it('los cuaterniones y la cinemática directa coinciden con Babylon', () => {
    for (const [x, y, z] of [[0.3, -1.1, 0.7], [1.2, 0.4, -2.0], [0, 0, 0.5]] as const) {
      const ours = quatFromEuler(x, y, z);
      const theirs = Quaternion.RotationYawPitchRoll(y, x, z);
      expect(ours[0]).toBeCloseTo(theirs.x, 6);
      expect(ours[1]).toBeCloseTo(theirs.y, 6);
      expect(ours[2]).toBeCloseTo(theirs.z, 6);
      expect(ours[3]).toBeCloseTo(theirs.w, 6);
    }
    // La misma pose montada con nodos de Babylon da los mismos puntos.
    const a = proceduralAnim('humanoid');
    const pose = evaluateClip(a.rig, a.clips['attack']!, 0.42, newPose(a.rig));
    const scene = new Scene(new NullEngine());
    const nodes = a.rig.joints.map((j, i) => {
      const n = new TransformNode(j.name, scene);
      n.position.set(j.offset[0] + pose[i * 7 + 4]!, j.offset[1] + pose[i * 7 + 5]!, j.offset[2] + pose[i * 7 + 6]!);
      n.rotationQuaternion = new Quaternion(pose[i * 7]!, pose[i * 7 + 1]!, pose[i * 7 + 2]!, pose[i * 7 + 3]!);
      return n;
    });
    a.rig.joints.forEach((j, i) => {
      if (j.parent) nodes[i]!.parent = nodes[a.rig.index.get(j.parent)!]!;
    });
    for (const j of ['handR', 'footL', 'head']) {
      const n = nodes[a.rig.index.get(j)!]!;
      n.computeWorldMatrix(true);
      const b = n.getAbsolutePosition();
      const ours = pointInModel(a.rig, pose, j);
      expect(ours[0]).toBeCloseTo(b.x, 5);
      expect(ours[1]).toBeCloseTo(b.y, 5);
      expect(ours[2]).toBeCloseTo(b.z, 5);
    }
    const tip = new Vector3();
    Vector3.TransformCoordinatesFromFloatsToRef(0, -0.1, 0, nodes[a.rig.index.get('handR')!]!.getWorldMatrix(), tip);
    expect(pointInModel(a.rig, pose, 'handR', [0, -0.1, 0])[1]).toBeCloseTo(tip.y, 5);
  });

  it('cada footstep de los datos cae cuando ese pie está apoyado (en el punto más bajo de su ciclo)', () => {
    for (const m of PROCEDURAL_MODELS) {
      const a = proceduralAnim(m);
      const pose = newPose(a.rig);
      const height = (f: string, t: number): number => pointInModel(a.rig, evaluateClip(a.rig, a.clips['run']!, t, pose), f, a.sole)[1];
      const steps = wd.animation.models[m].events['run']!.filter((e) => e.type === 'footstep');
      expect(steps.length, m).toBeGreaterThanOrEqual(2);
      const usedFeet = new Set<string>();
      for (const s of steps) {
        // El pie de apoyo es el más bajo en ese instante…
        const foot = a.feet.reduce((best, f) => (height(f, s.t) < height(best, s.t) ? f : best));
        usedFeet.add(foot);
        // …y está a menos de 1 cm de su punto más bajo en todo el ciclo.
        let min = Infinity;
        for (let i = 0; i < 400; i++) min = Math.min(min, height(foot, i / 400));
        expect(height(foot, s.t) - min, `${m} ${foot} t=${s.t}`).toBeLessThan(0.01);
      }
      // Los pasos alternan de pie.
      expect(usedFeet.size, m).toBeGreaterThanOrEqual(2);
    }
  });

  it('todos los modelos tienen las siete animaciones (o una equivalente) y eventos de impacto', () => {
    for (const m of PROCEDURAL_MODELS) {
      const a = proceduralAnim(m);
      for (const s of ['idle', 'run', 'attack', 'hit', 'death']) expect(a.clips[s], `${m}.${s}`).toBeDefined();
      const ev = wd.animation.models[m].events;
      for (const clip of Object.keys(ev)) expect(a.clips[clip], `${m}: eventos de un clip inexistente ${clip}`).toBeDefined();
      expect(ev['attack']!.some((e) => e.type === 'hit' || e.type === 'cast'), m).toBe(true);
    }
    const human = proceduralAnim('humanoid');
    for (const s of ANIM_STATES) expect(human.clips[s], s).toBeDefined();
  });

  it('el animador emite cada evento una vez por ciclo, también al dar la vuelta', () => {
    const a = proceduralAnim('humanoid');
    const events = { run: [{ t: 0.11, type: 'footstep' }, { t: 0.61, type: 'footstep' }] };
    const an = new Animator(a.rig, a.clips, events, 0.15);
    an.play('run');
    let n = 0;
    const dur = a.clips['run']!.duration;
    for (let i = 0; i < 1000; i++) n += an.update((dur * 10) / 1000).length;
    expect(n).toBe(20);
    // Con pasos más largos que un ciclo no se pierden eventos dentro del tramo.
    expect(crossedEvents(events.run, 0.9, 0.2, true)).toHaveLength(1);
  });

  it('funde entre clips y los de una vez terminan y se quedan en su último fotograma', () => {
    const a = proceduralAnim('humanoid');
    const an = new Animator(a.rig, a.clips, {}, 0.2);
    an.play('idle');
    an.update(0.5);
    const idle = Float32Array.from(an.pose);
    an.play('death');
    an.update(0.01);
    // A los 10 ms la pose está aún casi entera en reposo.
    let diff = 0;
    for (let i = 0; i < idle.length; i++) diff = Math.max(diff, Math.abs(an.pose[i]! - idle[i]!));
    expect(diff).toBeLessThan(0.1);
    an.update(5);
    expect(an.finished).toBe(true);
    const end = evaluateClip(a.rig, a.clips['death']!, 1, newPose(a.rig));
    for (let i = 0; i < end.length; i++) expect(an.pose[i]).toBeCloseTo(end[i]!, 5);
  });

  it('la velocidad de reproducción escala el tiempo', () => {
    const clip: ClipDef = { duration: 1, loop: true, tracks: {} };
    const rig = proceduralAnim('imp').rig;
    const an = new Animator(rig, { c: clip }, {}, 0);
    an.play('c', 2);
    an.update(0.25);
    expect(an.normalizedTime).toBeCloseTo(0.5);
  });

  it('cada arquetipo de enemigo y el jugador tienen personaje en el manifiesto', () => {
    const game = loadGameData();
    expect(wd.assets['player']).toBeDefined();
    for (const id of Object.keys(game.enemies.archetypes)) expect(wd.assets[`enemy.${id}`], id).toBeDefined();
  });

  it('rechaza eventos de tipos desconocidos', () => {
    const bad = structuredClone(animationJson) as unknown as { models: { wolf: { events: { run: Array<{ t: number; type: string }> } } } };
    bad.models.wolf.events.run[0]!.type = 'salto';
    expect(() => parseAnimation(bad)).toThrow(/models\.wolf\.events\.run\.0\.type/);
  });
});
