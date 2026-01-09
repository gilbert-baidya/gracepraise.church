// Main application logic
let currentFontSize = 16;
let currentTranspose = 0;
let showChords = true;
let showPhonetic = false;
let currentFilter = 'all'; // 'all', 'chords', or 'bilingual'
let servicePlaylist = []; // Songs selected for today's service
let showBilingualMode = false;
let isAuthorizedUser = false;

// Bengali to English phonetic mapping
const bengaliToPhonetic = {
    'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri',
    'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
    'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
    'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'ny',
    'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
    'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
    'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
    'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
    'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't',
    'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n',
    'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri',
    'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
    '্': '', 'ঽ': '',
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
    '।': '.', '॥': '..'
};

// Special conjunct combinations
const conjunctMap = {
    'ক্ক': 'kko', 'ক্ষ': 'kkho', 'ক্ত': 'kto', 'ক্র': 'kro',
    'খ্র': 'khro', 'গ্ন': 'gno', 'গ্ধ': 'gdho', 'গ্র': 'gro',
    'ঘ্ন': 'ghno', 'ঘ্র': 'ghro', 'ঙ্ক': 'ngko', 'ঙ্গ': 'nggo',
    'চ্চ': 'chcho', 'চ্ছ': 'chchho', 'জ্জ': 'jjo', 'জ্ঞ': 'ggyo',
    'ঞ্চ': 'nycho', 'ঞ্জ': 'nyjo', 'ট্ট': 'tto', 'ড্ড': 'ddo',
    'ণ্ড': 'ndo', 'ণ্ঠ': 'ntho', 'ত্ত': 'tto', 'ত্থ': 'ttho',
    'ত্ন': 'tno', 'ত্ম': 'tmo', 'ত্র': 'tro', 'দ্দ': 'ddo',
    'দ্ধ': 'ddho', 'দ্ব': 'dbo', 'দ্ম': 'dmo', 'ধ্র': 'dhro',
    'ন্ত': 'nto', 'ন্থ': 'ntho', 'ন্দ': 'ndo', 'ন্ধ': 'ndho',
    'ন্ন': 'nno', 'ন্ম': 'nmo', 'প্ত': 'pto', 'প্ন': 'pno',
    'প্র': 'pro', 'ব্দ': 'bdo', 'ব্ধ': 'bdho', 'ব্ব': 'bbo',
    'ব্র': 'bro', 'ভ্র': 'bhro', 'ম্ন': 'mno', 'ম্প': 'mpo',
    'ম্ফ': 'mpho', 'ম্ব': 'mbo', 'ম্ভ': 'mbho', 'ম্ম': 'mmo',
    'ল্ক': 'lko', 'ল্ল': 'llo', 'শ্চ': 'shcho', 'শ্ছ': 'shchho',
    'শ্র': 'shro', 'ষ্ট': 'shto', 'ষ্ঠ': 'shtho', 'ষ্ণ': 'shno',
    'ষ্প': 'shpo', 'ষ্ম': 'shmo', 'স্ক': 'sko', 'স্ত': 'sto',
    'স্থ': 'stho', 'স্ন': 'sno', 'স্প': 'spo', 'স্ফ': 'spho',
    'স্ম': 'smo', 'হ্ন': 'hno', 'হ্ম': 'hmo', 'হ্র': 'hro',
    // য-ফলা combinations (য্ + consonant)
    'ব্য': 'byo', 'প্য': 'pyo', 'ম্য': 'myo', 'শ্য': 'shyo',
    'স্য': 'syo', 'ত্য': 'tyo', 'দ্য': 'dyo', 'ন্য': 'nyo',
    'ল্য': 'lyo', 'ক্য': 'kyo', 'খ্য': 'khyo', 'গ্য': 'gyo'
};

