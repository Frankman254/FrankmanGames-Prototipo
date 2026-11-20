// Cámara 3D orbital que sigue a un punto con suavizado exponencial. Con la rueda
// pulsada se arrastra para girar (yaw libre, pitch con límites); la rueda hace zoom.
// Ángulos y distancia persiguen su objetivo con la suavidad elegida, y el modo
// (seguir, autoenfoque, inteligente o por casilla) y los encuadres salen de src/camera.
import { TargetCamera, Vector3, type Scene } from '@babylonjs/core';
import {
    damp,
    dampAngle,
    DEFAULT_CAMERA_TUNING,
    DEFAULT_FRAMINGS,
    distanceBeforeBlocker,
    modeTarget,
    nextZoneCell,
    type ZoneCell,
    type CameraMode,
    type CameraThreat,
    type CameraTuning,
    type FramingId,
} from '../camera';
import type { CameraDef } from '../data/schema';

const DEG = Math.PI / 180;

/** Suavidad (0 = casi instantánea, 1 = muy suave) → velocidad de persecución por segundo. */
export function smoothingRate(smoothing: number): number {
    const s = Math.max(0, Math.min(1, smoothing));
    return 3 + (1 - s) * (1 - s) * 27;
}

export class CameraRig {
    readonly camera: TargetCamera;
    private readonly focus = new Vector3();
    /** Velocidad del foco para predecir la posición futura (suaviza el seguimiento). */
    private readonly focusVel = new Vector3();
    private distance: number;
    /** Ángulos pedidos en grados (empiezan en los de los datos); los que se ven los persiguen. */
    yawDeg: number;
    pitchDeg: number;
    private shownYaw: number;
    private shownPitch: number;
    private shownDistance: number;
    /** Seguir, autoenfoque, inteligente o estática por casilla. */
    mode: CameraMode = 'follow';
    /** Suavidad del movimiento (opción del jugador). */
    smoothing = 0.5;
    /** Enemigos en combate, para el autoenfoque y la cámara inteligente. */
    threats: readonly CameraThreat[] = [];
    /** Segundos que la cámara inteligente respeta un giro manual. */
    private manualPause = 0;
    private readonly tuning: CameraTuning;
    /** Casilla en uso de la cámara estática; null en los demás modos. */
    zoneCell: ZoneCell | null = null;
    /** Altura del terreno para no meter la cámara bajo una colina. */
    ground: { sample(x: number, z: number): number } | null = null;
    /** Cajas sólidas (casas, rocas grandes): la cámara se acerca al foco si la tapan. */
    blockers: ReadonlyArray<{ x: number; z: number; hw: number; hd: number; top: number }> = [];
    private initialised = false;
    /** Opciones del jugador: multiplicador de giro e inversión de ejes (se suman a las de los datos). */
    sensitivity = 1;
    invertX = false;
    invertY = false;
    /**
     * `ray`: la cámara se acerca si cualquier caja tapa el rayo (exterior: casas, rocas).
     * `inside`: sólo se acerca si la cámara quedaría dentro de una caja (interiores:
     * los muros bajos que tapan al jugador los resuelve el recorte de oclusión).
     */
    blockerMode: 'ray' | 'inside' = 'ray';
    /** Tope de distancia (interiores: la cámara no se aleja tanto); null = el de los datos. */
    distanceCap: number | null = null;

    constructor(
        scene: Scene,
        private def: CameraDef,
    ) {
        this.camera = new TargetCamera('cam', new Vector3(0, 10, -10), scene);
        this.camera.fov = def.fovDeg * DEG;
        this.camera.minZ = 0.3;
        this.camera.maxZ = 500;
        this.distance = def.distance;
        this.yawDeg = def.yawDeg;
        this.pitchDeg = def.pitchDeg;
        this.shownYaw = def.yawDeg;
        this.shownPitch = def.pitchDeg;
        this.shownDistance = def.distance;
        this.tuning = { ...DEFAULT_CAMERA_TUNING, ...def.tuning };
    }

    /** Distancia que se ve ahora (con su suavizado). */
    get viewDistance(): number {
        return this.shownDistance;
    }

    zoomBy(steps: number): void {
        // Cada paso es proporcional a la distancia: de cerca se afina y de lejos no hace falta girar la rueda sin fin (F14).
        const step = steps * Math.max(0.25, this.distance / 14);
        this.distance = Math.min(
            this.distanceCap ?? this.def.maxDistance,
            Math.max(this.def.minDistance, this.distance + step),
        );
        this.manualPause = this.tuning.manualPauseSeconds;
    }

