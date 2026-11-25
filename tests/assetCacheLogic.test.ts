import { describe, expect, it } from 'vitest';
import { getOrCreateAssetPromise } from '../src/render/assetCacheLogic';

describe('getOrCreateAssetPromise', () => {
    it('reuses a fulfilled promise on cache hits', async () => {
        const cache = new Map<string, Promise<string>>();
        let loads = 0;
        const load = (): Promise<string> => {
            loads++;
            return Promise.resolve('container');
        };

        const first = getOrCreateAssetPromise(cache, 'hero', load);
        await expect(first).resolves.toBe('container');
        const hit = getOrCreateAssetPromise(cache, 'hero', load);

        expect(hit).toBe(first);
        expect(loads).toBe(1);
    });

    it('shares an in-flight promise instead of loading the asset twice', async () => {
        const cache = new Map<string, Promise<string>>();
        let loads = 0;
        let resolve!: (value: string) => void;
        const load = (): Promise<string> => {
            loads++;
            return new Promise((done) => {
                resolve = done;
            });
        };

        const first = getOrCreateAssetPromise(cache, 'hero', load);
        const duplicate = getOrCreateAssetPromise(cache, 'hero', load);

        expect(duplicate).toBe(first);
        expect(loads).toBe(1);
        resolve('container');
        await expect(first).resolves.toBe('container');
    });

    it('evicts a rejected load so a later request can retry', async () => {
        const cache = new Map<string, Promise<string>>();
        const failure = new Error('load failed');
        let loads = 0;
        const first = getOrCreateAssetPromise(cache, 'hero', () => {
            loads++;
            return Promise.reject(failure);
        });

        await expect(first).rejects.toBe(failure);
        expect(cache.has('hero')).toBe(false);

        const retry = getOrCreateAssetPromise(cache, 'hero', () => {
            loads++;
            return Promise.resolve('container');
        });

        await expect(retry).resolves.toBe('container');
        expect(retry).not.toBe(first);
        expect(loads).toBe(2);
    });
});
