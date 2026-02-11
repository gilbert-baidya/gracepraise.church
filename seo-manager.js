/**
 * SEO Manager for Daily Devotion Page
 * 
 * Handles dynamic updates of meta tags and structured data (JSON-LD)
 * based on the currently displayed devotion.
 */

(function () {
    'use strict';

    const SeoManager = {
        /**
         * Update all SEO tags based on devotion data
         * @param {Object} devotion - The devotion data object
         * @param {Date|string} dateObj - The date of the devotion
         */
        update(devotion, dateObj) {
            if (!devotion) return;

            // Normalize data structure to what we need
            const normalized = {
                title: devotion.title || 'Daily Devotion',
                date: new Date(dateObj || new Date()).toISOString().split('T')[0],
                formattedDate: new Date(dateObj || new Date()).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric'
                }),
                content: devotion.reflection || devotion.content || '',
                scriptureText: devotion.verseText || devotion.scripture?.verse || '',
                scriptureRef: devotion.verse || devotion.scripture?.reference || ''
            };

            this.updateMetaTags(normalized);
            this.updateJsonLd(normalized);
        },

        /**
         * Update HTML meta tags
         */
        updateMetaTags(data) {
            const title = `${data.title} (${data.formattedDate}) | Daily Devotion`;

            // Create a clean description
            const cleanBody = data.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
            // "For God so loved... (John 3:16) - Devotion text..."
            const description = `${data.scriptureText} (${data.scriptureRef}) - ${cleanBody}`.substring(0, 300);

            // 1. Page Title
            document.title = title;

            // 2. Meta Description
            this.setMeta('name', 'description', description);

            // 3. Open Graph
            this.setMeta('property', 'og:title', title);
            this.setMeta('property', 'og:description', description);

            // 4. Twitter
            this.setMeta('property', 'twitter:title', title);
            this.setMeta('property', 'twitter:description', description);
        },

        /**
         * Inject or update JSON-LD Structured Data
         */
        updateJsonLd(data) {
            let scriptBlock = document.getElementById('dynamic-json-ld');

            if (!scriptBlock) {
                scriptBlock = document.createElement('script');
                scriptBlock.id = 'dynamic-json-ld';
                scriptBlock.type = 'application/ld+json';
                document.head.appendChild(scriptBlock);
            }

            const schema = {
                "@context": "https://schema.org",
                "@type": "BlogPosting",
                "headline": data.title,
                "image": [
                    "https://gilbert-baidya.github.io/gracepraise.church/images/devotion-placeholder.jpg"
                ],
                "datePublished": data.date,
                "dateModified": data.date,
                "author": {
                    "@type": "Organization",
                    "name": "Grace and Praise Bangladeshi Church",
                    "url": "https://gilbert-baidya.github.io/gracepraise.church/"
                },
                "publisher": {
                    "@type": "Organization",
                    "name": "Grace and Praise Bangladeshi Church",
                    "logo": {
                        "@type": "ImageObject",
                        "url": "https://gilbert-baidya.github.io/gracepraise.church/images/logo.png"
                    }
                },
                "description": `${data.scriptureText} (${data.scriptureRef})`,
                "articleBody": data.content.replace(/<[^>]*>/g, '')
            };

            scriptBlock.textContent = JSON.stringify(schema, null, 2);
        },

        /**
         * Helper to set meta tag content
         */
        setMeta(attrName, attrValue, content) {
            let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attrName, attrValue);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        }
    };

    // Expose to window
    window.SeoManager = SeoManager;

})();
