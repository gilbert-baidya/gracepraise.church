'use strict';

const BOOKS = Object.freeze([
    { number: 1, name: 'Genesis', bnName: 'আদিপুস্তক', aliases: ['gen'] },
    { number: 2, name: 'Exodus', bnName: 'যাত্রাপুস্তক', aliases: ['exod', 'exo'] },
    { number: 3, name: 'Leviticus', bnName: 'লেবীয় পুস্তক', aliases: ['lev'] },
    { number: 4, name: 'Numbers', bnName: 'গণনাপুস্তক', aliases: ['num'] },
    { number: 5, name: 'Deuteronomy', bnName: 'দ্বিতীয় বিবরণ', aliases: ['deut'] },
    { number: 6, name: 'Joshua', bnName: 'যিহোশূয়', aliases: ['josh'] },
    { number: 7, name: 'Judges', bnName: 'বিচারকর্তৃগণ', aliases: ['judg'] },
    { number: 8, name: 'Ruth', bnName: 'রূৎ', aliases: [] },
    { number: 9, name: '1 Samuel', bnName: '১ শমূয়েল', aliases: ['1 sam', '1sam', 'i samuel', 'first samuel', 'first sam'] },
    { number: 10, name: '2 Samuel', bnName: '২ শমূয়েল', aliases: ['2 sam', '2sam', 'ii samuel', 'second samuel', 'second sam'] },
    { number: 11, name: '1 Kings', bnName: '১ রাজাবলি', aliases: ['1 kgs', '1kgs', 'i kings', 'first kings', 'first kgs'] },
    { number: 12, name: '2 Kings', bnName: '২ রাজাবলি', aliases: ['2 kgs', '2kgs', 'ii kings', 'second kings', 'second kgs'] },
    { number: 13, name: '1 Chronicles', bnName: '১ বংশাবলি', aliases: ['1 chr', '1chron', 'i chronicles', 'first chronicles', 'first chr'] },
    { number: 14, name: '2 Chronicles', bnName: '২ বংশাবলি', aliases: ['2 chr', '2chron', 'ii chronicles', 'second chronicles', 'second chr'] },
    { number: 15, name: 'Ezra', bnName: 'ইষ্রা', aliases: [] },
    { number: 16, name: 'Nehemiah', bnName: 'নহিমিয়', aliases: ['neh'] },
    { number: 17, name: 'Esther', bnName: 'ইষ্টের', aliases: ['esth'] },
    { number: 18, name: 'Job', bnName: 'ইয়োব', aliases: [] },
    { number: 19, name: 'Psalms', bnName: 'গীতসংহিতা', aliases: ['psalm', 'psalms', 'psa', 'ps'] },
    { number: 20, name: 'Proverbs', bnName: 'হিতোপদেশ', aliases: ['prov', 'pro'] },
    { number: 21, name: 'Ecclesiastes', bnName: 'উপদেশক', aliases: ['eccl', 'ecc'] },
    { number: 22, name: 'Song of Songs', bnName: 'পরমগীত', aliases: ['song of solomon', 'song of sol', 'song', 'songs', 'canticles'] },
    { number: 23, name: 'Isaiah', bnName: 'যিশাইয়', aliases: ['isa'] },
    { number: 24, name: 'Jeremiah', bnName: 'যিরমিয়', aliases: ['jer'] },
    { number: 25, name: 'Lamentations', bnName: 'বিলাপ-গাথা', aliases: ['lam'] },
    { number: 26, name: 'Ezekiel', bnName: 'যিহিষ্কেল', aliases: ['ezek', 'eze'] },
    { number: 27, name: 'Daniel', bnName: 'দানিয়েল', aliases: ['dan'] },
    { number: 28, name: 'Hosea', bnName: 'হোশেয়', aliases: ['hos'] },
    { number: 29, name: 'Joel', bnName: 'যোয়েল', aliases: [] },
    { number: 30, name: 'Amos', bnName: 'আমোষ', aliases: [] },
    { number: 31, name: 'Obadiah', bnName: 'ওবদিয়', aliases: ['obad'] },
    { number: 32, name: 'Jonah', bnName: 'যোনা', aliases: [] },
    { number: 33, name: 'Micah', bnName: 'মীখা', aliases: ['mic'] },
    { number: 34, name: 'Nahum', bnName: 'নাহূম', aliases: ['nah'] },
    { number: 35, name: 'Habakkuk', bnName: 'হবক্কুক', aliases: ['hab'] },
    { number: 36, name: 'Zephaniah', bnName: 'সফনিয়', aliases: ['zeph'] },
    { number: 37, name: 'Haggai', bnName: 'হগয়', aliases: ['hag'] },
    { number: 38, name: 'Zechariah', bnName: 'সখরিয়', aliases: ['zech'] },
    { number: 39, name: 'Malachi', bnName: 'মালাখি', aliases: ['mal'] },
    { number: 40, name: 'Matthew', bnName: 'মথি', aliases: ['matt', 'mt'] },
    { number: 41, name: 'Mark', bnName: 'মার্ক', aliases: ['mrk', 'mk'] },
    { number: 42, name: 'Luke', bnName: 'লূক', aliases: ['luk', 'lk'] },
    { number: 43, name: 'John', bnName: 'যোহন', aliases: ['jhn', 'jn'] },
    { number: 44, name: 'Acts', bnName: 'প্রেরিত', aliases: ['act'] },
    { number: 45, name: 'Romans', bnName: 'রোমীয়', aliases: ['rom'] },
    { number: 46, name: '1 Corinthians', bnName: '১ করিন্থীয়', aliases: ['1 cor', '1cor', 'i corinthians', 'first corinthians', 'first cor'] },
    { number: 47, name: '2 Corinthians', bnName: '২ করিন্থীয়', aliases: ['2 cor', '2cor', 'ii corinthians', 'second corinthians', 'second cor'] },
    { number: 48, name: 'Galatians', bnName: 'গালাতীয়', aliases: ['gal'] },
    { number: 49, name: 'Ephesians', bnName: 'ইফিষীয়', aliases: ['eph'] },
    { number: 50, name: 'Philippians', bnName: 'ফিলিপীয়', aliases: ['phil', 'php'] },
    { number: 51, name: 'Colossians', bnName: 'কলসীয়', aliases: ['col'] },
    { number: 52, name: '1 Thessalonians', bnName: '১ থিষলনীকীয়', aliases: ['1 thess', '1thess', 'i thessalonians', 'first thessalonians', 'first thess'] },
    { number: 53, name: '2 Thessalonians', bnName: '২ থিষলনীকীয়', aliases: ['2 thess', '2thess', 'ii thessalonians', 'second thessalonians', 'second thess'] },
    { number: 54, name: '1 Timothy', bnName: '১ তীমথিয়', aliases: ['1 tim', '1tim', 'i timothy', 'first timothy', 'first tim'] },
    { number: 55, name: '2 Timothy', bnName: '২ তীমথিয়', aliases: ['2 tim', '2tim', 'ii timothy', 'second timothy', 'second tim'] },
    { number: 56, name: 'Titus', bnName: 'তীত', aliases: ['tit'] },
    { number: 57, name: 'Philemon', bnName: 'ফিলীমোন', aliases: ['phlm', 'phm'] },
    { number: 58, name: 'Hebrews', bnName: 'ইব্রীয়', aliases: ['heb'] },
    { number: 59, name: 'James', bnName: 'যাকোব', aliases: ['jas', 'jm'] },
    { number: 60, name: '1 Peter', bnName: '১ পিতর', aliases: ['1 pet', '1pet', 'i peter', 'first peter', 'first pet'] },
    { number: 61, name: '2 Peter', bnName: '২ পিতর', aliases: ['2 pet', '2pet', 'ii peter', 'second peter', 'second pet'] },
    { number: 62, name: '1 John', bnName: '১ যোহন', aliases: ['1 jn', '1jn', 'i john', 'first john', 'first jn'] },
    { number: 63, name: '2 John', bnName: '২ যোহন', aliases: ['2 jn', '2jn', 'ii john', 'second john', 'second jn'] },
    { number: 64, name: '3 John', bnName: '৩ যোহন', aliases: ['3 jn', '3jn', 'iii john', 'third john', 'third jn'] },
    { number: 65, name: 'Jude', bnName: 'যিহূদা', aliases: [] },
    { number: 66, name: 'Revelation', bnName: 'প্রকাশিত বাক্য', aliases: ['rev', 'revelations', 'apocalypse'] }
]);

