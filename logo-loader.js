// Load church logo and branding
// Default settings in case JSON doesn't load
let logoSettings = {
    "logo": "images/new-gpbc-logo-final.svg",
    "logoDark": "images/new-gpbc-logo-final.svg",
    "logoFallback": "images/logo/gpbc_Logo_Transparent.svg",
    "logoDarkFallback": "images/logo/gpbc_Logo_Transparent.svg",
    "churchName": "Grace and Praise Bangladeshi Church",
    "abbreviation": "GPBC"
};

// Notify navigation.js that header padding needs recalculation when logo dimensions change
function notifyHeaderPaddingUpdate() {
    if (typeof window !== 'undefined' && window.GPBC_updateHeaderPadding) {
        window.GPBC_updateHeaderPadding();
    }
}

function dispatchHeaderHeightChangeEvent() {
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof CustomEvent === 'undefined') {
        return;
    }
    document.dispatchEvent(new CustomEvent('gpbc:headerHeightChanged'));
}

function dispatchLogoLoadedEvent() {
    if (typeof document === 'undefined' || typeof CustomEvent === 'undefined') {
        return;
    }
    document.dispatchEvent(new CustomEvent('gpbc:logoLoaded'));
}

// Detect directory depth to adjust relative paths for images
// Detect directory depth to adjust relative paths for images
function getPathPrefix() {
    // 1. Try to find the script tag that loaded this file
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].getAttribute('src');
        if (src && src.includes('logo-loader.js')) {
            // Remove 'logo-loader.js' from the end to get the prefix
            // e.g. '../logo-loader.js' -> '../'
            // e.g. 'js/logo-loader.js' -> 'js/'
            // e.g. 'logo-loader.js' -> ''
            return src.replace('logo-loader.js', '').split('?')[0];
        }
    }

    // 2. Fallback: URL-based detection (whitelist approach)
    const path = window.location.pathname;
    const subdirs = ['/ministries/', '/admin/', '/youth/', '/kids/', '/docs/'];

    if (subdirs.some(dir => path.includes(dir))) {
        return '../';
    }

    return '';
}

// Get correct path for fetching content (always relative to root)
function getContentPath() {
    const path = window.location.pathname;

    // If we're in a subdirectory, go up one level
    if (path.includes('/ministries/') || path.match(/\/[^\/]+\/[^\/]+\.html$/)) {
        return '../content/settings/logo.json';
    }
    return 'content/settings/logo.json';
}

async function loadChurchLogo() {
    // Check if we're in file:// mode
    const isFileProtocol = window.location.protocol === 'file:';
    const pathPrefix = getPathPrefix();

    // Correctly resolve path for local file system vs server
    const basePath = window.location.protocol === 'file:'
        ? pathPrefix
        : (pathPrefix === '' ? './' : pathPrefix);

    if (!isFileProtocol) {
        try {
            // console.log('Loading logo settings from server...'); // Removed for production
            // Use correct path based on environment
            const logoConfigPath = `${basePath}content/settings/logo.json`;
            const response = await fetch(logoConfigPath);
            if (response.ok) {
                const settings = await response.json();
                // Adjust image paths based on directory depth
                logoSettings = {
                    ...settings,
                    logo: pathPrefix + settings.logo,
                    logoDark: pathPrefix + settings.logoDark,
                    logoFallback: pathPrefix + settings.logoFallback,
                    logoDarkFallback: pathPrefix + settings.logoDarkFallback
                };
                // console.log('Logo settings loaded from JSON:', logoSettings); // Removed for production
            }
        } catch (error) {
            // console.log('Using default logo settings:', error.message); // Removed for production
            // Adjust default paths based on directory depth
            logoSettings = {
                ...logoSettings,
                logo: pathPrefix + logoSettings.logo,
                logoDark: pathPrefix + logoSettings.logoDark,
                logoFallback: pathPrefix + logoSettings.logoFallback,
                logoDarkFallback: pathPrefix + logoSettings.logoDarkFallback
            };
        }
    } else {
        // console.log('File protocol detected - using embedded logo settings'); // Removed for production
        // Apply prefix to all paths
        logoSettings = {
            ...logoSettings,
            logo: pathPrefix + logoSettings.logo,
            logoDark: pathPrefix + logoSettings.logoDark,
            logoFallback: pathPrefix + logoSettings.logoFallback,
            logoDarkFallback: pathPrefix + logoSettings.logoDarkFallback
        };
    }

    // Initial logo update (will use default settings if fetch failed)
    updateLogoDisplay();

    // Update page title if needed
    if (logoSettings.churchName) {
        const titleElement = document.querySelector('title');
        if (titleElement && titleElement.textContent.includes('Grace and Praise Bangladeshi Church')) {
            titleElement.textContent = titleElement.textContent.replace(
                'Grace and Praise Bangladeshi Church',
                logoSettings.churchName
            );
        }
    }

    // Watch for theme changes
    setupThemeObserver();
}

