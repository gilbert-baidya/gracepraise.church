let allPhotos = [];
let currentFilter = 'all';
let previousFocusedElement = null;
let galleryInitialized = false;
let galleryLoadState = 'idle';

async function loadGalleryPhotos() {
    if (galleryLoadState === 'loading') return;
    galleryLoadState = 'loading';
    displayPhotos();
    try {
        const response = await fetch('/content/gallery/index.json');
        let files;
        if (response.status === 404) {
            const listing = await fetch('/content/gallery/');
            if (!listing.ok) throw new Error(`Gallery listing returned HTTP ${listing.status}`);
            const doc = new DOMParser().parseFromString(await listing.text(), 'text/html');
            files = Array.from(doc.querySelectorAll('a[href]'))
                .map(link => new URL(link.getAttribute('href'), new URL('/content/gallery/', location.origin)))
                .filter(url => url.origin === location.origin && /^\/content\/gallery\/[^/]+\.md$/u.test(url.pathname))
                .map(url => url.pathname);
        } else {
            if (!response.ok) throw new Error(`Gallery manifest returned HTTP ${response.status}`);
            files = await response.json();
        }
        if (!Array.isArray(files) || !files.every(file => typeof file === 'string' && /^\/content\/gallery\/[^/]+\.md$/u.test(file))) {
            throw new Error('Invalid gallery manifest');
        }
        const photos = await Promise.all(files.map(async file => {
            const mdResponse = await fetch(file);
            if (!mdResponse.ok) throw new Error(`Gallery entry returned HTTP ${mdResponse.status}`);
            const photo = parseFrontmatter(await mdResponse.text());
            if (!photo || !photo.image) throw new Error('Invalid gallery entry');
            return photo;
        }));
        allPhotos = photos.sort((a, b) => new Date(b.date) - new Date(a.date));
        galleryLoadState = 'loaded';
        displayPhotos();
    } catch (error) {
        console.error('Error loading gallery:', error);
        allPhotos = [];
        galleryLoadState = 'error';
        displayPhotos();
    }
}

function parseFrontmatter(markdown) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = markdown.match(frontmatterRegex);
    
    if (!match) return null;
    
    const frontmatter = match[1];
    const photo = {};
    
    const lines = frontmatter.split('\n');
    for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
            photo[key.trim()] = value;
        }
    }
    
    return photo;
}

function displayPhotos() {
    const grid = document.getElementById('galleryGrid');
    const noPhotos = document.getElementById('noPhotos');
    document.getElementById('galleryError').hidden = galleryLoadState !== 'error';
    if (galleryLoadState !== 'loaded') {
        grid.style.display = 'none';
        noPhotos.style.display = 'none';
        return;
    }
    
    const filteredPhotos = currentFilter === 'all' 
        ? allPhotos 
        : allPhotos.filter(photo => photo.category === currentFilter);
    
    if (filteredPhotos.length === 0) {
        grid.style.display = 'none';
        noPhotos.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    noPhotos.style.display = 'none';
    
    grid.innerHTML = '';
    
    filteredPhotos.forEach((photo, index) => {
        const item = document.createElement('figure');
        item.className = 'gallery-item';
        item.tabIndex = 0;
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', `View photo: ${photo.title || 'Church photo'}`);

        const clickHandler = () => openLightbox(index, filteredPhotos);
        item.onclick = clickHandler;
        item.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                clickHandler();
            }
        };
        
        const altText = photo.title 
            ? `${photo.title} - Grace and Praise Bangladeshi Church` 
            : 'Grace and Praise Bangladeshi Church photo';

        item.innerHTML = `
            <img src="${photo.image}" alt="${altText}" loading="lazy">
            <figcaption class="gallery-item-info">
                <div class="gallery-item-title">${photo.title || 'Untitled'}</div>
                ${photo.description ? `<p class="gallery-item-description">${photo.description}</p>` : ''}
                <span class="gallery-item-category">${photo.category || 'Other'}</span>
            </figcaption>
        `;
        
        grid.appendChild(item);
    });
}

function openLightbox(index, photos) {
    const photo = photos[index];
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    
    previousFocusedElement = document.activeElement;

    const altText = photo.title 
        ? `${photo.title} - Grace and Praise Bangladeshi Church` 
        : 'Expanded church gallery photo';

    lightboxImg.src = photo.image;
    lightboxImg.alt = altText;
    document.getElementById('lightboxTitle').textContent = photo.title || 'Untitled';
    document.getElementById('lightboxDescription').textContent = photo.description || '';
    document.getElementById('lightboxCategory').textContent = photo.category || 'Other';
    
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus close button inside lightbox
    const closeBtn = lightbox.querySelector('.lightbox-close');
    if (closeBtn) {
        setTimeout(() => closeBtn.focus(), 50);
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
    }
    document.body.style.overflow = '';

    if (previousFocusedElement && typeof previousFocusedElement.focus === 'function') {
        previousFocusedElement.focus();
    }
}

function initGallery() {
    if (galleryInitialized) return;
    galleryInitialized = true;

    document.getElementById('retryGallery').addEventListener('click', loadGalleryPhotos);

    document.querySelectorAll('.filter-btn[data-category]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-category]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentFilter = btn.dataset.category;
            displayPhotos();
        });
    });

    document.addEventListener('keydown', (e) => {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox || !lightbox.classList.contains('active')) return;

        if (e.key === 'Escape') {
            closeLightbox();
            return;
        }

        if (e.key === 'Tab') {
            const focusables = lightbox.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (!focusables.length) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target.id === 'lightbox') {
                closeLightbox();
            }
        });
    }

    loadGalleryPhotos();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGallery, { once: true });
} else {
    initGallery();
}
