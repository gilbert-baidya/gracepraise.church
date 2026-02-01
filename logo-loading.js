// Logo Loading Screen with Animated Video
(function () {
    'use strict';

    // Configuration
    const config = {
        videoOptions: [
            'images/logo/gpbc-glow-one.mp4',
            'images/logo/glow-shine-fav.mp4',
            'images/logo/gpbc-dove-one-fav.mp4'
        ],
        fallbackLogo: 'images/new-gpbc-logo-final.svg',
        minDisplayTime: 1000, // Minimum time to show loading screen (ms)
        fadeOutDuration: 500 // Fade out animation duration (ms)
    };

    let startTime = Date.now();
    let isPageLoaded = false;
    let isVideoEnded = false;

    // Create loading screen HTML
    function createLoadingScreen() {
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'logo-loading-screen';

        // Choose random video from options
        const randomVideo = config.videoOptions[Math.floor(Math.random() * config.videoOptions.length)];

        loadingScreen.innerHTML = `
            <div class="logo-loader-container">
                <div class="logo-video-container">
                    <video class="logo-video" 
                           autoplay 
                           muted 
                           playsinline
                           preload="auto">
                        <source src="${randomVideo}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <img src="${config.fallbackLogo}" 
                         alt="GPBC Logo" 
                         class="logo-fallback"
                         style="display: none;">
                </div>
                <div class="loading-text">
                    Loading<span class="loading-dots">...</span>
                </div>
                <div class="loading-progress">
                    <div class="loading-progress-bar"></div>
                </div>
            </div>
        `;

        document.body.insertBefore(loadingScreen, document.body.firstChild);

        return loadingScreen;
    }

    // Animate loading dots
    function animateLoadingDots() {
        const dotsElement = document.querySelector('.loading-dots');
        if (!dotsElement) return;

        let dots = 0;
        const interval = setInterval(() => {
            dots = (dots + 1) % 4;
            dotsElement.textContent = '.'.repeat(dots);

            if (isPageLoaded && isVideoEnded) {
                clearInterval(interval);
            }
        }, 500);
    }

    // Hide loading screen
    function hideLoadingScreen(loadingScreen) {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, config.minDisplayTime - elapsedTime);

        setTimeout(() => {
            loadingScreen.classList.add('hidden');

            // Remove from DOM after transition
            setTimeout(() => {
                if (loadingScreen.parentNode) {
                    loadingScreen.parentNode.removeChild(loadingScreen);
                }
            }, config.fadeOutDuration);
        }, remainingTime);
    }

    // Initialize loading screen
    function init() {
        // Create loading screen immediately
        const loadingScreen = createLoadingScreen();
        const video = loadingScreen.querySelector('.logo-video');
        const fallbackImg = loadingScreen.querySelector('.logo-fallback');

        // Start dots animation
        animateLoadingDots();

        // Handle video events
        video.addEventListener('ended', () => {
            isVideoEnded = true;
            if (isPageLoaded) {
                hideLoadingScreen(loadingScreen);
            }
        });

        video.addEventListener('error', () => {
            // Show fallback image if video fails to load
            video.style.display = 'none';
            fallbackImg.style.display = 'block';
            isVideoEnded = true; // Treat as ended
            if (isPageLoaded) {
                hideLoadingScreen(loadingScreen);
            }
        });

        // Handle page load
        function onPageLoad() {
            isPageLoaded = true;
            // Hide immediately when page loads, don't wait for video
            hideLoadingScreen(loadingScreen);
        }

        if (document.readyState === 'complete') {
            onPageLoad();
        } else {
            window.addEventListener('load', onPageLoad);
        }

        // Fallback: Force hide after 3 seconds maximum
        setTimeout(() => {
            if (!loadingScreen.classList.contains('hidden')) {
                hideLoadingScreen(loadingScreen);
            }
        }, 3000);
    }

    // Start immediately
    init();

})();
