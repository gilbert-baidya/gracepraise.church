/*
 * GPBC V16 Devotion Foundation — Daily reference behavior
 *
 * This layer reorganizes existing Daily Devotion nodes after the legacy
 * runtime has bound its handlers. It does not replace data loading, date
 * behavior, sharing engines, or the existing devotional content.
 */
(function () {
    'use strict';

    function setDocumentLanguage(language) {
        document.documentElement.setAttribute('lang', language === 'bn' ? 'bn' : 'en');
    }

    function moveShareAfterPrayer(content) {
        const shareSection = document.getElementById('shareSection');
        const prayerSection = document.getElementById('prayerSection');
        if (!shareSection || !prayerSection || shareSection.dataset.v16Moved === 'true') return;

        prayerSection.after(shareSection);
        shareSection.dataset.v16Moved = 'true';

        const title = shareSection.querySelector('#sharePanelTitle');
        if (title) title.textContent = 'Share This Devotion';

        const oldPrimary = shareSection.querySelector('.share-today-wrapper');
        const primary = document.createElement('div');
        primary.className = 'devotion-v16-share-primary';

        const shareToday = document.getElementById('shareTodayBtn');
        const shareCard = document.getElementById('shareCardTrigger');

        if (shareToday) {
            shareToday.querySelector('span:last-child')?.replaceChildren(document.createTextNode('Share This Devotion'));
            shareToday.setAttribute('aria-label', 'Share this devotion');
            primary.appendChild(shareToday);
        }

        if (shareCard) {
            shareCard.querySelector('span:last-child')?.replaceChildren(document.createTextNode('Create Share Image'));
            shareCard.setAttribute('aria-label', 'Create a share image');
            primary.appendChild(shareCard);
        }

        if (oldPrimary) oldPrimary.remove();
        if (primary.children.length) shareSection.appendChild(primary);

        const secondaryGrid = shareSection.querySelector('.share-actions-grid');
        if (secondaryGrid && !secondaryGrid.closest('.devotion-v16-share-details')) {
            const details = document.createElement('details');
            details.className = 'devotion-v16-share-details';

            const summary = document.createElement('summary');
            summary.textContent = 'More ways to share';
            details.appendChild(summary);

            secondaryGrid.parentElement?.appendChild(details);
            details.appendChild(secondaryGrid);
        }

        if (content && shareSection.parentElement !== content) {
            content.appendChild(shareSection);
        }
    }

    function makeInviteSecondary() {
        const invite = document.getElementById('inviteSection');
        if (!invite || invite.dataset.v16Structured === 'true') return;

        const heading = invite.querySelector('.funnel-heading');
        const subtitle = invite.querySelector('.funnel-subtitle');
        const grid = invite.querySelector('.funnel-grid');
        if (!heading || !grid) return;

        const details = document.createElement('details');
        details.className = 'devotion-v16-invite-details';

        const summary = document.createElement('summary');
        summary.textContent = 'Invite someone today';
        details.appendChild(summary);
        details.appendChild(heading);
        if (subtitle) details.appendChild(subtitle);
        details.appendChild(grid);

        invite.replaceChildren(details);
        invite.dataset.v16Structured = 'true';
    }

    function enhanceShareModal() {
        const overlay = document.getElementById('shareCardOverlay');
        const modal = document.getElementById('shareCardModal');
        const title = modal?.querySelector('.share-card-title');
        if (!overlay || !modal || overlay.dataset.v16A11y === 'true') return;

        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        if (title && !title.id) title.id = 'shareCardTitle';
        if (title) overlay.setAttribute('aria-labelledby', title.id);
        overlay.dataset.v16A11y = 'true';
    }

    function bindLanguageState() {
        const english = document.getElementById('langEn');
        const bengali = document.getElementById('langBn');
        if (!english || !bengali || english.dataset.v16LanguageBound === 'true') return;

        english.addEventListener('click', () => setDocumentLanguage('en'));
        bengali.addEventListener('click', () => setDocumentLanguage('bn'));
        english.dataset.v16LanguageBound = 'true';
        setDocumentLanguage(bengali.classList.contains('active') ? 'bn' : 'en');
    }

    function enhance() {
        const content = document.getElementById('devotionContent');
        if (!content) return;

        moveShareAfterPrayer(content);
        makeInviteSecondary();
        enhanceShareModal();
        bindLanguageState();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enhance, { once: true });
    } else {
        enhance();
    }

    document.addEventListener('DEVOTION_RENDER_COMPLETE', enhance);
})();
