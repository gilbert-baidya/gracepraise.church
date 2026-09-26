'use strict';

/*
 * Exact, word-boundary-safe phrase/line overrides.
 * These preserve the already-confirmed song-117 correction without adding a
 * broad replacement rule to the V2 converter.
 */
const REVIEWED_PHRASE_OVERRIDES = Object.freeze({
    'আর কোন নাম নাই, যে নামে জীবন পাই,': Object.freeze({
        phonetic: 'Ar kono nam nai, je name jibon pai,',
        source: 'existing song-117 reviewed correction'
    }),
    'আত্মার দানে হয় ভরপুর।': Object.freeze({
        phonetic: 'Atmar dane hoy bhorpur.',
        source: 'existing song-117 reviewed correction'
    })
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = REVIEWED_PHRASE_OVERRIDES;
}

if (typeof globalThis !== 'undefined') {
    globalThis.GPBCReviewedPhoneticPhrases = REVIEWED_PHRASE_OVERRIDES;
}
