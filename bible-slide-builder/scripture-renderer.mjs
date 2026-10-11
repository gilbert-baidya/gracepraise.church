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
    const isFullscreen = !!document.fullscreenElement && document.fullscreenElement.contains(frame);
    
    let availableWidth = frame.parentElement?.clientWidth || frame.clientWidth;
    let availableHeight = Infinity;
    
    if (isFullscreen) {
        availableWidth = document.fullscreenElement.clientWidth;
        availableHeight = document.fullscreenElement.clientHeight;
        document.fullscreenElement.style.display = 'flex';
        document.fullscreenElement.style.alignItems = 'center';
        document.fullscreenElement.style.justifyContent = 'center';
    }
    
    const scale = Math.min(1, availableWidth / 1600, availableHeight / 900);
    
    canvas.style.transform = `scale(${scale})`;
    frame.style.width = `${1600 * scale}px`;
    frame.style.height = `${900 * scale}px`;
    
    return scale;
}

export function inspectCanvasGeometry(canvas) {
    const scale = canvas.getBoundingClientRect().width / 1600 || 1;
    const canvasRect = canvas.getBoundingClientRect();
    
    const safeLeft = 140 * scale;
    const safeRight = 140 * scale;
    const safeTopPad = 90 * scale;
    const safeBottomPad = 100 * scale;
    
    const safeRect = {
        left: canvasRect.left + safeLeft,
        right: canvasRect.right - safeRight,
        top: canvasRect.top + safeTopPad,
        bottom: canvasRect.bottom - safeBottomPad
    };
    
    let overflowX = 0;
    let overflowY = 0;
    
    const elements = canvas.querySelectorAll([
        '.scripture-reference-ribbon',
        '.scripture-verse__number',
        '.scripture-verse__text',
        '.scripture-footer__identity',
        '.scripture-footer__meta',
        '.scripture-footer__serial'
    ].join(', '));
    
    for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        
        const leftOverflow = safeRect.left - rect.left;
        const rightOverflow = rect.right - safeRect.right;
        if (leftOverflow > overflowX) overflowX = leftOverflow;
        if (rightOverflow > overflowX) overflowX = rightOverflow;
    }
    
    const ribbon = canvas.querySelector('.scripture-reference-ribbon');
    let contentTopBound = safeRect.top;
    if (ribbon) {
        const ribbonRect = ribbon.getBoundingClientRect();
        if (safeRect.top - ribbonRect.top > overflowY) overflowY = safeRect.top - ribbonRect.top;
        contentTopBound = ribbonRect.bottom;
    }
    
    const footer = canvas.querySelector('.scripture-footer');
    let contentBottomBound = safeRect.bottom;
    if (footer) {
        const footerRect = footer.getBoundingClientRect();
        if (footerRect.bottom - safeRect.bottom > overflowY) overflowY = footerRect.bottom - safeRect.bottom;
        contentBottomBound = footerRect.top;
    }
    
    const pairs = canvas.querySelectorAll('.scripture-pair');
    for (const pair of pairs) {
        const rect = pair.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        if (contentTopBound - rect.top > overflowY) overflowY = contentTopBound - rect.top;
        if (rect.bottom - contentBottomBound > overflowY) overflowY = rect.bottom - contentBottomBound;
    }
    
    overflowX = overflowX / scale;
    overflowY = overflowY / scale;
    
    return { 
        fits: overflowX <= 2.5 && overflowY <= 2.5, 
        overflowX: Math.max(0, overflowX), 
        overflowY: Math.max(0, overflowY) 
    };
}
