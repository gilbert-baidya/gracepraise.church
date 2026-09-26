'use strict';

/*
 * Human-reviewed phonetic vocabulary for the V2 shadow engine.
 *
 * This file intentionally contains only the user-confirmed reference words.
 * Unreviewed corpus vocabulary must remain in the comparison/review queue.
 */
const REVIEWED_WORD_OVERRIDES = Object.freeze({
    'নাম': Object.freeze({ phonetic: 'naam', source: 'user-confirmed' }),
    'সুমধুর': Object.freeze({ phonetic: 'sumodhur', source: 'user-confirmed' }),
    'যীশুর': Object.freeze({ phonetic: 'Jishur', source: 'user-confirmed' }),
    'তার': Object.freeze({ phonetic: 'taar', source: 'user-confirmed' }),
    'পরিধান': Object.freeze({ phonetic: 'poridhan', source: 'user-confirmed' }),
    'সমাধান': Object.freeze({ phonetic: 'somadhan', source: 'user-confirmed' }),
    'অবধান': Object.freeze({ phonetic: 'obodhan', source: 'user-confirmed' }),
    'আর': Object.freeze({ phonetic: 'Ar', source: 'user-confirmed' }),
    'আত্মার': Object.freeze({ phonetic: 'Atmar', source: 'user-confirmed' })
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = REVIEWED_WORD_OVERRIDES;
}

if (typeof globalThis !== 'undefined') {
    globalThis.GPBCReviewedPhoneticWords = REVIEWED_WORD_OVERRIDES;
}
