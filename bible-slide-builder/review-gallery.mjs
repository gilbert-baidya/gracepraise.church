import { createBilingualPassage, loadAuthoritativeBibles, parseReferenceInput } from './bible-data-adapter.mjs';
import { createCanvasMeasurer, generatePassageSlides } from './scripture-layout.mjs';
import { renderScriptureCanvas, updateCanvasScale } from './scripture-renderer.mjs';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
if (!LOCAL_HOSTS.has(window.location.hostname)) {
    document.getElementById('reviewStatus').textContent = 'Review gallery is available only on an exact loopback hostname.';
} else {
    buildGallery().catch(error => {
        document.getElementById('reviewStatus').textContent = error.message;
        document.getElementById('gallerySourceLock').dataset.tone = 'error';
    });
}

async function buildGallery() {
    const sources = await loadAuthoritativeBibles();
    const measure = createCanvasMeasurer();
    const cases = [
        { title: 'Bangla Psalm', subtitle: "Psalm 23 · Shepherd's Peace", reference: 'Psalm 23:1-4', mode: 'bn', theme: 'shepherds-peace', page: 0 },
        { title: 'Bilingual Psalm', subtitle: 'Psalm 23 · River of Grace', reference: 'Psalm 23:1-4', mode: 'bilingual', theme: 'river-grace', page: 0 },
        { title: 'John', subtitle: 'John 3:16–18 · Word & Light', reference: 'John 3:16-18', mode: 'bn', theme: 'word-light', page: 0, focusVerse: 16 },
        { title: 'Long-passage pagination', subtitle: 'John 14:1–6 · page 3', reference: 'John 14:1-6', mode: 'bilingual', theme: 'prayer-sanctuary', page: 2 },
        { title: 'Bangla Heritage', subtitle: 'Romans 8:31–34', reference: 'Romans 8:31-34', mode: 'bn', theme: 'bangla-heritage', page: 0 },
        { title: "Shepherd's Peace", subtitle: 'Psalm 23:1–4', reference: 'Psalm 23:1-4', mode: 'bn', theme: 'shepherds-peace', page: 1 },
        { title: 'Communion Table', subtitle: 'John 14:1–6', reference: 'John 14:1-6', mode: 'bn', theme: 'communion', page: 0 },
        { title: 'Bethlehem Night', subtitle: 'John 3:16–18', reference: 'John 3:16-18', mode: 'bilingual', theme: 'bethlehem', page: 0 },
        { title: 'Sacred Minimal', subtitle: 'Romans 8:31–34', reference: 'Romans 8:31-34', mode: 'bilingual', theme: 'sacred-minimal', page: 0 }
    ];
    const gallery = document.getElementById('reviewGallery');
    const frames = [];
    for (const item of cases) {
        const passage = createBilingualPassage(sources, parseReferenceInput(item.reference));
        const slides = generatePassageSlides(passage, {
            languageMode: item.mode,
            themeId: item.theme,
            focusVerse: item.focusVerse,
            measurer: measure
        });
        const slide = slides[Math.min(item.page, slides.length - 1)];
        const card = document.createElement('article');
        card.className = 'review-card';
        const heading = document.createElement('div');
        heading.className = 'review-card__heading';
        const title = document.createElement('h2');
        title.textContent = item.title;
        const subtitle = document.createElement('p');
        subtitle.textContent = `${item.subtitle} · slide ${Math.min(item.page, slides.length - 1) + 1} of ${slides.length}`;
        heading.append(title, subtitle);
        const frame = document.createElement('div');
        frame.className = 'review-frame';
        frame.append(renderScriptureCanvas(document, slide, {
            overlayIntensity: 0.72,
            showTranslationLabel: true,
            showProgramBadge: true,
            showPageCounter: true,
            programType: 'Sunday Worship'
        }));
        card.append(heading, frame);
        gallery.append(card);
        frames.push(frame);
    }
    document.getElementById('reviewStatus').hidden = true;
    const lock = document.getElementById('gallerySourceLock');
    lock.dataset.tone = 'success';
    lock.querySelector('strong').textContent = 'SOURCE LOCK VERIFIED';
    lock.querySelector('small').textContent = '9 live review renderings';
    const observer = new ResizeObserver(entries => {
        for (const entry of entries) updateCanvasScale(entry.target, entry.target.querySelector('.scripture-canvas'));
    });
    frames.forEach(frame => {
        observer.observe(frame);
        updateCanvasScale(frame, frame.querySelector('.scripture-canvas'));
    });
}