function convertToPhonetic(bengaliText) {
    let result = '';
    let i = 0;
    let isStartOfLine = true;
    
    while (i < bengaliText.length) {
        const char = bengaliText[i]; 
        // ✅ Special handling for য় (TOP LEVEL)
if (char === 'য়') {
    let phonetic = 'y';

    if (i + 1 < bengaliText.length && 'ািীুূেৈোৌ'.includes(bengaliText[i + 1])) {
        const vowelSign = bengaliText[i + 1];
        phonetic += bengaliToPhonetic[vowelSign];
        i += 2;
    } else {
        phonetic += 'o';
        i++;
    }

    if (isStartOfLine && phonetic.trim()) {
        phonetic = phonetic.charAt(0).toUpperCase() + phonetic.slice(1);
        isStartOfLine = false;
    }

    result += phonetic;
    continue;
}
        
        // Handle newlines
        if (char === '\n') {
            result += char;
            isStartOfLine = true;
            i++;
            continue;
        }
        
        // Check for special 3-character conjuncts first
        if (i + 3 < bengaliText.length) {
            const threeChar = bengaliText.substring(i, i + 4);
            if (conjunctMap[threeChar]) {
                let phonetic = conjunctMap[threeChar];
                
                // Check for vowel sign after conjunct
                if (i + 4 < bengaliText.length && 'ািীুূৃেৈোৌ'.includes(bengaliText[i + 4])) {
                    phonetic += bengaliToPhonetic[bengaliText[i + 4]];
                    i += 5;
                } else {
                    i += 4;
                }
                
                if (isStartOfLine && phonetic) {
                    phonetic = phonetic.charAt(0).toUpperCase() + phonetic.slice(1);
                    isStartOfLine = false;
                }
                result += phonetic;
                continue;
            }
        }
        
        // Check for 2-character conjuncts
        if (i + 2 < bengaliText.length && bengaliText[i + 1] === '্') {
            const twoChar = bengaliText.substring(i, i + 3);
            if (conjunctMap[twoChar]) {
                let phonetic = conjunctMap[twoChar];
                
                // Check for vowel sign after conjunct
                if (i + 3 < bengaliText.length && 'ািীুূৃেৈোৌ'.includes(bengaliText[i + 3])) {
                    phonetic += bengaliToPhonetic[bengaliText[i + 3]];
                    i += 4;
                } else {
                    i += 3;
                }
                
                if (isStartOfLine && phonetic) {
                    phonetic = phonetic.charAt(0).toUpperCase() + phonetic.slice(1);
                    isStartOfLine = false;
                }
                result += phonetic;
                continue;
            }
            
            // Generic conjunct handling
            const c1 = bengaliText[i];
            const c2 = bengaliText[i + 2];
            let phonetic = (bengaliToPhonetic[c1] || c1) + (bengaliToPhonetic[c2] || c2);
            
            // Check for vowel sign
            if (i + 3 < bengaliText.length && 'ািীুূৃেৈোৌ'.includes(bengaliText[i + 3])) {
                phonetic += bengaliToPhonetic[bengaliText[i + 3]];
                i += 4;
            } else {
                i += 3;
            }
            
            if (isStartOfLine && phonetic) {
                phonetic = phonetic.charAt(0).toUpperCase() + phonetic.slice(1);
                isStartOfLine = false;
            }
            result += phonetic;
            continue;
        }
        
        // Handle consonant + vowel sign
        if ('কখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য'.includes(char)) {
            let phonetic = bengaliToPhonetic[char] || char;
            
              // Check for vowel sign
    if (i + 1 < bengaliText.length && 'ািীুূৃেৈোৌ'.includes(bengaliText[i + 1])) {
        const vowelSign = bengaliText[i + 1];
        phonetic += bengaliToPhonetic[vowelSign];
        i += 2;
    } else {
        phonetic += 'o';   // inherent vowel (IMPORTANT)
        i++;
    }
    
    if (isStartOfLine && phonetic && phonetic.trim()) {
        phonetic = phonetic.charAt(0).toUpperCase() + phonetic.slice(1);
        isStartOfLine = false;
    }
    result += phonetic;
    continue;
}
        
        // Handle regular characters
        if (bengaliToPhonetic[char] !== undefined) {
            let phonetic = bengaliToPhonetic[char];
            if (isStartOfLine && phonetic && phonetic.trim()) {
                phonetic = phonetic.charAt(0).toUpperCase() + phonetic.slice(1);
                isStartOfLine = false;
            }
            result += phonetic;
        } else {
            let outputChar = char;
            if (isStartOfLine && char.trim()) {
                outputChar = char.toUpperCase();
                isStartOfLine = false;
            }
            result += outputChar;
        }
        
        if (char.trim() && isStartOfLine) {
            isStartOfLine = false;
        }
        
        i++;
    }
    
    // Replace 'jdi' with 'jodi'
    result = result.replace(/\bjdi\b/gi, 'jodi');
    
    // Clean up any remaining য় that wasn't caught
    result = result.replace(/য়/g, 'y');
    
    return result;
}

