class ActivityCarousel {
    constructor(configs, createFlyer, previousSlug, userPaused = false, existingRoot = null, createTools = () => null) {
        this.configs = configs;
        this.userPaused = userPaused;
        this.motion = matchMedia('(prefers-reduced-motion: reduce)');
        this.onMotion = () => this.updatePlayback();
        this.motion.addEventListener('change', this.onMotion);
        this.onVisibility = () => this.updatePlayback();
        document.addEventListener('visibilitychange', this.onVisibility);
        const root = this.root = existingRoot || document.createElement('div');
        root.className = 'activity-carousel';
        root.dataset.enhanced = 'true';
        root.dataset.activityFocus = 'carousel';
        root.setAttribute('role', 'region');
        root.setAttribute('aria-roledescription', 'carousel');
        root.setAttribute('aria-label', 'Church life and upcoming gatherings');
        root.tabIndex = 0;
        const header = root.querySelector('.activity-heading') || document.createElement('div');
        header.className = 'activity-heading';
        const heading = document.createElement('h2');
        this.bilingual(heading, { en: 'Life at GPBC', bn: 'আমাদের মণ্ডলীর জীবন' });
        this.counter = document.createElement('span');
        this.counter.className = 'activity-counter';
        this.counter.setAttribute('aria-hidden', 'true');
        header.replaceChildren(heading, this.counter);
        const stage = this.stage = root.querySelector('.activity-stage') || document.createElement('div');
        stage.className = 'activity-stage';
        stage.setAttribute('aria-atomic', 'false');
        const existingTheme = stage.querySelector('.activity-theme');
        stage.replaceChildren();
        this.slides = configs.map((config, index) => {
            const slide = config.type === 'theme'
                ? existingTheme?.dataset.themeConfig === JSON.stringify(config) ? existingTheme : this.createTheme(config)
                : createFlyer(config);
            slide.classList.add('activity-slide');
            slide.dataset.activity = config.slug;
            slide.setAttribute('role', 'group');
            slide.setAttribute('aria-roledescription', 'slide');
            slide.setAttribute('aria-label', `${index + 1} of ${configs.length}: ${config.label || config.title.en}`);
            stage.appendChild(slide);
            return slide;
        });
        const footer = root.querySelector('.activity-footer') || document.createElement('div');
        footer.className = 'activity-footer';
        const controls = document.createElement('div');
        controls.className = 'activity-controls';
        this.dots = [];
        if (configs.length > 1) {
            const dots = document.createElement('div');
            dots.className = 'activity-dots activity-rail';
            dots.setAttribute('role', 'group');
            dots.setAttribute('aria-label', 'Activity date timeline');
            this.rail = dots;
            this.dots = configs.map((config, index) => {
                const label = config.label || config.title.en;
                const dot = this.button('activity-dot', `Slide ${index + 1} of ${configs.length}: ${label}`, '', () => this.show(index));
                dot.dataset.activityFocus = 'dot:' + config.slug;
                dot.classList.add('activity-rail-item');
                const text = document.createElement('span');
                this.bilingual(text, config.date ? {
                    en: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' }).format(new Date(config.date + 'T12:00:00Z')),
                    bn: new Intl.DateTimeFormat('bn-BD', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' }).format(new Date(config.date + 'T12:00:00Z'))
                } : { en: 'Theme', bn: 'থিম' });
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
            controls.append(dots, this.pauseButton);
        }
        const cta = footer.querySelector('.activity-cta') || document.createElement('a');
        cta.className = 'btn btn-primary activity-cta';
        cta.dataset.gpbcFeatureLink = 'pages.planVisit';
        cta.dataset.gpbcSurface = 'homepage-cta';
        cta.dataset.activityFocus = 'cta';
        cta.replaceChildren();
        this.bilingual(cta, { en: 'Join us with your family', bn: 'সপরিবারে যোগ দিন' });
        const slot = document.createElement('div');
        slot.className = 'activity-tool-slot';
        slot.setAttribute('aria-live', 'off');
        this.tools = configs.map(config => {
            const tools = config.type === 'flyer' ? createTools(config) : document.createElement('div');
            if (!tools) return null;
            if (config.type === 'theme') {
                tools.className = 'activity-theme-caption';
                this.bilingual(tools, { en: config.year + ' ' + config.text.en,
                    bn: new Intl.NumberFormat('bn', { useGrouping: false }).format(config.year) + ' ' + config.text.bn });
            }
            slot.appendChild(tools);
            return tools;
        });
        footer.replaceChildren(controls, slot, cta);
        root.replaceChildren(header, stage, footer);
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
            if (event.target.closest('.activity-rail')) this.dots[this.activeIndex].focus({ preventScroll: true });
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
        this.hovered = root.matches(':hover');
        this.focused = root.contains(document.activeElement);
        this.show(index < 0 ? 0 : index);
    }

    button(className, label, text, handler) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.dataset.activityFocus = className;
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
        const template = document.createElement('template');
        template.innerHTML = renderHomeTheme(config);
        return template.content.firstElementChild;
    }

    show(index) {
        if (this.stage.contains(document.activeElement) || this.tools.some(tools => tools?.contains(document.activeElement))) this.root.focus({ preventScroll: true });
        this.activeIndex = (index + this.slides.length) % this.slides.length;
        this.activeSlug = this.configs[this.activeIndex].slug;
        this.slides.forEach((slide, position) => {
            const active = position === this.activeIndex;
            slide.classList.toggle('is-active', active);
            slide.inert = !active;
            slide.setAttribute('aria-hidden', String(!active));
        });
        this.dots.forEach((dot, position) => dot.setAttribute('aria-current', String(position === this.activeIndex)));
        this.tools.forEach((tools, position) => {
            if (tools) {
                tools.hidden = position !== this.activeIndex;
                tools.inert = position !== this.activeIndex;
            }
        });
        this.scrollActiveItem();
        this.counter.textContent = `${String(this.activeIndex + 1).padStart(2, '0')} / ${String(this.slides.length).padStart(2, '0')}`;
        this.updatePlayback();
    }

    scrollActiveItem() {
        const item = this.dots[this.activeIndex];
        if (!this.rail || !item) return;
        this.rail.scrollLeft = item.offsetLeft - (this.rail.clientWidth - item.offsetWidth) / 2;
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
