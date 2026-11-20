// Pausa de impacto (hit pause) y sacudida de cámara al recibir o infligir daño.
// Módulo puro: sin DOM ni Babylon. Expone la lógica de temporización para que
// el render la consuma y la opción del jugador la active/desactive.

/** Duración por defecto de la pausa de impacto en segundos. */
const DEFAULT_HIT_PAUSE_DURATION = 0.06;

/** Intensidad de la sacudida de cámara en metros (desplazamiento aleatorio máximo). */
const DEFAULT_SHAKE_INTENSITY = 0.15;

/** Decaimiento de la sacudida por segundo. */
const DEFAULT_SHAKE_DECAY = 8;

/**
 * Estado de la pausa de impacto y la sacudida de cámara.
 * El render lo consulta cada fotograma para decidir si pausa la simulación
 * y cuánto desplazar la cámara.
 */
export interface HitPauseState {
    /** Segundos restantes de pausa de impacto (0 = sin pausa). */
    pauseRemaining: number;
    /** Intensidad actual de la sacudida de cámara (0 = sin sacudida). */
    shakeIntensity: number;
    /** Desplazamiento aleatorio para este fotograma (x, z) en metros. */
    shakeOffset: { x: number; z: number };
}

/** Parámetros configurables de la pausa de impacto. */
export interface HitPauseConfig {
    /** Duración de la pausa en segundos. */
    duration: number;
    /** Intensidad máxima de la sacudida en metros. */
    shakeIntensity: number;
    /** Velocidad de decaimiento de la sacudida por segundo. */
    shakeDecay: number;
    /** Activado por el jugador en Opciones. */
    enabled: boolean;
}

export const DEFAULT_HIT_PAUSE_CONFIG: HitPauseConfig = {
    duration: DEFAULT_HIT_PAUSE_DURATION,
    shakeIntensity: DEFAULT_SHAKE_INTENSITY,
    shakeDecay: DEFAULT_SHAKE_DECAY,
    enabled: true,
};

/**
 * Controlador de pausa de impacto y sacudida.
 * Se actualiza cada fotograma y devuelve el estado actual.
 */
export class HitPauseController {
    private _pauseRemaining = 0;
    private _shakeIntensity = 0;
    private _config: HitPauseConfig = DEFAULT_HIT_PAUSE_CONFIG;
    /** Semilla pseudo-aleatoria para la sacudida (determinista por frame). */
    private _seed = 42;

    /** Estado actual (solo lectura). */
    get state(): HitPauseState {
        const offset = this.computeShakeOffset();
        return {
            pauseRemaining: this._pauseRemaining,
            shakeIntensity: this._shakeIntensity,
            shakeOffset: offset,
        };
    }

    setConfig(config: HitPauseConfig): void {
        this._config = { ...config };
    }

    /**
     * Activa la pausa de impacto y la sacudida.
     * @param damageAmount — Daño infligido (para escalar la intensidad).
     * @param isCrit — Si es crítico, la pausa y la sacudida son más fuertes.
     */
    trigger(damageAmount: number, isCrit: boolean): void {
        if (!this._config.enabled) return;

        // Escalar según el daño: más daño = más pausa y sacudida.
        const damageScale = Math.min(1, damageAmount / 100);
        const critMultiplier = isCrit ? 1.8 : 1;

        this._pauseRemaining = this._config.duration * damageScale * critMultiplier;
        this._shakeIntensity = this._config.shakeIntensity * damageScale * critMultiplier;
    }

    /**
     * Avanza el estado un fotograma.
     * @param dt — Segundos transcurridos.
     */
    update(dt: number): void {
        // Reducir la pausa.
        this._pauseRemaining = Math.max(0, this._pauseRemaining - dt);

        // Decaimiento exponencial de la sacudida.
        if (this._shakeIntensity > 0.001) {
            this._shakeIntensity *= Math.exp(-this._config.shakeDecay * dt);
            if (this._shakeIntensity < 0.001) {
                this._shakeIntensity = 0;
            }
        } else {
            this._shakeIntensity = 0;
        }

        // Avanzar la semilla para el siguiente frame.
        this._seed = (this._seed * 16807 + 1) & 0x7fffffff;
    }

    /**
     * Calcula el desplazamiento aleatorio para este fotograma.
     * Usa una semilla pseudo-aleatoria para que la sacudida sea suave pero impredecible.
     */
    private computeShakeOffset(): { x: number; z: number } {
        if (this._shakeIntensity < 0.001) {
            return { x: 0, z: 0 };
        }

        // Generar dos valores pseudo-aleatorios en [-1, 1].
        const r1 = ((this._seed % 1000) / 500) - 1;
        const r2 = ((this._seed % 7919) / 3959.5) - 1;

        return {
            x: r1 * this._shakeIntensity,
            z: r2 * this._shakeIntensity,
        };
    }

    /** Reinicia el estado (cambio de escena, etc.). */
    reset(): void {
        this._pauseRemaining = 0;
        this._shakeIntensity = 0;
        this._seed = 42;
    }
}
