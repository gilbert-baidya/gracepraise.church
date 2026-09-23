/* GPBC Song Book V18 presentation layer.
 * This file decorates the existing Song Book application without replacing
 * Firebase, the song data, playlist persistence, or modal/presenter logic.
 */
(() => {
    'use strict';

    const root = document.querySelector('[data-songbook-v18]');
    if (!root) return;

    let showingAllSongs = false;
    let lastRenderedSongs = [];

    const $ = (selector, scope = document) => scope.querySelector(selector);
    const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

    function setText(selector, value) {
        const element = $(selector);
        if (element) element.textContent = value;
    }

    function isBanglaSong(song) {
        return /[\u0980-\u09FF]/.test(`${song?.title || ''} ${song?.lyrics || ''}`);
    }

    function isEnglishSong(song) {
        return /[A-Za-z]/.test(`${song?.title || ''} ${song?.lyrics || ''}`) && !isBanglaSong(song);
    }

    function languageLabel(song) {
        if (isBanglaSong(song) && isEnglishSong(song)) return 'Bilingual';
        return isBanglaSong(song) ? 'বাংলা' : 'English';
    }

    function songChip(label) {
        const chip = document.createElement('span');
        chip.className = 'songbook-v18__chip';
        chip.textContent = label;
        return chip;
    }

    function decorateSongCards() {
        const cards = $$('#songList .song-card');
        cards.forEach((card, index) => {
            if (card.dataset.v18Decorated === 'true') return;

            const song = lastRenderedSongs[index];
            const title = $('h3', card);
            const category = $('p', card);
            const addButton = $('.add-to-service-btn', card);
            if (!song || !title || !category) return;

            card.dataset.v18Decorated = 'true';
            card.classList.add('songbook-v18__song-card');
            card.setAttribute('aria-label', `Open song: ${song.title}`);

            const top = document.createElement('div');
            top.className = 'songbook-v18__song-top';
            const note = document.createElement('span');
            note.className = 'songbook-v18__song-note';
            note.setAttribute('aria-hidden', 'true');
            note.textContent = '♫';
            const open = document.createElement('span');
            open.className = 'songbook-v18__song-open';
            open.textContent = 'Open song →';
            top.append(note, open);
            card.insertBefore(top, title);

            title.className = 'songbook-v18__song-title';
            category.className = 'songbook-v18__song-category';
            category.textContent = song.category || 'Worship';

            const meta = document.createElement('div');
            meta.className = 'songbook-v18__song-meta';
            meta.appendChild(songChip(languageLabel(song)));
            if (typeof hasChords === 'function' && hasChords(song)) meta.appendChild(songChip('With Chords'));
            card.insertBefore(meta, addButton || null);
        });
    }

    function syncListView() {
        const list = $('#songList');
        const search = $('#searchInput');
        if (!list) return;

        const hasSearch = Boolean(search?.value.trim());
        const hasSpecificAlphabet = Boolean($('.alphabet-btn.active:not(:first-child)'));
        const hasFilter = typeof currentFilter !== 'undefined' && currentFilter !== 'all';
        const hasLanguage = typeof currentLanguageFilter !== 'undefined' && currentLanguageFilter !== 'all';
        const collapsed = !showingAllSongs && !hasSearch && !hasSpecificAlphabet && !hasFilter && !hasLanguage;
        list.classList.toggle('is-collapsed', collapsed);

        const button = $('#showAllSongsBtn');
        if (button) {
            button.textContent = collapsed ? 'View All Songs →' : 'Show Recent Songs';
            button.setAttribute('aria-expanded', String(!collapsed));
        }
    }

    function renderFeaturedSong() {
        const target = $('#v18FeaturedSong');
        if (!target || typeof songsDatabase === 'undefined' || !songsDatabase.length) return;

        // The data set has no featured flag or dates. Use the final catalog item
        // deterministically and label it as a library feature, never as fake data.
        const song = songsDatabase[songsDatabase.length - 1];
        target.replaceChildren();

        const kicker = document.createElement('span');
        kicker.className = 'songbook-v18__section-kicker';
        kicker.textContent = 'From the song library';
        const title = document.createElement('h3');
        title.className = 'songbook-v18__featured-title';
        title.textContent = song.title;
        const meta = document.createElement('div');
        meta.className = 'songbook-v18__featured-meta';
        meta.appendChild(songChip(languageLabel(song)));
        if (song.category) meta.appendChild(songChip(song.category));
        if (typeof hasChords === 'function' && hasChords(song)) meta.appendChild(songChip('With Chords'));
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'songbook-v18__featured-button';
        button.textContent = 'View Song →';
        button.addEventListener('click', () => {
            if (typeof openSong === 'function') openSong(song);
        });
        target.append(kicker, title, meta, button);
    }

    function syncServiceSummary() {
        const target = $('#v18ServiceSummary');
        if (!target) return;
        const playlist = typeof servicePlaylist !== 'undefined' ? servicePlaylist : [];
        target.replaceChildren();

        if (!playlist.length) {
            const empty = document.createElement('div');
            empty.className = 'songbook-v18__service-empty';
            const title = document.createElement('strong');
            title.textContent = 'Plan your next worship service';
            const copy = document.createElement('p');
            copy.textContent = 'Add songs from the library to build a service playlist. Your current selection will appear here.';
            const mobileCopy = document.createElement('p');
            mobileCopy.className = 'songbook-v18__service-mobile-copy';
            mobileCopy.textContent = 'No songs selected yet.';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'songbook-v18__action songbook-v18__action--primary songbook-v18__service-browse';
            button.dataset.songbookAction = 'browse';
            button.innerHTML = '<span class="songbook-v18__service-browse-desktop">Browse songs →</span><span class="songbook-v18__service-browse-mobile">Build Service</span>';
            empty.append(title, copy, mobileCopy, button);
            target.appendChild(empty);
            return;
        }

        const list = document.createElement('ol');
        list.className = 'songbook-v18__service-list';
        playlist.slice(0, 5).forEach((song, index) => {
            const item = document.createElement('li');
            const number = document.createElement('span');
            number.className = 'songbook-v18__service-number';
            number.textContent = String(index + 1);
            const name = document.createElement('span');
            name.textContent = song.title;
            item.append(number, name);
            list.appendChild(item);
        });
        const summary = document.createElement('p');
        summary.className = 'songbook-v18__section-heading-copy';
        summary.textContent = `${playlist.length} song${playlist.length === 1 ? '' : 's'} in the current playlist.`;
        target.append(summary, list);
    }

    function setupAlphabetCollapse() {
        const alphabet = $('#alphabetIndex');
        const more = $('#songbookAlphabetMore');
        if (!alphabet || !more || more.dataset.bound === 'true') return;

        const applyState = () => {
            const buttons = $$('.alphabet-btn', alphabet);
            const isMobile = window.matchMedia('(max-width: 768px)').matches;
            const expanded = more.getAttribute('aria-expanded') === 'true';

            buttons.forEach((button, index) => {
                button.hidden = isMobile && !expanded && index >= 6;
            });

            more.hidden = !isMobile || buttons.length <= 6;
            if (!isMobile) more.setAttribute('aria-expanded', 'false');
            more.innerHTML = expanded && isMobile
                ? 'Show less <span aria-hidden="true">−</span>'
                : 'More <span aria-hidden="true">＋</span>';
        };

        more.addEventListener('click', () => {
            const expanded = more.getAttribute('aria-expanded') === 'true';
            more.setAttribute('aria-expanded', String(!expanded));
            applyState();
        });
        more.dataset.bound = 'true';

        const observer = new MutationObserver(applyState);
        observer.observe(alphabet, { childList: true });
        window.addEventListener('resize', applyState, { passive: true });
        applyState();
    }

    function syncMobileFooter() {
        const footer = document.querySelector('body.songbook-v18 .site-footer');
        if (!footer) return;

        const isMobile = window.matchMedia('(max-width: 640px)').matches;
        const columns = $$('.sacred-footer__column', footer);

        if (!isMobile) {
            columns.forEach((column) => {
                const toggle = $('.songbook-v18__footer-toggle', column);
                if (!toggle) return;
                const heading = document.createElement('h3');
                heading.className = 'footer-nav-title';
                heading.textContent = toggle.dataset.label || toggle.textContent.replace(/[+−]/g, '').trim();
                toggle.replaceWith(heading);
                const links = $('.footer-link-list', column);
                if (links) links.hidden = false;
            });
            footer.removeAttribute('data-songbook-mobile-footer');
            return;
        }

        columns.forEach((column, index) => {
            const heading = $('.footer-nav-title', column);
            const links = $('.footer-link-list', column);
            if (!heading || !links || heading.classList.contains('songbook-v18__footer-toggle')) return;

            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = `${heading.className} songbook-v18__footer-toggle`;
            toggle.dataset.label = heading.textContent.trim();
            toggle.setAttribute('aria-controls', links.id || `${column.id}-links`);
            toggle.setAttribute('aria-expanded', String(index === 0));
            toggle.innerHTML = `${toggle.dataset.label}<span aria-hidden="true">${index === 0 ? '−' : '+'}</span>`;
            links.id = links.id || `${column.id}-links`;
            links.hidden = index !== 0;

            toggle.addEventListener('click', () => {
                const open = toggle.getAttribute('aria-expanded') === 'true';
                columns.forEach((otherColumn) => {
                    const otherToggle = $('.songbook-v18__footer-toggle', otherColumn);
                    const otherLinks = $('.footer-link-list', otherColumn);
                    if (!otherToggle || !otherLinks) return;
                    const shouldOpen = otherToggle === toggle ? !open : false;
                    otherToggle.setAttribute('aria-expanded', String(shouldOpen));
                    otherToggle.lastElementChild.textContent = shouldOpen ? '−' : '+';
                    otherLinks.hidden = !shouldOpen;
                    otherColumn.classList.toggle('is-open', shouldOpen);
                });
            });

            heading.replaceWith(toggle);
            column.classList.toggle('is-open', index === 0);
        });

        footer.setAttribute('data-songbook-mobile-footer', 'true');
    }

    function syncCounts() {
        if (typeof songsDatabase === 'undefined') return;
        const songs = songsDatabase;
        const counts = {
            all: songs.length,
            bangla: songs.filter(isBanglaSong).length,
            english: songs.filter(isEnglishSong).length,
            chords: typeof hasChords === 'function' ? songs.filter(hasChords).length : 0
        };

        Object.entries(counts).forEach(([key, value]) => {
            $$(`[data-v18-count="${key}"]`).forEach((element) => {
                element.textContent = String(value);
            });
        });
    }

    function syncFilterState() {
        $$('.songbook-v18__filter').forEach((button) => {
            const language = button.dataset.language;
            const tabId = button.dataset.tab;
            const isLanguageActive = language && typeof currentLanguageFilter !== 'undefined' && currentLanguageFilter === language;
            const isTabActive = tabId && $(tabId)?.classList.contains('active');
            button.classList.toggle('is-active', Boolean(isLanguageActive || isTabActive));
        });
    }

    function setupControls() {
        const filterToggle = $('#songbookFilterToggle');
        const sidebar = $('#songbookFilterSidebar');
        filterToggle?.addEventListener('click', () => {
            const isOpen = sidebar.classList.toggle('is-open');
            filterToggle.setAttribute('aria-expanded', String(isOpen));
        });

        const mobileMore = $('#songbookMobileMore');
        const mobileMoreItems = $('#songbookMobileMoreItems');
        mobileMore?.addEventListener('click', () => {
            const expanded = mobileMore.getAttribute('aria-expanded') === 'true';
            mobileMore.setAttribute('aria-expanded', String(!expanded));
            if (mobileMoreItems) mobileMoreItems.hidden = expanded;
            mobileMore.innerHTML = expanded
                ? 'More <span aria-hidden="true">＋</span>'
                : 'Less <span aria-hidden="true">−</span>';
        });

        $('#showAllSongsBtn')?.addEventListener('click', () => {
            showingAllSongs = !showingAllSongs;
            syncListView();
            if (showingAllSongs) $('#songList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        $$('.songbook-v18__filter').forEach((button) => {
            button.addEventListener('click', () => {
                if (button.dataset.language && typeof setSongbookLanguageFilter === 'function') {
                    setSongbookLanguageFilter(button.dataset.language);
                    $('#searchInput').value = '';
                    showingAllSongs = false;
                    renderSongList(getFilteredSongs());
                } else if (button.dataset.tab) {
                    if (button.dataset.tab === '#allSongsTab' && typeof setSongbookLanguageFilter === 'function') {
                        setSongbookLanguageFilter('all');
                    }
                    $(button.dataset.tab)?.click();
                    showingAllSongs = false;
                }
                syncFilterState();
                sidebar?.classList.remove('is-open');
            });
        });

        $$('[data-songbook-scroll]').forEach((button) => {
            button.addEventListener('click', () => {
                const target = button.dataset.songbookScroll;
                if (target === 'saved') $('#savedPlaylistsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (target === 'service') $('#servicePlaylistPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (target === 'recent') $('#songList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        $$('[data-songbook-action="browse"]').forEach((button) => {
            button.addEventListener('click', () => {
                $('#searchInput')?.focus();
            });
        });

        document.addEventListener('keydown', (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                $('#searchInput')?.focus();
            }
        });

        $('#searchInput')?.addEventListener('input', () => {
            showingAllSongs = Boolean($('#searchInput').value.trim());
            window.setTimeout(() => {
                syncListView();
                syncFilterState();
            }, 0);
        });

        $$('.tab-btn').forEach((tab) => tab.addEventListener('click', () => {
            showingAllSongs = false;
            window.setTimeout(() => {
                syncListView();
                syncFilterState();
            }, 0);
        }));

        const songList = $('#songList');
        if (songList) {
            new MutationObserver(() => {
                decorateSongCards();
                syncListView();
            }).observe(songList, { childList: true });
        }
    }

    function wrapExistingAppFunctions() {
        if (typeof window.renderSongList === 'function' && !window.__songbookV18RenderWrapped) {
            const originalRenderSongList = window.renderSongList;
            window.renderSongList = (songs) => {
                lastRenderedSongs = Array.isArray(songs) ? songs : [];
                originalRenderSongList(songs);
                decorateSongCards();
                syncListView();
                syncFilterState();
            };
            window.__songbookV18RenderWrapped = true;
        }

        if (typeof window.updateServicePlaylistUI === 'function' && !window.__songbookV18PlaylistWrapped) {
            const originalUpdatePlaylist = window.updateServicePlaylistUI;
            window.updateServicePlaylistUI = (...args) => {
                originalUpdatePlaylist(...args);
                syncServiceSummary();
            };
            window.__songbookV18PlaylistWrapped = true;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        wrapExistingAppFunctions();
        if (!lastRenderedSongs.length && typeof songsDatabase !== 'undefined') lastRenderedSongs = songsDatabase;
        syncCounts();
        renderFeaturedSong();
        syncServiceSummary();
        setupControls();
        setupAlphabetCollapse();
        syncMobileFooter();
        decorateSongCards();
        syncListView();
        syncFilterState();
    }, { once: true });

    document.addEventListener('partials:loaded', syncMobileFooter);
    window.addEventListener('resize', syncMobileFooter, { passive: true });
})();
