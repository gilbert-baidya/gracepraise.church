import { loadClassicScript } from './songbook-adapter.mjs?studio-startup=11';

export const EXPORT_RESOLUTION = Object.freeze({ width: 3200, height: 1800 });
const MODE_FILENAMES = Object.freeze({
    congregation: 'Congregation', musician: 'Musician', phoneticChords: 'Phonetic-Chords', phonetic: 'Phonetic'
});
let librariesPromise;

async function loadExportLibraries() {
    if (!librariesPromise) {
        librariesPromise = Promise.all([
            'html-to-image.js', 'pptxgen.bundle.js', 'jspdf.umd.min.js', 'jszip.min.js'
        ].map(file => loadClassicScript(`./vendor/${file}?studio-export=1`))).then(() => {
            if (!window.htmlToImage?.toPng || !window.PptxGenJS || !window.jspdf?.jsPDF || !window.JSZip) {
                throw new Error('Local export libraries loaded without their required APIs.');
            }
        }).catch(error => {
            librariesPromise = undefined;
            throw error;
        });
    }
    await librariesPromise;
}

export function exportFilename(date, mode, extension) {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(date) || !Object.hasOwn(MODE_FILENAMES, mode)) {
        throw new Error('Choose a valid service date and presentation mode before exporting.');
    }
    return `GPBC_${date}_${MODE_FILENAMES[mode]}.${extension}`;
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function exportApprovedSlides({ set, canvases, format, onProgress = () => {} }) {
    if (!['pptx', 'pdf', 'png'].includes(format)) throw new Error('Unsupported export format.');
    const filename = exportFilename(set.date, set.activeMode, format === 'png' ? 'zip' : format);
    if (!set.slides.length || canvases.length !== set.slides.length) {
        throw new Error('Generate and review slides in the selected mode before exporting.');
    }
    if (canvases.some(canvas => canvas.closest('.slide-editor--overflow'))) {
        throw new Error('Resolve the visible slide overflow warnings before exporting. Content was not regenerated.');
    }
    // Snapshot approved DOM and presentation copies before any asynchronous work.
    const approved = JSON.parse(JSON.stringify(set));
    const captures = canvases.map((canvas, index) => ({
        node: canvas.cloneNode(true),
        metadata: {
            slideNumber: index + 1, theme: canvas.dataset.churchTheme, mode: approved.activeMode,
            slide: approved.slides[index],
            pageSerial: canvas.querySelector('.slide-canvas__serial').textContent,
            sectionLabel: canvas.querySelector('.slide-canvas__footer').hidden
                ? '' : canvas.querySelector('.slide-canvas__footer').textContent,
            lyricFontPx: parseFloat(getComputedStyle(canvas.querySelector('.slide-canvas__lyrics')).fontSize),
            chordFontPx: canvas.querySelector('.musician-chords')
                ? parseFloat(getComputedStyle(canvas.querySelector('.musician-chords')).fontSize) : null,
            displayedChords: [...canvas.querySelectorAll('.musician-chords, .unplaced-chords')].map(element => element.textContent),
            songSettings: approved.modeSettings?.[approved.activeMode]?.[approved.slides[index].songId] || {}
        }
    }));
    const manifest = {
        schemaVersion: 1, date: approved.date, name: approved.name, mode: approved.activeMode,
        theme: approved.themeId || 'sunday', resolution: EXPORT_RESOLUTION,
        rendering: 'Approved browser slide captured as a PNG; no regeneration; PowerPoint text is not individually editable.',
        slides: captures.map(capture => capture.metadata)
    };
    onProgress('Loading local export tools…');
    await loadExportLibraries();
    await document.fonts.ready;
    const images = [];
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-20000px;top:0;width:1600px;pointer-events:none;';
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);
    try {
        for (const [index, capture] of captures.entries()) {
            onProgress(`Rendering approved slide ${index + 1} of ${captures.length}…`);
            capture.node.style.transform = 'none';
            capture.node.style.position = 'relative';
            capture.node.style.inset = 'auto';
            host.replaceChildren(capture.node);
            const image = await window.htmlToImage.toPng(capture.node, {
                width: 1600, height: 900, pixelRatio: 2, fontEmbedCSS: '',
                style: { transform: 'none', position: 'relative', inset: 'auto' }
            });
            if (!image.startsWith('data:image/png;base64,')) throw new Error(`Slide ${index + 1} did not render a PNG.`);
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
        deck.author = 'Grace & Praise Bangladesh Church';
        deck.subject = `${approved.activeMode} · ${approved.themeId || 'sunday'} · approved local Sunday set`;
        deck.title = `${approved.name} · ${approved.date}`;
        deck.lang = 'bn-BD';
        images.forEach((image, index) => {
            const slide = deck.addSlide();
            slide.addImage({ data: image, x: 0, y: 0, w: 13.333333, h: 7.5 });
            slide.addNotes(JSON.stringify({ ...manifest, slides: [captures[index].metadata] }));
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
        zip.file('approved-presentation.json', JSON.stringify(manifest, null, 2));
        blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    }
    downloadBlob(blob, filename);
    return { filename, slideCount: captures.length };
}
