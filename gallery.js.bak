let allPhotos = [];
let currentFilter = 'all';

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
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.onclick = () => openLightbox(index, filteredPhotos);
        
        item.innerHTML = `
            <img src="${photo.image}" alt="${photo.title || 'Church photo'}" loading="lazy">
            <div class="gallery-item-info">
                <div class="gallery-item-title">${photo.title || 'Untitled'}</div>
                ${photo.description ? `<div class="gallery-item-description">${photo.description}</div>` : ''}
                <span class="gallery-item-category">${photo.category || 'Other'}</span>
            </div>
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
    
    document.getElementById('lightboxImg').src = photo.image;
    document.getElementById('lightboxTitle').textContent = photo.title || 'Untitled';
    document.getElementById('lightboxDescription').textContent = photo.description || '';
    document.getElementById('lightboxCategory').textContent = photo.category || 'Other';
    
    lightbox.classList.add('active');
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeLightbox();
    }
});

document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') {
        closeLightbox();
    }
});

document.addEventListener('DOMContentLoaded', loadGalleryPhotos);
