// Físicas secundarias: cadenas de huesos con muelle y amortiguación (Verlet).
// Se activa para los huesos cuyo nombre empiece por `fis_` (convención OMP-POL-13).
// La lógica pura (Verlet, restricciones, colisión) no importa Babylon ni DOM.
// La integración con los huesos de Babylon vive en GltfCharacter.
//
// Cada cadena parte de un hueso raíz (p. ej. `cadera`) y recorre los hijos `fis_`
// en serie. En cada paso Verlet, cada nodo se desplaza por gravedad e inercia,
// se aplica el muelle hacia la posición de reposo, se limita el ángulo respecto
// al padre y se empuja fuera de las cápsulas de colisión (muslos, espinillas, cadera).

/** Parámetros de una cadena de física secundaria. */
export interface SecondaryChainConfig {
    /** Rigidez del muelle hacia la posición de reposo (0–1). 1 = rígido. */
    stiffness: number;
    /** Amortiguación (0–1). 1 = sin movimiento residual. */
    damping: number;
    /** Gravedad aplicada (m/s², negativo = hacia abajo). */
    gravity: number;
    /** Ángulo máximo respecto al hueso padre en radianes. 0 = sin límite. */
    maxAngle: number;
}

/** Configuración por defecto para cadenas `fis_`. */
export const DEFAULT_CHAIN_CONFIG: SecondaryChainConfig = {
    stiffness: 0.3,
    damping: 0.85,
    gravity: -9.81,
    maxAngle: Math.PI / 4, // 45°
};

/** Un punto 3D simple (sin dependencia de Babylon para tests puros). */
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

/** Una cápsula de colisión en el cuerpo (muslo, espinilla, cadera). */
export interface CollisionCapsule {
    /** Centro en reposo, en espacio del hueso raíz de la cadena. */
    center: Vec3;
    /** Radio de la cápsula en metros. */
    radius: number;
    /** Longitud de la cápsula (entre los extremos esféricos). */
    length: number;
    /** Eje principal de la cápsula en espacio local (normalizado). */
    axis: Vec3;
}

/** Un nodo de la cadena Verlet (lógica pura, sin Babylon). */
interface VerletNode {
    /** Posición actual en espacio del hueso raíz. */
    pos: Vec3;
    /** Posición anterior (para Verlet). */
    prevPos: Vec3;
    /** Posición de reposo en espacio del hueso raíz. */
    restPos: Vec3;
    /** Longitud del segmento padre→este nodo en reposo. */
    segmentLen: number;
}

/**
 * Cadena de física secundaria: un hueso raíz y una lista de nodos `fis_` en serie.
 * Se actualiza a paso fijo y no depende de los FPS.
 * Lógica pura: no importa Babylon.
 */
export class SecondaryChain {
    private readonly nodes: VerletNode[];
    private readonly config: SecondaryChainConfig;
    private readonly capsules: CollisionCapsule[];

    constructor(
        nodes: Array<{ restPos: Vec3 }>,
        config: SecondaryChainConfig,
        capsules: CollisionCapsule[],
    ) {
        this.config = config;
        this.capsules = capsules;
        this.nodes = nodes.map((entry, i) => {
            const parentRest = i === 0 ? { x: 0, y: 0, z: 0 } : nodes[i - 1]!.restPos;
            const restPos = { ...entry.restPos };
            const dx = restPos.x - parentRest.x;
            const dy = restPos.y - parentRest.y;
            const dz = restPos.z - parentRest.z;
            const segmentLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
            return {
                pos: { ...restPos },
                prevPos: { ...restPos },
                restPos,
                segmentLen,
            };
        });
    }

