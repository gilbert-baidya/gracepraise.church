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

// Detect directory depth to adjust relative paths for images
function getPathPrefix() {
    const path = window.location.pathname;
    
    // If we're in a subdirectory (like ministries/), add ../ prefix
    if (path.includes('/ministries/') || path.match(/\/[^\/]+\/[^\/]+\.html$/)) {
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

    if (!isFileProtocol) {
        try {
            console.log('Loading logo settings from server...');
            const response = await fetch(getContentPath());
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
                console.log('Logo settings loaded from JSON:', logoSettings);
            }
        } catch (error) {
            console.log('Using default logo settings:', error.message);
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
        console.log('File protocol detected - using embedded logo settings');
        // Adjust default paths based on directory depth
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
                // Clear text immediately to prevent "GPBC" flash
                logo.textContent = '';
                img = document.createElement('img');
                img.className = 'logo-image';
                logo.appendChild(img);
            }

            img.src = logoSrc;
            img.alt = logoSettings.churchName;

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
            console.log('No logo image, using text:', logoSettings.abbreviation);
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

// Load logo when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadChurchLogo);
} else {
    loadChurchLogo();
}
