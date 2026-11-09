export interface EnemyLabelCandidate {
  id: number;
  state: string;
  pos: { x: number; y: number };
}

/** Mantiene legible el combate cuando muchas criaturas ocupan la pantalla. */
export function visibleEnemyLabelIds(
  enemies: readonly EnemyLabelCandidate[],
  focus: { x: number; y: number },
  targetId: number | null,
  limit = 2,
): Set<number> {
  return new Set(enemies
    .filter((enemy) => enemy.state !== 'dead')
    .sort((a, b) => {
      if (a.id === targetId) return -1;
      if (b.id === targetId) return 1;
      return Math.hypot(a.pos.x - focus.x, a.pos.y - focus.y)
        - Math.hypot(b.pos.x - focus.x, b.pos.y - focus.y);
    })
    .slice(0, Math.max(0, limit))
    .map((enemy) => enemy.id));
}