    /**
     * Actualiza la cadena con un paso de tiempo fijo.
     * @param dt Paso en segundos (p. ej. 1/60).
     * @param inertia Aceleración del personaje en el mundo (para inercia).
     * @returns Nuevas posiciones de los nodos.
     */
    update(dt: number, inertia: Vec3): Vec3[] {
        if (dt <= 0 || this.nodes.length === 0) return this.nodes.map((n) => ({ ...n.pos }));
        const { stiffness, damping, gravity, maxAngle } = this.config;

        // 1. Verlet: pos = 2*pos - prevPos + a*dt*dt
        for (const node of this.nodes) {
            const vx = (node.pos.x - node.prevPos.x) * (1 - damping);
            const vy = (node.pos.y - node.prevPos.y) * (1 - damping);
            const vz = (node.pos.z - node.prevPos.z) * (1 - damping);

            const ax = inertia.x;
            const ay = gravity + inertia.y;
            const az = inertia.z;

            const newPos: Vec3 = {
                x: node.pos.x + vx + ax * dt * dt,
                y: node.pos.y + vy + ay * dt * dt,
                z: node.pos.z + vz + az * dt * dt,
            };

            node.prevPos.x = node.pos.x;
            node.prevPos.y = node.pos.y;
            node.prevPos.z = node.pos.z;
            node.pos.x = newPos.x + (node.restPos.x - newPos.x) * stiffness;
            node.pos.y = newPos.y + (node.restPos.y - newPos.y) * stiffness;
            node.pos.z = newPos.z + (node.restPos.z - newPos.z) * stiffness;
        }

        // 2. Restricción de segmento: cada nodo está a `segmentLen` de su padre.
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i]!;
            const parentPos = i === 0 ? { x: 0, y: 0, z: 0 } : this.nodes[i - 1]!.pos;
            constrainToDistance(node.pos, parentPos, node.segmentLen);
        }

        // 3. Límite de ángulo respecto al padre.
        if (maxAngle > 0) {
            for (let i = 0; i < this.nodes.length; i++) {
                const node = this.nodes[i]!;
                const parentPos = i === 0 ? { x: 0, y: 0, z: 0 } : this.nodes[i - 1]!.pos;
                constrainAngle(node.pos, parentPos, node.restPos, maxAngle);
            }
        }

        // 4. Colisión con cápsulas del cuerpo.
        for (const node of this.nodes) {
            collideWithCapsules(node.pos, this.capsules);
        }

        return this.nodes.map((n) => ({ ...n.pos }));
    }

    /** Devuelve las posiciones de reposo (freeze). */
    freezePositions(): Vec3[] {
        for (const node of this.nodes) {
            node.pos.x = node.restPos.x;
            node.pos.y = node.restPos.y;
            node.pos.z = node.restPos.z;
            node.prevPos.x = node.restPos.x;
            node.prevPos.y = node.restPos.y;
            node.prevPos.z = node.restPos.z;
        }
        return this.nodes.map((n) => ({ ...n.pos }));
    }

    /** Número de nodos en la cadena. */
    get nodeCount(): number {
        return this.nodes.length;
    }
}

// ---- Funciones puras de restricción (exportadas para tests) ----

function constrainToDistance(
    pos: Vec3,
    anchor: Vec3,
    dist: number,
): void {
    const dx = pos.x - anchor.x;
    const dy = pos.y - anchor.y;
    const dz = pos.z - anchor.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 0.0001 || dist < 0.0001) return;
    const scale = dist / len;
    pos.x = anchor.x + dx * scale;
    pos.y = anchor.y + dy * scale;
    pos.z = anchor.z + dz * scale;
}

function constrainAngle(
    pos: Vec3,
    parent: Vec3,
    rest: Vec3,
    maxAngle: number,
): void {
    const dx = pos.x - parent.x;
    const dy = pos.y - parent.y;
    const dz = pos.z - parent.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 0.0001) return;

    const rdx = rest.x - parent.x;
    const rdy = rest.y - parent.y;
    const rdz = rest.z - parent.z;
    const rLen = Math.sqrt(rdx * rdx + rdy * rdy + rdz * rdz);
    if (rLen < 0.0001) return;

    const dot = (dx * rdx + dy * rdy + dz * rdz) / (len * rLen);
    const angle = Math.acos(Math.min(1, Math.max(-1, dot)));

    if (angle <= maxAngle) return;

    const blend = maxAngle / angle;
    pos.x = parent.x + rdx * len * blend;
    pos.y = parent.y + rdy * len * blend;
    pos.z = parent.z + rdz * len * blend;
}

function collideWithCapsules(pos: Vec3, capsules: CollisionCapsule[]): void {
    for (const cap of capsules) {
        const dist = pointToCapsuleDistance(pos, cap.center, cap.length, cap.axis);
        if (dist < cap.radius) {
            const push = cap.radius - dist;
            const nx = pos.x - cap.center.x;
            const ny = pos.y - cap.center.y;
            const nz = pos.z - cap.center.z;
            const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (nLen > 0.0001) {
                const inv = push / nLen;
                pos.x += nx * inv;
                pos.y += ny * inv;
                pos.z += nz * inv;
            }
        }
    }
}

/**
 * Distancia del punto al eje de la cápsula (sin el radio).
 */
