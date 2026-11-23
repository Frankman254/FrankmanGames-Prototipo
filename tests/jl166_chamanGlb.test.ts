import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

describe('JL-166: chaman.glb accesible', () => {
    it('el archivo existe en assets/models/', () => {
        const path = join(ROOT, 'assets/models/chaman.glb');
        expect(existsSync(path)).toBe(true);
    });

    it('es un GLB válido (magic glTF)', () => {
        const path = join(ROOT, 'assets/models/chaman.glb');
        const buf = readFileSync(path);
        // Magic: 0x46546C67 ("glTF" en little-endian)
        const magic = buf.readUInt32LE(0);
        expect(magic).toBe(0x46546C67);
    });

    it('sin buffers externos (todo embebido)', () => {
        const path = join(ROOT, 'assets/models/chaman.glb');
        const buf = readFileSync(path);
        // Saltar header (12 bytes) y leer chunk JSON
        const chunkLen = buf.readUInt32LE(12);
        const chunkType = buf.readUInt32LE(16);
        expect(chunkType).toBe(0x4E4F534A); // JSON
        const jsonStr = buf.toString('utf8', 20, 20 + chunkLen);
        const gltf = JSON.parse(jsonStr);
        const buffers = gltf.buffers || [];
        // Si hay buffers, deben ser embebidos (sin uri externa)
        for (const b of buffers) {
            if (b.uri) {
                // URI externa – no debería haber
                expect(b.uri.startsWith('data:')).toBe(true);
            }
        }
    });

    it('sin imágenes externas', () => {
        const path = join(ROOT, 'assets/models/chaman.glb');
        const buf = readFileSync(path);
        const chunkLen = buf.readUInt32LE(12);
        const jsonStr = buf.toString('utf8', 20, 20 + chunkLen);
        const gltf = JSON.parse(jsonStr);
        const images = gltf.images || [];
        for (const img of images) {
            if (img.uri) {
                expect(img.uri.startsWith('data:')).toBe(true);
            }
        }
    });

    it('tiene las animaciones esperadas', () => {
        const path = join(ROOT, 'assets/models/chaman.glb');
        const buf = readFileSync(path);
        const chunkLen = buf.readUInt32LE(12);
        const jsonStr = buf.toString('utf8', 20, 20 + chunkLen);
        const gltf = JSON.parse(jsonStr);
        const anims = (gltf.animations || []).map((a: any) => a.name);
        expect(anims).toContain('Reposo');
        expect(anims).toContain('Caminar');
        expect(anims).toContain('Correr');
        expect(anims).toContain('Golpeado');
        expect(anims).toContain('Morir');
    });

    it('data/assets.json referencia chaman.glb', () => {
        const assetsPath = join(ROOT, 'data/assets.json');
        const assets = JSON.parse(readFileSync(assetsPath, 'utf8'));
        // Buscar la plantilla chaman
        const chaman = assets.templates?.chaman;
        expect(chaman).toBeDefined();
        expect(chaman.file).toBe('assets/models/chaman.glb');
    });
});
