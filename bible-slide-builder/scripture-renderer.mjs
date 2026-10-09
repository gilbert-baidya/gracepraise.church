import { applyScriptureTheme } from './scripture-themes.mjs';
import { toBengaliDigits } from './scripture-layout.mjs';

function element(documentObject, tag, className, text) {
    const value = documentObject.createElement(tag);
    if (className) value.className = className;
    if (text !== undefined) value.textContent = text;
    return value;
}

function scriptureLine(documentObject, language, segment, focus) {
    const line = element(documentObject, 'div', `scripture-verse scripture-verse--${language}`);
    line.dataset.verse = String(segment.verseNumber);
    line.classList.toggle('scripture-verse--focus', Boolean(focus));
    const number = element(
        documentObject,
        'span',
        'scripture-verse__number',
        language === 'bn' ? toBengaliDigits(segment.verseNumber) : String(segment.verseNumber)
    );
    number.setAttribute('aria-label', `Verse ${segment.verseNumber}`);
    const text = element(
        documentObject,
        'span',
        'scripture-verse__text',
        language === 'bn' ? segment.bnText : segment.enText
    );
    line.append(number, text);
    return line;
}

function addBackground(documentObject, canvas, settings) {
    const background = element(documentObject, 'div', 'scripture-background');
    background.setAttribute('aria-hidden', 'true');
    background.append(
        element(documentObject, 'div', 'scripture-background__light'),
        element(documentObject, 'div', 'scripture-background__land'),
        element(documentObject, 'div', 'scripture-background__symbol'),
        element(documentObject, 'div', 'scripture-background__ornament'),
        element(documentObject, 'div', 'scripture-background__texture')
    );
    const overlay = element(documentObject, 'div', 'scripture-readability-overlay');
    overlay.style.setProperty('--overlay-opacity', String(settings.overlayIntensity ?? 0.72));
    overlay.setAttribute('aria-hidden', 'true');
    canvas.append(background, overlay);
}

function renderTitleSlide(documentObject, canvas, slide, settings) {
    const body = element(documentObject, 'div', 'scripture-title-slide');
    const closing = slide.kind === 'closing';
    body.append(
        element(documentObject, 'div', 'scripture-title-slide__eyebrow', closing ? 'THE WORD OF THE LORD' : 'SCRIPTURE READING'),
        element(documentObject, 'div', 'scripture-title-slide__bangla', closing ? 'প্রভুর বাক্য' : 'আজকের শাস্ত্রপাঠ'),
        element(documentObject, 'div', 'scripture-title-slide__rule'),
        element(documentObject, 'div', 'scripture-title-slide__reference', `${slide.reference.en}  |  ${slide.reference.bn}`)
    );
    if (settings.showProgramBadge && settings.programType) {
        body.append(element(documentObject, 'div', 'scripture-title-slide__program', settings.programType));
    }
    canvas.append(body);
}

export function renderScriptureCanvas(documentObject, slide, settings = {}) {
    const canvas = element(documentObject, 'div', 'scripture-canvas');
    canvas.dataset.slideId = slide.id;
    canvas.dataset.kind = slide.kind;
    canvas.dataset.languageMode = slide.languageMode;
    canvas.dataset.passageId = slide.passageId || '';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', slide.kind === 'scripture'
        ? `${slide.reference.en} Scripture presentation slide`
        : `${slide.kind} presentation slide`);
    addBackground(documentObject, canvas, settings);
    applyScriptureTheme(canvas, slide.themeId || settings.themeId || 'shepherds-peace');
    if (slide.kind === 'blank') return canvas;
    if (slide.kind !== 'scripture') {
        renderTitleSlide(documentObject, canvas, slide, settings);
        return canvas;
    }

    const content = element(documentObject, 'div', 'scripture-content');
    const header = element(documentObject, 'header', 'scripture-reference-ribbon');
    header.append(
        element(documentObject, 'span', 'scripture-reference-ribbon__en', slide.reference.en),
        element(documentObject, 'span', 'scripture-reference-ribbon__divider', '|'),
        element(documentObject, 'span', 'scripture-reference-ribbon__bn', slide.reference.bn)
    );
    const body = element(documentObject, 'div', 'scripture-body');
    for (const segment of slide.segments) {
        const pair = element(documentObject, 'section', 'scripture-pair');
        pair.dataset.verse = String(segment.verseNumber);
        if (slide.languageMode !== 'en' && segment.bnText) {
            pair.append(scriptureLine(documentObject, 'bn', segment, segment.focus));
        }
        if (slide.languageMode !== 'bn' && segment.enText) {
            pair.append(scriptureLine(documentObject, 'en', segment, segment.focus));
        }
        body.append(pair);
    }
    const footer = element(documentObject, 'footer', 'scripture-footer');
    const identity = element(documentObject, 'div', 'scripture-footer__identity', 'GPBC');
    const labels = [];
    if (settings.showTranslationLabel !== false) {
        if (slide.languageMode !== 'en') labels.push('BSI 2016 O.V.');
        if (slide.languageMode !== 'bn') labels.push('NIV 1984');
    }
    if (settings.showProgramBadge && settings.programType) labels.push(settings.programType);
    const meta = element(documentObject, 'div', 'scripture-footer__meta', labels.join('  ·  '));
    const serial = element(
        documentObject,
        'div',
        'scripture-footer__serial',
        settings.showPageCounter === false ? '' : `${slide.pageNumber} / ${slide.pageTotal}`
    );
    footer.append(identity, meta, serial);
    content.append(header, body, footer);
    canvas.append(content);
    return canvas;
}

export function updateCanvasScale(frame, canvas) {
    const available = frame.clientWidth;
    const scale = Math.min(1, available / 1600);
    canvas.style.transform = `scale(${scale})`;
    frame.style.height = `${900 * scale}px`;
    return scale;
}

export function inspectCanvasGeometry(canvas) {
    const body = canvas.querySelector('.scripture-body');
    if (!body) return { fits: true, overflowX: 0, overflowY: 0 };
    const overflowX = Math.max(0, body.scrollWidth - body.clientWidth);
    const overflowY = Math.max(0, body.scrollHeight - body.clientHeight);
    return { fits: overflowX <= 1 && overflowY <= 1, overflowX, overflowY };
}
