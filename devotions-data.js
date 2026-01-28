/**
 * Devotions Data Loader for Daily Devotion Page
 * 
 * This script fetches the devotions-2026.json file and makes it available
 * to the daily-devotion.html page via the window.DEVOTIONS global variable.
 * 
 * The devotions-2026.json file contains all 365 daily devotions for 2026,
 * each with bilingual content (English and Bengali).
 */

(function() {
    'use strict';

    const scriptBase = (function() {
        try {
            if (document.currentScript && document.currentScript.src) {
                return new URL('.', document.currentScript.src).toString();
            }
        } catch (err) {}
        return new URL('.', window.location.href).toString();
    })();

    // Fetch helper
    async function fetchJson(url) {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${url}`);
        }
        return response.json();
    }

    async function fetchFromCandidates(candidates) {
        let lastError = null;
        for (const url of candidates) {
            try {
                return await fetchJson(url);
            } catch (err) {
                lastError = err;
            }
        }
        if (lastError) throw lastError;
        throw new Error('No fetch candidates provided');
    }

    // Attempt to load the consolidated file first; if it fails, fall back to month files.
    async function loadDevotions() {
        let devotions = [];
        let source = 'devotions-2026.json';

        try {
            const primaryCandidates = [
                new URL('devotions-2026.json', scriptBase).toString(),
                new URL('./devotions-2026.json', window.location.href).toString(),
                '/devotions-2026.json'
            ];
            devotions = await fetchFromCandidates(primaryCandidates);
        } catch (primaryError) {
            console.warn('Primary devotion fetch failed, trying monthly files:', primaryError);
            window.dispatchEvent(new CustomEvent('devotionsLoadError', { 
                detail: { error: primaryError.message, stage: 'primary' } 
            }));

            try {
                const months = [
                    '01-january','02-february','03-march','04-april','05-may','06-june',
                    '07-july','08-august','09-september','10-october','11-november','12-december'
                ];
                const monthCandidates = months.map(name => ([
                    new URL(`devotions-data/${name}.json`, scriptBase).toString(),
                    new URL(`./devotions-data/${name}.json`, window.location.href).toString(),
                    `/devotions-data/${name}.json`
                ]));

                const results = await Promise.allSettled(
                    monthCandidates.map(candidates => fetchFromCandidates(candidates))
                );
                const monthData = results
                    .filter(result => result.status === 'fulfilled')
                    .map(result => result.value);

                devotions = monthData.flat();
                source = 'devotions-data/*.json (partial ok)';
            } catch (fallbackError) {
                console.error('Monthly devotions fetch failed:', fallbackError);
                window.dispatchEvent(new CustomEvent('devotionsLoadError', { 
                    detail: { error: fallbackError.message, stage: 'fallback' } 
                }));
            }
        }

        if (!Array.isArray(devotions)) {
            devotions = [];
        }

        // Minimal inline fallback to keep the page functional if all fetches fail
        if (devotions.length === 0) {
            const todayKey = new Date().toISOString().slice(0,10);
            devotions = [
                {
                    date: todayKey,
                    title: 'God So Loved',
                    titleBn: 'ঈশ্বর এত ভালোবাসলেন',
                    verse: 'John 3:16',
                    verseText: '“For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.”',
                    verseTextBn: '“কারণ ঈশ্বর পৃথিবীকে এত ভালোবাসলেন যে তিনি তাঁর একমাত্র পুত্র দিলেন, যেন যে কেউ তাঁর প্রতি বিশ্বাস করে সে বিনাশ না হয় বরং অনন্ত জীবন পায়।”',
                    reflection: 'Today we rest in the simple, life-changing truth that God loves you personally. His love is proven in Jesus, given so you can live. Whatever else is uncertain, His love is not. Receive it, trust it, and let it shape your steps today.',
                    reflectionBn: 'আজ আমরা সহজ কিন্তু জীবন-বদলানো সত্যে বিশ্রাম নিই: ঈশ্বর তোমাকে ব্যক্তিগতভাবে ভালোবাসেন। তাঁর ভালোবাসার প্রমাণ যিশু, তোমার জীবনের জন্য দেওয়া। অন্য সব কিছু অনিশ্চিত হলেও তাঁর ভালোবাসা নয়। এটি গ্রহণ করো, বিশ্বাস করো এবং আজ তোমার পদক্ষেপ গড়তে দাও।',
                    prayer: 'Father, thank You for loving me in Jesus. Help me live from Your love and share it freely today.',
                    prayerBn: 'পিতা, যিশুতে আমাকে ভালোবাসার জন্য ধন্যবাদ। আপনার ভালোবাসা থেকে বাঁচতে এবং আজ তা উদারভাবে ভাগ করতে আমাকে সাহায্য করুন।'
                }
            ];
            source = 'inline-fallback';
        }

        window.DEVOTIONS = devotions;

        console.log(`✓ Loaded ${devotions.length} devotions (${source})`);

        window.dispatchEvent(new CustomEvent('devotionsLoaded', { 
            detail: { count: devotions.length, source } 
        }));
    }

    loadDevotions();
})();
