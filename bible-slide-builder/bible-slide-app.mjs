import {
    SOURCE_MANIFEST,
    bookOptions,
    chapterOptions,
    createBilingualPassage,
    loadAuthoritativeBibles,
    parseReferenceInput,
    verseOptions
} from './bible-data-adapter.mjs';
import {
    LANGUAGE_MODES,
    createCanvasMeasurer,
    formatReference,
    generateScriptureSet,
    refreshSlideMetadata,
    safelySplitSlide,
    slideGeometryFits,
    toBengaliDigits
} from './scripture-layout.mjs';
import { inspectCanvasGeometry, renderScriptureCanvas, updateCanvasScale } from './scripture-renderer.mjs';
import { SCRIPTURE_THEMES, recommendScriptureTheme } from './scripture-themes.mjs';
import {
    STORAGE_SCHEMA_VERSION,
    createScriptureSetId,
    listScriptureSets,
    loadScriptureSet,
    saveScriptureSet
} from './scripture-storage.mjs';
import { exportScriptureSlides } from './scripture-export.mjs';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const app = document.getElementById('builderApp');
const gate = document.getElementById('localAccessGate');

if (LOCAL_HOSTS.has(window.location.hostname)) {
    gate.hidden = true;
    app.hidden = false;
    startBuilder().catch(error => {
        console.error('[Bible Slide Builder]', error);
        const lock = document.getElementById('sourceLock');
        lock.dataset.tone = 'error';
        document.getElementById('sourceLockTitle').textContent = 'SOURCE CHECK FAILED';
        document.getElementById('sourceLockDetail').textContent = error.message;
        showGlobalNotice(error.message, 'error');
    });
}