function updateLogoDisplay() {
    if (!logoSettings) return;

    const logoElements = document.querySelectorAll('.logo');
    const isDarkMode = document.body.classList.contains('dark') ||
        document.body.getAttribute('data-theme') === 'dark';

    // Choose appropriate logo based on theme
    let logoSrc = logoSettings.logo;
    let fallbackSrc = logoSettings.logoFallback;
    if (isDarkMode && logoSettings.logoDark) {
        logoSrc = logoSettings.logoDark;
        fallbackSrc = logoSettings.logoDarkFallback || logoSettings.logoFallback;
    }

    logoElements.forEach(logo => {
        // Ensure the logo is a link to home
        if (!logo.hasAttribute('href')) {
            logo.setAttribute('href', 'index.html');
        }

        if (logoSrc && logoSrc.trim() !== '') {
            // Check if there's already an image
            let img = logo.querySelector('img');

            if (!img) {
                img = document.createElement('img');
                img.className = 'logo-image';
                // Add intrinsic placeholders to minimize CLS
                img.style.minWidth = '40px';
                img.style.minHeight = '40px';

                // Append first, then set src to avoid clearing text too early if logo fails
                img.src = logoSrc;
                img.alt = logoSettings.churchName;

                // Only clear text and append image once we are reasonably sure we have a node
                logo.innerHTML = '';
                logo.appendChild(img);
                notifyHeaderPaddingUpdate();
            } else {
                img.src = logoSrc;
                img.alt = logoSettings.churchName;
            }

            // Ask navigation.js to recalc header padding once the new image height settles
            const handleLogoLoaded = () => {
                // Remove temporary placeholder constraints
                img.style.minWidth = '';
                img.style.minHeight = '';
                notifyHeaderPaddingUpdate();
                dispatchHeaderHeightChangeEvent();
                dispatchLogoLoadedEvent();
            };
            img.addEventListener('load', handleLogoLoaded, { once: true });
            if (img.complete) {
                handleLogoLoaded();
            }

            // Add error handler for image loading
            img.dataset.logoFallback = fallbackSrc || '';
            img.dataset.logoFallbackTried = 'false';

            img.onerror = function () {
                const fallback = img.dataset.logoFallback;
                if (fallback && img.dataset.logoFallbackTried !== 'true') {
                    img.dataset.logoFallbackTried = 'true';
                    img.src = fallback;
                    return;
                }
                console.error('Failed to load logo image:', logoSrc);
                logo.textContent = logoSettings.abbreviation || 'GPBC';
            };
        } else {
            // console.log('No logo image, using text:', logoSettings.abbreviation); // Removed for production
            // No logo - use abbreviation text
            logo.textContent = logoSettings.abbreviation || 'GPBC';
        }
    });
}

function setupThemeObserver() {
    // Watch for theme changes on body element
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' &&
                (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
                updateLogoDisplay();
            }
        });
    });

    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
    });
}

if (typeof window !== 'undefined') {
    window.GPBC_loadLogo = loadChurchLogo;
}

// Load logo when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadChurchLogo);
} else {
    loadChurchLogo();
}
