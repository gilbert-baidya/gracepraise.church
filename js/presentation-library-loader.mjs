export function loadClassicScript(source) {
    return new Promise((resolve, reject) => {
        let existing = [...document.querySelectorAll('script[data-presentation-source]')]
            .find(script => script.dataset.presentationSource === source);
        if (existing?.dataset.failed === 'true') {
            existing.remove();
            existing = null;
        }
        if (existing?.dataset.loaded === 'true') {
            resolve();
            return;
        }
        const script = existing || document.createElement('script');
        script.src = source;
        script.async = true;
        script.dataset.presentationSource = source;
        script.addEventListener('load', () => {
            script.dataset.loaded = 'true';
            resolve();
        }, { once: true });
        script.addEventListener('error', () => {
            script.dataset.failed = 'true';
            reject(new Error(`Could not load ${source}`));
        }, { once: true });
        if (!existing) document.head.appendChild(script);
    });
}
