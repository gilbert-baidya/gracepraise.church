(() => {
    const emojiPattern = /\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu;
    const paths = {
        book: 'M3 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H3V4Zm18 0h-6a3 3 0 0 0-3 3v14a4 4 0 0 1 4-3h5V4Z',
        calendar: 'M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM7 2v5m10-5v5M3 10h18m-14 4h3m4 0h3m-10 3h3',
        sun: 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
        moon: 'M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z',
        cross: 'M10 3h4v6h6v4h-6v8h-4v-8H4V9h6V3Z',
        print: 'M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6v-7Z',
        camera: 'M3 6h5l2-3h4l2 3h5v15H3V6Zm13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
        share: 'M12 16V3m-5 5 5-5 5 5M5 13v8h14v-8',
        bell: 'M5 17h14l-2-4V9a5 5 0 0 0-10 0v4l-2 4Zm5 3h4',
        trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
        church: 'M4 21V10l8-6 8 6v11H4ZM12 1v6M9 3h6M10 21v-6h4v6'
    };
    const kinds = { '🖨': 'print', '📸': 'camera', '📤': 'share', '🔔': 'bell', '🗑': 'trash', '⛪': 'church', '☀': 'sun', '🌙': 'moon', '✝': 'cross' };
    const iconSurfaces = '.book-icon, .sun-icon, .moon-icon, .calendar-page main, .calendar-page #countdownBanner, .calendar-page .modal :is(button, h2, h3, strong, label, legend)';

    function replaceIcons(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        if (root.nodeType === Node.TEXT_NODE) nodes.push(root);
        for (const node of nodes) {
            if (!node.parentElement?.closest(iconSurfaces) ||
                node.parentElement.closest('svg, script, style, textarea, input, select, [contenteditable], #eventDescription')) continue;
            const matches = [...node.textContent.matchAll(emojiPattern)]
                .filter(match => /[\p{Emoji_Presentation}\uFE0F]/u.test(match[0]));
            if (!matches.length) continue;
            const fragment = document.createDocumentFragment();
            let offset = 0;
            for (const match of matches) {
                fragment.append(document.createTextNode(node.textContent.slice(offset, match.index)));
                if (match[0] === '🆕') {
                    fragment.append(document.createTextNode('New'));
                    offset = match.index + match[0].length;
                    continue;
                }
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                const path = document.createElementNS(svg.namespaceURI, 'path');
                const kind = node.parentElement.closest('.book-icon') ? 'book' :
                    kinds[match[0].replace(/\uFE0F/g, '')] || 'calendar';
                path.setAttribute('d', paths[kind]);
                svg.setAttribute('viewBox', '0 0 24 24');
                svg.setAttribute('width', '1em');
                svg.setAttribute('height', '1em');
                svg.setAttribute('fill', 'none');
                svg.setAttribute('stroke', 'currentColor');
                svg.setAttribute('stroke-width', '1.7');
                svg.setAttribute('aria-hidden', 'true');
                svg.setAttribute('focusable', 'false');
                svg.setAttribute('data-decorative-icon', kind);
                svg.style.verticalAlign = '-0.15em';
                svg.append(path);
                fragment.append(svg);
                offset = match.index + match[0].length;
            }
            fragment.append(document.createTextNode(node.textContent.slice(offset)));
            node.replaceWith(fragment);
        }
    }

    replaceIcons(document.body);
    new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'characterData') replaceIcons(record.target);
            else for (const node of record.addedNodes) replaceIcons(node);
        }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
