/**
 * ============================================================================
 * SMART SHARE AI V2 - CAPABILITY DETECTOR
 * ============================================================================
 * Advanced device and environment capability detection
 * ============================================================================
 */

export class CapabilityDetector {
    constructor() {
        this.profile = this.detect();
    }

    detect() {
        const ua = navigator.userAgent || '';
        
        return {
            // Device identification
            deviceType: this.getDeviceType(ua),
            deviceModel: this.getDeviceModel(ua),
            os: this.getOS(ua),
            osVersion: this.getOSVersion(ua),
            browser: this.getBrowser(ua),
            browserVersion: this.getBrowserVersion(ua),
            
            // Share capabilities
            hasWebShare: typeof navigator.share === 'function',
            canShareFiles: this.canShareFiles(),
            canShareText: this.canShareText(),
            canShareUrl: this.canShareUrl(),
            hasClipboard: typeof navigator.clipboard !== 'undefined',
            clipboardSupportsImages: this.clipboardSupportsImages(),
            
            // Network
            networkType: this.getNetworkType(),
            networkSpeed: this.getNetworkSpeed(),
            isOnline: navigator.onLine,
            saveData: this.getSaveDataPreference(),
            
            // Display
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1,
            orientation: this.getOrientation(),
            
            // Theme & appearance
            prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
            prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            currentTheme: this.getCurrentTheme(),
            
            // Performance
            deviceMemory: navigator.deviceMemory || 'unknown',
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            
            // Metadata
            timestamp: Date.now(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    getDeviceType(ua) {
        if (/iPad/i.test(ua)) return 'ipad';
        if (/iPhone/i.test(ua)) return 'iphone';
        if (/Android/i.test(ua) && /Mobile/i.test(ua)) return 'android-phone';
        if (/Android/i.test(ua)) return 'android-tablet';
        if (window.innerWidth < 768) return 'mobile';
        if (window.innerWidth < 1024) return 'tablet';
        return 'desktop';
    }

    getDeviceModel(ua) {
        // iPhone detection
        if (/iPhone/.test(ua)) {
            if (window.screen.height === 844) return 'iPhone 13/14';
            if (window.screen.height === 926) return 'iPhone 14 Pro Max';
            return 'iPhone';
        }
        
        // iPad detection
        if (/iPad/.test(ua)) {
            if (window.screen.width === 1024) return 'iPad Pro 11"';
            if (window.screen.width === 1366) return 'iPad Pro 12.9"';
            return 'iPad';
        }
        
        return 'unknown';
    }

    getOS(ua) {
        if (/Windows/i.test(ua)) return 'windows';
        if (/Mac OS X/i.test(ua)) return 'macos';
        if (/iPhone|iPad/i.test(ua)) return 'ios';
        if (/Android/i.test(ua)) return 'android';
        if (/Linux/i.test(ua)) return 'linux';
        return 'unknown';
    }

    getOSVersion(ua) {
        const match = ua.match(/(?:iPhone OS|Android|Mac OS X|Windows NT) ([\d._]+)/);
        return match ? match[1].replace(/_/g, '.') : 'unknown';
    }

    getBrowser(ua) {
        if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) return 'chrome';
        if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'safari';
        if (/Firefox/i.test(ua)) return 'firefox';
        if (/Edge|Edg/i.test(ua)) return 'edge';
        return 'unknown';
    }

    getBrowserVersion(ua) {
        const match = ua.match(/(?:Chrome|Safari|Firefox|Edge|Edg)\/([\d.]+)/);
        return match ? match[1] : 'unknown';
    }

    canShareFiles() {
        try {
            if (!navigator.canShare) return false;
            
            const testBlob = new Blob(['test'], { type: 'image/png' });
            const testFile = new File([testBlob], 'test.png', { type: 'image/png' });
            
            return navigator.canShare({ files: [testFile] });
        } catch (error) {
            return false;
        }
    }

    canShareText() {
        try {
            if (!navigator.canShare) return !!navigator.share;
            return navigator.canShare({ text: 'test' });
        } catch (error) {
            return !!navigator.share;
        }
    }

    canShareUrl() {
        try {
            if (!navigator.canShare) return !!navigator.share;
            return navigator.canShare({ url: 'https://example.com' });
        } catch (error) {
            return !!navigator.share;
        }
    }

    clipboardSupportsImages() {
        return typeof ClipboardItem !== 'undefined' && 
               typeof navigator.clipboard?.write === 'function';
    }

    getNetworkType() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!connection) return 'unknown';
        
        return connection.effectiveType || connection.type || 'unknown';
    }

    getNetworkSpeed() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!connection) return { level: 'unknown', downlink: null };
        
        const downlink = connection.downlink;
        
        if (!downlink) return { level: 'unknown', downlink: null };
        
        let level;
        if (downlink > 10) level = 'fast';
        else if (downlink > 2) level = 'medium';
        else level = 'slow';
        
        return { level, downlink };
    }

    getSaveDataPreference() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return connection?.saveData || false;
    }

    getOrientation() {
        if (window.innerWidth > window.innerHeight) return 'landscape';
        return 'portrait';
    }

    getCurrentTheme() {
        const html = document.documentElement;
        if (html.classList.contains('dark') || html.getAttribute('data-theme') === 'dark') {
            return 'dark';
        }
        return 'light';
    }

    /**
     * Get capability score (0-100) for sharing
     */
    getCapabilityScore() {
        let score = 0;
        
        // Web Share support (40 points)
        if (this.profile.hasWebShare) score += 20;
        if (this.profile.canShareFiles) score += 20;
        
        // Network (30 points)
        if (this.profile.networkSpeed.level === 'fast') score += 30;
        else if (this.profile.networkSpeed.level === 'medium') score += 20;
        else if (this.profile.networkSpeed.level === 'slow') score += 10;
        
        // Device (20 points)
        if (this.profile.deviceType.includes('phone') || this.profile.deviceType.includes('ipad')) {
            score += 20; // Mobile devices have best share support
        } else if (this.profile.deviceType === 'tablet') {
            score += 15;
        } else {
            score += 10;
        }
        
        // Additional features (10 points)
        if (this.profile.clipboardSupportsImages) score += 5;
        if (this.profile.hasClipboard) score += 5;
        
        return Math.min(100, score);
    }

    /**
     * Refresh capabilities (for dynamic changes)
     */
    refresh() {
        this.profile = this.detect();
        return this.profile;
    }
}