export function pointToCapsuleDistance(
    p: Vec3,
    center: Vec3,
    length: number,
    axis: Vec3,
): number {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const dz = p.z - center.z;
    // Proyección escalar sobre el eje (axis ya está normalizado).
    const proj = dx * axis.x + dy * axis.y + dz * axis.z;
    if (Math.abs(proj) > length * 0.5) {
        // Fuera del cilindro: distancia al extremo más cercano.
        const clampedProj = Math.sign(proj) * length * 0.5;
        const endX = center.x + axis.x * clampedProj;
        const endY = center.y + axis.y * clampedProj;
        const endZ = center.z + axis.z * clampedProj;
        const ex = p.x - endX;
        const ey = p.y - endY;
        const ez = p.z - endZ;
        return Math.sqrt(ex * ex + ey * ey + ez * ez);
    }
    // Dentro del cilindro: distancia perpendicular al eje.
    const perpX = dx - axis.x * proj;
    const perpY = dy - axis.y * proj;
    const perpZ = dz - axis.z * proj;
    return Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);
}

/**
 * Motor de físicas secundarias para un personaje.
 * Gestiona todas las cadenas y las actualiza en cada fotograma.
 * Lógica pura: no importa Babylon.
 */
export class SecondaryPhysics {
    private chains: SecondaryChain[] = [];
    private active = true;
    private inertia: Vec3 = { x: 0, y: 0, z: 0 };
    private readonly fixedDt = 1 / 60;
    private accumulator = 0;

    /**
     * Construye las cadenas a partir de una lista de huesos `fis_`.
     * @param boneGroups Grupos de huesos, cada uno con sus posiciones de reposo.
     * @param config Configuración por defecto de las cadenas.
     * @param capsules Cápsulas de colisión del cuerpo.
     */
    buildChains(
        boneGroups: Array<Array<{ restPos: Vec3 }>>,
        config: SecondaryChainConfig = DEFAULT_CHAIN_CONFIG,
        capsules: CollisionCapsule[] = [],
    ): void {
        this.chains = [];
        for (const group of boneGroups) {
            if (group.length === 0) continue;
            this.chains.push(new SecondaryChain(group, config, capsules));
        }
    }

    /**
     * Actualiza todas las cadenas.
     * @param dt Tiempo transcurrido en segundos.
     * @param inertia Aceleración del personaje (para inercia de faldas, capas, pelo).
     * @returns Posiciones de todos los nodos de todas las cadenas.
     */
    update(dt: number, inertia: Vec3): Vec3[][] {
        if (!this.active || this.chains.length === 0) return [];
        this.inertia = inertia;
        this.accumulator += dt;
        let steps = 0;
        while (this.accumulator >= this.fixedDt && steps < 8) {
            for (const chain of this.chains) {
                chain.update(this.fixedDt, this.inertia);
            }
            this.accumulator -= this.fixedDt;
            steps++;
        }
        return this.chains.map((c) => c.update(0, { x: 0, y: 0, z: 0 }));
    }

    /** Congela la física (lejos de la cámara). Los huesos vuelven a reposo. */
    freeze(): void {
        this.active = false;
        for (const chain of this.chains) {
            chain.freezePositions();
        }
    }

    /** Descongela la física (cerca de la cámara). */
    thaw(): void {
        this.active = true;
    }

    /** Devuelve true si hay cadenas activas. */
    get hasChains(): boolean {
        return this.chains.length > 0;
    }

    /** Número de cadenas. */
    get chainCount(): number {
        return this.chains.length;
    }

    /** Limpia las cadenas. */
    dispose(): void {
        this.chains = [];
        this.accumulator = 0;
    }
}

/**
 * Calcula la inclinación del torso por inercia.
 * Al arrancar, el torso se inclina hacia atrás; al frenar, hacia adelante.
 * Al girar, se inclina hacia dentro de la curva.
 * @param velocity Velocidad actual del personaje (m/s).
 * @param prevVelocity Velocidad del fotograma anterior.
 * @param yawChange Cambio de orientación en radianes.
 * @param dt Tiempo transcurrido.
 * @returns Inclinación en radianes { pitch (adelante/atrás), roll (izq/der) }.
 */
export function bodyInertiaLean(
    velocity: number,
    prevVelocity: number,
    yawChange: number,
    dt: number,
): { pitch: number; roll: number } {
    if (dt <= 0) return { pitch: 0, roll: 0 };
    const accel = (velocity - prevVelocity) / dt;
    // Al arrancar (accel > 0), el torso se inclina hacia atrás: pitch positivo.
    // Al frenar (accel < 0), el torso se inclina hacia adelante: pitch negativo.
    const pitchFactor = Math.min(Math.PI / 12, Math.max(-Math.PI / 12, accel * 0.02));
    const yawRate = yawChange / dt;
    const rollFactor = Math.min(Math.PI / 18, Math.max(-Math.PI / 18, yawRate * 0.15));
    return { pitch: pitchFactor, roll: rollFactor };
}
