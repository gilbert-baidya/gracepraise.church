const defineTheme = (id, name, base, depth, accent, secondary, atmosphere, symbol) => Object.freeze({
    id, name, base, depth, accent, secondary, atmosphere, symbol,
    lyrics: '#fffdf8', chord: accent, fontWeight: 700,
    textShadow: '0 1px 0 rgba(255,255,255,.12), 0 3px 2px rgba(0,0,0,.38), 0 5px 10px rgba(0,0,0,.18)'
});

export const THEMES = Object.freeze([
    defineTheme('sunday', 'Sunday Worship', '#123c38', '#092a29', '#efd59a', '#74b9a5', 'reverent', 'light'),
    defineTheme('victory', 'Victory / Celebration', '#173a69', '#121c41', '#ffe09a', '#70c9f5', 'radiant', 'rays'),
    defineTheme('good-friday', 'Good Friday', '#321823', '#110d17', '#dda9aa', '#803046', 'restrained', 'cross'),
    defineTheme('communion', 'Holy Communion', '#4c2636', '#21151d', '#f4dcb2', '#b98d72', 'sacred', 'cup'),
    defineTheme('easter', 'Easter / Resurrection', '#374e68', '#21364f', '#ffe7af', '#f4b89b', 'sunrise', 'sun'),
    defineTheme('christmas', 'Christmas', '#3d1d30', '#102b27', '#f4d494', '#aacfad', 'starlight', 'star'),
    defineTheme('new-year', 'New Year', '#18384c', '#131c32', '#d7e6ff', '#c1a6ef', 'horizon', 'rays'),
    defineTheme('thanksgiving', 'Thanksgiving', '#553827', '#2b2021', '#f5d59b', '#cf9d6b', 'harvest', 'branch'),
    defineTheme('prayer', 'Prayer / Fasting', '#253c4b', '#182731', '#d5e0df', '#8faeaa', 'quiet', 'light'),
    defineTheme('revival', 'Revival', '#3c224e', '#1c1939', '#f8ce91', '#d38db9', 'awakening', 'rays'),
    defineTheme('pentecost', 'Pentecost / Holy Spirit', '#57272a', '#2a172b', '#ffdaa0', '#eea475', 'warmth', 'flame'),
    defineTheme('baptism', 'Baptism', '#164e60', '#102e49', '#d8f5f4', '#82c9e0', 'water', 'waves'),
    defineTheme('youth', 'Youth Worship', '#292e66', '#18223e', '#d2f4da', '#c0adfa', 'modern', 'arcs')
]);

export function getTheme(id = 'sunday') {
    const theme = THEMES.find(theme => theme.id === id);
    if (!theme) throw new Error(`Unknown church theme: ${id}`);
    return theme;
}

// Event-name suggestions are advisory only. Dates never silently select a theme.
export function recommendTheme(name = '') {
    const rules = [
        [/good friday/iu, 'good-friday'], [/communion/iu, 'communion'], [/easter|resurrection/iu, 'easter'],
        [/christmas/iu, 'christmas'], [/new year/iu, 'new-year'], [/thanksgiving/iu, 'thanksgiving'],
        [/pentecost|holy spirit/iu, 'pentecost'], [/baptism/iu, 'baptism'], [/revival/iu, 'revival'],
        [/prayer|fasting/iu, 'prayer'], [/youth/iu, 'youth'], [/victory|celebration/iu, 'victory']
    ];
    return getTheme(rules.find(([pattern]) => pattern.test(name))?.[1] || 'sunday');
}

const SYMBOL_PATHS = Object.freeze({
    light: 'M0 20 Q110 0 220 20 M0 40 Q110 20 220 40',
    rays: 'M110 190 L15 15 M110 190 L70 0 M110 190 L145 0 M110 190 L205 20',
    cross: 'M110 15 V190 M55 70 H165',
    cup: 'M55 25 H165 Q160 105 110 110 Q60 105 55 25 M110 110 V175 M65 175 H155',
    sun: 'M20 155 A90 90 0 0 1 200 155 M0 175 H220 M10 190 H210',
    star: 'M110 10 L124 88 L200 100 L124 112 L110 190 L96 112 L20 100 L96 88 Z',
    branch: 'M40 190 Q150 130 180 10 M80 155 Q25 105 105 120 M130 100 Q65 65 150 65 M165 45 Q205 65 185 95',
    flame: 'M110 10 Q165 80 150 105 Q180 85 185 125 Q195 190 110 190 Q25 170 55 115 Q85 75 110 10 Z',
    waves: 'M0 60 Q55 20 110 60 T220 60 M0 110 Q55 70 110 110 T220 110 M0 160 Q55 120 110 160 T220 160',
    arcs: 'M10 190 A180 180 0 0 1 190 10 M45 190 A145 145 0 0 1 190 45 M80 190 A110 110 0 0 1 190 80'
});

export function applyTheme(canvas, id = 'sunday') {
    const theme = getTheme(id);
    canvas.dataset.churchTheme = theme.id;
    canvas.dataset.atmosphere = theme.atmosphere;
    for (const [key, value] of Object.entries({
        '--slide-base': theme.base, '--slide-depth': theme.depth, '--slide-accent': theme.accent,
        '--slide-secondary': theme.secondary, '--slide-glow': `${theme.secondary}30`,
        '--slide-lyrics': theme.lyrics, '--slide-chord': theme.chord,
        '--slide-weight': theme.fontWeight, '--slide-shadow': theme.textShadow
    })) canvas.style.setProperty(key, String(value));
    canvas.querySelector('.theme-symbol')?.remove();
    const svg = canvas.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 220 210');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'theme-symbol');
    const path = canvas.ownerDocument.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', SYMBOL_PATHS[theme.symbol]);
    svg.appendChild(path);
    canvas.prepend(svg);
}