    /** Va a un encuadre con suavidad. `default` es el de los datos; los demás, los de src/camera. */
    setFraming(id: FramingId): void {
        const pose =
            id === 'default'
                ? { yawDeg: this.def.yawDeg, pitchDeg: this.def.pitchDeg, distance: this.def.distance }
                : DEFAULT_FRAMINGS[id];
        this.yawDeg = pose.yawDeg;
        this.pitchDeg = Math.min(this.def.maxPitchDeg, Math.max(this.def.minPitchDeg, pose.pitchDeg));
        this.distance = Math.min(
            this.distanceCap ?? this.def.maxDistance,
            Math.max(this.def.minDistance, pose.distance),
        );
        this.manualPause = this.tuning.manualPauseSeconds;
    }

    /** Orientación con la que se ve ahora (paneo del sonido, brújula). */
    get viewYawDeg(): number {
        return this.shownYaw;
    }

    /** Distancia actual (m) al foco. */
    get zoom(): number {
        return this.distance;
    }

    /** Pone la distancia (dentro de los límites) y salta al próximo foco sin suavizado (cambio de escena). */
    jumpTo(distance: number): void {
        this.distance = Math.min(this.distanceCap ?? this.def.maxDistance, Math.max(this.def.minDistance, distance));
        this.shownDistance = this.distance;
        this.shownYaw = this.yawDeg;
        this.shownPitch = this.pitchDeg;
        this.initialised = false;
    }

    /** Mira hacia ese rumbo sin animar el giro (personaje nuevo: hacia quien lo recibe). */
    lookToward(yawDeg: number): void {
        this.yawDeg = yawDeg;
        this.shownYaw = yawDeg;
        this.manualPause = this.tuning.manualPauseSeconds;
    }

    /** Arrastre con la rueda pulsada, en píxeles de pantalla. */
    orbit(dx: number, dy: number): void {
        const k = this.def.orbitDegPerPixel * this.sensitivity;
        const sx = this.def.invertX !== this.invertX ? -1 : 1;
        const sy = this.def.invertY !== this.invertY ? -1 : 1;
        this.yawDeg = (this.yawDeg + dx * k * sx) % 360;
        this.pitchDeg = Math.min(this.def.maxPitchDeg, Math.max(this.def.minPitchDeg, this.pitchDeg + dy * k * sy));
        this.manualPause = this.tuning.manualPauseSeconds;
    }

    /** Giro horizontal en grados (teclas de cámara). */
    turn(deg: number): void {
        this.yawDeg = (this.yawDeg + deg * (this.def.invertX !== this.invertX ? -1 : 1)) % 360;
        this.manualPause = this.tuning.manualPauseSeconds;
    }