// Service Playlist Management
function toggleServicePlaylist(songId) {
    const song = songsDatabase.find(s => s.id === songId);
    const index = servicePlaylist.findIndex(s => s.id === songId);
    
    if (index > -1) {
        servicePlaylist.splice(index, 1);
    } else {
        servicePlaylist.push(song);
    }
    
    updateServicePlaylistUI();
    renderSongList(getFilteredSongs()); // Refresh to update buttons
}

function removeFromPlaylist(songId) {
    const index = servicePlaylist.findIndex(s => s.id === songId);
    if (index > -1) {
        servicePlaylist.splice(index, 1);
        updateServicePlaylistUI();
        renderSongList(getFilteredSongs());
    }
}

function clearPlaylist() {
    if (confirm('Clear all songs from service playlist?')) {
        servicePlaylist = [];
        updateServicePlaylistUI();
        renderSongList(getFilteredSongs());
    }
}

function startPresentation() {
    if (servicePlaylist.length === 0) {
        alert('Please add songs to the service playlist first!');
        return;
    }
    
    window.currentPresentationIndex = 0;
    showPresentationMode(servicePlaylist[0]);
}

// Save playlist with prompt
function savePlaylistPrompt() {
    if (typeof checkAuthorization === 'function' && !checkAuthorization()) {
        return;
    }
    
    if (servicePlaylist.length === 0) {
        alert('Please add songs to the playlist first!');
        return;
    }
    
    const playlistName = prompt('Enter a name for this playlist (e.g., "Sunday Dec 22, 2024"):');
    if (playlistName && playlistName.trim()) {
        const songIds = servicePlaylist.map(song => song.id);
        if (typeof savePlaylistToFirebase === 'function') {
            savePlaylistToFirebase(playlistName.trim(), songIds);
        } else {
            alert('Firebase is not initialized. Please check your configuration.');
        }
    }
}

function updateServicePlaylistUI() {
    const panel = document.getElementById('servicePlaylistPanel');
    const count = document.getElementById('playlistCount');
    const list = document.getElementById('playlistSongs');
    
    count.textContent = servicePlaylist.length;
    
    if (servicePlaylist.length === 0) {
        panel.classList.remove('visible');
        list.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No songs added yet</p>';
        return;
    }
    
    panel.classList.add('visible');
    list.innerHTML = '';
    
    servicePlaylist.forEach((song, index) => {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        item.innerHTML = `
            <span class="playlist-number">${index + 1}</span>
            <span class="playlist-title">${song.title}</span>
            <button class="playlist-remove" onclick="removeFromPlaylist(${song.id})">×</button>
        `;
        list.appendChild(item);
    });
}

