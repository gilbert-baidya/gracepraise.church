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

async function loadChurchLogo() {
    // Check if we're in file:// mode
    const isFileProtocol = window.location.protocol === 'file:';

    if (!isFileProtocol) {
        try {
            console.log('Loading logo settings from server...');
            const response = await fetch('content/settings/logo.json');
            if (response.ok) {
                logoSettings = await response.json();
                console.log('Logo settings loaded from JSON:', logoSettings);
            }
        } catch (error) {
            console.log('Using default logo settings:', error.message);
        }
    } else {
        console.log('File protocol detected - using embedded logo settings');
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
