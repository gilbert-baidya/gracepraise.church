/**
 * ============================================================================
 * GPBC PERSISTENT FLOATING SERMON PLAYER
 * ============================================================================
 * A Spotify-style sticky bottom audio bar with dark glassmorphism.
 *
 * Features:
 *   - Thumbnail, title, speaker/passage metadata
 *   - HTML5 <audio> with seek/progress bar, current + duration time
 *   - Play/Pause, -10s / +30s skip, speed (1x/1.25x/1.5x), volume slider
 *   - Collapse/minimize trigger and close
 *   - localStorage persistence of metadata, position, volume, speed across pages
 *   - Global API: window.playSermon({ title, speaker, audioUrl, coverImg, passage })
 *
 * Any sermon card can call:
 *   window.playSermon({
 *     title: 'The God Who Pursues',
 *     speaker: 'Pastor John',
 *     passage: 'Luke 15:1-7',
 *     audioUrl: '/media/sermons/2026-08-31.mp3',
 *     coverImg: '/images/sermons/pursues.webp'
 *   });
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  const STORAGE_KEY = 'gpbc_sermon_player_state';
  const SPEEDS = [1, 1.25, 1.5];

  const SermonPlayer = {
    audio: null,
    root: null,
    els: {},
    state: {
      title: '',
      speaker: '',
      passage: '',
      audioUrl: '',
      coverImg: '',
      position: 0,
      volume: 1,
      speedIndex: 0,
      collapsed: false,
      playing: false
    },
    _saveTimer: null,

    // ---------------------------------------------------------------------
    // INIT
    // ---------------------------------------------------------------------
    init() {
      if (this.root) return;
      this.injectStyles();
      this.buildDOM();
      this.audio = this.els.audio;
      this.bindEvents();
      this.restore();
    },

    // ---------------------------------------------------------------------
    // STYLES (dark glassmorphism)
    // ---------------------------------------------------------------------
    injectStyles() {
      if (document.getElementById('gpbc-sermon-player-styles')) return;
      const css = `
        #gpbc-sermon-player {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483000;
          display: none; transform: translateY(110%);
          transition: transform .35s cubic-bezier(.4,0,.2,1);
          background: rgba(15, 23, 42, 0.95);
          -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
          border-top: 1px solid #1e293b; color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          box-shadow: 0 -8px 30px rgba(0,0,0,0.45);
        }
        #gpbc-sermon-player.gpbc-visible { display: block; transform: translateY(0); }
        #gpbc-sermon-player.gpbc-collapsed .gpbc-sp-main { display: none; }
        #gpbc-sermon-player.gpbc-collapsed .gpbc-sp-mini { display: flex; }

        .gpbc-sp-progress-wrap { padding: 6px 16px 0; }
        .gpbc-sp-seek {
          -webkit-appearance: none; appearance: none; width: 100%; height: 4px;
          border-radius: 4px; background: #334155; outline: none; cursor: pointer;
        }
        .gpbc-sp-seek::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 14px; height: 14px;
          border-radius: 50%; background: #d4af6a; box-shadow: 0 0 6px rgba(212,175,106,.6);
        }
        .gpbc-sp-seek::-moz-range-thumb {
          width: 14px; height: 14px; border: none; border-radius: 50%; background: #d4af6a;
        }
        .gpbc-sp-times {
          display: flex; justify-content: space-between; font-size: 11px;
          color: #94a3b8; margin-top: 4px; font-variant-numeric: tabular-nums;
        }

        .gpbc-sp-main {
          display: grid;
          grid-template-columns: minmax(0,1fr) auto minmax(0,1fr);
          align-items: center; gap: 12px; padding: 8px 16px 12px;
        }
        .gpbc-sp-meta { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .gpbc-sp-cover {
          width: 48px; height: 48px; border-radius: 8px; object-fit: cover;
          flex-shrink: 0; background: #1e293b; border: 1px solid #334155;
        }
        .gpbc-sp-text { min-width: 0; }
        .gpbc-sp-title {
          font-size: 14px; font-weight: 600; color: #f8fafc; margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .gpbc-sp-sub {
          font-size: 12px; color: #94a3b8; margin: 2px 0 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .gpbc-sp-controls { display: flex; align-items: center; gap: 6px; justify-self: center; }
        .gpbc-sp-btn {
          background: transparent; border: none; color: #e2e8f0; cursor: pointer;
          width: 40px; height: 40px; border-radius: 50%; display: inline-flex;
          align-items: center; justify-content: center; transition: background .2s, transform .1s;
          font-size: 12px; font-weight: 600;
        }
        .gpbc-sp-btn:hover { background: rgba(148,163,184,.15); }
        .gpbc-sp-btn:active { transform: scale(.92); }
        .gpbc-sp-btn:focus-visible { outline: 2px solid #d4af6a; outline-offset: 2px; }
        .gpbc-sp-play {
          width: 48px; height: 48px; background: #d4af6a; color: #0f172a;
        }
        .gpbc-sp-play:hover { background: #e0bd80; }
        .gpbc-sp-skip-label { font-size: 10px; line-height: 1; }

        .gpbc-sp-extra { display: flex; align-items: center; gap: 10px; justify-self: end; }
        .gpbc-sp-speed {
          background: rgba(148,163,184,.12); border: 1px solid #334155; color: #e2e8f0;
          border-radius: 999px; padding: 4px 10px; font-size: 12px; cursor: pointer;
          min-width: 52px; text-align: center;
        }
        .gpbc-sp-speed:hover { background: rgba(148,163,184,.2); }
        .gpbc-sp-vol-wrap { display: flex; align-items: center; gap: 6px; }
        .gpbc-sp-vol {
          -webkit-appearance: none; appearance: none; width: 80px; height: 4px;
          border-radius: 4px; background: #334155; outline: none; cursor: pointer;
        }
        .gpbc-sp-vol::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 12px; height: 12px;
          border-radius: 50%; background: #e2e8f0;
        }
        .gpbc-sp-vol::-moz-range-thumb {
          width: 12px; height: 12px; border: none; border-radius: 50%; background: #e2e8f0;
        }

        .gpbc-sp-mini {
          display: none; align-items: center; justify-content: space-between;
          gap: 12px; padding: 10px 16px;
        }
        .gpbc-sp-mini .gpbc-sp-title { font-size: 13px; }

        @media (max-width: 720px) {
          .gpbc-sp-main { grid-template-columns: 1fr auto; grid-template-areas: 'meta controls'; }
          .gpbc-sp-extra { display: none; }
          .gpbc-sp-cover { width: 42px; height: 42px; }
        }
        @media (prefers-reduced-motion: reduce) {
          #gpbc-sermon-player { transition: none; }
        }
      `;
      const style = document.createElement('style');
      style.id = 'gpbc-sermon-player-styles';
      style.textContent = css;
      document.head.appendChild(style);
    },

    // ---------------------------------------------------------------------
    // DOM
    // ---------------------------------------------------------------------
    buildDOM() {
      const root = document.createElement('div');
      root.id = 'gpbc-sermon-player';
      root.setAttribute('role', 'region');
      root.setAttribute('aria-label', 'Sermon audio player');
      root.innerHTML = `
        <audio class="gpbc-sp-audio" preload="metadata"></audio>

        <div class="gpbc-sp-progress-wrap">
          <input type="range" class="gpbc-sp-seek" min="0" max="100" value="0" step="0.1"
            aria-label="Seek sermon position">
          <div class="gpbc-sp-times">
            <span class="gpbc-sp-current">0:00</span>
            <span class="gpbc-sp-duration">0:00</span>
          </div>
        </div>

        <div class="gpbc-sp-main">
          <div class="gpbc-sp-meta">
            <img class="gpbc-sp-cover" alt="" src="" width="48" height="48">
            <div class="gpbc-sp-text">
              <p class="gpbc-sp-title">No sermon selected</p>
              <p class="gpbc-sp-sub"></p>
            </div>
          </div>

          <div class="gpbc-sp-controls">
            <button type="button" class="gpbc-sp-btn gpbc-sp-back" aria-label="Rewind 10 seconds">
              <span class="gpbc-sp-skip-label">-10s</span>
            </button>
            <button type="button" class="gpbc-sp-btn gpbc-sp-play" aria-label="Play or pause">
              <span class="gpbc-sp-play-icon">&#9654;</span>
            </button>
            <button type="button" class="gpbc-sp-btn gpbc-sp-fwd" aria-label="Forward 30 seconds">
              <span class="gpbc-sp-skip-label">+30s</span>
            </button>
          </div>

          <div class="gpbc-sp-extra">
            <button type="button" class="gpbc-sp-speed" aria-label="Playback speed">1x</button>
            <div class="gpbc-sp-vol-wrap">
              <span aria-hidden="true">&#128266;</span>
              <input type="range" class="gpbc-sp-vol" min="0" max="1" step="0.01" value="1"
                aria-label="Volume">
            </div>
            <button type="button" class="gpbc-sp-btn gpbc-sp-collapse" aria-label="Minimize player">&#8212;</button>
            <button type="button" class="gpbc-sp-btn gpbc-sp-close" aria-label="Close player">&times;</button>
          </div>
        </div>

        <div class="gpbc-sp-mini">
          <div class="gpbc-sp-meta">
            <button type="button" class="gpbc-sp-btn gpbc-sp-play-mini gpbc-sp-play" aria-label="Play or pause">
              <span class="gpbc-sp-play-icon-mini">&#9654;</span>
            </button>
            <div class="gpbc-sp-text">
              <p class="gpbc-sp-title gpbc-sp-title-mini">No sermon selected</p>
            </div>
          </div>
          <button type="button" class="gpbc-sp-btn gpbc-sp-expand" aria-label="Expand player">&#9650;</button>
        </div>
      `;
      document.body.appendChild(root);
      this.root = root;

      const q = (sel) => root.querySelector(sel);
      this.els = {
        audio: q('.gpbc-sp-audio'),
        seek: q('.gpbc-sp-seek'),
        current: q('.gpbc-sp-current'),
        duration: q('.gpbc-sp-duration'),
        cover: q('.gpbc-sp-cover'),
        title: q('.gpbc-sp-title'),
        titleMini: q('.gpbc-sp-title-mini'),
        sub: q('.gpbc-sp-sub'),
        back: q('.gpbc-sp-back'),
        fwd: q('.gpbc-sp-fwd'),
        play: q('.gpbc-sp-play'),
        playIcon: q('.gpbc-sp-play-icon'),
        playMini: q('.gpbc-sp-play-mini'),
        playIconMini: q('.gpbc-sp-play-icon-mini'),
        speed: q('.gpbc-sp-speed'),
        vol: q('.gpbc-sp-vol'),
        collapse: q('.gpbc-sp-collapse'),
        expand: q('.gpbc-sp-expand'),
        close: q('.gpbc-sp-close')
      };
    },

    // ---------------------------------------------------------------------
    // EVENTS
    // ---------------------------------------------------------------------
    bindEvents() {
      const a = this.audio;
      const e = this.els;

      e.play.addEventListener('click', () => this.toggle());
      e.playMini.addEventListener('click', () => this.toggle());
      e.back.addEventListener('click', () => this.skip(-10));
      e.fwd.addEventListener('click', () => this.skip(30));
      e.speed.addEventListener('click', () => this.cycleSpeed());
      e.collapse.addEventListener('click', () => this.setCollapsed(true));
      e.expand.addEventListener('click', () => this.setCollapsed(false));
      e.close.addEventListener('click', () => this.close());

      e.vol.addEventListener('input', () => {
        a.volume = parseFloat(e.vol.value);
        this.state.volume = a.volume;
        this.persist();
      });

      e.seek.addEventListener('input', () => {
        if (a.duration && isFinite(a.duration)) {
          a.currentTime = (parseFloat(e.seek.value) / 100) * a.duration;
        }
      });

      a.addEventListener('loadedmetadata', () => {
        e.duration.textContent = this.formatTime(a.duration);
        if (this.state.position > 0 && this.state.position < a.duration) {
          a.currentTime = this.state.position;
        }
      });
      a.addEventListener('timeupdate', () => this.onTimeUpdate());
      a.addEventListener('play', () => this.reflectPlaying(true));
      a.addEventListener('pause', () => this.reflectPlaying(false));
      a.addEventListener('ended', () => this.reflectPlaying(false));

      // Persist on navigation away
      window.addEventListener('beforeunload', () => this.persist(true));

      // Media Session (lock-screen / hardware controls)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('seekbackward', () => this.skip(-10));
        navigator.mediaSession.setActionHandler('seekforward', () => this.skip(30));
      }
    },

    // ---------------------------------------------------------------------
    // PUBLIC PLAYBACK API
    // ---------------------------------------------------------------------
    load(meta, autoplay) {
      const s = this.state;
      s.title = meta.title || 'Untitled Sermon';
      s.speaker = meta.speaker || '';
      s.passage = meta.passage || '';
      s.audioUrl = meta.audioUrl || '';
      s.coverImg = meta.coverImg || '';
      // New sermon starts from beginning unless explicitly resuming same url
      s.position = (meta.audioUrl === this.audio.getAttribute('src')) ? s.position : 0;

      this.renderMeta();
      this.audio.src = s.audioUrl;
      this.audio.load();
      this.show();
      this.applyStoredAudioSettings();

      if (autoplay !== false) {
        this.play();
      }
      this.updateMediaSession();
      this.persist();
    },

    play() {
      if (!this.audio.src) return;
      const p = this.audio.play();
      if (p && p.catch) p.catch(() => {/* autoplay blocked; user can tap play */});
    },

    pause() { this.audio.pause(); },

    toggle() {
      if (this.audio.paused) this.play();
      else this.pause();
    },

    skip(seconds) {
      if (!isFinite(this.audio.duration)) return;
      this.audio.currentTime = Math.min(
        Math.max(0, this.audio.currentTime + seconds),
        this.audio.duration
      );
    },

    cycleSpeed() {
      this.state.speedIndex = (this.state.speedIndex + 1) % SPEEDS.length;
      const rate = SPEEDS[this.state.speedIndex];
      this.audio.playbackRate = rate;
      this.els.speed.textContent = rate + 'x';
      this.persist();
    },

    setCollapsed(collapsed) {
      this.state.collapsed = collapsed;
      this.root.classList.toggle('gpbc-collapsed', collapsed);
      this.persist();
    },

    close() {
      this.pause();
      this.root.classList.remove('gpbc-visible');
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    },

    show() {
      this.root.classList.add('gpbc-visible');
    },

    // ---------------------------------------------------------------------
    // RENDER / SYNC
    // ---------------------------------------------------------------------
    renderMeta() {
      const s = this.state;
      this.els.title.textContent = s.title;
      this.els.titleMini.textContent = s.title;
      const subParts = [s.speaker, s.passage].filter(Boolean);
      this.els.sub.textContent = subParts.join('  •  ');
      if (s.coverImg) {
        this.els.cover.src = s.coverImg;
        this.els.cover.alt = s.title + ' cover art';
      } else {
        this.els.cover.removeAttribute('src');
        this.els.cover.alt = '';
      }
    },

    applyStoredAudioSettings() {
      this.audio.volume = this.state.volume;
      this.els.vol.value = this.state.volume;
      const rate = SPEEDS[this.state.speedIndex] || 1;
      this.audio.playbackRate = rate;
      this.els.speed.textContent = rate + 'x';
      this.root.classList.toggle('gpbc-collapsed', !!this.state.collapsed);
    },

    onTimeUpdate() {
      const a = this.audio;
      if (a.duration && isFinite(a.duration)) {
        this.els.seek.value = (a.currentTime / a.duration) * 100;
        this.els.current.textContent = this.formatTime(a.currentTime);
      }
      this.state.position = a.currentTime;
      this.debouncedPersist();
    },

    reflectPlaying(playing) {
      this.state.playing = playing;
      const glyph = playing ? '\u23F8' : '\u25B6'; // pause : play
      this.els.playIcon.textContent = glyph;
      this.els.playIconMini.textContent = glyph;
      this.els.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      }
      this.persist();
    },

    updateMediaSession() {
      if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
      const s = this.state;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: s.title,
        artist: s.speaker || 'Grace & Praise Bangladeshi Church',
        album: s.passage || 'Sermons',
        artwork: s.coverImg ? [{ src: s.coverImg, sizes: '512x512', type: 'image/webp' }] : []
      });
    },

    // ---------------------------------------------------------------------
    // PERSISTENCE
    // ---------------------------------------------------------------------
    persist(immediate) {
      const write = () => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch (_) {}
      };
      if (immediate) return write();
      write();
    },

    debouncedPersist() {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => this.persist(), 1000);
    },

    restore() {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (_) {}
      if (!saved || !saved.audioUrl) return;

      Object.assign(this.state, saved);
      this.renderMeta();
      this.applyStoredAudioSettings();
      this.audio.src = this.state.audioUrl;
      this.audio.load();
      this.els.duration.textContent = '0:00';
      this.show();
      // Resume paused at last position (do not autoplay across navigation)
      this.reflectPlaying(false);
    },

    // ---------------------------------------------------------------------
    // UTIL
    // ---------------------------------------------------------------------
    formatTime(seconds) {
      if (!isFinite(seconds) || seconds < 0) return '0:00';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
  };

  // -------------------------------------------------------------------------
  // GLOBAL API
  // -------------------------------------------------------------------------
  function ensureInit() {
    if (!SermonPlayer.root) SermonPlayer.init();
  }

  window.playSermon = function (meta) {
    ensureInit();
    if (!meta || !meta.audioUrl) {
      console.warn('[SermonPlayer] playSermon requires an audioUrl');
      return;
    }
    SermonPlayer.load(meta, meta.autoplay !== false);
  };

  window.GPBCSermonPlayer = SermonPlayer;

  // Auto-init on DOM ready so a persisted sermon reappears across pages
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureInit);
  } else {
    ensureInit();
  }

})(window, document);
