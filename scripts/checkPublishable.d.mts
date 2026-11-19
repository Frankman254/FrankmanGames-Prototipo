export declare const FORBIDDEN_DIRS: string[];
export declare const OUTPUT_DIRS: string[];
/** Problemas encontrados: copias de archivos vetados y textos que citan carpetas vetadas. */
export declare function findUnpublishable(root: string, forbidden?: string[], outputs?: string[]): string[];
