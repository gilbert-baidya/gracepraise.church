# Authoritative Bible XML audit

Audit date: 2026-10-09. The audit parses the checked-in bytes without rewriting either XML file.

| Check | Bangla | English |
| --- | ---: | ---: |
| Filename | `bn-bsi-2016-ov.xml` | `en-niv-1984.xml` |
| SHA-256 | `223ef4d4db4d989592dfd84b7f2095e017694bfd76dbe12c9612f906dd27b6b8` | `5fbe1d7bc934f0e118f53ed111fae334b3c1d78219e32ce6007e41401d39951c` |
| Detected encoding | XML declaration UTF-8; UTF-8 bytes; CRLF | XML declaration UTF-8; UTF-8 bytes with BOM |
| Translation metadata | `Bengali (BSI) 2016 O.V. Bible, পবিএ বাইবেল O.V` | `biblename="ENGLISHNIV"` (repository license metadata identifies NIV 1984) |
| Books | 66 | 66 |
| Chapters | 1,189 | 1,189 |
| Raw verse elements | 31,083 | 31,102 |
| Non-empty canonical verse assignments | 31,097 | 31,086 |
| Empty verse elements | 17 | 16 |
| Structural merged-verse elements | 16 | 0 |
| Duplicate canonical verse IDs | 0 | 0 |
| Unexpected verse child markup | 0 | 0 |
| Malformed XML | No | No |

The raw-element and canonical-assignment totals differ because the Bangla XML contains 16 explicit structural markers such as `[6-7]`, while both translations contain some intentionally empty verse nodes. The adapter retains `sourceText`, records the marker, and exposes the Scripture text without that structural marker. Bilingual generation refuses a merged assignment until a human-approved alignment rule exists.

There are no missing books and no chapter-count mismatches. The English XML book labels `Psalm` and `Song of Solomon` differ from the repository canonical names `Psalms` and `Song of Songs`; book number remains the verified join key.

## Verse-number mismatch audit

Twenty-four chapters contain a non-empty canonical verse-number difference. These are reported, not modified or hidden:

| Chapter | Bangla only | English only |
| --- | --- | --- |
| Exodus 7 | — | 25 |
| Numbers 22 | — | 41 |
| 1 Chronicles 21 | 31 | — |
| Song of Songs 4 | 17 | — |
| Jeremiah 6 | — | 30 |
| Hosea 11 | — | 12 |
| Matthew 23 | 14 | — |
| Mark 7 | 16 | — |
| Mark 9 | 44, 46 | — |
| Mark 11 | 26 | — |
| Mark 15 | 28 | — |
| Luke 17 | 36 | — |
| Luke 23 | 17 | — |
| John 5 | 4 | — |
| John 7 | — | 53 |
| Acts 8 | 37 | 40 |
| Acts 15 | 34 | — |
| Acts 23 | — | 35 |
| Acts 24 | 7 | — |
| Acts 28 | 29 | 31 |
| Romans 16 | 24 | — |
| 1 Corinthians 10 | 34 | — |
| 3 John 1 | 15 | — |
| Revelation 12 | 18 | — |

## Locked passage regression set

The integrity suite reads both XML files and verifies exact book, chapter, verse number, Bangla text, English text, punctuation, pairing, pagination reconstruction, and export metadata for:

- Psalm 23:1–4
- John 3:16–18
- John 14:1–6
- Romans 8:31–34

The test hashes both source files before parsing and again after final slide generation. A changed byte, missing punctuation mark, duplicate verse, omitted verse, wrong pairing, or export-metadata difference fails the suite.
