import {
    getSongLanguage,
    loadSongbookCatalog,
    makeSearchExcerpt,
    searchCatalog
} from './songbook-adapter.mjs?studio-startup=11';
import {
    PRESENTATION,
    createCanvasLineMeasurer,
    defaultSectionOrder,
    estimateRenderedLines,
    isAttributionLine,
    layoutSundaySet,
    parseSectionOrder,
    parseSongSections,
    songTheme,
    songPageSerials
} from './layout-engine.mjs?studio-startup=11';
import { createSetId, listSavedSets, loadSet, saveSet } from './studio-storage.mjs?studio-startup=11';
import {
    MODES, KEYS, hasChords, initializeModes, selectMode, storageSnapshot,
    layoutMode, loadSongbookPresentation, keySteps, renderPresentationLine,
    fitChordedPreview, CHORDED_PROFILES
} from './presentation-modes.mjs?studio-startup=11';
import { THEMES, applyTheme, recommendTheme } from './themes.mjs?studio-startup=11';
import { exportApprovedSlides } from './slide-export.mjs?studio-startup=11';
import { analyzeSongPropagation } from './chord-propagation.mjs?studio-startup=11';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const isLocalDevelopment = LOCAL_HOSTS.has(window.location.hostname);
const appElement = document.getElementById('studioApp');
const gateElement = document.getElementById('localAccessGate');

if (!isLocalDevelopment) {
    gateElement.hidden = false;
} else {
    appElement.hidden = false;
    startStudio().catch(error => {
        console.error('[Worship Song Studio]', error);
        document.getElementById('catalogCount').textContent = 'Catalog unavailable';
        document.getElementById('catalogDetail').textContent = error.message;
    });
}

