class ActivityCarousel {
    constructor(configs, createFlyer, previousSlug, userPaused = false) {
        this.configs = configs;
        this.userPaused = userPaused;
        this.motion = matchMedia('(prefers-reduced-motion: reduce)');
        this.onMotion = () => this.updatePlayback();
        this.motion.addEventListener('change', this.onMotion);
        this.onVisibility = () => this.updatePlayback();
        document.addEventListener('visibilitychange', this.onVisibility);
        const root = this.root = document.createElement('div');
        root.className = 'activity-carousel';
        root.setAttribute('role', 'region');
        root.setAttribute('aria-roledescription', 'carousel');
        root.setAttribute('aria-label', 'Church life and upcoming gatherings');
        root.tabIndex = 0;
        const header = document.createElement('div');
        header.className = 'activity-heading';
        const heading = document.createElement('h2');
        this.bilingual(heading, { en: 'Life at GPBC', bn: 'আমাদের মণ্ডলীর জীবন' });
        this.counter = document.createElement('span');
        this.counter.className = 'activity-counter';
        this.counter.setAttribute('aria-hidden', 'true');
        header.append(heading, this.counter);
        const stage = this.stage = document.createElement('div');
        stage.className = 'activity-stage';
        stage.setAttribute('aria-atomic', 'false');
        this.slides = configs.map((config, index) => {
            const slide = config.type === 'theme' ? this.createTheme(config) : createFlyer(config);
            slide.classList.add('activity-slide');
            slide.dataset.activity = config.slug;
            slide.setAttribute('role', 'group');
            slide.setAttribute('aria-roledescription', 'slide');
            slide.setAttribute('aria-label', `${index + 1} of ${configs.length}: ${config.label || config.title.en}`);
            stage.appendChild(slide);
            return slide;
        });
        const footer = document.createElement('div');
        footer.className = 'activity-footer';
        const controls = document.createElement('div');
        controls.className = 'activity-controls';
        this.dots = [];
        if (configs.length > 1) {
            const previous = this.button('activity-arrow activity-prev', 'Previous slide', '←', () => this.show(this.activeIndex - 1));
            const next = this.button('activity-arrow activity-next', 'Next slide', '→', () => this.show(this.activeIndex + 1));
            const dots = document.createElement('div');
            dots.className = 'activity-dots';
            dots.setAttribute('role', 'group');
            dots.setAttribute('aria-label', 'Choose an activity');
            this.dots = configs.map((config, index) => {
                const label = config.label || config.title.en;
                const dot = this.button('activity-dot', `Slide ${index + 1} of ${configs.length}: ${label}`, '', () => this.show(index));
                const text = document.createElement('span');
                text.textContent = config.date ? config.date.slice(5).replace('-', '/') + ' · ' + label : config.year + ' · Church Theme';
                const progress = document.createElement('span');
                progress.className = 'activity-progress';
                progress.setAttribute('aria-hidden', 'true');
                dot.append(text, progress);
                dots.appendChild(dot);
                return dot;
            });
            this.pauseButton = this.button('activity-pause', 'Pause slideshow', 'Ⅱ Pause', () => {
                this.userPaused = !this.userPaused;
                this.updatePlayback();
            });
            controls.append(previous, dots, next, this.pauseButton);
        }
        const cta = document.createElement('a');
        cta.className = 'btn btn-primary activity-cta';
        this.bilingual(cta, { en: 'Join us with your family', bn: 'সপরিবারে যোগ দিন' });
        footer.append(controls, cta);
        root.append(header, stage, footer);
        root.addEventListener('mouseenter', () => { this.hovered = true; this.updatePlayback(); });
        root.addEventListener('mouseleave', () => { this.hovered = false; this.updatePlayback(); });
        root.addEventListener('focusin', () => { this.focused = true; this.updatePlayback(); });
        root.addEventListener('focusout', event => {
            this.focused = root.contains(event.relatedTarget);
            this.updatePlayback();
        });
        root.addEventListener('keydown', event => {
            if (configs.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
            event.preventDefault();
            this.show(this.activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
        });
        let touchStart;
        stage.addEventListener('touchstart', event => {
            touchStart = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
        }, { passive: true });
        stage.addEventListener('touchend', event => {
            if (!touchStart || configs.length < 2) return;
            const dx = event.changedTouches[0].clientX - touchStart.x;
            const dy = event.changedTouches[0].clientY - touchStart.y;
            touchStart = null;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) this.show(this.activeIndex + (dx < 0 ? 1 : -1));
        }, { passive: true });
        const index = configs.findIndex(config => config.slug === previousSlug);
        this.show(index < 0 ? 0 : index);
    }

    button(className, label, text, handler) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.setAttribute('aria-label', label);
        button.textContent = text;
        button.addEventListener('click', handler);
        return button;
    }

