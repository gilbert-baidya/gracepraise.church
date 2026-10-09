import { loadClassicScript } from '../worship-studio/songbook-adapter.mjs';

export const SCRIPTURE_EXPORT_RESOLUTION = Object.freeze({ width: 3200, height: 1800 });
let libraryPromise;

function loadLibraries() {
    if (!libraryPromise) {
        libraryPromise = Promise.all([
            'html-to-image.js', 'pptxgen.bundle.js', 'jspdf.umd.min.js', 'jszip.min.js'
        ].map(file => loadClassicScript(`../worship-studio/vendor/${file}?bible-slide-export=1`))).then(() => {
            if (!window.htmlToImage?.toPng || !window.PptxGenJS || !window.jspdf?.jsPDF || !window.JSZip) {
                throw new Error('The local presentation export libraries did not expose their required APIs.');
            }
        }).catch(error => {
            libraryPromise = undefined;
            throw error;
        });
    }
    return libraryPromise;
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

export function scriptureExportFilename(set, extension) {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(set?.date || '') || !set?.name) {
        throw new Error('A valid service date and set name are required before export.');
    }
    const safeName = set.name.normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 52) || 'Scripture';
    return `GPBC_${set.date}_${safeName}.${extension}`;
}

function slideMetadata(slide, index) {
    return {
        slideNumber: index + 1,
        slideId: slide.id,
        kind: slide.kind,
        passageId: slide.passageId,
        reference: clone(slide.reference || null),
        book: slide.book || null,
        banglaBook: slide.bnBook || null,
        chapter: slide.chapter || null,
        startVerse: slide.startVerse || null,
        endVerse: slide.endVerse || null,
        languageMode: slide.languageMode,
        themeId: slide.themeId,
        pageNumber: slide.pageNumber || null,
        pageTotal: slide.pageTotal || null,
        exactScripture: slide.segments.map(segment => ({
            verseNumber: segment.verseNumber,
            continuationIndex: segment.continuationIndex,
            bangla: segment.bnText,
            english: segment.enText,
            banglaSourceNodeId: segment.bnSourceNodeId,
            englishSourceNodeId: segment.enSourceNodeId
        }))
    };
}

export function buildScriptureExportManifest(set) {
    return {
        schemaVersion: 1,
        product: 'GPBC Bible Slide Builder',
        date: set.date,
        name: set.name,
        programType: set.programType,
        languageMode: set.languageMode,
        themeId: set.themeId,
        sourceLock: clone(set.sourceLock),
        translations: { bn: 'Bengali BSI 2016 O.V.', en: 'New International Version (1984)' },
        resolution: SCRIPTURE_EXPORT_RESOLUTION,
        rendering: 'Approved live browser slides captured once as PNG images; export does not repaginate or rewrite Scripture.',
        slides: set.slides.map(slideMetadata)
    };
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function exportScriptureSlides({ set, canvases, format, onProgress = () => {} }) {
    if (!['pptx', 'pdf', 'png'].includes(format)) throw new Error(`Unsupported Scripture export format: ${format}`);
    if (!set.slides.length || canvases.length !== set.slides.length) {
        throw new Error('Generate and review every slide before exporting.');
    }
    if (canvases.some(canvas => canvas.closest('.scripture-slide-editor--overflow'))) {
        throw new Error('Resolve all visible overflow warnings before exporting.');
    }
    const approved = clone(set);
    const manifest = buildScriptureExportManifest(approved);
    const captures = canvases.map(canvas => canvas.cloneNode(true));
    const filename = scriptureExportFilename(approved, format === 'png' ? 'zip' : format);
    onProgress('Loading checked-in export tools…');
    await loadLibraries();
    await document.fonts.ready;
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-20000px;top:0;width:1600px;height:900px;pointer-events:none;';
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);
    const images = [];
    try {
        for (const [index, canvas] of captures.entries()) {
            onProgress(`Rendering approved slide ${index + 1} of ${captures.length}…`);
            canvas.style.transform = 'none';
            canvas.style.position = 'relative';
            canvas.style.inset = 'auto';
            host.replaceChildren(canvas);
            const image = await window.htmlToImage.toPng(canvas, {
                width: 1600,
                height: 900,
                pixelRatio: 2,
                fontEmbedCSS: '',
                style: { transform: 'none', position: 'relative', inset: 'auto' }
            });
            if (!image.startsWith('data:image/png;base64,')) throw new Error(`Slide ${index + 1} did not render as PNG.`);
            images.push(image);
        }
    } finally {
        host.remove();
    }

    onProgress(`Packaging ${images.length} approved slides…`);
    let blob;
    if (format === 'pptx') {
        const deck = new window.PptxGenJS();
        deck.layout = 'LAYOUT_WIDE';
        deck.author = 'Grace and Praise Bangladeshi Church';
        deck.subject = `${approved.programType} · ${approved.languageMode} · ${approved.themeId}`;
        deck.title = `${approved.name} · ${approved.date}`;
        deck.lang = 'bn-BD';
        images.forEach((image, index) => {
            const slide = deck.addSlide();
            slide.addImage({ data: image, x: 0, y: 0, w: 13.333333, h: 7.5 });
            slide.addNotes(JSON.stringify({ ...manifest, slides: [manifest.slides[index]] }));
        });
        blob = await deck.write({ outputType: 'blob' });
    } else if (format === 'pdf') {
        const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: [960, 540], compress: true });
        pdf.setProperties({ title: `${approved.name} · ${approved.date}`, subject: manifest.rendering, author: 'GPBC' });
        images.forEach((image, index) => {
            if (index) pdf.addPage([960, 540], 'landscape');
            pdf.addImage(image, 'PNG', 0, 0, 960, 540);
        });
        blob = pdf.output('blob');
    } else {
        const zip = new window.JSZip();
        images.forEach((image, index) => {
            zip.file(`Slide_${String(index + 1).padStart(3, '0')}.png`, image.split(',')[1], { base64: true });
        });
        zip.file('approved-scripture-presentation.json', JSON.stringify(manifest, null, 2));
        blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    }
    downloadBlob(blob, filename);
    return { filename, slideCount: images.length, manifest };
}