function localIsoDate(date = new Date()) {
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function makeEmptySet(date = localIsoDate()) {
    return initializeModes({
        schemaVersion: 1,
        id: createSetId(date),
        date,
        name: 'Sunday Worship',
        themeId: 'sunday',
        showSectionLabels: true,
        songEntries: [],
        slides: [],
        createdAt: new Date().toISOString(),
        updatedAt: null
    });
}

async function startStudio() {
    const runtime = await loadSongbookPresentation();
    const catalog = await loadSongbookCatalog();
    const measureWidth = createCanvasLineMeasurer();
    const measureChord = createCanvasLineMeasurer({ fontCssPx: 36, fontFamily: 'Arial, sans-serif' });
    let currentSet = makeEmptySet();
    let previewObserver = null;

    const elements = {
        catalogCount: document.getElementById('catalogCount'),
        catalogDetail: document.getElementById('catalogDetail'),
        serviceDate: document.getElementById('serviceDate'),
        setName: document.getElementById('setName'),
        savedSets: document.getElementById('savedSets'),
        loadSetButton: document.getElementById('loadSetButton'),
        newSetButton: document.getElementById('newSetButton'),
        saveSetButton: document.getElementById('saveSetButton'),
        saveStatus: document.getElementById('saveStatus'),
        songSearch: document.getElementById('songSearch'),
        searchHelp: document.getElementById('searchHelp'),
        searchResults: document.getElementById('searchResults'),
        selectedSongs: document.getElementById('selectedSongs'),
        selectedSongCount: document.getElementById('selectedSongCount'),
        generateSlidesButton: document.getElementById('generateSlidesButton'),
        slideCount: document.getElementById('slideCount'),
        layoutStatus: document.getElementById('layoutStatus'),
        slidesEmpty: document.getElementById('slidesEmpty'),
        slidesList: document.getElementById('slidesList'),
        searchResultTemplate: document.getElementById('searchResultTemplate')
    };
    const themeSelector = document.getElementById('themeSelector');
    const sectionLabels = document.getElementById('showSectionLabels');
    const exportStatus = document.getElementById('exportStatus');
    const exportButtons = ['downloadPptx', 'downloadPdf', 'downloadPng'].map(id => document.getElementById(id));
    themeSelector.replaceChildren(...THEMES.map(theme => new Option(theme.name, theme.id)));

    elements.catalogCount.textContent = `${catalog.counts.total.toLocaleString()} real Songbook songs`;
    elements.catalogDetail.textContent = `${catalog.counts.bangla.toLocaleString()} Bangla + ${catalog.counts.english.toLocaleString()} English · stable IDs 1–${Math.max(...catalog.byId.keys())}`;

    function setStatus(message, tone = '') {
        elements.saveStatus.textContent = message;
        elements.saveStatus.dataset.tone = tone;
    }

    function markSetChanged(message = 'Unsaved set changes.') {
        setStatus(message, 'changed');
    }

    function withStorageErrors(action) {
        try {
            action();
        } catch (error) {
            console.error('[Worship Song Studio storage]', error);
            setStatus(`Browser-local storage failed: ${error.message}. Existing saved data was not cleared.`, 'error');
        }
    }

    function syncSetFields() {
        elements.serviceDate.value = currentSet.date;
        elements.setName.value = currentSet.name;
        themeSelector.value = currentSet.themeId || 'sunday';
        sectionLabels.checked = currentSet.showSectionLabels !== false;
        updateThemeRecommendation();
    }

    function updateThemeRecommendation() {
        const recommendation = recommendTheme(currentSet.name);
        document.getElementById('themeRecommendation').textContent =
            `Suggested for this set name: ${recommendation.name}. Your Theme selection always wins; dates never force a theme.`;
    }

    function styleSlide(canvas) {
        applyTheme(canvas, currentSet.themeId || 'sunday');
        const footer = canvas.querySelector('.slide-canvas__footer');
        if (footer) footer.hidden = currentSet.showSectionLabels === false;
    }

    function refreshSavedSets(selectedId = '') {
        const sets = listSavedSets();
        elements.savedSets.replaceChildren(new Option('Choose a saved set…', ''));
        for (const set of sets) {
            const label = `${set.date} · ${set.name || 'Sunday Worship'} · ${set.songEntries?.length || 0} songs`;
            elements.savedSets.appendChild(new Option(label, set.id));
        }
        elements.savedSets.value = sets.some(set => set.id === selectedId) ? selectedId : '';
        elements.loadSetButton.disabled = !elements.savedSets.value;
    }

    function getEntrySections(entry) {
        const song = catalog.byId.get(entry.songId);
        return song ? parseSongSections(song) : [];
    }

    function updateEntryOrder(entry, repeatChorus) {
        const sections = getEntrySections(entry);
        entry.repeatChorus = Boolean(repeatChorus);
        entry.sectionOrder = defaultSectionOrder(sections, entry.repeatChorus);
    }

    function renderSearchResults() {
        const query = elements.songSearch.value;
        elements.searchResults.replaceChildren();
        if (query.trim().length < 2) {
            elements.searchHelp.textContent = 'Enter at least two characters to search the full catalog.';
            return;
        }

        const results = searchCatalog(catalog, query, 30, runtime);
        elements.searchHelp.textContent = results.length
            ? `Showing ${results.length}${results.length === 30 ? ' best' : ''} match${results.length === 1 ? '' : 'es'}.`
            : 'No matching Songbook songs.';

        for (const song of results) {
            const fragment = elements.searchResultTemplate.content.cloneNode(true);
            const phoneticMatch = /^phonetic-/u.test(runtime.matchSongSearch(song, query) || '');
            fragment.querySelector('.search-result__id').textContent = `#${song.id} · ${getSongLanguage(song)}${phoneticMatch ? ' · phonetic match' : ''}`;
            fragment.querySelector('.search-result__title').textContent = song.title;
            fragment.querySelector('.search-result__excerpt').textContent = makeSearchExcerpt(song, query);
            const button = fragment.querySelector('.search-result__add');
            const selected = currentSet.songEntries.some(entry => entry.songId === song.id);
            button.textContent = selected ? 'Added' : 'Add';
            button.disabled = selected;
            button.addEventListener('click', () => addSong(song.id));
            elements.searchResults.appendChild(fragment);
        }
    }

    function addSong(songId) {
        if (currentSet.songEntries.some(entry => entry.songId === songId)) return;
        const song = catalog.byId.get(songId);
        if (!song) return;
        const sections = parseSongSections(song);
        currentSet.songEntries.push({
            songId,
            repeatChorus: false,
            sectionOrder: defaultSectionOrder(sections, false)
        });
        markSetChanged(`Added Songbook #${songId}. Existing manual slides were preserved.`);
        renderSelectedSongs();
        renderSearchResults();
    }

    function removeSong(index) {
        const [removed] = currentSet.songEntries.splice(index, 1);
        if (!removed) return;
        currentSet.slides = currentSet.slides.filter(slide => slide.songId !== removed.songId);
        for (const mode of Object.keys(currentSet.modeSlides)) {
            currentSet.modeSlides[mode] = currentSet.modeSlides[mode].filter(slide => slide.songId !== removed.songId);
        }
        currentSet.modeSlides[currentSet.activeMode] = currentSet.slides;
        for (const settings of Object.values(currentSet.modeSettings)) delete settings[removed.songId];
        markSetChanged(`Removed Songbook #${removed.songId} and its set-specific slides.`);
        renderSelectedSongs();
        renderSearchResults();
        renderSlides();
    }

    function moveSong(index, direction) {
        const target = index + direction;
        if (target < 0 || target >= currentSet.songEntries.length) return;
        [currentSet.songEntries[index], currentSet.songEntries[target]] = [currentSet.songEntries[target], currentSet.songEntries[index]];
        markSetChanged('Song order changed. Manual slide order was preserved; regenerate only if you want to replace it.');
        renderSelectedSongs();
    }

    function makeIconButton(label, text, onClick, disabled = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'icon-button';
        button.setAttribute('aria-label', label);
        button.title = label;
        button.textContent = text;
        button.disabled = disabled;
        button.addEventListener('click', onClick);
        return button;
    }

    function renderSelectedSongs() {
        elements.selectedSongs.replaceChildren();
        elements.selectedSongCount.textContent = String(currentSet.songEntries.length);
        elements.generateSlidesButton.disabled = currentSet.songEntries.length === 0;

        if (!currentSet.songEntries.length) {
            const empty = document.createElement('p');
            empty.className = 'empty-copy';
            empty.textContent = 'Search the master Songbook and add songs to begin.';
            elements.selectedSongs.appendChild(empty);
            return;
        }

        currentSet.songEntries.forEach((entry, index) => {
            const song = catalog.byId.get(entry.songId);
            if (!song) return;
            const sections = parseSongSections(song);
            const hasChorus = sections.some(section => section.kind === 'chorus');
            entry.sectionOrder = parseSectionOrder(entry.sectionOrder?.join(', '), sections);

            const card = document.createElement('article');
            card.className = 'selected-song';

            const order = document.createElement('span');
            order.className = 'selected-song__number';
            order.textContent = String(index + 1);

            const content = document.createElement('div');
            content.className = 'selected-song__content';
            const title = document.createElement('h3');
            title.textContent = song.title;
            const meta = document.createElement('p');
            meta.textContent = `Songbook #${song.id} · ${getSongLanguage(song)} · ${sections.map(section => `${section.code} ${section.label}`).join(' · ')}`;

            const controls = document.createElement('div');
            controls.className = 'selected-song__layout';
            const orderLabel = document.createElement('label');
            const orderLabelText = document.createElement('span');
            orderLabelText.textContent = 'Section order';
            const orderInput = document.createElement('input');
            orderInput.type = 'text';
            orderInput.value = entry.sectionOrder.join(', ');
            orderInput.setAttribute('aria-label', `Section order for ${song.title}`);
            orderInput.addEventListener('change', () => {
                entry.sectionOrder = parseSectionOrder(orderInput.value, sections);
                orderInput.value = entry.sectionOrder.join(', ');
                entry.repeatChorus = false;
                markSetChanged('Section sequence changed. Existing manual slides were preserved.');
                renderSelectedSongs();
            });
            orderLabel.append(orderLabelText, orderInput);

            const repeatLabel = document.createElement('label');
            repeatLabel.className = 'checkbox-label';
            const repeat = document.createElement('input');
            repeat.type = 'checkbox';
            repeat.checked = Boolean(entry.repeatChorus);
            repeat.disabled = !hasChorus;
            repeat.addEventListener('change', () => {
                updateEntryOrder(entry, repeat.checked);
                markSetChanged('Full chorus repetition changed. Existing manual slides were preserved.');
                renderSelectedSongs();
            });
            const repeatText = document.createElement('span');
            repeatText.textContent = hasChorus ? 'Repeat the full chorus after each verse' : 'No chorus marker detected';
            repeatLabel.append(repeat, repeatText);
            controls.append(orderLabel, repeatLabel);
            if (hasChords(currentSet.activeMode)) {
                const settings = currentSet.modeSettings[currentSet.activeMode][song.id] ||= { key: '', capo: 0 };
                const base = runtime.getSongBaseKey(song);
                const keyLabel = document.createElement('label');
                const label = document.createElement('span');
                label.textContent = `Sounding key (Songbook original: ${base || 'unavailable'})`;
                const keySelect = document.createElement('select');
                keySelect.setAttribute('aria-label', `Key for Songbook ${song.id}`);
                keySelect.appendChild(new Option(`Original key${base ? ` (${base})` : ' unavailable'}`, ''));
                for (const key of KEYS) keySelect.appendChild(new Option(key, key));
                keySelect.value = settings.key;
                keySelect.disabled = !base;
                keySelect.addEventListener('change', () => {
                    settings.key = keySelect.value;
                    markSetChanged('Presentation key changed; lyric edits and original source preserved.');
                    renderSelectedSongs();
                    renderSlides();
                });
                keyLabel.append(label, keySelect);
                const capoLabel = document.createElement('label');
                const capoText = document.createElement('span');
                const steps = base ? keySteps(song, settings.key, runtime) : 0;
                const sounding = base ? runtime.transposeChordSymbol(base, steps) : null;
                const playing = base ? runtime.transposeChordSymbol(base, steps - settings.capo) : null;
                const suggestions = base ? runtime.getSuggestedCapos(song, steps) : [];
                const sourceCapo = runtime.getSongSourceCapo(song);
                capoText.textContent = `Capo ${settings.capo}: play ${playing || 'unknown'}; sounds ${sounding || 'unknown'}`
                    + (sourceCapo === null ? '' : ` · printed capo ${sourceCapo}`)
                    + (suggestions.length ? ` · suggested ${suggestions.map(option => `${option.capo} → ${option.shape}`).join(', ')}` : '');
                const capoSelect = document.createElement('select');
                capoSelect.setAttribute('aria-label', `Capo for Songbook ${song.id}`);
                for (let capo = 0; capo <= 12; capo += 1) capoSelect.appendChild(new Option(String(capo), String(capo)));
                capoSelect.value = String(settings.capo);
                capoSelect.disabled = !base;
                capoSelect.addEventListener('change', () => {
                    settings.capo = Number(capoSelect.value);
                    markSetChanged('Set-specific capo changed; master arrangement preserved.');
                    renderSelectedSongs();
                    renderSlides();
                });
                capoLabel.append(capoText, capoSelect);
                controls.append(keyLabel, capoLabel);
                const audit = analyzeSongPropagation(song, { runtime, measureWidth });
                if (audit.candidates.length) {
                    const apply = document.createElement('button');
                    apply.type = 'button';
                    apply.className = 'text-button';
                    apply.disabled = audit.candidates.every(candidate => candidate.confidence === 'low');
                    apply.textContent = apply.disabled ? 'Chord pattern needs review'
                        : 'Apply same-song chord suggestions';
                    apply.title = apply.disabled
                        ? [...new Set(audit.candidates.map(candidate => candidate.reason))].join(' ')
                        : 'Updates non-manual copies for this song only; confirmed source chords are preserved.';
                    apply.setAttribute('aria-label', `Apply same-song chord pattern for Songbook ${song.id}`);
                    apply.addEventListener('click', () => {
                        const replacements = [];
                        const skipped = [];
                        try {
                            for (const mode of ['musician', 'phoneticChords']) {
                                const existing = currentSet.modeSlides[mode];
                                if (!existing) continue;
                                const own = existing.filter(slide => slide.songId === song.id);
                                if (own.some(slide => slide.manual)) {
                                    skipped.push(MODES[mode]);
                                    continue;
                                }
                                const generated = layoutMode([entry], catalog, mode, { measureWidth, measureChord, runtime });
                                let inserted = false;
                                const next = existing.flatMap(slide => {
                                    if (slide.songId !== song.id) return [slide];
                                    if (inserted) return [];
                                    inserted = true;
                                    return generated;
                                });
                                if (!inserted) next.push(...generated);
                                replacements.push({ mode, slides: next });
                            }
                            if (!replacements.length) {
                                setStatus('Existing manual copies were preserved. Generate a reviewed new mode copy to apply suggestions.', 'error');
                                return;
                            }
                            for (const replacement of replacements) currentSet.modeSlides[replacement.mode] = replacement.slides;
                            currentSet.slides = currentSet.modeSlides[currentSet.activeMode];
                            markSetChanged(`Same-song suggestions applied; source chords unchanged.${skipped.length ? ` Manual ${skipped.join(' / ')} copies preserved.` : ''}`);
                            renderSlides();
                        } catch (error) {
                            console.error('[Worship Song Studio chord propagation]', error);
                            setStatus(`Chord propagation failed: ${error.message}. Existing copies preserved.`, 'error');
                        }
                    });
                    controls.appendChild(apply);
                }
            }
            content.append(title, meta, controls);

            const actions = document.createElement('div');
            actions.className = 'row-actions';
            actions.append(
                makeIconButton(`Move ${song.title} up`, '↑', () => moveSong(index, -1), index === 0),
                makeIconButton(`Move ${song.title} down`, '↓', () => moveSong(index, 1), index === currentSet.songEntries.length - 1),
                makeIconButton(`Remove ${song.title}`, '×', () => removeSong(index))
            );
            card.append(order, content, actions);
            elements.selectedSongs.appendChild(card);
        });
    }

    function updateLayoutStatus(message, tone = '') {
        elements.layoutStatus.textContent = message;
        elements.layoutStatus.dataset.tone = tone;
    }

    function generateSlides() {
        if (!currentSet.songEntries.length) return;
        if (currentSet.slides.length && !window.confirm(`Regenerate all ${MODES[currentSet.activeMode]} slides? This replaces manual line and slide edits for this mode only.`)) return;
        generateActiveMode();
    }

    function generateActiveMode() {
        try {
            const slides = currentSet.activeMode === 'congregation'
                ? layoutSundaySet(currentSet.songEntries, catalog, { measureWidth })
                : layoutMode(currentSet.songEntries, catalog, currentSet.activeMode, { measureWidth, measureChord, runtime });
            currentSet.slides = slides;
            currentSet.modeSlides[currentSet.activeMode] = slides;
        } catch (error) {
            console.error('[Worship Song Studio generation]', error);
            updateLayoutStatus(`Generation failed: ${error.message}. Existing slides were preserved.`, 'error');
            return;
        }
        markSetChanged('Generated slides are ready; save the set to keep them.');
        updateLayoutStatus(`${currentSet.slides.length} slides generated from ${currentSet.songEntries.length} real Songbook song${currentSet.songEntries.length === 1 ? '' : 's'}.`, 'success');
        renderSlides();
    }

    function markManual(slide, message = 'Manual slide edit preserved in this set.') {
        slide.manual = true;
        markSetChanged(message);
    }

    function moveSlide(index, direction) {
        const target = index + direction;
        if (target < 0 || target >= currentSet.slides.length) return;
        [currentSet.slides[index], currentSet.slides[target]] = [currentSet.slides[target], currentSet.slides[index]];
        currentSet.slides[index].manual = true;
        currentSet.slides[target].manual = true;
        markSetChanged('Manual slide order changed.');
        renderSlides();
    }

    function splitSlide(index, afterLineIndex) {
        const slide = currentSet.slides[index];
        if (!slide || afterLineIndex < 0 || afterLineIndex >= slide.lines.length - 1) return;
        const trailing = slide.lines.splice(afterLineIndex + 1);
        const trailingDetails = slide.lineDetails?.splice(afterLineIndex + 1);
        markManual(slide);
        currentSet.slides.splice(index + 1, 0, {
            ...slide,
            id: `${slide.id}-split-${Date.now().toString(36)}`,
            lines: trailing,
            ...(trailingDetails ? { lineDetails: trailingDetails } : {}),
            manual: true
        });
        renderSlides();
    }

    function mergeSlideWithNext(index) {
        const slide = currentSet.slides[index];
        const next = currentSet.slides[index + 1];
        if (!slide || !next || slide.songId !== next.songId) return;
        slide.lines.push(...next.lines);
        if (slide.lineDetails) slide.lineDetails.push(...next.lineDetails);
        slide.manual = true;
        currentSet.slides.splice(index + 1, 1);
        markSetChanged('Slides merged. Chorded previews try safe adaptive fitting; congregation stays 54pt.');
        renderSlides();
    }

    function moveLine(slideIndex, lineIndex, direction) {
        const slide = currentSet.slides[slideIndex];
        const target = currentSet.slides[slideIndex + direction];
        if (!slide || !target || slide.songId !== target.songId) return;
        const [line] = slide.lines.splice(lineIndex, 1);
        const detail = slide.lineDetails?.splice(lineIndex, 1)[0];
        if (direction < 0) target.lines.push(line);
        else target.lines.unshift(line);
        if (detail) {
            if (direction < 0) target.lineDetails.push(detail);
            else target.lineDetails.unshift(detail);
        }
        slide.manual = true;
        target.manual = true;
        if (!slide.lines.length) currentSet.slides.splice(slideIndex, 1);
        markSetChanged('Line moved between slides.');
        renderSlides();
    }

    function deleteSlide(index) {
        currentSet.slides.splice(index, 1);
        markSetChanged('Slide removed from this set.');
        renderSlides();
    }

    function renderLyricLine(element, line, detail, songId) {
        renderPresentationLine(element, line, detail, {
            mode: currentSet.activeMode, song: catalog.byId.get(songId),
            settings: currentSet.modeSettings[currentSet.activeMode][songId] || {}, runtime
        });
    }

    function updateSlideScale(frame, canvas) {
        const scale = frame.clientWidth / PRESENTATION.widthPx;
        frame.style.height = `${PRESENTATION.heightPx * scale}px`;
        canvas.style.transform = `scale(${scale})`;
    }

    function fitSlidePreview(canvas, slide, card) {
        if (!hasChords(currentSet.activeMode)) return;
        const layout = fitChordedPreview(canvas);
        slide.chordLayout = layout || { ...CHORDED_PROFILES.at(-1) };
        const label = card.querySelector('.capacity-label');
        card.classList.toggle('slide-editor--overflow', !layout);
        label.dataset.overflow = String(!layout);
        if (layout) {
            label.textContent = `${layout.fontPoints}pt lyrics · ${layout.fontPoints / 2}pt chords · ${slide.lines.length} logical lines`
                + (slide.manual ? ' · manually edited' : '');
        } else {
            label.textContent = '48pt lyrics · 24pt chords — still exceeds safe geometry; split or review this slide.';
        }
    }

    function observeSlidePreviews() {
        previewObserver?.disconnect();
        previewObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const canvas = entry.target.querySelector('.slide-canvas');
                if (canvas) {
                    updateSlideScale(entry.target, canvas);
                    if (hasChords(currentSet.activeMode)) {
                        const card = entry.target.closest('.slide-editor');
                        const slide = currentSet.slides.find(item => item.id === card.dataset.slideId);
                        if (slide) fitSlidePreview(canvas, slide, card);
                    }
                }
            }
        });
        document.querySelectorAll('.slide-frame').forEach(frame => {
            previewObserver.observe(frame);
            const canvas = frame.querySelector('.slide-canvas');
            if (canvas) updateSlideScale(frame, canvas);
        });
    }

    function renderSlides() {
        document.getElementById('modeTitle').textContent = MODES[currentSet.activeMode];
        document.querySelector('.layout-actions strong').textContent = `${MODES[currentSet.activeMode]} layout`;
        document.querySelector('.layout-actions span').textContent = hasChords(currentSet.activeMode)
            ? '16:9 · adaptive 54–48pt lyrics · proportional chords · up to 4 meaningful phrases'
            : '16:9 · 54pt · prefer 3 lyric lines · up to 4 rendered lines';
        document.querySelectorAll('[data-mode]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.mode === currentSet.activeMode));
        });
        elements.slidesList.replaceChildren();
        elements.slideCount.textContent = String(currentSet.slides.length);
        elements.slidesEmpty.hidden = currentSet.slides.length > 0;
        exportButtons.forEach(button => { button.disabled = !currentSet.slides.length; });
        exportStatus.dataset.tone = '';
        exportStatus.textContent = currentSet.slides.length
            ? `${MODES[currentSet.activeMode]} · ${currentSet.slides.length} slides ready for review and download.`
            : 'Generate and review the selected mode to enable downloads.';
        if (!currentSet.slides.length) return;

        const pageSerials = songPageSerials(currentSet.slides);
        currentSet.slides.forEach((slide, slideIndex) => {
            const renderedLineCount = estimateRenderedLines(slide.lines, measureWidth);
            const chorded = hasChords(currentSet.activeMode);
            const capacityLimit = PRESENTATION.maxRenderedLines;
            const overflow = !chorded && renderedLineCount > capacityLimit;
            const card = document.createElement('article');
            card.className = `slide-editor${overflow ? ' slide-editor--overflow' : ''}`;
            card.dataset.slideId = slide.id;

            const header = document.createElement('header');
            header.className = 'slide-editor__header';
            const heading = document.createElement('div');
            const indexLabel = document.createElement('span');
            indexLabel.className = 'slide-editor__index';
            indexLabel.textContent = `Slide ${slideIndex + 1}`;
            const title = document.createElement('h3');
            title.textContent = `${slide.songTitle} · ${slide.sectionLabel}`;
            const capacity = document.createElement('p');
            capacity.className = 'capacity-label';
            capacity.dataset.overflow = String(overflow);
            capacity.textContent = overflow
                ? `${renderedLineCount} rendered lines — split this slide; font remains 54pt`
                : `${renderedLineCount} of ${capacityLimit} rendered lines${slide.manual ? ' · manually edited' : ''}`;
            heading.append(indexLabel, title, capacity);

            const headerActions = document.createElement('div');
            headerActions.className = 'row-actions';
            headerActions.append(
                makeIconButton(`Move slide ${slideIndex + 1} up`, '↑', () => moveSlide(slideIndex, -1), slideIndex === 0),
                makeIconButton(`Move slide ${slideIndex + 1} down`, '↓', () => moveSlide(slideIndex, 1), slideIndex === currentSet.slides.length - 1),
                makeIconButton(`Merge slide ${slideIndex + 1} with next slide`, 'Merge ↓', () => mergeSlideWithNext(slideIndex), slide.songId !== currentSet.slides[slideIndex + 1]?.songId),
                makeIconButton(`Delete slide ${slideIndex + 1}`, '×', () => deleteSlide(slideIndex))
            );
            header.append(heading, headerActions);

            const body = document.createElement('div');
            body.className = 'slide-editor__body';
            const frame = document.createElement('div');
            frame.className = 'slide-frame';
            frame.setAttribute('aria-label', `16 by 9 ${MODES[currentSet.activeMode].toLowerCase()} preview for slide ${slideIndex + 1}`);
            const canvas = document.createElement('div');
            canvas.className = 'slide-canvas';
            canvas.dataset.theme = songTheme(slide.songId);
            canvas.dataset.mode = currentSet.activeMode;
            const slideTitle = document.createElement('div');
            slideTitle.className = 'slide-canvas__title';
            slideTitle.textContent = slide.songTitle;
            const lyricBlock = document.createElement('div');
            lyricBlock.className = 'slide-canvas__lyrics';
            for (const [lineIndex, line] of slide.lines.entries()) {
                const lyric = document.createElement('div');
                renderLyricLine(lyric, line, slide.lineDetails?.[lineIndex], slide.songId);
                lyricBlock.appendChild(lyric);
            }
            const slideFooter = document.createElement('div');
            slideFooter.className = 'slide-canvas__footer';
            slideFooter.textContent = `${slide.sectionLabel} · GPBC`;
            const pageSerial = document.createElement('div');
            pageSerial.className = 'slide-canvas__serial';
            pageSerial.textContent = pageSerials[slideIndex];
            pageSerial.setAttribute('aria-label', `Song page ${pageSerials[slideIndex]}`);
            canvas.append(slideTitle, lyricBlock, slideFooter, pageSerial);
            styleSlide(canvas);
            frame.appendChild(canvas);

            const lineEditor = document.createElement('div');
            lineEditor.className = 'line-editor';
            const lineEditorLabel = document.createElement('strong');
            lineEditorLabel.textContent = 'Lyric lines';
            lineEditor.appendChild(lineEditorLabel);
            const reviewNotes = [...(slide.reviewNotes || []),
                ...(slide.lineDetails || []).flatMap(detail => [
                    ...detail.warnings,
                    ...(detail.alignmentValid ? [] : ['Manual lyric edit: confirm chord word positions before using alignment.'])
                ])];
            if (reviewNotes.length) {
                const note = document.createElement('p');
                note.className = 'review-note';
                note.textContent = [...new Set(reviewNotes)].join(' ');
                lineEditor.appendChild(note);
            }
            slide.lines.forEach((line, lineIndex) => {
                const row = document.createElement('div');
                row.className = 'line-editor__row';
                const input = document.createElement('textarea');
                input.rows = 2;
                input.value = line;
                input.setAttribute('aria-label', `Slide ${slideIndex + 1}, line ${lineIndex + 1}`);
                input.addEventListener('input', () => {
                    slide.lines[lineIndex] = input.value.replace(/\n/gu, ' ');
                    markManual(slide);
                    const detail = slide.lineDetails?.[lineIndex];
                    if (detail?.anchors.length) {
                        detail.alignmentValid = false;
                        if (detail.propagation) detail.propagation.status = 'suggested';
                        let note = lineEditor.querySelector('.manual-alignment-note');
                        if (!note) {
                            note = document.createElement('p');
                            note.className = 'review-note manual-alignment-note';
                            lineEditor.appendChild(note);
                        }
                        note.textContent = 'Manual lyric edit: review and confirm chord word positions. Chords are shown as unpositioned until confirmed.';
                    }
                    const previewLine = lyricBlock.children[lineIndex];
                    if (previewLine) renderLyricLine(previewLine, slide.lines[lineIndex], detail, slide.songId);
                    if (chorded) {
                        fitSlidePreview(canvas, slide, card);
                        return;
                    }
                    const nextRenderedLineCount = estimateRenderedLines(slide.lines, measureWidth);
                    const nextOverflow = nextRenderedLineCount > capacityLimit;
                    card.classList.toggle('slide-editor--overflow', nextOverflow);
                    capacity.dataset.overflow = String(nextOverflow);
                    capacity.textContent = nextOverflow
                        ? `${nextRenderedLineCount} rendered lines — split this slide; font remains 54pt`
                        : `${nextRenderedLineCount} of ${PRESENTATION.maxRenderedLines} rendered lines · manually edited`;
                });
                const actions = document.createElement('div');
                actions.className = 'line-editor__actions';
                actions.append(
                    makeIconButton('Move line to previous slide', '←', () => moveLine(slideIndex, lineIndex, -1), slide.songId !== currentSet.slides[slideIndex - 1]?.songId),
                    makeIconButton('Split slide after this line', 'Split', () => splitSlide(slideIndex, lineIndex), lineIndex === slide.lines.length - 1),
                    makeIconButton('Move line to next slide', '→', () => moveLine(slideIndex, lineIndex, 1), slide.songId !== currentSet.slides[slideIndex + 1]?.songId)
                );
                row.append(input, actions);
                if (chorded && slide.lineDetails?.[lineIndex]) {
                    const detail = slide.lineDetails[lineIndex];
                    const chordEditor = document.createElement('div');
                    chordEditor.className = 'chord-editor';
                    const chordHelp = document.createElement('small');
                    chordHelp.textContent = detail.propagation
                        ? detail.propagation.status === 'confirmed'
                            ? `Confirmed in this Sunday set · derived from ${detail.propagation.sourceSectionLabel}`
                            : detail.propagation.status === 'needs-review'
                                ? `Chord pattern needs review. · ${detail.propagation.confidence} confidence`
                                : `Suggested from ${detail.propagation.sourceSectionLabel} — ${detail.propagation.confidence} confidence — review positions`
                        : detail.anchors.length || detail.progression
                            ? 'Confirmed source chords · Songbook · review source spacing where noted.'
                            : 'Needs review · no positioned source chords for this row.';
                    if (detail.propagation) chordHelp.title = detail.propagation.reason;
                    const positionHelp = document.createElement('small');
                    positionHelp.textContent = 'Source-key chord / lyric word number (1-based). Preview applies key and capo.';
                    chordEditor.appendChild(chordHelp);
                    chordEditor.appendChild(positionHelp);
                    for (const [anchorIndex, anchor] of detail.anchors.entries()) {
                        const chordInput = document.createElement('input');
                        chordInput.value = anchor.chord;
                        chordInput.setAttribute('aria-label', `Source chord ${anchorIndex + 1}, slide ${slideIndex + 1}, line ${lineIndex + 1}`);
                        chordInput.addEventListener('change', () => {
                            if (chordInput.value === anchor.chord) return;
                            const optional = /^\(([^()\s]+)\)$/u.exec(chordInput.value);
                            if (runtime.parseChordLine(optional?.[1] || chordInput.value)?.parts.length !== 1) {
                                setStatus('Invalid chord symbol. The previous source chord was preserved.', 'error');
                                chordInput.value = anchor.chord;
                                return;
                            }
                            anchor.chord = chordInput.value;
                            if (detail.propagation) detail.propagation.status = 'suggested';
                            markManual(slide);
                            renderSlides();
                        });
                        const wordInput = document.createElement('input');
                        wordInput.type = 'number';
                        wordInput.min = '1';
                        wordInput.value = String(anchor.wordIndex + 1);
                        wordInput.setAttribute('aria-label', `Chord ${anchorIndex + 1} word position, slide ${slideIndex + 1}, line ${lineIndex + 1}`);
                        wordInput.addEventListener('change', () => {
                            const index = Number(wordInput.value) - 1;
                            if (index === anchor.wordIndex) return;
                            if (!Number.isInteger(index) || index < 0 || index >= runtime.getLyricWordTokens(slide.lines[lineIndex]).length) {
                                setStatus('Chord position must identify an existing lyric word.', 'error');
                                wordInput.value = String(anchor.wordIndex + 1);
                                return;
                            }
                            anchor.wordIndex = index;
                            detail.alignmentValid = false;
                            if (detail.propagation) detail.propagation.status = 'suggested';
                            markManual(slide);
                            renderSlides();
                        });
                        chordEditor.append(chordInput, wordInput);
                    }
                    if (detail.anchors.length) {
                        const confirm = document.createElement('button');
                        confirm.type = 'button';
                        confirm.className = 'text-button';
                        confirm.textContent = detail.propagation ? 'Confirm suggested chord positions' : 'Confirm chord word positions';
                        confirm.addEventListener('click', () => {
                            if (detail.anchors.some(anchor => anchor.wordIndex >= runtime.getLyricWordTokens(slide.lines[lineIndex]).length)) {
                                setStatus('Review chord positions: a referenced word is missing.', 'error');
                                return;
                            }
                            detail.alignmentValid = true;
                            if (detail.propagation) detail.propagation.status = 'confirmed';
                            markManual(slide);
                            renderSlides();
                        });
                        chordEditor.appendChild(confirm);
                    }
                    row.appendChild(chordEditor);
                }
                lineEditor.appendChild(row);
            });
            const addLineButton = document.createElement('button');
            addLineButton.type = 'button';
            addLineButton.className = 'text-button';
            addLineButton.textContent = '+ Add blank line';
            addLineButton.addEventListener('click', () => {
                slide.lines.push('');
                slide.lineDetails?.push({ anchors: [], warnings: ['Manually added lyric; no chords assigned.'], progression: '', alignmentValid: true });
                markManual(slide);
                renderSlides();
            });
            lineEditor.appendChild(addLineButton);
            body.append(frame, lineEditor);
            card.append(header, body);
            elements.slidesList.appendChild(card);
            fitSlidePreview(canvas, slide, card);
        });
        observeSlidePreviews();
    }

    function saveCurrentSet() {
        if (!elements.serviceDate.reportValidity()) {
            setStatus('Choose a valid service date before saving.', 'error');
            return;
        }
        currentSet.date = elements.serviceDate.value;
        currentSet.id = createSetId(currentSet.date);
        currentSet.name = elements.setName.value.trim() || 'Sunday Worship';
        currentSet.updatedAt = saveSet(storageSnapshot(currentSet)).updatedAt;
        setStatus(`Saved ${currentSet.name} for ${currentSet.date} on this browser.`, 'success');
        refreshSavedSets(currentSet.id);
    }

    function loadSelectedSet() {
        const saved = loadSet(elements.savedSets.value);
        if (!saved) {
            setStatus('That browser-local set could not be loaded.', 'error');
            return;
        }
        if (saved.songEntries.some(entry => !catalog.byId.has(entry.songId))
            || saved.slides.some(slide => !saved.songEntries.some(entry => entry.songId === slide.songId))) {
            throw new Error('Saved set references unavailable songs or orphaned slides.');
        }
        if ((currentSet.songEntries.length || currentSet.slides.length)
            && elements.saveStatus.dataset.tone === 'changed'
            && !window.confirm('Reload this saved set? This replaces the current unsaved edits.')) return;
        const validEntries = Array.isArray(saved.songEntries)
            ? saved.songEntries.filter(entry => catalog.byId.has(Number(entry.songId))).map(entry => ({
                songId: Number(entry.songId),
                repeatChorus: Boolean(entry.repeatChorus),
                sectionOrder: Array.isArray(entry.sectionOrder) ? [...entry.sectionOrder] : []
            }))
            : [];
        const congregationSlides = saved.slides.map(slide => ({
            ...slide, lines: slide.lines.filter(line => !isAttributionLine(line))
        })).filter(slide => slide.lines.length);
        const modeSlides = { ...saved.modeSlides };
        if (congregationSlides.length || Object.hasOwn(modeSlides, 'congregation')) {
            modeSlides.congregation = congregationSlides;
        }
        currentSet = initializeModes({
            ...makeEmptySet(saved.date),
            ...saved,
            modeSlides,
            songEntries: validEntries,
            slides: congregationSlides
        });
        syncSetFields();
        renderSelectedSongs();
        renderSearchResults();
        renderSlides();
        updateLayoutStatus(currentSet.slides.length ? `Reloaded ${currentSet.slides.length} saved slides, including manual edits.` : 'Saved set has no generated slides yet.', 'success');
        setStatus(`Reloaded ${currentSet.name} for ${currentSet.date}.`, 'success');
    }

    elements.serviceDate.addEventListener('change', () => {
        currentSet.date = elements.serviceDate.value;
        currentSet.id = createSetId(currentSet.date);
        markSetChanged();
    });
    elements.setName.addEventListener('input', () => {
        currentSet.name = elements.setName.value;
        updateThemeRecommendation();
        markSetChanged();
    });
    themeSelector.addEventListener('change', () => {
        currentSet.themeId = themeSelector.value;
        document.querySelectorAll('.slide-canvas').forEach(styleSlide);
        markSetChanged('Theme changed. Lyrics, chords, phonetics and manual slide structure were preserved.');
    });
    sectionLabels.addEventListener('change', () => {
        currentSet.showSectionLabels = sectionLabels.checked;
        document.querySelectorAll('.slide-canvas').forEach(styleSlide);
        markSetChanged('Section-label styling changed. Presentation content was preserved.');
    });
    exportButtons.forEach((button, index) => button.addEventListener('click', async () => {
        const format = ['pptx', 'pdf', 'png'][index];
        const enabledControls = [...appElement.querySelectorAll('input, textarea, select, button')]
            .filter(control => !control.disabled);
        enabledControls.forEach(control => { control.disabled = true; });
        appElement.setAttribute('aria-busy', 'true');
        exportStatus.dataset.tone = '';
        exportStatus.textContent = 'Preparing approved presentation…';
        try {
            const result = await exportApprovedSlides({
                set: currentSet, canvases: [...elements.slidesList.querySelectorAll('.slide-canvas')], format,
                onProgress: message => { exportStatus.textContent = message; }
            });
            exportStatus.dataset.tone = 'success';
            exportStatus.textContent = `Prepared ${result.filename} · ${result.slideCount} approved slides; download requested.`;
        } catch (error) {
            console.error('[Worship Song Studio export]', error);
            exportStatus.dataset.tone = 'error';
            exportStatus.textContent = `Export failed: ${error.message}`;
        } finally {
            enabledControls.forEach(control => { control.disabled = false; });
            appElement.removeAttribute('aria-busy');
        }
    }));
    elements.songSearch.addEventListener('input', renderSearchResults);
    document.querySelectorAll('[data-mode]').forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.mode;
            const ungenerated = !Object.hasOwn(currentSet.modeSlides, mode);
            selectMode(currentSet, mode);
            if (ungenerated && currentSet.songEntries.length) generateActiveMode();
            renderSelectedSongs();
            renderSlides();
            markSetChanged(`Viewing ${MODES[mode]}. Other modes' manual edits were preserved.`);
        });
    });
    elements.generateSlidesButton.addEventListener('click', generateSlides);
    elements.saveSetButton.addEventListener('click', () => withStorageErrors(saveCurrentSet));
    elements.savedSets.addEventListener('change', () => {
        elements.loadSetButton.disabled = !elements.savedSets.value;
    });
    elements.loadSetButton.addEventListener('click', () => withStorageErrors(loadSelectedSet));
    elements.newSetButton.addEventListener('click', () => {
        if ((currentSet.songEntries.length || currentSet.slides.length) && !window.confirm('Start a new unsaved set?')) return;
        currentSet = makeEmptySet(elements.serviceDate.value || localIsoDate());
        syncSetFields();
        renderSelectedSongs();
        renderSearchResults();
        renderSlides();
        updateLayoutStatus('Add songs, choose their order, then generate.');
        setStatus('New browser-local set started.');
    });

    syncSetFields();
    withStorageErrors(refreshSavedSets);
    renderSelectedSongs();
    renderSlides();
}