function showPresentationMode(song) {
    const modal = document.getElementById('presentationModal');
    const title = document.getElementById('presentationTitle');
    const content = document.getElementById('presentationContent');
    const counter = document.getElementById('presentationCounter');
    
    title.textContent = song.title;
    
    // Bilingual mode in presentation
    if (showBilingualMode) {
        const lines = song.lyrics.split('\n');
        const bilingualLines = [];
        
        lines.forEach(line => {
            const trimmed = line.trim();
            
            // Skip empty lines
            if (!trimmed) {
                bilingualLines.push('');
                return;
            }
            
            // Check if this is a chord-only line
            const hasBengali = /[\u0980-\u09FF]/.test(trimmed);
            const chordPattern = /^[A-G#bmajdinsug\s]+$/;
            const isChordLine = !hasBengali && chordPattern.test(trimmed);
            
            // If it's a chord line and chords are hidden, skip it
            if (isChordLine && !showChords) {
                return;
            }
            
            // If it's a chord line and chords are shown, display it
            if (isChordLine && showChords) {
                bilingualLines.push(line);
                return;
            }
            
            // It's a lyric line - show Bengali and phonetic
            bilingualLines.push(line); // Bengali lyric
            const phoneticLine = convertToPhonetic(line);
            bilingualLines.push('<span style="color: #aaa; font-size: 0.85em;">' + phoneticLine + '</span>'); // Phonetic
        });
        
        content.innerHTML = bilingualLines.join('<br>');
    } else {
        content.innerHTML = song.lyrics.replace(/\n/g, '<br>');
    }
    
    counter.textContent = `${window.currentPresentationIndex + 1} / ${servicePlaylist.length}`;
    
    modal.style.display = 'flex';
    
    // Lock body scroll when presentation modal opens
    document.body.style.overflow = 'hidden';
}

function nextSong() {
    if (window.currentPresentationIndex < servicePlaylist.length - 1) {
        window.currentPresentationIndex++;
        showPresentationMode(servicePlaylist[window.currentPresentationIndex]);
    }
}

function previousSong() {
    if (window.currentPresentationIndex > 0) {
        window.currentPresentationIndex--;
        showPresentationMode(servicePlaylist[window.currentPresentationIndex]);
    }
}

function exitPresentation() {
    const modal = document.getElementById('presentationModal');
    modal.style.display = 'none';
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Reset presentation state
    window.currentPresentationIndex = 0;
}

// Chord transposition map
const chordMap = {
    'C': ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    'D': ['D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#'],
    'E': ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'],
    'F': ['F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E'],
    'G': ['G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#'],
    'A': ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
    'B': ['B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#']
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // CRITICAL: Ensure all modals are closed on page load
    const songModal = document.getElementById('songModal');
    const presentationModal = document.getElementById('presentationModal');
    const copyrightModal = document.getElementById('copyrightModal');
    
    if (songModal) songModal.style.display = 'none';
    if (presentationModal) presentationModal.style.display = 'none';
    if (copyrightModal) copyrightModal.style.display = 'none';
    
    // CRITICAL: Reset all global UI states
    document.body.style.overflow = '';
    document.body.classList.remove('menu-open');
    window.currentSong = null;
    window.currentPresentationIndex = 0;
    
    // Setup copy protection first
    setupCopyProtection();
    
    // Initialize Firebase first
    if (typeof initializeFirebase === 'function') {
        initializeFirebase();
    }
    
    renderAlphabetIndex();
    renderSongList(getFilteredSongs());
    setupEventListeners();
    setupFilterTabs();
    updateServicePlaylistUI();
});

