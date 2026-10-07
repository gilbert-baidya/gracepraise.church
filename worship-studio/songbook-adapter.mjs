const BENGALI_RANGE = /[\u0980-\u09FF]/u;

export function normalizeSearchTerm(value) {
    return String(value || '')
        .toLocaleLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/gu, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

function cloneSong(song) {
    return Object.freeze({
        ...song,
        alternateTitles: Array.isArray(song.alternateTitles)
            ? Object.freeze([...song.alternateTitles])
            : undefined,
        sourcePages: Array.isArray(song.sourcePages)
            ? Object.freeze([...song.sourcePages])
            : undefined,
        sections: Array.isArray(song.sections)
            ? Object.freeze([...song.sections])
            : undefined
    });
}

export function createCatalog({ bengaliSongs = [], englishSongs = [] } = {}) {
    const combined = [...bengaliSongs, ...englishSongs].map(cloneSong);
    const ids = new Set();

    for (const song of combined) {
        if (!Number.isInteger(song.id) || song.id <= 0) {
            throw new Error('Songbook contains an invalid stable song ID.');
        }
        if (ids.has(song.id)) {
            throw new Error(`Songbook contains duplicate song ID ${song.id}.`);
        }
        if (typeof song.title !== 'string' || typeof song.lyrics !== 'string') {
            throw new Error(`Song ${song.id} is missing title or lyrics text.`);
        }
        ids.add(song.id);
    }

    const songs = Object.freeze(combined);
    const byId = new Map(songs.map(song => [song.id, song]));

    return Object.freeze({
        songs,
        byId,
        counts: Object.freeze({
            bangla: bengaliSongs.length,
            english: englishSongs.length,
            total: songs.length
        })
    });
}

export function loadClassicScript(source) {
    return new Promise((resolve, reject) => {
        let existing = document.querySelector(`script[data-studio-source="${source}"]`);
        if (existing?.dataset.failed === 'true') {
            existing.remove();
            existing = null;
        }
        if (existing?.dataset.loaded === 'true') {
            resolve();
            return;
        }

        const script = existing || document.createElement('script');
        script.src = source;
        script.async = true;
        script.dataset.studioSource = source;
        script.addEventListener('load', () => {
            script.dataset.loaded = 'true';
            resolve();
        }, { once: true });
        script.addEventListener('error', () => {
            script.dataset.failed = 'true';
            reject(new Error(`Could not load ${source}`));
        }, { once: true });
        if (!existing) document.head.appendChild(script);
    });
}

export async function loadSongbookCatalog() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('The browser Songbook adapter requires a document.');
    }

    if (!Array.isArray(window.SONGS_DATA)) {
        await loadClassicScript('../songs-data.js');
    }

    const bengaliSongs = Array.isArray(window.SONGS_DATA) ? window.SONGS_DATA : [];
    const englishSongs = Array.isArray(window.GPBC_ENGLISH_SONGS) ? window.GPBC_ENGLISH_SONGS : [];
    const metadataSongs = Array.isArray(window.SONGS_CATALOG) ? window.SONGS_CATALOG : [];

    if (metadataSongs.length && metadataSongs.length !== bengaliSongs.length) {
        throw new Error(`Songbook metadata/full-data mismatch: ${metadataSongs.length} catalog rows vs ${bengaliSongs.length} lyric records.`);
    }
    if (metadataSongs.length) {
        const metadataIds = new Set(metadataSongs.map(row => Number(row?.[0])));
        const missingMetadataId = bengaliSongs.find(song => !metadataIds.has(song.id));
        if (missingMetadataId) {
            throw new Error(`Songbook metadata is missing stable song ID ${missingMetadataId.id}.`);
        }
    }
    const catalog = createCatalog({ bengaliSongs, englishSongs });

    if (!catalog.counts.bangla) {
        throw new Error('The Songbook lyric source loaded without Bangla songs.');
    }

    return catalog;
}

export function getSongLanguage(song) {
    if (String(song?.language || '').toLocaleLowerCase() === 'english') return 'English';
    return BENGALI_RANGE.test(`${song?.title || ''}\n${song?.lyrics || ''}`) ? 'Bangla' : 'Unknown';
}

export function searchCatalog(catalog, query, limit = 30, runtime = globalThis.window?.GPBCSongbookPresentation) {
    const normalizedQuery = normalizeSearchTerm(query);
    if (normalizedQuery.length < 2) return [];

    const startsWith = [];
    const titleContains = [];
    const lyricContains = [];
    const phoneticContains = [];

    for (const song of catalog.songs) {
        const titles = [song.title, ...(song.alternateTitles || [])].map(normalizeSearchTerm);
        const primaryTitle = titles[0] || '';
        if (primaryTitle.startsWith(normalizedQuery)) {
            startsWith.push(song);
        } else if (titles.some(title => title.includes(normalizedQuery))) {
            titleContains.push(song);
        } else if (normalizeSearchTerm(song.lyrics).includes(normalizedQuery)) {
            lyricContains.push(song);
        } else if (runtime && /^phonetic-/u.test(runtime.matchSongSearch(song, query) || '')) {
            phoneticContains.push(song);
        }
    }

    return [...startsWith, ...titleContains, ...lyricContains, ...phoneticContains].slice(0, limit);
}

export function makeSearchExcerpt(song, query, maxLength = 132) {
    const normalizedQuery = normalizeSearchTerm(query);
    const lyricLines = String(song?.lyrics || '').split('\n').map(line => line.trim()).filter(Boolean);
    const match = lyricLines.find(line => normalizeSearchTerm(line).includes(normalizedQuery));
    const source = match || lyricLines[0] || '';
    return source.length > maxLength ? `${source.slice(0, maxLength - 1).trimEnd()}…` : source;
}
