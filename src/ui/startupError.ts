import { setLanguage, tr, type Language } from '../i18n';

export function startupErrorDetails(error: unknown): string {
    if (error instanceof Error) return error.message || error.name;
    if (typeof error === 'string') return error;
    try {
        return JSON.stringify(error) ?? String(error);
    } catch {
        return String(error);
    }
}

export function startupErrorLanguage(preference: string | null): Language {
    try {
        const options = JSON.parse(preference ?? 'null') as { language?: unknown } | null;
        return options?.language === 'en' ? 'en' : 'es';
    } catch {
        return 'es';
    }
}

export function showStartupError(error: unknown): void {
    let preference: string | null = null;
    try {
        preference = localStorage.getItem('frankmangames.options');
    } catch {
        preference = null;
    }
    setLanguage(startupErrorLanguage(preference));

    const root = document.createElement('main');
    root.id = 'startup-error';
    root.dataset.testid = 'startup-error';
    root.setAttribute('role', 'alert');
    root.setAttribute('aria-live', 'assertive');
    root.style.cssText =
        'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;box-sizing:border-box;overflow:auto;padding:32px;background:#17191e;color:#f4f1e8;font:16px/1.5 system-ui,sans-serif;';

    const panel = document.createElement('section');
    panel.style.cssText =
        'box-sizing:border-box;width:min(720px,100%);padding:28px;border:1px solid #595b62;border-radius:10px;background:#22252c;box-shadow:0 12px 40px #0008;';

    const title = document.createElement('h1');
    title.textContent = tr('No se pudo iniciar el juego');
    title.style.cssText = 'margin:0 0 12px;font-size:26px;line-height:1.2;';

    const guidance = document.createElement('p');
    guidance.textContent = tr('Revisa que los archivos de data/ estén completos y vuelve a abrir el juego.');
    guidance.style.cssText = 'margin:0 0 20px;color:#d2d3d8;';

    const label = document.createElement('h2');
    label.textContent = tr('Detalle del error');
    label.style.cssText = 'margin:0 0 8px;font-size:16px;';

    const detail = document.createElement('pre');
    detail.dataset.testid = 'startup-error-detail';
    detail.textContent = startupErrorDetails(error);
    detail.style.cssText =
        'box-sizing:border-box;max-height:40vh;overflow:auto;margin:0;padding:12px;border-radius:6px;background:#111318;color:#ffd27a;font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;';

    panel.append(title, guidance, label, detail);
    root.append(panel);
    document.body.replaceChildren(root);
}