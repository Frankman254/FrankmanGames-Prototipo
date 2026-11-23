// U02-INT: Retrato e iconos de características — verificación de rutas y helpers.
import { describe, expect, it } from 'vitest';
import { artIcon, artIconUrl, portraitIds, portraitImg, portraitUrl } from '../src/ui/menus/artIcons';

describe('U02-INT: Retrato y iconos de stats', () => {
    describe('Retrato adventurer_default', () => {
        it('portraitUrl devuelve una URL para adventurer_default', () => {
            const url = portraitUrl('adventurer_default');
            expect(url).toBeTruthy();
            expect(url!.endsWith('.png')).toBe(true);
        });

        it('portraitImg devuelve <img> con la URL correcta', () => {
            const html = portraitImg('adventurer_default');
            expect(html).toBeTruthy();
            expect(html!).toContain('class="portrait-img"');
            expect(html!).toContain('src="');
            expect(html!).toContain('.png');
        });

        it('portraitImg devuelve null para un id que no existe', () => {
            expect(portraitImg('no_existe')).toBeNull();
        });

        it('portraitIds incluye adventurer_default', () => {
            const ids = portraitIds();
            expect(ids).toContain('adventurer_default');
        });
    });

    describe('Iconos de stats', () => {
        const statsWithIcons = ['strength', 'agility', 'intellect', 'vitality', 'spirit'];

        it.each(statsWithIcons)('artIconUrl("stats", "%s") devuelve una URL', (stat) => {
            const url = artIconUrl('stats', stat);
            expect(url).toBeTruthy();
            expect(url!.includes(stat)).toBe(true);
        });

        it.each(statsWithIcons)('artIcon("stats", "%s") devuelve <img>', (stat) => {
            const html = artIcon('stats', stat);
            expect(html).toBeTruthy();
            expect(html!).toContain('src="');
            expect(html!).toContain('alt=""');
        });

        it.each(['calm', 'flow', 'will'])('los stats secundarios también tienen PNG: %s', (stat) => {
            const html = artIcon('stats', stat);
            expect(html).toContain(`/assets/icons/stats/${stat}.png`);
            expect(html).toContain('alt=""');
        });

        it('artIcon devuelve null para id undefined', () => {
            expect(artIcon('stats', undefined)).toBeNull();
        });
    });
});