function localDate(date = new Date()) {
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function showGlobalNotice(message, tone = '') {
    const notice = document.getElementById('appNotice');
    notice.hidden = false;
    notice.dataset.tone = tone;
    notice.textContent = message;
}

function settingsFromControls(elements) {
    return {
        showTranslationLabel: elements.showTranslationLabel.checked,
        showProgramBadge: elements.showProgramBadge.checked,
        showPageCounter: elements.showPageCounter.checked,
        includeOpening: elements.includeOpening.checked,
        includeClosing: elements.includeClosing.checked,
        overlayIntensity: Number(elements.overlayIntensity.value) / 100
    };
}

function emptySet(sourceLock, date = localDate()) {
    const name = 'Sunday Scripture Set';
    return {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        id: createScriptureSetId(date, name),
        date,
        name,
        programType: 'Sunday Worship',
        languageMode: 'bn',
        themeId: 'shepherds-peace',
        passages: [],
        slides: [],
        settings: {
            showTranslationLabel: true,
            showProgramBadge: true,
            showPageCounter: true,
            includeOpening: false,
            includeClosing: false,
            overlayIntensity: 0.72
        },
        sourceLock: clone(sourceLock),
        revision: 0,
        createdAt: new Date().toISOString(),
        updatedAt: null
    };
}

function button(documentObject, label, text, action, disabled = false, tone = 'quiet') {
    const value = documentObject.createElement('button');
    value.type = 'button';
    value.className = `button button-${tone} button-small`;
    value.setAttribute('aria-label', label);
    value.textContent = text;
    value.disabled = disabled;
    value.addEventListener('click', action);
    return value;
}

async function startBuilder() {
    const sources = await loadAuthoritativeBibles();
    const measurer = createCanvasMeasurer();
    const elements = Object.fromEntries([
        'sourceLock', 'sourceLockTitle', 'sourceLockDetail', 'serviceDate', 'setName', 'programType',
        'languageMode', 'themeSelector', 'fastReference', 'parseReferenceButton', 'parsedReference',
        'bookSelector', 'chapterSelector', 'startVerse', 'endVerse', 'focusVerse', 'addPassageButton',
        'cancelPassageEdit', 'showTranslationLabel', 'showProgramBadge', 'showPageCounter', 'includeOpening',
        'includeClosing', 'overlayIntensity', 'overlayValue', 'savedSets', 'saveSetButton', 'loadSetButton',
        'newSetButton', 'reviewSetButton', 'saveStatus', 'passageList', 'passageCount', 'passageEmpty',
        'generateSlidesButton', 'slidesEmpty', 'slidesList', 'slideCount', 'layoutStatus', 'addBlankSlide',
        'resetLayoutButton', 'downloadPptx', 'downloadPdf', 'downloadPng', 'exportStatus'
    ].map(id => [id, document.getElementById(id)]));
    let currentSet = emptySet(sources.sourceLock);
    let editingPassageId = null;
    let themeTouched = false;
    let resizeObserver;

    elements.sourceLock.dataset.tone = 'success';
    elements.sourceLockTitle.textContent = 'SOURCE LOCK VERIFIED';
    elements.sourceLockDetail.textContent = `${SOURCE_MANIFEST.bn.filename} + ${SOURCE_MANIFEST.en.filename} · SHA-256 exact`;
    elements.serviceDate.value = currentSet.date;
    elements.themeSelector.replaceChildren(...SCRIPTURE_THEMES.map(theme => new Option(theme.name, theme.id)));
    elements.bookSelector.replaceChildren(...bookOptions().map(book => new Option(`${book.name} — ${book.bnName}`, String(book.number))));

    function setNotice(message, tone = '') {
        showGlobalNotice(message, tone);
    }

    function setSaveStatus(message, tone = '') {
        elements.saveStatus.textContent = message;
        elements.saveStatus.dataset.tone = tone;
    }

    function syncSetFromControls() {
        currentSet.date = elements.serviceDate.value;
        currentSet.name = elements.setName.value.trim() || 'Scripture Set';
        currentSet.id = createScriptureSetId(currentSet.date, currentSet.name);
        currentSet.programType = elements.programType.value;
        currentSet.languageMode = elements.languageMode.value;
        currentSet.themeId = elements.themeSelector.value;
        currentSet.settings = settingsFromControls(elements);
    }

    function applySetToControls() {
        elements.serviceDate.value = currentSet.date;
        elements.setName.value = currentSet.name;
        elements.programType.value = currentSet.programType;
        elements.languageMode.value = currentSet.languageMode;
        elements.themeSelector.value = currentSet.themeId;
        for (const key of ['showTranslationLabel', 'showProgramBadge', 'showPageCounter', 'includeOpening', 'includeClosing']) {
            elements[key].checked = Boolean(currentSet.settings[key]);
        }
        elements.overlayIntensity.value = String(Math.round((currentSet.settings.overlayIntensity ?? 0.72) * 100));
        elements.overlayValue.textContent = `${elements.overlayIntensity.value}%`;
    }

    function populateChapters(preferred) {
        const values = chapterOptions(sources, elements.bookSelector.value);
        elements.chapterSelector.replaceChildren(...values.map(number => new Option(String(number), String(number))));
        if (preferred && values.includes(Number(preferred))) elements.chapterSelector.value = String(preferred);
        populateVerses();
    }

    function populateVerses(startPreferred, endPreferred, focusPreferred) {
        const values = verseOptions(sources, elements.bookSelector.value, elements.chapterSelector.value);
        const options = () => values.map(number => new Option(String(number), String(number)));
        elements.startVerse.replaceChildren(...options());
        elements.endVerse.replaceChildren(...options());
        elements.focusVerse.replaceChildren(new Option('None', ''), ...options());
        if (startPreferred && values.includes(Number(startPreferred))) elements.startVerse.value = String(startPreferred);
        if (endPreferred && values.includes(Number(endPreferred))) elements.endVerse.value = String(endPreferred);
        else if (elements.startVerse.value) elements.endVerse.value = elements.startVerse.value;
        if (focusPreferred && values.includes(Number(focusPreferred))) elements.focusVerse.value = String(focusPreferred);
    }

    function selectedReference() {
        return {
            bookNumber: Number(elements.bookSelector.value),
            chapter: Number(elements.chapterSelector.value),
            startVerse: Number(elements.startVerse.value),
            endVerse: Number(elements.endVerse.value)
        };
    }

    function displayPassageReference(passage) {
        return formatReference({
            book: passage.book,
            bnBook: passage.bnBook,
            chapter: passage.chapter,
            startVerse: passage.startVerse,
            endVerse: passage.endVerse
        });
    }

    function resolvePassageRequest(request) {
        const passage = createBilingualPassage(sources, request);
        return {
            ...passage,
            id: request.id || passage.id,
            focusVerse: request.focusVerse || null,
            themeId: request.themeId || currentSet.themeId
        };
    }

    function exactCopy(passage, mode) {
        const reference = displayPassageReference(passage);
        const bn = passage.verses.map(verse => `${toBengaliDigits(verse.number)} ${verse.bn.text}`).join('\n');
        const en = passage.verses.map(verse => `${verse.number} ${verse.en.text}`).join('\n');
        if (mode === 'bn') return `${reference.bn}\n${bn}`;
        if (mode === 'en') return `${reference.en}\n${en}`;
        return `${reference.en} | ${reference.bn}\n\n${passage.verses.map(verse => `${toBengaliDigits(verse.number)} ${verse.bn.text}\n${verse.number} ${verse.en.text}`).join('\n\n')}`;
    }

    async function copyText(text, label) {
        try {
            await navigator.clipboard.writeText(text);
            setNotice(`${label} copied with exact source text.`, 'success');
        } catch (error) {
            setNotice(`Clipboard unavailable: ${error.message}`, 'error');
        }
    }

    function renderPassages() {
        elements.passageList.replaceChildren();
        elements.passageCount.textContent = String(currentSet.passages.length);
        elements.passageEmpty.hidden = currentSet.passages.length > 0;
        elements.generateSlidesButton.disabled = currentSet.passages.length === 0;
        for (const [index, request] of currentSet.passages.entries()) {
            const passage = resolvePassageRequest(request);
            const reference = displayPassageReference(passage);
            const item = document.createElement('li');
            item.className = 'passage-item';
            const number = document.createElement('div');
            number.className = 'passage-item__number';
            number.textContent = String(index + 1).padStart(2, '0');
            const text = document.createElement('div');
            const heading = document.createElement('strong');
            heading.textContent = reference.en;
            const local = document.createElement('span');
            local.textContent = `${reference.bn}${request.focusVerse ? ` · Focus ${toBengaliDigits(request.focusVerse)}` : ''}`;
            text.append(heading, local);
            const actions = document.createElement('div');
            actions.className = 'row-actions';
            actions.append(
                button(document, `Move ${reference.en} earlier`, '↑', () => movePassage(index, -1), index === 0),
                button(document, `Move ${reference.en} later`, '↓', () => movePassage(index, 1), index === currentSet.passages.length - 1),
                button(document, `Edit ${reference.en}`, 'Edit', () => editPassage(request)),
                button(document, `Copy bilingual ${reference.en}`, 'Copy', () => copyText(exactCopy(passage, 'bilingual'), 'Bilingual Scripture')),
                button(document, `Remove ${reference.en}`, '×', () => removePassage(index), false, 'danger')
            );
            item.append(number, text, actions);
            elements.passageList.append(item);
        }
    }

    function movePassage(index, direction) {
        const target = index + direction;
        if (target < 0 || target >= currentSet.passages.length) return;
        [currentSet.passages[index], currentSet.passages[target]] = [currentSet.passages[target], currentSet.passages[index]];
        currentSet.slides = [];
        renderPassages();
        renderSlides();
        setSaveStatus('Passage order changed; regenerate the presentation.', 'changed');
    }

    function removePassage(index) {
        const [removed] = currentSet.passages.splice(index, 1);
        currentSet.slides = currentSet.slides.filter(slide => slide.passageId !== removed.id);
        refreshSlideMetadata(currentSet.slides);
        renderPassages();
        renderSlides();
        setSaveStatus('Passage removed from this set.', 'changed');
    }

    function editPassage(request) {
        editingPassageId = request.id;
        elements.bookSelector.value = String(request.bookNumber);
        populateChapters(request.chapter);
        populateVerses(request.startVerse, request.endVerse, request.focusVerse);
        elements.addPassageButton.textContent = 'Update passage';
        elements.cancelPassageEdit.hidden = false;
        elements.addPassageButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function cancelEdit() {
        editingPassageId = null;
        elements.addPassageButton.textContent = 'Add passage';
        elements.cancelPassageEdit.hidden = true;
    }

    function addOrUpdatePassage() {
        try {
            const selection = selectedReference();
            const passage = createBilingualPassage(sources, selection);
            const id = editingPassageId || passage.id;
            const request = {
                id,
                bookNumber: selection.bookNumber,
                chapter: selection.chapter,
                startVerse: selection.startVerse,
                endVerse: selection.endVerse,
                focusVerse: elements.focusVerse.value ? Number(elements.focusVerse.value) : null,
                themeId: currentSet.themeId
            };
            const duplicate = currentSet.passages.find(entry => entry.id === passage.id && entry.id !== editingPassageId);
            if (duplicate) throw new Error(`${displayPassageReference(passage).en} is already in this set.`);
            if (editingPassageId) {
                const index = currentSet.passages.findIndex(entry => entry.id === editingPassageId);
                currentSet.passages[index] = request;
                currentSet.slides = currentSet.slides.filter(slide => slide.passageId !== editingPassageId);
            } else currentSet.passages.push(request);
            cancelEdit();
            renderPassages();
            renderSlides();
            setNotice(`${displayPassageReference(passage).en} ready. Scripture came directly from both locked XML sources.`, 'success');
            setSaveStatus('Passage list changed; generate and save when ready.', 'changed');
        } catch (error) {
            elements.parsedReference.dataset.tone = 'error';
            elements.parsedReference.textContent = error.message;
        }
    }

    function parseFastReference() {
        try {
            const parsed = parseReferenceInput(elements.fastReference.value);
            createBilingualPassage(sources, parsed);
            elements.bookSelector.value = String(parsed.bookNumber);
            populateChapters(parsed.chapter);
            populateVerses(parsed.startVerse, parsed.endVerse);
            const passage = createBilingualPassage(sources, parsed);
            const reference = displayPassageReference(passage);
            elements.parsedReference.dataset.tone = 'success';
            elements.parsedReference.textContent = `Parsed: ${reference.en} | ${reference.bn}`;
        } catch (error) {
            elements.parsedReference.dataset.tone = 'error';
            elements.parsedReference.textContent = error.message;
        }
    }

    function generationOptions() {
        syncSetFromControls();
        return {
            languageMode: currentSet.languageMode,
            themeId: currentSet.themeId,
            includeOpening: currentSet.settings.includeOpening,
            includeClosing: currentSet.settings.includeClosing,
            measurer
        };
    }

    function generateSlides(message = true) {
        try {
            const passages = currentSet.passages.map(resolvePassageRequest);
            currentSet.slides = generateScriptureSet(passages, generationOptions());
            renderSlides();
            if (message) setNotice(`${currentSet.slides.length} measured slides generated from ${passages.length} passage${passages.length === 1 ? '' : 's'}.`, 'success');
            setSaveStatus('Generated presentation has unsaved changes.', 'changed');
        } catch (error) {
            setNotice(error.message, 'error');
        }
    }

    function moveSlide(index, direction) {
        const target = index + direction;
        if (target < 0 || target >= currentSet.slides.length) return;
        [currentSet.slides[index], currentSet.slides[target]] = [currentSet.slides[target], currentSet.slides[index]];
        refreshSlideMetadata(currentSet.slides);
        renderSlides();
        setSaveStatus('Slide order changed manually.', 'changed');
    }

    function deleteSlide(index) {
        currentSet.slides.splice(index, 1);
        refreshSlideMetadata(currentSet.slides);
        renderSlides();
        setSaveStatus('Slide removed from the saved presentation copy.', 'changed');
    }

    function splitSlide(index) {
        const replacement = safelySplitSlide(currentSet.slides[index]);
        if (!replacement) {
            setNotice('This slide has no safe additional split point.', 'error');
            return;
        }
        currentSet.slides.splice(index, 1, ...replacement);
        refreshSlideMetadata(currentSet.slides);
        renderSlides();
        setSaveStatus('Slide split at an existing safe text boundary.', 'changed');
    }

    function mergeWithNext(index) {
        const current = currentSet.slides[index];
        const next = currentSet.slides[index + 1];
        if (!current || !next || current.kind !== 'scripture' || next.kind !== 'scripture' || current.passageId !== next.passageId) return;
        const merged = { ...current, id: `${current.id}-merged`, segments: [...current.segments, ...next.segments], manual: true };
        if (!slideGeometryFits(merged, measurer)) {
            setNotice('Those slides cannot merge at 54pt without overflow.', 'error');
            return;
        }
        currentSet.slides.splice(index, 2, merged);
        refreshSlideMetadata(currentSet.slides);
        renderSlides();
        setSaveStatus('Adjacent continuation merged.', 'changed');
    }

    function moveVerseBlock(index, direction) {
        const source = currentSet.slides[index];
        const target = currentSet.slides[index + direction];
        if (!source || !target || source.kind !== 'scripture' || target.kind !== 'scripture' || source.passageId !== target.passageId) return;
        const moved = direction < 0 ? source.segments.shift() : source.segments.pop();
        if (!moved) return;
        if (direction < 0) target.segments.push(moved);
        else target.segments.unshift(moved);
        if (!slideGeometryFits(target, measurer)) {
            if (direction < 0) {
                target.segments.pop();
                source.segments.unshift(moved);
            } else {
                target.segments.shift();
                source.segments.push(moved);
            }
            setNotice('That verse block would overflow the destination slide at 54pt.', 'error');
            return;
        }
        source.manual = true;
        target.manual = true;
        if (!source.segments.length) currentSet.slides.splice(index, 1);
        refreshSlideMetadata(currentSet.slides);
        renderSlides();
        setSaveStatus('Verse block moved in the saved presentation copy.', 'changed');
    }

    function addPauseSlide() {
        syncSetFromControls();
        currentSet.slides.push({
            id: `blank-${Date.now()}`,
            kind: 'blank',
            passageId: 'blank',
            reference: null,
            languageMode: currentSet.languageMode,
            themeId: currentSet.themeId,
            segments: [],
            manual: true
        });
        renderSlides();
        setSaveStatus('Blank pause slide added.', 'changed');
    }

    function observePreviews() {
        resizeObserver?.disconnect();
        resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const canvas = entry.target.querySelector('.scripture-canvas');
                if (canvas) updateCanvasScale(entry.target, canvas);
            }
        });
        document.querySelectorAll('.slide-frame').forEach(frame => {
            resizeObserver.observe(frame);
            updateCanvasScale(frame, frame.querySelector('.scripture-canvas'));
        });
    }

    function renderSlides() {
        syncSetFromControls();
        elements.slidesList.replaceChildren();
        elements.slideCount.textContent = String(currentSet.slides.length);
        elements.slidesEmpty.hidden = currentSet.slides.length > 0;
        elements.addBlankSlide.disabled = currentSet.slides.length === 0;
        elements.resetLayoutButton.disabled = currentSet.passages.length === 0 || currentSet.slides.length === 0;
        [elements.downloadPptx, elements.downloadPdf, elements.downloadPng].forEach(value => { value.disabled = currentSet.slides.length === 0; });
        elements.layoutStatus.textContent = currentSet.slides.length
            ? `${LANGUAGE_MODES[currentSet.languageMode]} · 1600 × 900 · Bangla 54pt · ${currentSet.slides.length} slides`
            : 'Generate a set to create measured slides.';
        elements.exportStatus.textContent = currentSet.slides.length
            ? 'Exports capture these approved live previews at 3200 × 1800 without repagination.'
            : 'Generate and review slides to enable downloads.';
        for (const [index, slide] of currentSet.slides.entries()) {
            const card = document.createElement('article');
            card.className = 'scripture-slide-editor';
            card.dataset.slideId = slide.id;
            const header = document.createElement('header');
            header.className = 'slide-editor__header';
            const heading = document.createElement('div');
            const indexLabel = document.createElement('span');
            indexLabel.className = 'slide-editor__index';
            indexLabel.textContent = `Slide ${index + 1}`;
            const title = document.createElement('h3');
            title.textContent = slide.kind === 'scripture'
                ? `${slide.reference.en} | ${slide.reference.bn}`
                : slide.kind === 'opening' ? 'Scripture Reading title' : slide.kind === 'closing' ? 'Word of the Lord ending' : 'Blank pause slide';
            const capacity = document.createElement('p');
            capacity.className = 'capacity-label';
            capacity.textContent = slide.kind === 'scripture'
                ? `${slide.segments.length} verse block${slide.segments.length === 1 ? '' : 's'}${slide.manual ? ' · manual layout' : ' · measured auto-layout'}`
                : 'Presentation spacer';
            heading.append(indexLabel, title, capacity);
            const actions = document.createElement('div');
            actions.className = 'row-actions';
            const previous = currentSet.slides[index - 1];
            const next = currentSet.slides[index + 1];
            actions.append(
                button(document, `Move slide ${index + 1} up`, '↑', () => moveSlide(index, -1), index === 0),
                button(document, `Move slide ${index + 1} down`, '↓', () => moveSlide(index, 1), index === currentSet.slides.length - 1),
                button(document, `Delete slide ${index + 1}`, '×', () => deleteSlide(index), false, 'danger')
            );
            header.append(heading, actions);
            const frame = document.createElement('div');
            frame.className = 'slide-frame';
            frame.append(renderScriptureCanvas(document, slide, {
                ...currentSet.settings,
                programType: currentSet.programType,
                themeId: currentSet.themeId
            }));
            const tools = document.createElement('div');
            tools.className = 'slide-editor__tools';
            const status = document.createElement('p');
            status.textContent = slide.kind === 'scripture' ? 'Live source text · read-only' : 'No Scripture text';
            const manualActions = document.createElement('div');
            manualActions.className = 'row-actions';
            if (slide.kind === 'scripture') {
                manualActions.append(
                    button(document, 'Move first verse block to previous slide', '← Block', () => moveVerseBlock(index, -1), previous?.passageId !== slide.passageId),
                    button(document, 'Split slide at a safe source boundary', 'Split safely', () => splitSlide(index)),
                    button(document, 'Move last verse block to next slide', 'Block →', () => moveVerseBlock(index, 1), next?.passageId !== slide.passageId),
                    button(document, 'Merge this slide with the next slide', 'Merge ↓', () => mergeWithNext(index), next?.passageId !== slide.passageId)
                );
            }
            tools.append(status, manualActions);
            card.append(header, frame, tools);
            elements.slidesList.append(card);
        }
        observePreviews();
        requestAnimationFrame(() => {
            document.querySelectorAll('.scripture-slide-editor').forEach(card => {
                const geometry = inspectCanvasGeometry(card.querySelector('.scripture-canvas'));
                card.classList.toggle('scripture-slide-editor--overflow', !geometry.fits);
                const label = card.querySelector('.capacity-label');
                if (!geometry.fits && label) {
                    label.dataset.overflow = 'true';
                    label.textContent = `Overflow ${Math.ceil(geometry.overflowX)} × ${Math.ceil(geometry.overflowY)} px — export blocked; split this slide`;
                }
            });
        });
    }

    function refreshSavedSets(preferredId = '') {
        try {
            const sets = listScriptureSets();
            elements.savedSets.replaceChildren(
                new Option(sets.length ? 'Choose a saved set' : 'No saved sets', ''),
                ...sets.map(set => new Option(`${set.date} · ${set.name} · r${set.revision || 1}`, set.id))
            );
            if (preferredId && sets.some(set => set.id === preferredId)) elements.savedSets.value = preferredId;
        } catch (error) {
            setSaveStatus(`Storage could not be read: ${error.message}`, 'error');
        }
    }

    function saveCurrentSet() {
        try {
            syncSetFromControls();
            const snapshot = saveScriptureSet(currentSet);
            currentSet = snapshot;
            refreshSavedSets(snapshot.id);
            setSaveStatus(`Saved ${snapshot.name} as revision ${snapshot.revision}. Previous revisions were retained.`, 'success');
        } catch (error) {
            setSaveStatus(`Save failed: ${error.message}`, 'error');
        }
    }

    function loadSavedSet() {
        try {
            if (!elements.savedSets.value) throw new Error('Choose a saved Scripture set first.');
            const loaded = loadScriptureSet(elements.savedSets.value);
            if (!loaded) throw new Error('That saved Scripture set no longer exists.');
            for (const language of ['bn', 'en']) {
                if (loaded.sourceLock?.[language]?.sha256 !== sources.sourceLock[language].sha256) {
                    throw new Error(`Saved set source lock differs for ${language}; no Scripture was loaded.`);
                }
            }
            currentSet = loaded;
            applySetToControls();
            renderPassages();
            renderSlides();
            setSaveStatus(`Reloaded revision ${loaded.revision} with its approved manual pagination.`, 'success');
        } catch (error) {
            setSaveStatus(`Reload failed: ${error.message}`, 'error');
        }
    }

    function startNewSet() {
        currentSet = emptySet(sources.sourceLock, elements.serviceDate.value || localDate());
        editingPassageId = null;
        themeTouched = false;
        applySetToControls();
        renderPassages();
        renderSlides();
        setSaveStatus('New unsaved Scripture set started.');
    }

    function loadReviewSet() {
        const reviewReferences = ['Psalm 23:1-4', 'John 3:16-18', 'John 14:1-6', 'Romans 8:31-34'];
        currentSet = emptySet(sources.sourceLock, elements.serviceDate.value || localDate());
        currentSet.name = 'Bible Slide Builder Review';
        currentSet.languageMode = 'bn';
        currentSet.themeId = 'shepherds-peace';
        currentSet.passages = reviewReferences.map(reference => {
            const parsed = parseReferenceInput(reference);
            const passage = createBilingualPassage(sources, parsed);
            return { id: passage.id, ...parsed, focusVerse: reference === 'John 3:16-18' ? 16 : null, themeId: currentSet.themeId };
        });
        currentSet.id = createScriptureSetId(currentSet.date, currentSet.name);
        applySetToControls();
        renderPassages();
        generateSlides(false);
        saveCurrentSet();
        setNotice('Bible Slide Builder Review loaded in Bangla with Shepherd’s Peace and saved locally.', 'success');
    }

    async function runExport(format) {
        try {
            syncSetFromControls();
            const controls = [elements.downloadPptx, elements.downloadPdf, elements.downloadPng];
            controls.forEach(value => { value.disabled = true; });
            const result = await exportScriptureSlides({
                set: currentSet,
                canvases: [...elements.slidesList.querySelectorAll('.scripture-canvas')],
                format,
                onProgress(message) { elements.exportStatus.textContent = message; }
            });
            elements.exportStatus.textContent = `${result.filename} prepared with ${result.slideCount} approved slides.`;
        } catch (error) {
            elements.exportStatus.textContent = `Export failed: ${error.message}`;
            setNotice(error.message, 'error');
        } finally {
            const disabled = currentSet.slides.length === 0;
            [elements.downloadPptx, elements.downloadPdf, elements.downloadPng].forEach(value => { value.disabled = disabled; });
        }
    }

    elements.bookSelector.addEventListener('change', () => populateChapters());
    elements.chapterSelector.addEventListener('change', () => populateVerses());
    elements.startVerse.addEventListener('change', () => {
        if (Number(elements.endVerse.value) < Number(elements.startVerse.value)) elements.endVerse.value = elements.startVerse.value;
    });
    elements.parseReferenceButton.addEventListener('click', parseFastReference);
    elements.fastReference.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); parseFastReference(); }
    });
    elements.addPassageButton.addEventListener('click', addOrUpdatePassage);
    elements.cancelPassageEdit.addEventListener('click', cancelEdit);
    elements.generateSlidesButton.addEventListener('click', () => generateSlides());
    elements.resetLayoutButton.addEventListener('click', () => generateSlides());
    elements.addBlankSlide.addEventListener('click', addPauseSlide);
    elements.saveSetButton.addEventListener('click', saveCurrentSet);
    elements.loadSetButton.addEventListener('click', loadSavedSet);
    elements.newSetButton.addEventListener('click', startNewSet);
    elements.reviewSetButton.addEventListener('click', loadReviewSet);
    elements.downloadPptx.addEventListener('click', () => runExport('pptx'));
    elements.downloadPdf.addEventListener('click', () => runExport('pdf'));
    elements.downloadPng.addEventListener('click', () => runExport('png'));
    elements.programType.addEventListener('change', () => {
        currentSet.programType = elements.programType.value;
        if (!themeTouched) {
            currentSet.themeId = recommendScriptureTheme(currentSet.programType).id;
            elements.themeSelector.value = currentSet.themeId;
        }
        renderSlides();
    });
    elements.themeSelector.addEventListener('change', () => {
        themeTouched = true;
        currentSet.themeId = elements.themeSelector.value;
        currentSet.passages.forEach(passage => { passage.themeId = currentSet.themeId; });
        currentSet.slides.forEach(slide => { slide.themeId = currentSet.themeId; });
        renderSlides();
        setSaveStatus('Theme changed without altering Scripture or pagination.', 'changed');
    });
    elements.languageMode.addEventListener('change', () => {
        currentSet.languageMode = elements.languageMode.value;
        if (currentSet.slides.length) generateSlides(false);
    });
    for (const id of ['showTranslationLabel', 'showProgramBadge', 'showPageCounter']) {
        elements[id].addEventListener('change', () => { currentSet.settings = settingsFromControls(elements); renderSlides(); });
    }
    for (const id of ['includeOpening', 'includeClosing']) {
        elements[id].addEventListener('change', () => { if (currentSet.slides.length) generateSlides(false); });
    }
    elements.overlayIntensity.addEventListener('input', () => {
        elements.overlayValue.textContent = `${elements.overlayIntensity.value}%`;
        currentSet.settings = settingsFromControls(elements);
        renderSlides();
    });

    populateChapters(1);
    populateVerses(1, 1);
    applySetToControls();
    refreshSavedSets();
    renderPassages();
    renderSlides();

    globalThis.__GPBCBibleSlideBuilder = {
        get currentSet() { return clone(currentSet); },
        get sourceAudit() { return sources.audit; },
        loadReviewSet,
        generateSlides
    };
}
