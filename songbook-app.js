// Main application logic
const SONGBOOK_COORDINATOR_EMAIL = 'gilbert.baidya@gmail.com';

let currentFontSize = 16;
let currentTranspose = 0;
let showChords = true;
let showPhonetic = false;
let currentFilter = 'all'; // 'all', 'chords', or 'bilingual'
let currentLanguageFilter = 'all';
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

/*
 * Song Reader data helpers.
 *
 * The library stores raw lyric text only. Phonetic text is generated at read
 * time, with narrowly scoped manual overrides for inspected corrections. The
 * parser below is the single source of truth for chord-only line detection.
 */
const CHORD_SYMBOL_SOURCE = '[A-G](?:#|b)?(?:(?:maj|min|m|dim|aug|sus|add|no|M|Δ|°|ø)?(?:\\d+)?(?:/[A-G](?:#|b)?)?)';
const CHORD_TOKEN_RE = new RegExp(`^(${CHORD_SYMBOL_SOURCE})(?:\\((${CHORD_SYMBOL_SOURCE})\\))?$`, 'i');
const SONG_PHONETIC_OVERRIDES = Object.freeze({
    117: Object.freeze({
        title: 'Ar kono nam nai, je name jibon pai,',
        lines: Object.freeze({
            'আর কোন নাম নাই, যে নামে জীবন পাই,': 'Ar kono nam nai, je name jibon pai,',
            'আত্মার দানে হয় ভরপুর।': 'Atmar dane hoy bhorpur.'
        })
    })
});

function cleanChordToken(token) {
    return token.trim()
        .replace(/^\[/, '')
        .replace(/\]$/, '')
        .replace(/[|,;:]+$/, '');
}

function parseChordToken(token) {
    const cleaned = cleanChordToken(token);
    const match = CHORD_TOKEN_RE.exec(cleaned);
    if (!match) return null;

    return {
        raw: cleaned,
        symbols: match[2] ? [match[1], match[2]] : [match[1]],
        grouped: Boolean(match[2])
    };
}

function parseCompactChordToken(token) {
    const cleaned = cleanChordToken(token);
    let remainder = cleaned;
    const symbols = [];

    while (remainder) {
        const match = new RegExp(`^(${CHORD_SYMBOL_SOURCE})`, 'i').exec(remainder);
        if (!match) return null;
        symbols.push(match[1]);
        remainder = remainder.slice(match[1].length);
    }

    return symbols.length > 1 ? { raw: cleaned, symbols, grouped: false } : null;
}

function parseChordLine(line) {
    const trimmed = line.trim();
    if (!trimmed || /[\u0980-\u09FF]/u.test(trimmed)) return null;

    const tokens = trimmed.split(/\s+/).filter(Boolean);
    const parts = tokens.map(token => parseChordToken(token) || parseCompactChordToken(token));
    return parts.length && parts.every(Boolean) ? { parts } : null;
}

function classifySongLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return 'BLANK';

    if (/^(?:\[?\s*(?:verse|chorus|bridge|intro|outro|pre-chorus|refrain|tag)(?:\s+\d+)?\s*\]?|ধূয়াঃ|ধুয়া|ধ্রুবক)\s*[:：]?$/iu.test(trimmed)) {
        return 'SECTION';
    }

    if (parseChordLine(trimmed)) return 'CHORD';
    if (/[\u0980-\u09FFA-Za-z0-9]/u.test(trimmed)) return 'LYRIC';
    return 'OTHER';
}

function hasInlineChordMarkers(line) {
    return new RegExp(`\\[${CHORD_SYMBOL_SOURCE}(?:\\(${CHORD_SYMBOL_SOURCE}\\))?\\]`, 'i').test(line);
}

function getSongPhoneticLine(song, line) {
    const override = SONG_PHONETIC_OVERRIDES[song?.id];
    const trimmed = line.trim();
    if (override?.lines?.[trimmed]) {
        return line.slice(0, line.indexOf(trimmed)) + override.lines[trimmed];
    }

    if (classifySongLine(line) === 'CHORD') return line;
    return convertToPhonetic(line);
}

function getSongPhonetic(song) {
    return song.lyrics.split('\n').map(line => getSongPhoneticLine(song, line)).join('\n');
}

function getSongPhoneticTitle(song) {
    return SONG_PHONETIC_OVERRIDES[song?.id]?.title || convertToPhonetic(song.title);
}

