const theme = (id, name, base, depth, accent, secondary, atmosphere, symbol, description) => Object.freeze({
    id, name, base, depth, accent, secondary, atmosphere, symbol, description,
    scripture: '#fffdf6', english: '#f1eee5'
});

export const SCRIPTURE_THEMES = Object.freeze([
    theme('shepherds-peace', "Shepherd's Peace", '#163b36', '#071f25', '#e9d69b', '#79b5a0', 'pasture', 'river', 'Dawn over still water and a quiet pasture horizon.'),
    theme('word-light', 'Word & Light', '#16304f', '#080f22', '#f1d58d', '#8cb9dc', 'light', 'book', 'Deep blue, an open-book line, and restrained rays.'),
    theme('river-grace', 'River of Grace', '#184957', '#0b2634', '#d9e7c8', '#6cb7bd', 'river', 'river', 'A calm river corridor with distant layered land.'),
    theme('cross-dawn', 'Cross & Dawn', '#59372e', '#1c1a28', '#ffd9a0', '#da8c69', 'dawn', 'cross', 'A distant cross held in a warm sunrise field.'),
    theme('resurrection', 'Resurrection Morning', '#506376', '#1b344f', '#fff0bc', '#f0baa0', 'morning', 'sun', 'White-gold morning light above an opened horizon.'),
    theme('communion', 'Communion Table', '#4f2935', '#21141c', '#f3d9aa', '#b78b70', 'table', 'cup', 'Warm table tones with quiet bread-and-cup symbolism.'),
    theme('bethlehem', 'Bethlehem Night', '#17264b', '#080e25', '#f3d68f', '#829acb', 'night', 'star', 'Midnight blue, a guiding star, and a low village silhouette.'),
    theme('prayer-sanctuary', 'Prayer Sanctuary', '#2c4050', '#111c2b', '#e5d8bd', '#829b9d', 'sanctuary', 'arch', 'Soft sanctuary arches and a narrow beam of light.'),
    theme('victory-summit', 'Victory Summit', '#28415d', '#151d34', '#ffe0a0', '#e59a72', 'summit', 'mountain', 'A strong mountain line illuminated from the horizon.'),
    theme('bangla-heritage', 'Bangla Heritage', '#433029', '#171f24', '#e9c881', '#a87b60', 'heritage', 'boat', 'River, boat, and restrained alpana-inspired geometry.'),
    theme('revival-fire', 'Revival Fire', '#4b2439', '#1b1226', '#ffce83', '#c7675d', 'fire', 'flame', 'Dark plum depth with disciplined warm energy.'),
    theme('sacred-minimal', 'Sacred Minimal', '#243645', '#0c1721', '#e8d29b', '#738a9a', 'minimal', 'geometry', 'A premium deep gradient with fine gold geometry.')
]);

export function getScriptureTheme(id = 'shepherds-peace') {
    const value = SCRIPTURE_THEMES.find(entry => entry.id === id);
    if (!value) throw new Error(`Unknown Scripture theme: ${id}`);
    return value;
}

export function recommendScriptureTheme(programType = '') {
    const rules = [
        [/communion/iu, 'communion'],
        [/good friday|funeral|memorial/iu, 'cross-dawn'],
        [/easter|resurrection|baptism/iu, 'resurrection'],
        [/christmas/iu, 'bethlehem'],
        [/prayer|fasting|bible study/iu, 'prayer-sanctuary'],
        [/revival|youth/iu, 'revival-fire'],
        [/thanksgiving|wedding/iu, 'river-grace'],
        [/victory/iu, 'victory-summit']
    ];
    return getScriptureTheme(rules.find(([pattern]) => pattern.test(programType))?.[1] || 'shepherds-peace');
}

const SYMBOL_PATHS = Object.freeze({
    river: 'M0 126 Q55 98 110 126 T220 126 M0 151 Q55 123 110 151 T220 151 M25 92 Q80 64 125 86 T210 76',
    book: 'M18 62 Q68 42 108 68 V170 Q65 142 18 158 Z M202 62 Q152 42 112 68 V170 Q155 142 202 158 Z M110 22 V53 M78 31 L92 54 M142 31 L128 54',
    cross: 'M110 20 V184 M57 78 H163',
    sun: 'M20 154 A90 90 0 0 1 200 154 M0 176 H220 M110 32 V78 M54 54 L80 83 M166 54 L140 83',
    cup: 'M55 34 H165 Q158 111 110 116 Q62 111 55 34 M110 116 V176 M64 176 H156 M42 28 H178',
    star: 'M110 8 L124 87 L202 100 L124 113 L110 192 L96 113 L18 100 L96 87 Z M22 176 Q72 145 110 167 T198 176',
    arch: 'M36 188 V92 A74 74 0 0 1 184 92 V188 M72 188 V100 A38 38 0 0 1 148 100 V188',
    mountain: 'M5 184 L70 99 L105 134 L145 61 L216 184 Z M123 91 L145 61 L163 94',
    boat: 'M30 148 Q110 187 190 148 Q166 196 55 182 Z M109 46 V148 M110 54 Q157 82 166 126 H112 M42 40 Q62 20 82 40 M32 50 Q62 18 92 50',
    flame: 'M110 12 Q163 76 148 106 Q181 85 184 132 Q188 192 110 194 Q31 177 54 119 Q82 76 110 12 Z',
    geometry: 'M30 30 H190 V190 H30 Z M58 58 H162 V162 H58 Z M110 15 V205 M15 110 H205 M48 48 L172 172 M172 48 L48 172'
});

export function applyScriptureTheme(canvas, id) {
    const value = getScriptureTheme(id);
    canvas.dataset.scriptureTheme = value.id;
    canvas.dataset.atmosphere = value.atmosphere;
    const tokens = {
        '--scripture-base': value.base,
        '--scripture-depth': value.depth,
        '--scripture-accent': value.accent,
        '--scripture-secondary': value.secondary,
        '--scripture-text': value.scripture,
        '--scripture-english': value.english
    };
    for (const [name, token] of Object.entries(tokens)) canvas.style.setProperty(name, token);
    const symbolHost = canvas.querySelector('.scripture-background__symbol');
    if (symbolHost) {
        const svg = canvas.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 220 210');
        svg.setAttribute('aria-hidden', 'true');
        const path = canvas.ownerDocument.createElementNS(svg.namespaceURI, 'path');
        path.setAttribute('d', SYMBOL_PATHS[value.symbol]);
        svg.appendChild(path);
        symbolHost.replaceChildren(svg);
    }
    return value;
}