const BOOK_NUMBER_TO_NAME = Object.freeze(
    BOOKS.reduce((accumulator, book) => {
        accumulator[book.number] = book.name;
        return accumulator;
    }, {})
);

const BOOK_NUMBER_TO_BENGALI_NAME = Object.freeze(
    BOOKS.reduce((accumulator, book) => {
        accumulator[book.number] = book.bnName;
        return accumulator;
    }, {})
);

const BENGALI_DIGITS = Object.freeze({
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9'
});

function normalizeDigits(value) {
    return String(value).replace(/[০-৯]/g, (digit) => BENGALI_DIGITS[digit] || digit);
}

function normalizeBookToken(value) {
    return normalizeDigits(value)
        .toLowerCase()
        .replace(/\./g, '')
        .replace(/\s+/g, ' ')
        .replace(/^([1-3])([a-z])/i, '$1 $2')
        .trim();
}

const BOOK_NAME_TO_NUMBER = Object.freeze(
    BOOKS.reduce((accumulator, book) => {
        accumulator[book.name] = book.number;
        return accumulator;
    }, {})
);

const BOOK_ALIASES = Object.freeze(
    BOOKS.reduce((accumulator, book) => {
        const canonical = book.name;
        const normalizedNames = new Set([
            canonical,
            canonical.replace(/\s+/g, ''),
            book.bnName
        ].map(normalizeBookToken));

        for (const alias of book.aliases) {
            normalizedNames.add(normalizeBookToken(alias));
        }

        for (const alias of normalizedNames) {
            accumulator[alias] = canonical;
        }

        return accumulator;
    }, {})
);

function resolveBookName(input) {
    return BOOK_ALIASES[normalizeBookToken(input)] || null;
}

const exportedBookMap = {
    BOOKS,
    BOOK_ALIASES,
    BOOK_NAME_TO_NUMBER,
    BOOK_NUMBER_TO_BENGALI_NAME,
    BOOK_NUMBER_TO_NAME,
    normalizeBookToken,
    normalizeDigits,
    resolveBookName
};

if (typeof globalThis !== 'undefined') {
    globalThis.GPBCBibleBookMap = exportedBookMap;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportedBookMap;
}