function songHasPhonetic(song) {
    return /[\u0980-\u09FF]/u.test(`${song?.title || ''}\n${song?.lyrics || ''}`);
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
            
            // Use the same conservative chord classifier as the Song Reader.
            const isChordLine = classifySongLine(trimmed) === 'CHORD';
            
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
            const phoneticLine = getSongPhoneticLine(song, line);
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
    trapModalFocus(modal);
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
    releaseModalFocus(modal);
    
    // Reset presentation state
    window.currentPresentationIndex = 0;
}

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
    return Boolean(song?.lyrics?.split('\n').some(line => (
        classifySongLine(line) === 'CHORD' || hasInlineChordMarkers(line)
    )));
}

// Get filtered songs based on current category and language filters.
function getFilteredSongs() {
    let filteredSongs = songsDatabase;

    if (currentFilter === 'chords') {
        filteredSongs = songsDatabase.filter(song => hasChords(song));
    } else if (currentFilter === 'christmas') {
        filteredSongs = songsDatabase.filter(song => {
            const lyrics = song.lyrics.toLowerCase();
            return lyrics.includes('বড়দিন') || lyrics.includes('গোশালা') || lyrics.includes('গোয়াল ঘর') || 
                   lyrics.includes('বৈথলেহম') || lyrics.includes('বেথেল') || 
                   (lyrics.includes('রাখাল') && lyrics.includes('মেষ')) ||
                   (lyrics.includes('স্বর্গদূত') && lyrics.includes('রাখাল')) ||
                   lyrics.includes('যাবপাত্র') || lyrics.includes('christmas');
        });
    } else if (currentFilter === 'easter') {
        filteredSongs = songsDatabase.filter(song => {
            const lyrics = song.lyrics.toLowerCase();
            return lyrics.includes('পুনরুত্থান') || lyrics.includes('easter') ||
                   (lyrics.includes('ক্রুশ') && lyrics.includes('জয়')) ||
                   (lyrics.includes('মৃত্যু') && lyrics.includes('জয়'));
        });
    } else if (currentFilter === 'goodfriday') {
        filteredSongs = songsDatabase.filter(song => {
            const lyrics = song.lyrics.toLowerCase();
            return lyrics.includes('ক্রুশ') || lyrics.includes('good friday') || 
                   lyrics.includes('গুড ফ্রাইডে') || lyrics.includes('মহাশুক্রবার') ||
                   lyrics.includes('ক্রুশারোপণ') || lyrics.includes('গলগথা');
        });
    } else if (currentFilter === 'communion') {
        filteredSongs = songsDatabase.filter(song => {
            const lyrics = song.lyrics.toLowerCase();
            return lyrics.includes('প্রভুভোজ') || lyrics.includes('holy communion') ||
                   lyrics.includes('সাক্রামেন্ট') || 
                   (lyrics.includes('রুটি') && lyrics.includes('দ্রাক্ষারস'));
        });
    } else if (currentFilter === 'newyear') {
        filteredSongs = songsDatabase.filter(song => {
            const lyrics = song.lyrics.toLowerCase();
            return lyrics.includes('নববর্ষ') || lyrics.includes('নতুন বছর') ||
                   lyrics.includes('new year') || lyrics.includes('নব বৎসর');
        });
    }

    if (currentLanguageFilter === 'bangla') {
        filteredSongs = filteredSongs.filter(song => /[\u0980-\u09FF]/.test(`${song.title} ${song.lyrics}`));
    } else if (currentLanguageFilter === 'english') {
        filteredSongs = filteredSongs.filter(song => /[A-Za-z]/.test(`${song.title} ${song.lyrics}`) && !/[\u0980-\u09FF]/.test(`${song.title} ${song.lyrics}`));
    }

    return filteredSongs;
}

function setSongbookLanguageFilter(language) {
    currentLanguageFilter = ['all', 'bangla', 'english'].includes(language) ? language : 'all';
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
        allTabs.forEach(tab => {
            if (tab) {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
            }
        });
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.setAttribute('aria-selected', 'true');
        }
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
    
    // Announce result count to screen readers
    const announcer = document.getElementById('songResultsAnnouncer');
    if (announcer) {
        announcer.textContent = songs.length === 0 ? 'No songs found' : `${songs.length} songs found`;
    }
    
    if (songs.length === 0) {
        songList.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1;">No songs found</p>';
        return;
    }
    
    songs.forEach(song => {
        const card = document.createElement('div');
        card.className = 'song-card songbook-v18__song-card';
        card.dataset.songId = String(song.id);
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `Open song: ${song.title}`);
        const isInPlaylist = servicePlaylist.some(s => s.id === song.id);
        const title = document.createElement('h3');
        title.textContent = song.title;
        const category = document.createElement('p');
        category.textContent = song.category || 'Worship';
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = `add-to-service-btn ${isInPlaylist ? 'in-playlist' : ''}`;
        addButton.textContent = isInPlaylist ? '✓ Added' : '+ Add to Service';
        addButton.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleServicePlaylist(song.id);
        });
        card.append(title, category, addButton);
        card.onclick = () => openSong(song);
        card.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openSong(song);
            }
        };
        songList.appendChild(card);
    });
}

