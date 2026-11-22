(() => {
    'use strict';
    const paypal = 'https://www.paypal.com/ncp/payment/V3AF32ZHJSAME';
    const email = 'mailto:info@gracepraise.church';
    const storageKey = 'gpbc-give-handoff';
    const action = document.getElementById('give-paypal');
    const once = document.getElementById('give-once');
    const status = document.getElementById('give-status');
    const returnLink = document.getElementById('give-return');
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(storageKey)); } catch {}
    const params = new URL(location.href).searchParams;
    let language = 'en';
    let frequency = params.get('frequency') === 'monthly' ? 'monthly' : params.get('frequency') === 'once' ? 'once' : saved?.frequency === 'monthly' ? 'monthly' : 'once';
    let opening = false;
    let timer;
    let notice = history.state?.gpbcGivePending || ['opening', 'unconfirmed'].includes(saved?.status) || ['status', 'payment_status', 'paymentId', 'PayerID', 'token', 'cancel', 'canceled', 'cancelled', 'return', 'success', 'pending'].some(key => params.has(key)) ? 'unconfirmed' : '';
    const messages = {
        unconfirmed: ['Your payment could not be confirmed. Check PayPal before retrying, or contact the church for help.', 'আপনার অর্থপ্রদান নিশ্চিত করা যায়নি। আবার চেষ্টা করার আগে পেপ্যালে যাচাই করুন অথবা মণ্ডলীর সাহায্য নিন।'],
        opening: ['Opening PayPal…', 'পেপ্যাল খোলা হচ্ছে…'],
        monthlyTitle: ['Monthly giving is being set up', 'মাসিক দানের ব্যবস্থা করা হচ্ছে'],
        monthlyCopy: ['Contact the church to arrange a recurring gift.', 'নিয়মিত দানের ব্যবস্থা করতে মণ্ডলীর সঙ্গে যোগাযোগ করুন।'],
        monthlyHelp: ['No recurring gift is created here. Choose One time to make a one-time gift.', 'এখানে নিয়মিত দান চালু হয় না। একবার দান করতে এককালীন বেছে নিন।'],
        monthlyAction: ['Ask about monthly giving', 'মাসিক দান সম্পর্কে জিজ্ঞেস করুন']
    };
    function text(key) { return messages[key][language === 'bn' ? 1 : 0]; }
    function store() {
        try { sessionStorage.setItem(storageKey, JSON.stringify({ frequency, status: opening ? 'opening' : notice })); } catch {}
        try { history.replaceState({ ...history.state, gpbcGivePending: opening || notice === 'unconfirmed' }, '', location.href); } catch {}
    }
    function render() {
        language = window.GPBCLanguage?.language || 'en';
        document.querySelectorAll('[data-give-en]').forEach(element => {
            element.textContent = element.dataset[language === 'bn' ? 'giveBn' : 'giveEn'];
            element.lang = language;
        });
        once.checked = frequency === 'once';
        action.href = frequency === 'monthly' ? email : paypal;
        if (frequency === 'monthly') {
            for (const [id, key] of [['give-cadence-title', 'monthlyTitle'], ['give-cadence-copy', 'monthlyCopy'], ['give-cadence-help', 'monthlyHelp'], ['give-action-label', 'monthlyAction']]) document.getElementById(id).textContent = text(key);
        }
        if (opening) document.getElementById('give-action-label').textContent = text('opening');
        action.setAttribute('aria-disabled', String(opening));
        document.getElementById('give-confirmation').hidden = frequency === 'monthly';
        status.hidden = !notice;
        status.lang = language;
        status.textContent = notice ? text(notice) : '';
        const back = new URL('give.html', location.href);
        back.searchParams.set('frequency', frequency);
        back.searchParams.set('lang', language);
        back.hash = 'giving-card';
        returnLink.href = back.pathname + back.search + back.hash;
        returnLink.hidden = notice !== 'unconfirmed';
    }
    function restore() {
        clearTimeout(timer);
        opening = false;
        notice = 'unconfirmed';
        store();
        render();
    }
    window.addEventListener('gpbc:languagechange', () => { store(); render(); });
    once.addEventListener('change', () => {
        if (!once.checked || opening) return;
        frequency = 'once';
        const url = new URL(location.href);
        url.searchParams.set('frequency', 'once');
        history.replaceState(history.state, '', url);
        store();
        render();
    });
    action.addEventListener('click', event => {
        if (opening) { event.preventDefault(); return; }
        if (frequency !== 'once' || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        opening = true;
        notice = 'opening';
        store();
        render();
        timer = setTimeout(restore, 8000);
        try { location.assign(paypal); } catch { restore(); }
    });
    window.addEventListener('pageshow', event => {
        if (event.persisted && opening) restore();
    });
    store();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true });
    else render();
})();
