export interface WindowDragPosition {
    x: number;
    y: number;
}

/**
 * Recorte mientras se arrastra. Creador (2026-11-08): ninguna ventana sale de la
 * pantalla, ni aunque ya asomara al agarrarla; si cabe, se queda entera dentro.
 * Solo si es más grande que la pantalla se puede deslizar entre sus dos bordes
 * para ver cualquiera de ellos. (`start` se conserva por compatibilidad.)
 */
export function clampDrag(
    p: WindowDragPosition,
    w: number,
    h: number,
    vw: number,
    vh: number,
    _start?: WindowDragPosition,
): WindowDragPosition {
    const axis = (v: number, size: number, view: number): number => {
        const lo = Math.min(0, view - size);
        const hi = Math.max(0, view - size);
        return Math.max(lo, Math.min(hi, v));
    };
    return { x: axis(p.x, w, vw), y: axis(p.y, h, vh) };
}