export interface InspectorEntityDetails {
    name: string;
    parentNames: readonly string[];
    materialName: string | null;
    distance: number;
    point: { x: number; y: number; z: number } | null;
    vertices: number;
}

export function inspectorEntityText(entity: InspectorEntityDetails): string {
    const { name, parentNames, materialName, distance, point, vertices } = entity;
    return [
        `Malla: ${name}`,
        `Cuelga de: ${parentNames.join(' ← ') || '(raíz)'}`,
        `Material: ${materialName ?? '—'}`,
        `Distancia: ${Number.isFinite(distance) ? distance.toFixed(1) + ' m' : '—'}`,
        point ? `Punto: ${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)}` : '',
        `Vértices: ${vertices}`,
    ]
        .filter(Boolean)
        .join('\n');
}
