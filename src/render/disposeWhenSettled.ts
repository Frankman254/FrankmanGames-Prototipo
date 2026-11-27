// Cierre seguro de una escena y su motor propios (vistas previas 3D).
import type { AbstractEngine, Scene } from '@babylonjs/core';
// Babylon importa este shader bajo demanda al preparar la textura BRDF; en desarrollo ese
// import tarda segundos y la preparación terminaba con la escena ya cerrada. Cargado aquí, llega al instante.
import '@babylonjs/core/Shaders/rgbdDecode.fragment';

/**
 * Destruye `scene` y `engine` cuando Babylon ha terminado de preparar la textura BRDF de los
 * materiales PBR. Esa preparación es asíncrona: si la escena se destruye antes, al terminar
 * lee `getScene().postProcessManager` de una escena ya cerrada y lanza «Cannot read
 * properties of null (reading 'postProcessManager')». Espera como mucho `maxMs`.
 */
export function disposeWhenSettled(scene: Scene, engine: AbstractEngine, maxMs = 15000): void {
    const start = performance.now();
    const step = (): void => {
        const brdf = scene.environmentBRDFTexture?.getInternalTexture();
        if (brdf && !brdf.isReady && performance.now() - start < maxMs) {
            setTimeout(step, 50);
            return;
        }
        scene.dispose();
        engine.dispose();
    };
    step();
}