    bilingual(parent, values) {
        for (const language of ['en', 'bn']) {
            const text = document.createElement('span');
            text.dataset.lang = language;
            text.lang = values[language] ? language : 'en';
            text.textContent = values[language] || values.en;
            parent.appendChild(text);
        }
    }

    createTheme(config) {
        const slide = document.createElement('div');
        slide.className = 'activity-theme';
        const motif = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        motif.setAttribute('viewBox', '0 0 240 240');
        motif.setAttribute('aria-hidden', 'true');
        motif.setAttribute('focusable', 'false');
        motif.classList.add('activity-root-motif');
        const roots = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        roots.setAttribute('d', 'M120 14V148 M120 48L82 20 M120 70L158 32 M120 92L64 58 M120 112L182 70 M120 148L92 180L72 216 M120 148L148 180L168 216 M120 148V226 M92 180L58 184 M148 180L182 184 M92 180L96 218 M148 180L144 218 M82 20L82 42 M158 32L162 52 M64 58L66 82 M182 70L178 94');
        motif.appendChild(roots);
        slide.appendChild(motif);
        if (config.image) {
            const image = document.createElement('img');
            image.src = config.image;
            image.alt = '';
            image.className = 'activity-theme-image';
            slide.appendChild(image);
        }
        const content = document.createElement('div');
        content.className = 'activity-theme-copy';
        const year = document.createElement('p');
        year.className = 'activity-theme-year';
        year.textContent = config.year;
        const title = document.createElement('h2');
        this.bilingual(title, config.title);
        const text = document.createElement('p');
        text.className = 'activity-theme-subtitle';
        this.bilingual(text, {
            en: config.year + ' ' + config.text.en,
            bn: new Intl.NumberFormat('bn', { useGrouping: false }).format(config.year) + ' ' + config.text.bn
        });
        content.append(year, title, text);
        slide.appendChild(content);
        return slide;
    }

    show(index) {
        if (this.stage.contains(document.activeElement)) this.root.focus({ preventScroll: true });
        this.activeIndex = (index + this.slides.length) % this.slides.length;
        this.activeSlug = this.configs[this.activeIndex].slug;
        this.slides.forEach((slide, position) => {
            const active = position === this.activeIndex;
            slide.classList.toggle('is-active', active);
            slide.inert = !active;
            slide.setAttribute('aria-hidden', String(!active));
        });
        this.dots.forEach((dot, position) => dot.setAttribute('aria-current', String(position === this.activeIndex)));
        this.counter.textContent = `${String(this.activeIndex + 1).padStart(2, '0')} / ${String(this.slides.length).padStart(2, '0')}`;
        this.updatePlayback();
    }

    updatePlayback() {
        clearTimeout(this.timer);
        this.progress?.cancel();
        const playing = this.slides.length > 1 && !this.motion.matches && !this.userPaused &&
            !this.hovered && !this.focused && !document.hidden && this.root.isConnected;
        this.root.dataset.playing = String(playing);
        this.stage.setAttribute('aria-live', playing ? 'off' : 'polite');
        if (this.pauseButton) {
            this.pauseButton.disabled = this.motion.matches;
            const text = this.motion.matches ? 'Motion paused' : this.userPaused ? '▶ Play' : 'Ⅱ Pause';
            if (this.pauseButton.textContent !== text) this.pauseButton.textContent = text;
            this.pauseButton.setAttribute('aria-label', this.motion.matches ? 'Slideshow paused for reduced motion' : this.userPaused ? 'Play slideshow' : 'Pause slideshow');
            this.pauseButton.setAttribute('aria-pressed', String(Boolean(this.userPaused)));
        }
        if (playing) {
            this.progress = this.dots[this.activeIndex].querySelector('.activity-progress')
                .animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 6500, fill: 'forwards' });
            this.timer = setTimeout(() => this.show(this.activeIndex + 1), 6500);
        }
    }

    destroy() {
        clearTimeout(this.timer);
        this.progress?.cancel();
        this.motion.removeEventListener('change', this.onMotion);
        document.removeEventListener('visibilitychange', this.onVisibility);
    }
}