// Check if song has chords
function hasChords(song) {
    // Check for chords in square brackets [C] [G] etc.
    if (song.lyrics.includes('[') && song.lyrics.includes(']')) {
        return true;
    }
    
    // Check for common chord patterns (C, D, E, F, G, A, B with optional # or m)
    const chordPattern = /\b[A-G](#|b)?(m|maj|min|sus|dim|aug|\d)?\b/g;
    const lines = song.lyrics.split('\n');
    
    // Check if any line contains multiple chord-like patterns
    for (let line of lines) {
        const matches = line.match(chordPattern);
        if (matches && matches.length >= 2) {
            // Check if line has more chords than regular words (likely a chord line)
            const words = line.trim().split(/\s+/);
            const chordCount = matches.length;
            if (chordCount >= words.length * 0.5) {
                return true;
            }
        }
    }
    
    return false;
}

// Get filtered songs based on current filter
function getFilteredSongs() {
    if (currentFilter === 'chords') {
        return songsDatabase.filter(song => hasChords(song));
    }
    if (currentFilter === 'christmas') {
        return songsDatabase.filter(song => {
            const lyrics = song.lyrics.toLowerCase();
            return lyrics.includes('বড়দিন') || lyrics.includes('গোশালা') || lyrics.includes('গোয়াল ঘর') || 
                   lyrics.includes('বৈথলেহম') || lyrics.includes('বেথেল') || 
                   (lyrics.includes('রাখাল') && lyrics.includes('মেষ')) ||
                   (lyrics.includes('স্বর্গদূত') && lyrics.includes('রাখাল')) ||
                   lyrics.includes('যাবপাত্র') || lyrics.includes('christmas');
        });
    }
    if (currentFilter === 'easter') {
        return songsDatabase.filter(song => {
            const lyrics = song.lyrics.toLowerCase();
            return lyrics.includes('পুনরুত্থান') || lyrics.includes('easter') ||
                   (lyrics.includes('ক্রুশ') && lyrics.includes('জয়')) ||
                   (lyrics.includes('মৃত্যু') && lyrics.includes('জয়'));
        });
    }
    if (currentFilter === 'goodfriday') {
        return songsDatabase.filter(song => {
            const lyrics = song.lyrics.toLowerCase();
            return lyrics.includes('ক্রুশ') || lyrics.includes('good friday') || 
                   lyrics.includes('গুড ফ্রাইডে') || lyrics.includes('মহাশুক্রবার') ||
                   lyrics.includes('ক্রুশারোপণ') || lyrics.includes('গলগথা');
        });
    }
    if (currentFilter === 'communion') {
        return songsDatabase.filter(song => {
            const lyrics = song.lyrics.toLowerCase();
            return lyrics.includes('প্রভুভোজ') || lyrics.includes('holy communion') ||
                   lyrics.includes('সাক্রামেন্ট') || 
                   (lyrics.includes('রুটি') && lyrics.includes('দ্রাক্ষারস'));
        });
    }
    if (currentFilter === 'newyear') {
        return songsDatabase.filter(song => {
            const lyrics = song.lyrics.toLowerCase();
            return lyrics.includes('নববর্ষ') || lyrics.includes('নতুন বছর') ||
                   lyrics.includes('new year') || lyrics.includes('নব বৎসর');
        });
    }
    return songsDatabase;
}

// Setup filter tabs
function setupFilterTabs() {
    const allSongsTab = document.getElementById('allSongsTab');
    const chordsOnlyTab = document.getElementById('chordsOnlyTab');
    const bilingualTab = document.getElementById('bilingualTab');
    const christmasTab = document.getElementById('christmasTab');
    const easterTab = document.getElementById('easterTab');
    const goodFridayTab = document.getElementById('goodFridayTab');
    const communionTab = document.getElementById('communionTab');
    const newYearTab = document.getElementById('newYearTab');
    
    const allTabs = [allSongsTab, chordsOnlyTab, bilingualTab, christmasTab, easterTab, goodFridayTab, communionTab, newYearTab];
    
    function setActiveTab(activeTab) {
        allTabs.forEach(tab => tab && tab.classList.remove('active'));
        activeTab && activeTab.classList.add('active');
        renderAlphabetIndex();
        renderSongList(getFilteredSongs());
        document.getElementById('searchInput').value = '';
    }
    
    allSongsTab.addEventListener('click', () => {
        currentFilter = 'all';
        showBilingualMode = false;
        setActiveTab(allSongsTab);
    });
    
    chordsOnlyTab.addEventListener('click', () => {
        currentFilter = 'chords';
        showBilingualMode = false;
        setActiveTab(chordsOnlyTab);
    });
    
    bilingualTab.addEventListener('click', () => {
        currentFilter = 'all';
        showBilingualMode = true;
        setActiveTab(bilingualTab);
    });
    
    christmasTab && christmasTab.addEventListener('click', () => {
        currentFilter = 'christmas';
        showBilingualMode = false;
        setActiveTab(christmasTab);
    });
    
    easterTab && easterTab.addEventListener('click', () => {
        currentFilter = 'easter';
        showBilingualMode = false;
        setActiveTab(easterTab);
    });
    
    goodFridayTab && goodFridayTab.addEventListener('click', () => {
        currentFilter = 'goodfriday';
        showBilingualMode = false;
        setActiveTab(goodFridayTab);
    });
    
    communionTab && communionTab.addEventListener('click', () => {
        currentFilter = 'communion';
        showBilingualMode = false;
        setActiveTab(communionTab);
    });
    
    newYearTab && newYearTab.addEventListener('click', () => {
        currentFilter = 'newyear';
        showBilingualMode = false;
        setActiveTab(newYearTab);
    });
}

// Render alphabet index
function renderAlphabetIndex() {
    const alphabetIndex = document.getElementById('alphabetIndex');
    alphabetIndex.innerHTML = '';
    
    // Get songs based on current filter
    const baseSongs = getFilteredSongs();
    
    // Get unique first characters from filtered songs
    const firstChars = [...new Set(baseSongs.map(song => song.title.charAt(0)))].sort();
    
    // Add "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'alphabet-btn active';
    allBtn.textContent = 'সব';
    allBtn.onclick = () => {
        document.querySelectorAll('.alphabet-btn').forEach(btn => btn.classList.remove('active'));
        allBtn.classList.add('active');
        renderSongList(baseSongs);
        document.getElementById('searchInput').value = '';
    };
    alphabetIndex.appendChild(allBtn);
    
    // Add character buttons
    firstChars.forEach(char => {
        const btn = document.createElement('button');
        btn.className = 'alphabet-btn';
        btn.textContent = char;
        btn.onclick = () => {
            document.querySelectorAll('.alphabet-btn').forEach(btn => btn.classList.remove('active'));
            btn.classList.add('active');
            const filtered = baseSongs.filter(song => song.title.startsWith(char));
            renderSongList(filtered);
            document.getElementById('searchInput').value = '';
        };
        alphabetIndex.appendChild(btn);
    });
}

// Render song cards
function renderSongList(songs) {
    const songList = document.getElementById('songList');
    songList.innerHTML = '';
    
    if (songs.length === 0) {
        songList.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1;">No songs found</p>';
        return;
    }
    
    songs.forEach(song => {
        const card = document.createElement('div');
        card.className = 'song-card';
        const isInPlaylist = servicePlaylist.some(s => s.id === song.id);
        card.innerHTML = `
            <h3>${song.title}</h3>
            <p>${song.category}</p>
            <button class="add-to-service-btn ${isInPlaylist ? 'in-playlist' : ''}" 
                    onclick="event.stopPropagation(); toggleServicePlaylist(${song.id})">
                ${isInPlaylist ? '✓ Added' : '+ Add to Service'}
            </button>
        `;
        card.onclick = () => openSong(song);
        songList.appendChild(card);
    });
}

// Open song modal
function openSong(song) {
    const modal = document.getElementById('songModal');
    const title = document.getElementById('songTitle');
    
    title.textContent = song.title;
    currentTranspose = 0;
    currentFontSize = 16;
    
    // Reset to defaults when opening a new song
    showChords = true;
    const chordsBtn = document.getElementById('toggleChords');
    if (chordsBtn) chordsBtn.textContent = 'Hide Chords';
    
    // Keep bilingual mode if active, otherwise reset to Bengali
    if (!showBilingualMode) {
        showPhonetic = false;
    }
    
    // Reset advanced controls to hidden on mobile
    const advancedControls = document.getElementById('advancedControls');
    const toggleAdvancedBtn = document.getElementById('toggleAdvanced');
    if (advancedControls && toggleAdvancedBtn) {
        advancedControls.style.display = 'none';
        toggleAdvancedBtn.textContent = 'Advanced ▼';
    }
    
    // Store current song globally
    window.currentSong = song;
    
    renderSongContent(song.lyrics);
    modal.style.display = 'flex';
    
    // Lock body scroll when modal opens
    document.body.style.overflow = 'hidden';
}

// Centralized cleanup function to restore UI state
function closeSongModal() {
    const modal = document.getElementById('songModal');
    modal.style.display = 'none';
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Clear any transient UI states
    window.currentSong = null;
}

// Render song content with chords
function renderSongContent(lyrics) {
    const content = document.getElementById('songContent');
    content.style.fontSize = currentFontSize + 'px';
    
    let textToDisplay = lyrics;
    
    // Bilingual mode: alternate Bangla and phonetic lines
    if (showBilingualMode) {
        const lines = lyrics.split('\n');
        const bilingualLines = [];
        
        lines.forEach(line => {
            const trimmed = line.trim();
            
            // Skip empty lines
            if (!trimmed) {
                bilingualLines.push('');
                return;
            }
            
            // Check if this is a chord-only line
            const hasBengali = /[\u0980-\u09FF]/.test(trimmed);
            const chordPattern = /^[A-G#bmajdinsug\s]+$/;
            const isChordLine = !hasBengali && chordPattern.test(trimmed);
            
            // If it's a chord line and chords are hidden, skip it
            if (isChordLine && !showChords) {
                return;
            }
            
            // If it's a chord line and chords are shown, display it
            if (isChordLine && showChords) {
                bilingualLines.push(line);
                return;
            }
            
            // It's a lyric line - show Bengali and phonetic
            bilingualLines.push(line); // Bengali lyric
            const phoneticLine = convertToPhonetic(line);
            bilingualLines.push('<span style="color: #999; font-size: 0.85em;">' + phoneticLine + '</span>'); // Phonetic
        });
        
        content.innerHTML = bilingualLines.join('<br>');
        return;
    }
    
    // Convert to phonetic if enabled
    if (showPhonetic) {
        textToDisplay = convertToPhonetic(lyrics);
    }
    
    if (showChords) {
        // Show all content as-is (chords and lyrics)
        const finalHTML = textToDisplay.replace(/\n/g, '<br>');
        content.innerHTML = finalHTML;
        content.offsetHeight; // Force reflow
    } else {
        // Remove chord-only lines (lines with mostly chord patterns like F#, BF#, C, etc.)
        const lines = textToDisplay.split('\n');
        const lyricsOnly = lines.filter(line => {
            const trimmed = line.trim();
            // Skip empty lines
            if (!trimmed) return true;
            
            // Check if line contains mostly Bengali/text (not just chords)
            const hasBengali = /[\u0980-\u09FF]/.test(trimmed);
            
            // If has Bengali, it's a lyric line - keep it
            if (hasBengali) return true;
            
            // If no Bengali, check if it's a chord line (only chord symbols)
            const chordPattern = /^[A-G#bmajdinsug\s]+$/;
            const looksLikeChords = chordPattern.test(trimmed);
            
            // Keep non-chord lines, remove chord lines
            return !looksLikeChords;
        });
        
        const finalHTML = lyricsOnly.join('<br>');
        content.innerHTML = finalHTML;
        content.offsetHeight; // Force reflow
    }
}

// Transpose chord
function transposeChord(chord, steps) {
    // Extract the base note and modifiers
    const match = chord.match(/^([A-G][#b]?)(.*)/);
    if (!match) return chord;
    
    let [, note, modifier] = match;
    
    // Normalize sharps/flats
    note = note.replace('b', '#');
    if (note === 'C#') note = 'C#';
    else if (note === 'D#') note = 'D#';
    else if (note === 'F#') note = 'F#';
    else if (note === 'G#') note = 'G#';
    else if (note === 'A#') note = 'A#';
    
    // Find in chord map
    const baseNote = note.charAt(0);
    if (!chordMap[baseNote]) return chord;
    
    const noteIndex = chordMap[baseNote].indexOf(note);
    if (noteIndex === -1) return chord;
    
    const newIndex = (noteIndex + steps + 12) % 12;
    const newNote = chordMap[baseNote][newIndex];
    
    return newNote + modifier;
}

// Search functionality
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const modal = document.getElementById('songModal');
    const closeBtn = document.querySelector('.close');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const baseSongs = getFilteredSongs();
        const filtered = baseSongs.filter(song => {
            // Search in title, category, and lyrics
            const titleMatch = song.title.toLowerCase().includes(query);
            const categoryMatch = song.category.toLowerCase().includes(query);
            const lyricsMatch = song.lyrics.toLowerCase().includes(query);
            
            // Also search in phonetic version
            const phoneticTitle = convertToPhonetic(song.title).toLowerCase();
            const phoneticLyrics = convertToPhonetic(song.lyrics).toLowerCase();
            const phoneticMatch = phoneticTitle.includes(query) || phoneticLyrics.includes(query);
            
            return titleMatch || categoryMatch || lyricsMatch || phoneticMatch;
        });
        renderSongList(filtered);
    });
    
    closeBtn.onclick = () => closeSongModal();
    
    // Close modal when clicking outside content
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeSongModal();
        }
    };
    
    // Close modal with ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeSongModal();
        }
    });
    
    // Control buttons
    document.getElementById('toggleChords').onclick = function() {
        showChords = !showChords;
        const btn = document.getElementById('toggleChords');
        btn.textContent = showChords ? 'Hide Chords' : 'Show Chords';
        
        if (window.currentSong) {
            renderSongContent(window.currentSong.lyrics);
        }
    };
    
    document.getElementById('togglePhonetic').onclick = () => {
        showPhonetic = !showPhonetic;
        const btn = document.getElementById('togglePhonetic');
        btn.textContent = showPhonetic ? 'Show Bengali' : 'Show Phonetic';
        if (window.currentSong) renderSongContent(window.currentSong.lyrics);
    };
    
    // Toggle advanced controls visibility (mobile optimization)
    const toggleAdvancedBtn = document.getElementById('toggleAdvanced');
    const advancedControls = document.getElementById('advancedControls');
    if (toggleAdvancedBtn && advancedControls) {
        toggleAdvancedBtn.onclick = () => {
            const isVisible = advancedControls.style.display !== 'none';
            advancedControls.style.display = isVisible ? 'none' : 'flex';
            toggleAdvancedBtn.textContent = isVisible ? 'Advanced ▼' : 'Advanced ▲';
        };
    }
    
    document.getElementById('increaseFontSize').onclick = () => {
        currentFontSize += 2;
        if (window.currentSong) renderSongContent(window.currentSong.lyrics);
    };
    
    document.getElementById('decreaseFontSize').onclick = () => {
        if (currentFontSize > 10) {
            currentFontSize -= 2;
            if (window.currentSong) renderSongContent(window.currentSong.lyrics);
        }
    };
    
    document.getElementById('transposeUp').onclick = () => {
        currentTranspose++;
        if (window.currentSong) renderSongContent(window.currentSong.lyrics);
    };
    
    document.getElementById('transposeDown').onclick = () => {
        currentTranspose--;
        if (window.currentSong) renderSongContent(window.currentSong.lyrics);
    };
}