    update(target: Vector3, frameSeconds: number): void {
        this.manualPause = Math.max(0, this.manualPause - frameSeconds);
        this.zoneCell =
            this.mode === 'zone'
                ? nextZoneCell(this.zoneCell, target.x, target.z, Math.max(4, this.tuning.zoneCellSize))
                : null;
        const engine = this.camera.getScene().getEngine();
        const aspect = engine.getRenderHeight() > 0 ? engine.getRenderWidth() / engine.getRenderHeight() : 16 / 9;
        const goal = modeTarget({
            zone: this.zoneCell ? { cell: this.zoneCell, fovDeg: this.def.fovDeg, aspect } : undefined,
            mode: this.mode,
            target,
            threats: this.threats,
            pose: { yawDeg: this.yawDeg, pitchDeg: this.pitchDeg, distance: this.distance },
            dt: frameSeconds,
            manualPause: this.manualPause,
            tuning: this.tuning,
        });
        // La cámara inteligente gira sola: ese giro pasa a ser el pedido.
        this.yawDeg = goal.pose.yawDeg;
        // La casilla pide la distancia que haga falta: el tope de zoom es para el jugador.
        const goalDistance =
            this.mode === 'zone'
                ? goal.pose.distance
                : Math.min(this.distanceCap ?? this.def.maxDistance, goal.pose.distance);
        if (!this.initialised) {
            this.focus.set(goal.focus.x, goal.focus.y, goal.focus.z);
            this.focusVel.set(0, 0, 0);
            this.shownYaw = this.yawDeg;
            this.shownPitch = this.pitchDeg;
            this.shownDistance = goalDistance;
            this.initialised = true;
        } else {
            const rate = smoothingRate(this.smoothing);
            // JUG-05: predicción de velocidad para suavizar el seguimiento.
            // La cámara mira un poco adelante del objetivo, proporcional a su velocidad.
            const predAhead = Math.min(0.3, frameSeconds); // segundos de predicción, tope 30 cm a 1 m/s
            const predX = goal.focus.x + this.focusVel.x * predAhead;
            const predY = goal.focus.y + this.focusVel.y * predAhead;
            const predZ = goal.focus.z + this.focusVel.z * predAhead;
            const prevX = this.focus.x;
            const prevY = this.focus.y;
            const prevZ = this.focus.z;
            this.focus.x = damp(prevX, predX, rate, frameSeconds);
            this.focus.y = damp(prevY, predY, rate, frameSeconds);
            this.focus.z = damp(prevZ, predZ, rate, frameSeconds);
            // Actualiza la velocidad estimada del foco (suavizada).
            const velRate = Math.max(rate * 0.5, 2);
            this.focusVel.x = damp(this.focusVel.x, (goal.focus.x - prevX) / Math.max(frameSeconds, 0.001), velRate, frameSeconds);
            this.focusVel.y = damp(this.focusVel.y, (goal.focus.y - prevY) / Math.max(frameSeconds, 0.001), velRate, frameSeconds);
            this.focusVel.z = damp(this.focusVel.z, (goal.focus.z - prevZ) / Math.max(frameSeconds, 0.001), velRate, frameSeconds);
            // El giro responde más rápido que el seguimiento: va pegado a la mano.
            this.shownYaw = dampAngle(this.shownYaw, this.yawDeg, rate * 2.5, frameSeconds);
            this.shownPitch = damp(this.shownPitch, this.pitchDeg, rate * 2.5, frameSeconds);
            this.shownDistance = damp(this.shownDistance, goalDistance, rate, frameSeconds);
        }
        const pitch = this.shownPitch * DEG;
        const yaw = this.shownYaw * DEG;
        const dx = -Math.sin(yaw) * Math.cos(pitch);
        const dy = Math.sin(pitch);
        const dz = -Math.cos(yaw) * Math.cos(pitch);
        const dist = this.unblockedDistance(dx, dy, dz);
        const p = this.camera.position;
        p.set(this.focus.x + dx * dist, this.focus.y + 1 + dy * dist, this.focus.z + dz * dist);
        if (this.ground) p.y = Math.max(p.y, this.ground.sample(p.x, p.z) + this.def.groundClearance);
        // Mira un poco por encima de los pies para que el personaje quede centrado.
        this.camera.setTarget(new Vector3(this.focus.x, this.focus.y + 1, this.focus.z));
    }

    /** Distancia hasta la primera caja sólida en la dirección (dx, dy, dz) desde el foco.
     * JUG-05: usa colisión analítica en lugar de muestreo discreto para eliminar tirones. */
    private unblockedDistance(dx: number, dy: number, dz: number): number {
        const ox = this.focus.x;
        const oy = this.focus.y + 1;
        const oz = this.focus.z;
        // Por casilla la cámara va alta: acercarla por una casa rompería el encuadre.
        if (this.blockerMode === 'inside' || this.mode === 'zone') {
            // Modo interior: solo se acerca si la cámara quedaría dentro de una caja.
            const blockers = this.blockers.map((b) => ({
                x: b.x,
                z: b.z,
                halfWidth: b.hw,
                halfDepth: b.hd,
                top: b.top,
            }));
            const ray = { x: ox, y: oy, z: oz, dx, dy, dz };
            const dist = distanceBeforeBlocker(ray, this.shownDistance, blockers, 0.35);
            return Math.max(this.def.minDistance * 0.5, dist);
        }
        // Modo exterior: la cámara se acerca si cualquier caja tapa el rayo.
        const blockers = this.blockers.map((b) => ({
            x: b.x,
            z: b.z,
            halfWidth: b.hw,
            halfDepth: b.hd,
            top: b.top,
        }));
        const ray = { x: ox, y: oy, z: oz, dx, dy, dz };
        const dist = distanceBeforeBlocker(ray, this.shownDistance, blockers, 0.6);
        return Math.max(this.def.minDistance * 0.5, dist);
    }
}
