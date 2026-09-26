/*
 * Static musical alignment overrides.
 *
 * The Song Reader consumes this table through the shared renderer.  Keep
 * overrides keyed by song id and lyric line id; never encode musical
 * placement as CSS selectors.  Automatic source-spacing/PDF alignment is
 * used first, and this table is reserved for lines that need human review.
 *
 * Example:
 * {
 *   1407: {
 *     0: [{ chord: 'C', wordIndex: 0 }, { chord: 'F', wordIndex: 3 }]
 *   }
 * }
 */
const songChordAlignmentOverrides = Object.freeze({});
