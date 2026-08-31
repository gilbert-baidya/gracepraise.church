let allPhotos = [];
let currentFilter = 'all';
let previousFocusedElement = null;

async function loadGalleryPhotos() {
    try {
        const response = await fetch('/content/gallery/');
        const text = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const links = Array.from(doc.querySelectorAll('a')).filter(a => a.href.endsWith('.md'));
        
        for (const link of links) {
            const mdResponse = await fetch(link.href);
            const mdText = await mdResponse.text();
            
            const photo = parseFrontmatter(mdText);
            if (photo) {
                allPhotos.push(photo);
            }
        }
        
        allPhotos.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        displayPhotos();
    } catch (error) {
        console.error('Error loading gallery:', error);
        document.getElementById('noPhotos').style.display = 'block';
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

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        currentFilter = btn.dataset.category;
        displayPhotos();
    });
});

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

document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') {
        closeLightbox();
    }
});

document.addEventListener('DOMContentLoaded', loadGalleryPhotos);