// Focus Trap Helper for Accessible Modals
let songbookLastFocusedElement = null;

function trapModalFocus(modalElement) {
    if (!modalElement) return;
    songbookLastFocusedElement = document.activeElement;

    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(modalElement.querySelectorAll(focusableSelectors)).filter(
        el => !el.disabled && el.offsetParent !== null
    );

    if (focusables.length > 0) {
        setTimeout(() => focusables[0].focus(), 60);
    }

    const keyHandler = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            if (modalElement.id === 'songModal') closeSongModal();
            else if (modalElement.id === 'presentationModal') exitPresentation();
            else if (modalElement.id === 'copyrightModal') closeCopyrightModal();
            return;
        }

        if (e.key === 'Tab') {
            const currentFocusables = Array.from(modalElement.querySelectorAll(focusableSelectors)).filter(
                el => !el.disabled && el.offsetParent !== null
            );
            if (!currentFocusables.length) return;

            const firstEl = currentFocusables[0];
            const lastEl = currentFocusables[currentFocusables.length - 1];

            if (e.shiftKey && document.activeElement === firstEl) {
                e.preventDefault();
                lastEl.focus();
            } else if (!e.shiftKey && document.activeElement === lastEl) {
                e.preventDefault();
                firstEl.focus();
            }
        }
    };

    modalElement._focusKeyHandler = keyHandler;
    modalElement.addEventListener('keydown', keyHandler);
}

function releaseModalFocus(modalElement) {
    if (modalElement && modalElement._focusKeyHandler) {
        modalElement.removeEventListener('keydown', modalElement._focusKeyHandler);
        delete modalElement._focusKeyHandler;
    }
    if (songbookLastFocusedElement && typeof songbookLastFocusedElement.focus === 'function') {
        songbookLastFocusedElement.focus();
    }
}

// Open song modal
function openSong(song) {
    const modal = document.getElementById('songModal');
    const title = document.getElementById('songTitle');
    if (!modal || !title || !song) return;

    title.textContent = song.title;
    currentTranspose = 0;
    currentFontSize = 16;
    showChords = true;
    showPhonetic = false;

    const phoneticTitle = document.getElementById('songPhoneticTitle');
    if (phoneticTitle) {
        phoneticTitle.textContent = songHasPhonetic(song) ? getSongPhoneticTitle(song) : '';
        phoneticTitle.hidden = !songHasPhonetic(song);
    }

    const advancedControls = document.getElementById('advancedControls');
    const toggleAdvancedBtn = document.getElementById('toggleAdvanced');
    if (advancedControls && toggleAdvancedBtn) {
        advancedControls.hidden = true;
        advancedControls.setAttribute('aria-hidden', 'true');
        toggleAdvancedBtn.hidden = true;
    }

    window.currentSong = song;
    updateReaderControls();
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    renderSongContent(song.lyrics);
    document.body.style.overflow = 'hidden';
    trapModalFocus(modal);
}

