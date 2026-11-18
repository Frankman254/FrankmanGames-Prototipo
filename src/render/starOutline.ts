// Contorno de la estrella de ocho puntas (área `star`) sobre el plano local XZ, sin Babylon.
// Es la unión de cuatro barras de ancho `width` y alcance `arm` cada 45°, la misma forma que
// prueba `shapeHitsCircle` en la simulación. El contorno es estrellado respecto al centro, así
// que basta un abanico desde el origen para rellenarlo (no hace falta triangulador).

/** Puntos [x, z] del contorno en sentido antihorario: por cada brazo, sus dos esquinas de la
 *  punta y el vértice cóncavo que lo une con el siguiente (24 puntos). */
export function starOutline(arm: number, width = 1): [number, number][] {
    const w = width / 2;
    const step = Math.PI / 4;
    const inner = w / Math.sin(step / 2); // cruce de los bordes de dos barras vecinas
    const tip = arm; // punta recta, como la barra de la simulación
    const out: [number, number][] = [];
    for (let k = 0; k < 8; k++) {
        const a = k * step;
        const c = Math.cos(a);
        const s = Math.sin(a);
        out.push([c * tip + s * w, s * tip - c * w]);
        out.push([c * tip - s * w, s * tip + c * w]);
        const m = a + step / 2;
        out.push([Math.cos(m) * inner, Math.sin(m) * inner]);
    }
    return out;
}
