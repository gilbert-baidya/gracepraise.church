/**
 * GPBC Holy Bible: Luminous Parallel Reader
 * Core State Machine & Logic
 */

const app = {
    state: {
        view: 'atlas', // atlas, constellation, reader
        currentBook: null,
        currentChapter: 1,
        language: 'both', // en, bn, both
        theme: localStorage.getItem('theme') || 'sanctuary'
    },

    books: [
        // Old Testament
        { id: 'gen', en: 'Genesis', bn: 'আদিপুস্তক', chapters: 50, test: 'ot', icon: '🌱' },
        { id: 'exo', en: 'Exodus', bn: 'যাত্রাপুস্তক', chapters: 40, test: 'ot', icon: '📜' },
        { id: 'lev', en: 'Leviticus', bn: 'লেবীয় পুস্তক', chapters: 27, test: 'ot', icon: '🔥' },
        { id: 'num', en: 'Numbers', bn: 'গণনাপুস্তক', chapters: 36, test: 'ot', icon: '🔢' },
        { id: 'deu', en: 'Deuteronomy', bn: 'দ্বিতীয় বিবরণ', chapters: 34, test: 'ot', icon: '🗣️' },
        { id: 'jos', en: 'Joshua', bn: 'যিহোশূয়', chapters: 24, test: 'ot', icon: '⚔️' },
        { id: 'jdg', en: 'Judges', bn: 'বিচারকর্তৃগণ', chapters: 21, test: 'ot', icon: '⚖️' },
        { id: 'rut', en: 'Ruth', bn: 'রূৎ', chapters: 4, test: 'ot', icon: '🌾' },
        { id: '1sa', en: '1 Samuel', bn: '১ শমূয়েল', chapters: 31, test: 'ot', icon: '👑' },
        { id: '2sa', en: '2 Samuel', bn: '২ শমূয়েল', chapters: 24, test: 'ot', icon: '🏰' },
        { id: '1ki', en: '1 Kings', bn: '১ রাজাবলি', chapters: 22, test: 'ot', icon: '🏛️' },
        { id: '2ki', en: '2 Kings', bn: '২ রাজাবলি', chapters: 25, test: 'ot', icon: '🔥' },
        { id: '1ch', en: '1 Chronicles', bn: '১ বংশাবলি', chapters: 29, test: 'ot', icon: '🧬' },
        { id: '2ch', en: '2 Chronicles', bn: '২ বংশাবলি', chapters: 36, test: 'ot', icon: '🏗️' },
        { id: 'ezr', en: 'Ezra', bn: 'ইষ্রা', chapters: 10, test: 'ot', icon: '📜' },
        { id: 'neh', en: 'Nehemiah', bn: 'নহিমিয়', chapters: 13, test: 'ot', icon: '🧱' },
        { id: 'est', en: 'Esther', bn: 'ইষ্টের', chapters: 10, test: 'ot', icon: '🛡️' },
        { id: 'job', en: 'Job', bn: 'ইয়োব', chapters: 42, test: 'ot', icon: '⛈️' },
        { id: 'psa', en: 'Psalms', bn: 'সামসঙ্গীত', chapters: 150, test: 'ot', icon: '🎵' },
        { id: 'pro', en: 'Proverbs', bn: 'হিতোপদেশ', chapters: 31, test: 'ot', icon: '💡' },
        { id: 'ecc', en: 'Ecclesiastes', bn: 'উপদেশক', chapters: 12, test: 'ot', icon: '⚖️' },
        { id: 'sol', en: 'Song of Solomon', bn: 'পরম গীত', chapters: 8, test: 'ot', icon: '🌹' },
        { id: 'isa', en: 'Isaiah', bn: 'যিশাইয়', chapters: 66, test: 'ot', icon: '🦅' },
        { id: 'jer', en: 'Jeremiah', bn: 'যিরমিয়', chapters: 52, test: 'ot', icon: '💧' },
        { id: 'lam', en: 'Lamentations', bn: 'বিলাপ', chapters: 5, test: 'ot', icon: '😢' },
        { id: 'eze', en: 'Ezekiel', bn: 'যিহিষ্কেল', chapters: 48, test: 'ot', icon: '☸️' },
        { id: 'dan', en: 'Daniel', bn: 'দানিয়েল', chapters: 12, test: 'ot', icon: '🦁' },
        { id: 'hos', en: 'Hosea', bn: 'হোশেয়', chapters: 14, test: 'ot', icon: '💔' },
        { id: 'joe', en: 'Joel', bn: 'যোয়েল', chapters: 3, test: 'ot', icon: '🦗' },
        { id: 'amo', en: 'Amos', bn: 'আমোষ', chapters: 9, test: 'ot', icon: '🧺' },
        { id: 'oba', en: 'Obadiah', bn: 'ওবদিয়', chapters: 1, test: 'ot', icon: '⛰️' },
        { id: 'jon', en: 'Jonah', bn: 'যোনা', chapters: 4, test: 'ot', icon: '🐋' },
        { id: 'mic', en: 'Micah', bn: 'মীখা', chapters: 7, test: 'ot', icon: '🕊️' },
        { id: 'nah', en: 'Nahum', bn: 'নহূম', chapters: 3, test: 'ot', icon: '💨' },
        { id: 'hab', en: 'হবক্‌কূক', bn: 'Habakkuk', chapters: 3, test: 'ot', icon: '🎺' },
        { id: 'zep', en: 'Zephaniah', bn: 'সফনিয়', chapters: 3, test: 'ot', icon: '⏳' },
        { id: 'hag', en: 'Haggai', bn: 'হগয়', chapters: 2, test: 'ot', icon: '🕋' },
        { id: 'zec', en: 'Zechariah', bn: 'সখরিয়', chapters: 14, test: 'ot', icon: '🌖' },
        { id: 'mal', en: 'Malachi', bn: 'মালাখি', chapters: 4, test: 'ot', icon: '☀️' },

        // New Testament
        { id: 'mat', en: 'Matthew', bn: 'মথি', chapters: 28, test: 'nt', icon: '👼' },
        { id: 'mar', en: 'Mark', bn: 'মার্ক', chapters: 16, test: 'nt', icon: '🦁' },
        { id: 'luk', en: 'Luke', bn: 'লূক', chapters: 24, test: 'nt', icon: '🐂' },
        { id: 'joh', en: 'John', bn: 'যোহন', chapters: 21, test: 'nt', icon: '🦅' },
        { id: 'act', en: 'Acts', bn: 'প্রেরিত', chapters: 28, test: 'nt', icon: '🔥' },
        { id: 'rom', en: 'Romans', bn: 'রোমীয়', chapters: 16, test: 'nt', icon: '🏛️' },
        { id: '1co', en: '1 Corinthians', bn: '১ করিন্থীয়', chapters: 16, test: 'nt', icon: '🍞' },
        { id: '2co', en: '2 Corinthians', bn: '২ করিন্থীয়', chapters: 13, test: 'nt', icon: '🤝' },
        { id: 'gal', en: 'Galatians', bn: 'গালাতীয়', chapters: 6, test: 'nt', icon: '🕊️' },
        { id: 'eph', en: 'Ephesians', bn: 'ইফিষীয়', chapters: 6, test: 'nt', icon: '🛡️' },
        { id: 'phi', en: 'Philippians', bn: 'ফিলিপীয়', chapters: 4, test: 'nt', icon: '💖' },
        { id: 'col', en: 'Colossians', bn: 'কলসীয়', chapters: 4, test: 'nt', icon: '🌿' },
        { id: '1th', en: '1 Thessalonians', bn: '১ থিষলনীকীয়', chapters: 5, test: 'nt', icon: '🎺' },
        { id: '2th', en: '2 Thessalonians', bn: '২ থিষলনীকীয়', chapters: 3, test: 'nt', icon: '✉️' },
        { id: '1ti', en: '1 Timothy', bn: '১ তীমথিয়', chapters: 6, test: 'nt', icon: '👨‍💼' },
        { id: '2ti', en: '2 Timothy', bn: '২ তীমথিয়', chapters: 4, test: 'nt', icon: '⛓️' },
        { id: 'tit', en: 'Titus', bn: 'তীত', chapters: 3, test: 'nt', icon: '🖌️' },
        { id: 'phi', en: 'Philemon', bn: 'ফিলীমন', chapters: 1, test: 'nt', icon: '🔓' },
        { id: 'heb', en: 'Hebrews', bn: 'ইব্রীয়', chapters: 13, test: 'nt', icon: '⚓' },
        { id: 'jam', en: 'James', bn: 'যাকোব', chapters: 5, test: 'nt', icon: '⚓' },
        { id: '1pe', en: '1 Peter', bn: '১ পিতর', chapters: 5, test: 'nt', icon: '🔑' },
        { id: '2pe', en: '2 Peter', bn: '২ পিতর', chapters: 3, test: 'nt', icon: '🔑' },
        { id: '1jo', en: '1 John', bn: '১ যোহন', chapters: 5, test: 'nt', icon: '❤️' },
        { id: '2jo', en: '2 John', bn: '২ যোহন', chapters: 1, test: 'nt', icon: '❤️' },
        { id: '3jo', en: '3 John', bn: '৩ যোহন', chapters: 1, test: 'nt', icon: '❤️' },
        { id: 'jud', en: 'Jude', bn: 'যিহূদা', chapters: 1, test: 'nt', icon: '🛡️' },
        { id: 'rev', en: 'Revelation', bn: 'প্রকাশিত বাক্য', chapters: 22, test: 'nt', icon: '👑' }
    ],

    init() {
        console.log('GPBC Luminous Bible Reader Initialized');
        this.renderAtlas();
        this.setupEventListeners();
        this.loadState();
        this.applyTheme();
        this.handleUrlReference(); // Handle deep links
    },

    handleUrlReference() {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (!ref) return;

        // More robust parser for "Book Chapter:Verse" or "Book Chapter"
        const match = ref.match(/(.+?)\s+(\d+)(?::(\d+))?$/);
        if (!match) {
            console.warn(`[BibleReader] Could not parse reference: ${ref}`);
            return;
        }

        const bookName = match[1].trim().toLowerCase();
        const chapter = parseInt(match[2], 10);
        const verse = match[3] ? parseInt(match[3], 10) : null;

        // Find book by English name or ID
        const book = this.books.find(b => 
            b.en.toLowerCase() === bookName || 
            b.id.toLowerCase() === bookName
        );

        if (book) {
            this.state.currentBook = book;
            this.state.currentChapter = chapter;
            this.showView('reader'); // Show loading state
            this.renderReader().then(() => {
                if (verse) {
                    const verseRow = document.querySelector(`.verse-row[data-verse="${verse}"]`);
                    if (verseRow) {
                        setTimeout(() => { // Allow UI to settle
                            verseRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            this.focusVerse(verse);
                        }, 100);
                    }
                }
            });
        } else {
            console.warn(`[BibleReader] Book not found: ${bookName}`);
        }
    },

    loadState() {
        const saved = localStorage.getItem('bible_reader_state');
        if (saved) {
            this.state = { ...this.state, ...JSON.parse(saved) };
            if (this.state.currentBook) {
                // Return to last session if appropriate
                // For now, start active view based on state
                this.showView(this.state.view);
            }
        }
    },

    saveState() {
        localStorage.setItem('bible_reader_state', JSON.stringify(this.state));
    },

    showView(viewName) {
        this.state.view = viewName;
        document.querySelectorAll('.bible-view').forEach(v => v.classList.remove('active'));
        const activeView = document.getElementById(`${viewName}View`);
        if (activeView) activeView.classList.add('active');
        this.saveState();
    },

    renderAtlas(filter = '') {
        const otGrid = document.getElementById('otGrid');
        const ntGrid = document.getElementById('ntGrid');
        
        const filterFn = b => b.en.toLowerCase().includes(filter.toLowerCase()) || b.bn.includes(filter);
        
        const otBooks = this.books.filter(b => b.test === 'ot' && filterFn(b));
        const ntBooks = this.books.filter(b => b.test === 'nt' && filterFn(b));

        const cardHtml = b => `
            <div class="book-card" onclick="app.selectBook('${b.id}')">
                <div class="book-icon">${b.icon}</div>
                <div class="book-name">${b.en}</div>
                <div class="book-name-bn">${b.bn}</div>
            </div>
        `;

        otGrid.innerHTML = otBooks.map(cardHtml).join('');
        ntGrid.innerHTML = ntBooks.map(cardHtml).join('');
    },

    selectBook(bookId) {
        const book = this.books.find(b => b.id === bookId);
        this.state.currentBook = book;
        document.getElementById('selectedBookName').innerText = `${book.en} / ${book.bn}`;
        this.renderConstellation(book);
        this.showView('constellation');
    },

    renderConstellation(book) {
        const grid = document.getElementById('chapterGrid');
        let html = '';
        for (let i = 1; i <= book.chapters; i++) {
            html += `<div class="chapter-node" onclick="app.selectChapter(${i})">${i}</div>`;
        }
        grid.innerHTML = html;
    },

    selectChapter(num) {
        this.state.currentChapter = num;
        this.showView('reader');
        this.renderReader();
    },

    async renderReader() {
        const book = this.state.currentBook;
        const chapter = this.state.currentChapter;
        document.getElementById('currentPassageDisplay').innerText = `${book.en} ${chapter} / ${book.bn} ${chapter}`;
        
        const container = document.getElementById('verseContent');
        container.innerHTML = '<div class="verse-loading">Illuminating the Word...</div>';
        
        return new Promise(resolve => {
            // Simulating fetch
            setTimeout(() => {
                const verses = [
                    { num: 1, en: "In the beginning God created the heavens and the earth.", bn: "আদিতে ঈশ্বর আকাশ ও পৃথিবী সৃষ্টি করিলেন।" },
                    { num: 2, en: "Now the earth was formless and empty, darkness was over the surface of the deep...", bn: "পৃথিবী ঘোর ও শূন্য ছিল; এবং অন্ধকারের মহাসাগরের ওপর ছিল;" },
                    { num: 3, en: "And God said, 'Let there be light,' and there was light.", bn: "ঈশ্বর কহিলেন, 'আলো হোক'; এবং আলো হইল।" },
                    { num: 4, en: "God saw that the light was good, and he separated the light from the darkness.", bn: "ঈশ্বর দেখিলেন যে আলো ভাল; এবং ঈশ্বর আলো ও অন্ধকার পৃথক করিলেন।" }
                ];

                container.innerHTML = verses.map(v => `
                    <div class="verse-row ${this.state.language}-mode" data-verse="${v.num}" onclick="app.focusVerse(${v.num})">
                        <div class="verse-text-en">
                            <span class="verse-num">${v.num}</span> ${v.en}
                        </div>
                        <div class="verse-text-bn" style="${this.state.language === 'en' ? 'display:none' : ''}">
                            <span class="verse-num">${v.num}</span> ${v.bn}
                        </div>
                    </div>
                `).join('');
                
                // Adjust for language mode
                this.updateLanguageUI();
                resolve();
            }, 400);
        });
    },

    focusVerse(num) {
        console.log('Focusing verse:', num);
        // Add illumination class to selected verse
        document.querySelectorAll('.verse-row').forEach(r => r.classList.remove('focused'));
        const row = document.querySelector(`.verse-row[onclick*="focusVerse(${num})"]`);
        if (row) row.classList.add('focused');
    },

    updateLanguageUI() {
        const rows = document.querySelectorAll('.verse-row');
        rows.forEach(row => {
            const en = row.querySelector('.verse-text-en');
            const bn = row.querySelector('.verse-text-bn');
            
            if (this.state.language === 'en') {
                en.style.display = 'block';
                bn.style.display = 'none';
                row.style.gridTemplateColumns = '1fr';
            } else if (this.state.language === 'bn') {
                en.style.display = 'none';
                bn.style.display = 'block';
                row.style.gridTemplateColumns = '1fr';
            } else {
                en.style.display = 'block';
                bn.style.display = 'block';
                row.style.gridTemplateColumns = window.innerWidth > 768 ? '1fr 1fr' : '1fr';
            }
        });
    },

    setupEventListeners() {
        const searchInput = document.getElementById('smartSearch');
        searchInput.addEventListener('input', (e) => {
            if (this.state.view === 'atlas') {
                this.renderAtlas(e.target.value);
            }
        });

        document.getElementById('themeToggle').addEventListener('click', () => {
            this.state.theme = this.state.theme === 'sanctuary' ? 'dark-sanctuary' : 'sanctuary';
            this.applyTheme();
            this.saveState();
        });

        document.getElementById('langToggle').addEventListener('click', () => {
            const cycle = { 'both': 'en', 'en': 'bn', 'bn': 'both' };
            this.state.language = cycle[this.state.language];
            document.getElementById('langToggle').innerText = this.state.language.toUpperCase();
            this.updateLanguageUI();
            this.saveState();
        });
        
        // Handle window resize for parallel rendering
        window.addEventListener('resize', () => {
            if (this.state.view === 'reader') this.updateLanguageUI();
        });
    },

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.state.theme);
        // Extra body class for specific sanctuary styling
        document.body.className = this.state.theme.includes('dark') ? 'page-bible-reader dark-mode' : 'page-bible-reader';
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