// Centralized cleanup function to restore UI state
function closeSongModal() {
    const modal = document.getElementById('songModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    releaseModalFocus(modal);
    window.currentSong = null;
}

function updateReaderLanguageControls() {
    const banglaButton = document.getElementById('showBangla');
    const phoneticButton = document.getElementById('togglePhonetic');
    const hasPhonetic = songHasPhonetic(window.currentSong);

    if (banglaButton) {
        banglaButton.classList.toggle('is-active', !showPhonetic);
        banglaButton.setAttribute('aria-pressed', String(!showPhonetic));
    }

    if (phoneticButton) {
        phoneticButton.disabled = !hasPhonetic;
        phoneticButton.classList.toggle('is-active', showPhonetic && hasPhonetic);
        phoneticButton.setAttribute('aria-pressed', String(showPhonetic && hasPhonetic));
        phoneticButton.setAttribute('aria-disabled', String(!hasPhonetic));
    }
}

function updateReaderControls() {
    updateReaderLanguageControls();

    const chordsButton = document.getElementById('toggleChords');
    if (chordsButton) {
        const value = chordsButton.querySelector('.songbook-v18__reader-control-value');
        if (value) value.textContent = showChords ? 'ON' : 'OFF';
        chordsButton.setAttribute('aria-pressed', String(showChords));
        chordsButton.setAttribute('aria-label', showChords ? 'Hide chords' : 'Show chords');
        chordsButton.classList.toggle('is-active', showChords);
    }

    const baseKey = getSongBaseKey(window.currentSong);
    const keyLabel = document.getElementById('transposeKey');
    if (keyLabel) keyLabel.textContent = `Key: ${baseKey ? transposeChordSymbol(baseKey, currentTranspose) : '—'}`;

    const content = document.getElementById('songContent');
    if (content) content.style.setProperty('--reader-font-size', `${currentFontSize}px`);
}

function setReaderLanguage(language) {
    if (language === 'phonetic' && !songHasPhonetic(window.currentSong)) return;
    showPhonetic = language === 'phonetic';
    updateReaderControls();
    if (window.currentSong) renderSongContent(window.currentSong.lyrics);
}

function getSongBaseKey(song) {
    if (!song) return null;
    const firstChordLine = song.lyrics.split('\n').map(parseChordLine).find(Boolean);
    const firstSymbol = firstChordLine?.parts?.[0]?.symbols?.[0];
    return firstSymbol?.match(/^([A-G](?:#|b)?)/i)?.[1] || null;
}

function appendInlineReaderText(container, line) {
    const inlineChordPattern = new RegExp(`\\[(${CHORD_SYMBOL_SOURCE}(?:\\(${CHORD_SYMBOL_SOURCE}\\))?)\\]`, 'gi');
    let cursor = 0;
    let match;

    while ((match = inlineChordPattern.exec(line))) {
        if (match.index > cursor) container.appendChild(document.createTextNode(line.slice(cursor, match.index)));
        if (showChords) {
            const chord = document.createElement('span');
            chord.className = 'songbook-v18__reader-inline-chord';
            chord.textContent = transposeChord(match[1], currentTranspose);
            container.appendChild(chord);
        }
        cursor = inlineChordPattern.lastIndex;
    }

    if (cursor < line.length) container.appendChild(document.createTextNode(line.slice(cursor)));
    if (!match) container.textContent = line;
}

function createReaderLine(line, type, isPhonetic) {
    const element = document.createElement('div');
    element.className = type === 'SECTION'
        ? 'songbook-v18__reader-section'
        : isPhonetic
            ? 'songbook-v18__reader-lyric-line songbook-v18__reader-lyric-line--phonetic'
            : 'songbook-v18__reader-lyric-line';

    if (type === 'CHORD') {
        element.className = 'songbook-v18__reader-chord-line';
        element.textContent = transposeChordLine(line, currentTranspose);
    } else {
        appendInlineReaderText(element, line);
    }
    return element;
}

// Render every reader view through one line classifier and renderer.
function renderSongContent(lyrics) {
    const content = document.getElementById('songContent');
    const song = window.currentSong;
    if (!content || !song) return;

    const originalLines = lyrics.split('\n');
    const displayLines = showPhonetic ? getSongPhonetic(song).split('\n') : originalLines;
    content.replaceChildren();
    content.dataset.language = showPhonetic ? 'phonetic' : 'bangla';
    content.dataset.chords = showChords ? 'on' : 'off';
    content.style.setProperty('--reader-font-size', `${currentFontSize}px`);

    let needsStanzaSpace = false;
    originalLines.forEach((originalLine, index) => {
        const type = classifySongLine(originalLine);
        if (type === 'BLANK') {
            if (content.lastElementChild) needsStanzaSpace = true;
            return;
        }
        if (type === 'CHORD' && !showChords) return;

        if (needsStanzaSpace) {
            const spacer = document.createElement('div');
            spacer.className = 'songbook-v18__reader-stanza-space';
            spacer.setAttribute('aria-hidden', 'true');
            content.appendChild(spacer);
            needsStanzaSpace = false;
        }

        const line = displayLines[index] ?? originalLine;
        content.appendChild(createReaderLine(line, type, showPhonetic && type !== 'CHORD'));
    });
}

// Normalize chord spacing (fixes "BF#" → "B F#", "C#F#" → "C# F#")
function normalizeChordLine(line) {
    const parsed = parseChordLine(line);
    if (!parsed) return line;
    const leading = line.match(/^\s*/)?.[0] || '';
    return leading + parsed.parts.map(part => part.grouped
        ? `${part.symbols[0]}(${part.symbols[1]})`
        : part.symbols.join(' ')).join(' ');
}

function transposeChordSymbol(chord, steps) {
    const match = /^([A-G](?:#|b)?)(.*)$/i.exec(chord);
    if (!match) return chord;

    const aliases = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
    const transposeRoot = root => {
        const note = root.charAt(0).toUpperCase() + root.slice(1);
        const pitch = aliases[note];
        if (pitch === undefined) return root;
        const names = note.includes('b') ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const nextPitch = ((pitch + steps) % 12 + 12) % 12;
        return names[nextPitch];
    };

    const note = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    const modifier = match[2];
    const slashIndex = modifier.search(/\/[A-G](?:#|b)?$/i);
    if (slashIndex === -1) return transposeRoot(note) + modifier;

    const quality = modifier.slice(0, slashIndex);
    const bass = modifier.slice(slashIndex + 1);
    return `${transposeRoot(note)}${quality}/${transposeRoot(bass)}`;
}

function transposeChord(chord, steps) {
    const parsed = parseChordToken(chord);
    if (parsed?.grouped) {
        return `${transposeChordSymbol(parsed.symbols[0], steps)}(${transposeChordSymbol(parsed.symbols[1], steps)})`;
    }
    return parsed ? parsed.symbols.map(symbol => transposeChordSymbol(symbol, steps)).join(' ') : chord;
}

function transposeChordLine(line, steps) {
    const parsed = parseChordLine(line);
    if (!parsed) return line;
    const leading = line.match(/^\s*/)?.[0] || '';
    return leading + parsed.parts.map(part => {
        const transposed = part.symbols.map(symbol => transposeChordSymbol(symbol, steps));
        return part.grouped ? `${transposed[0]}(${transposed[1]})` : transposed.join(' ');
    }).join(' ');
}

// Search functionality
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const modal = document.getElementById('songModal');
    const closeBtn = modal?.querySelector('.close');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const baseSongs = getFilteredSongs();
        const filtered = baseSongs.filter(song => {
            // Search in title, category, and lyrics
            const titleMatch = song.title.toLowerCase().includes(query);
            const categoryMatch = song.category.toLowerCase().includes(query);
            const lyricsMatch = song.lyrics.toLowerCase().includes(query);
            
            // Also search in phonetic version
            const phoneticTitle = getSongPhoneticTitle(song).toLowerCase();
            const phoneticLyrics = getSongPhonetic(song).toLowerCase();
            const phoneticMatch = phoneticTitle.includes(query) || phoneticLyrics.includes(query);
            
            return titleMatch || categoryMatch || lyricsMatch || phoneticMatch;
        });
        renderSongList(filtered);
    });
    
    if (closeBtn) closeBtn.onclick = () => closeSongModal();
    
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
        updateReaderControls();
        if (window.currentSong) renderSongContent(window.currentSong.lyrics);
    };

    document.getElementById('showBangla').onclick = () => setReaderLanguage('bangla');
    document.getElementById('togglePhonetic').onclick = () => setReaderLanguage('phonetic');

    const toggleAdvancedBtn = document.getElementById('toggleAdvanced');
    const advancedControls = document.getElementById('advancedControls');
    if (toggleAdvancedBtn && advancedControls) {
        toggleAdvancedBtn.onclick = () => {
            const isVisible = !advancedControls.hidden;
            advancedControls.hidden = isVisible;
            advancedControls.setAttribute('aria-hidden', String(isVisible));
            toggleAdvancedBtn.setAttribute('aria-expanded', String(!isVisible));
        };
    }

    document.getElementById('increaseFontSize').onclick = () => {
        currentFontSize = Math.min(28, currentFontSize + 2);
        updateReaderControls();
        if (window.currentSong) renderSongContent(window.currentSong.lyrics);
    };

    document.getElementById('decreaseFontSize').onclick = () => {
        currentFontSize = Math.max(14, currentFontSize - 2);
        updateReaderControls();
        if (window.currentSong) renderSongContent(window.currentSong.lyrics);
    };

    document.getElementById('transposeUp').onclick = () => {
        currentTranspose++;
        updateReaderControls();
        if (window.currentSong) renderSongContent(window.currentSong.lyrics);
    };

    document.getElementById('transposeDown').onclick = () => {
        currentTranspose--;
        updateReaderControls();
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
    const modal = document.getElementById('copyrightModal');
    if (modal) {
        modal.style.display = 'flex';
        trapModalFocus(modal);
    }
}

function closeCopyrightModal() {
    const modal = document.getElementById('copyrightModal');
    if (modal) {
        modal.style.display = 'none';
        releaseModalFocus(modal);
    }
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

/**
 * Open default mail client to submit a song contribution or inquiry
 */
function contactSongCoordinator() {
    window.location.href = `mailto:${SONGBOOK_COORDINATOR_EMAIL}?subject=GPBC%20Songbook%20Contribution%20%2F%20Inquiry`;
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