// Copy protection functions
function setupCopyProtection() {
    // Prevent right-click context menu for unauthorized users
    document.addEventListener('contextmenu', function(e) {
        // Check current state, not initial state
        if (!isAuthorizedUser) {
            e.preventDefault();
            showCopyrightModal();
            return false;
        }
    });
    
    // Prevent keyboard shortcuts for copying (Ctrl+C, Cmd+C)
    document.addEventListener('keydown', function(e) {
        // Check current state, not initial state
        if (!isAuthorizedUser && (e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            showCopyrightModal();
            return false;
        }
    });
    
    // Apply initial protection
    updateCopyProtectionUI();
}

function showCopyrightModal() {
    // Don't show modal if user is authorized
    if (isAuthorizedUser) {
        return;
    }
    document.getElementById('copyrightModal').style.display = 'flex';
}

function closeCopyrightModal() {
    document.getElementById('copyrightModal').style.display = 'none';
}

function updateCopyProtectionUI() {
    // Update CSS protection based on current authorization state
    if (isAuthorizedUser) {
        document.body.classList.remove('copy-protected');
    } else {
        document.body.classList.add('copy-protected');
    }
}

function enableCopyForAuthorizedUser() {
    isAuthorizedUser = true;
    updateCopyProtectionUI();
}

function disableCopyForUnauthorizedUser() {
    isAuthorizedUser = false;
    updateCopyProtectionUI();
}

// Safety cleanup: Ensure UI state is restored when leaving the page or switching tabs
window.addEventListener('beforeunload', () => {
    document.body.style.overflow = '';
    document.body.classList.remove('menu-open');
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden - ensure no locks remain
        const modal = document.getElementById('songModal');
        if (modal && modal.style.display === 'flex') {
            closeSongModal();
        }
    }
});

