export const LOADING_TIPS = [
    'Las Piedras Pintadas recuerdan dónde despiertas al caer.',
    'Mantén pulsado el botón de andar y el personaje sigue al cursor.',
    'Los monstruos cerca de tu nivel dan más experiencia; los muy débiles, casi nada.',
    'Con lluvia el fuego pega menos; con sol fuerte, más.',
    'En Características puedes escribir cuántos puntos gasta cada «+», o gastarlos todos con «Todo».',
    'Cuanto más hondo bajas en la cripta, mejores son sus cofres.',
    'En forma espectral no se puede viajar: busca un Alzador.',
    'Las puertas cerradas de la cripta se abren con un clic al llegar a ellas.',
    'Los objetos que no caben en la mochila pueden esperar en el banco de El Cruce.',
];

export function loadingProgressPercent(progress: number): number {
    return Math.round(Math.max(0, Math.min(1, progress)) * 100);
}

export function nextLoadingTipIndex(index: number): number {
    return (index + 1) % LOADING_TIPS.length;
}
