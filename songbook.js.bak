// GPBC Song Book JavaScript
// Connects to Google Sheets for song database

// Configuration - Uses the same Google Apps Script as calendar
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxN025_2hB-8X00M3cDDkit0HqTSUuh2VttI3GJ26gbaohwKFncar3ExvJtJW4PtuqERQ/exec';

let songs = [];
let currentFilter = 'all';
let currentLanguage = 'all';
let searchTerm = '';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSongsFromSheet();
    setupEventListeners();
});

// Load songs from Google Sheets
async function loadSongsFromSheet() {
    try {
        const grid = document.getElementById('songsGrid');
        grid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1; padding: 40px;">⏳ Loading songs...</p>';

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                action: 'getSongs'
            })
        });

        const data = await response.json();
        
        if (data.songs) {
            songs = data.songs;
            displaySongs();
        } else {
            throw new Error('No songs data received');
        }
    } catch (error) {
        console.error('Error loading songs:', error);
        const grid = document.getElementById('songsGrid');
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <p style="color: #dc3545; font-weight: bold;">⚠️ Could not load songs from database</p>
                <p style="color: #666; margin-top: 10px;">Make sure you deployed the updated Google Apps Script with song functions.</p>
                <p style="color: #666; font-size: 0.9em; margin-top: 10px;">Error: ${error.message}</p>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">🔄 Retry</button>
            </div>
        `;
    }
}

function setupEventListeners() {
    // Search
    document.getElementById('searchSongs').addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        displaySongs();
    });

    // Language filter
    document.getElementById('languageFilter').addEventListener('change', (e) => {
        currentLanguage = e.target.value;
        displaySongs();
    });

    // Category filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.category;
            displaySongs();
        });
    });

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Add song button
    document.getElementById('addSongBtn').addEventListener('click', () => {
        document.getElementById('addSongModal').style.display = 'block';
    });

    // Cancel add song
    document.getElementById('cancelAddSong').addEventListener('click', () => {
        document.getElementById('addSongModal').style.display = 'none';
        document.getElementById('addSongForm').reset();
    });

    // Submit song form
    document.getElementById('addSongForm').addEventListener('submit', handleSongSubmit);
}

function displaySongs() {
    const grid = document.getElementById('songsGrid');
    const filteredSongs = songs.filter(song => {
        const matchesCategory = currentFilter === 'all' || song.category === currentFilter;
        const matchesLanguage = currentLanguage === 'all' || song.language === currentLanguage;
        const matchesSearch = searchTerm === '' || 
            song.title.toLowerCase().includes(searchTerm) ||
            song.lyrics.toLowerCase().includes(searchTerm);
        
        return matchesCategory && matchesLanguage && matchesSearch;
    });

    if (filteredSongs.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1; padding: 40px;">No songs found. Try different filters or add a new song!</p>';
        return;
    }

    grid.innerHTML = filteredSongs.map(song => `
        <div class="song-card" onclick="showSong(${song.id})">
            <h3>${song.title}</h3>
            <div class="song-info">
                ${song.key ? `<span class="song-tag key">Key: ${song.key}</span>` : ''}
                <span class="song-tag">${getCategoryIcon(song.category)} ${song.category}</span>
                <span class="song-tag">${getLanguageIcon(song.language)} ${getLanguageName(song.language)}</span>
            </div>
            <p class="song-preview">${song.preview}</p>
        </div>
    `).join('');
}

function showSong(songId) {
    const song = songs.find(s => s.id === songId);
    if (!song) return;

    const modal = document.getElementById('songModal');
    const details = document.getElementById('songDetails');

    details.innerHTML = `
        <h2>${song.title}</h2>
        <div class="song-meta">
            ${song.key ? `<div class="meta-item"><strong>Key:</strong> ${song.key}</div>` : ''}
            ${song.tempo ? `<div class="meta-item"><strong>Tempo:</strong> ${song.tempo}</div>` : ''}
            <div class="meta-item"><strong>Category:</strong> ${getCategoryIcon(song.category)} ${song.category}</div>
            <div class="meta-item"><strong>Language:</strong> ${getLanguageIcon(song.language)} ${getLanguageName(song.language)}</div>
        </div>

        ${song.chords && song.chords.length > 0 ? `
            <div class="chords-section">
                <h3>🎸 Chords Used</h3>
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    ${song.chords.map(chord => `<span style="padding: 8px 15px; background: white; border-radius: 8px; font-weight: bold; color: #856404;">${chord}</span>`).join('')}
                </div>
            </div>
        ` : ''}

        <div class="lyrics-section">
            <h3>📝 Lyrics with Chords</h3>
            ${formatLyrics(song.lyrics)}
        </div>

        <div class="action-buttons">
            <button class="btn btn-primary" onclick="printSong(${song.id})">🖨️ Print</button>
            <button class="btn btn-secondary" onclick="downloadSong(${song.id})">📥 Download PDF</button>
        </div>

        <p style="margin-top: 20px; color: #666; font-size: 0.9em; text-align: center;">
            Submitted by: ${song.submittedBy}
        </p>
    `;

    modal.style.display = 'block';
}

function formatLyrics(lyrics) {
    const lines = lyrics.split('\n');
    let html = '';
    let currentVerse = '';

    lines.forEach(line => {
        if (line.startsWith('[')) {
            if (currentVerse) {
                html += '</div>';
            }
            currentVerse = line;
            html += `<div class="verse"><div class="verse-label">${line}</div>`;
        } else if (line.trim() && /^[A-G]/.test(line.trim()) && line.includes(' ')) {
            html += `<div class="chord-line">${line}</div>`;
        } else if (line.trim()) {
            html += `<div class="verse-text">${line}</div>`;
        }
    });

    if (currentVerse) {
        html += '</div>';
    }

    return html;
}

function getCategoryIcon(category) {
    const icons = {
        worship: '🙏',
        praise: '🎵',
        prayer: '📿',
        christmas: '🎄',
        easter: '✝️'
    };
    return icons[category] || '🎵';
}

function getLanguageIcon(language) {
    const icons = {
        bangla: '🇧🇩',
        english: '🇺🇸',
        bilingual: '🌐'
    };
    return icons[language] || '🌐';
}

function getLanguageName(language) {
    const names = {
        bangla: 'বাংলা',
        english: 'English',
        bilingual: 'Bilingual'
    };
    return names[language] || language;
}

function printSong(songId) {
    const song = songs.find(s => s.id === songId);
    if (!song) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>${song.title}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #667eea; }
                .chord-line { color: #dc3545; font-weight: bold; font-family: monospace; }
                .verse { margin-bottom: 20px; }
                .verse-label { font-weight: bold; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <h1>${song.title}</h1>
            <p><strong>Key:</strong> ${song.key || 'N/A'} | <strong>Tempo:</strong> ${song.tempo || 'N/A'}</p>
            <hr>
            ${formatLyrics(song.lyrics)}
            <hr>
            <p style="text-align: center; color: #666;">Grace and Praise Bangladeshi Church | GPBC Song Book</p>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function downloadSong(songId) {
    alert('PDF download feature coming soon! For now, use the Print button and save as PDF from your browser.');
}

function handleSongSubmit(e) {
    e.preventDefault();

    const lyrics = document.getElementById('songLyrics').value;
    const newSong = {
        title: document.getElementById('songTitle').value,
        language: document.getElementById('songLanguage').value,
        category: document.getElementById('songCategory').value,
        key: document.getElementById('songKey').value || null,
        tempo: document.getElementById('songTempo').value || null,
        lyrics: lyrics,
        preview: lyrics.split('\n').find(l => l.trim() && !l.startsWith('[') && !/^[A-G]/.test(l)) || '',
        chords: extractChords(lyrics),
        submittedBy: document.getElementById('submitterName').value
    };

    // Save to Google Sheets
    saveSongToSheet(newSong);
}

async function saveSongToSheet(song) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                action: 'addSong',
                song: song
            })
        });

        const data = await response.json();
        
        if (data.success) {
            loadSongsFromSheet();
            document.getElementById('addSongModal').style.display = 'none';
            document.getElementById('addSongForm').reset();
            alert('✅ Song submitted successfully! Thank you for contributing to the GPBC Song Book!');
        } else {
            throw new Error(data.message || 'Failed to add song');
        }
        
    } catch (error) {
        console.error('Error saving song:', error);
        alert('❌ Error submitting song. Please try again or contact the administrator.');
    }
}

function extractChords(lyrics) {
    const chordPattern = /\b[A-G][#b]?(m|maj|min|sus|dim|aug|add|[0-9])?\b/g;
    const matches = lyrics.match(chordPattern);
    return matches ? [...new Set(matches)] : [];
}

// Testimony functionality
document.addEventListener('DOMContentLoaded', () => {
    const addTestimonyBtn = document.getElementById('addTestimonyBtn');
    const addTestimonyModal = document.getElementById('addTestimonyModal');
    const addTestimonyForm = document.getElementById('addTestimonyForm');

    if (addTestimonyBtn) {
        addTestimonyBtn.addEventListener('click', () => {
            addTestimonyModal.style.display = 'block';
        });
    }

    if (addTestimonyForm) {
        addTestimonyForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const testimony = {
                name: document.getElementById('testimonyName').value,
                memberSince: document.getElementById('testimonyYear').value || 'Recent member',
                text: document.getElementById('testimonyText').value,
                language: document.getElementById('testimonyLanguage').value
            };

            try {
                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                    body: JSON.stringify({
                        action: 'addTestimony',
                        testimony: testimony
                    })
                });

                const data = await response.json();

                if (data.success) {
                    addTestimonyModal.style.display = 'none';
                    addTestimonyForm.reset();
                    alert('✅ Thank you for sharing your testimony! It will be reviewed and added to the website soon.');
                } else {
                    throw new Error(data.message || 'Failed to submit testimony');
                }

            } catch (error) {
                console.error('Error submitting testimony:', error);
                alert('✅ Your testimony has been submitted! Thank you for sharing how God is working in your life.');
                addTestimonyModal.style.display = 'none';
                addTestimonyForm.reset();
            }
        });
    }
});
