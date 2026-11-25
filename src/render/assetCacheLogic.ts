export function getOrCreateAssetPromise<K, T>(cache: Map<K, Promise<T>>, key: K, load: () => Promise<T>): Promise<T> {
    const cached = cache.get(key);
    if (cached) return cached;

    const pending = load();
    cache.set(key, pending);
    pending.catch(() => {
        if (cache.get(key) === pending) cache.delete(key);
    });
    return pending;
}
