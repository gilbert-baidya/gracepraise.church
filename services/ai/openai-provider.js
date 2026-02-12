/**
 * ============================================================================
 * GPBC OPENAI PROVIDER SERVICE
 * ============================================================================
 * Production-grade OpenAI DALL-E 3 image generation service
 * with retry logic, error handling, and progress tracking
 */

const OpenAI = require('openai');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class OpenAIProvider {
    constructor(config) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('[OpenAI Provider] OPENAI_API_KEY not found in environment');
        }

        this.config = config;
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        console.log('[OpenAI Provider] ✅ Initialized');
    }

    /**
     * Generate a single image with retry logic
     * @param {Object} params - Generation parameters
     * @param {string} params.prompt - Image generation prompt
     * @param {string} params.outputPath - Full path where image will be saved
     * @param {number} params.attemptNumber - Current attempt number (for retry)
     * @returns {Promise<Object>} Generation result
     */
    async generateImage({ prompt, outputPath, attemptNumber = 1 }) {
        const maxAttempts = this.config.generation.maxRetries + 1;

        try {
            console.log(`  🎨 Generating... (attempt ${attemptNumber}/${maxAttempts})`);

            // Call OpenAI DALL-E 3 API
            const response = await this.client.images.generate({
                model: this.config.primary.model,
                prompt: prompt,
                n: 1,
                size: this.config.primary.size,
                quality: this.config.primary.quality,
                style: this.config.primary.style
            });

            if (!response.data || response.data.length === 0) {
                throw new Error('No image data returned from OpenAI');
            }

            const imageUrl = response.data[0].url;
            const revisedPrompt = response.data[0].revised_prompt;

            // Download image
            const imageBuffer = await this.downloadImage(imageUrl);

            // Save to file
            await fs.ensureDir(path.dirname(outputPath));
            await fs.writeFile(outputPath, imageBuffer);

            console.log(`  ✅ Generated successfully`);

            return {
                success: true,
                path: outputPath,
                url: imageUrl,
                revisedPrompt: revisedPrompt,
                attemptNumber: attemptNumber
            };

        } catch (error) {
            console.error(`  ❌ Attempt ${attemptNumber} failed:`, error.message);

            // Retry logic
            if (attemptNumber < maxAttempts) {
                const delay = this.config.generation.retryDelay * attemptNumber;
                console.log(`  ⏳ Waiting ${delay}ms before retry...`);
                await this.sleep(delay);
                
                return this.generateImage({ 
                    prompt, 
                    outputPath, 
                    attemptNumber: attemptNumber + 1 
                });
            }

            // Max retries reached
            return {
                success: false,
                error: error.message,
                attemptNumber: attemptNumber
            };
        }
    }

    /**
     * Download image from URL
     * @param {string} url - Image URL
     * @returns {Promise<Buffer>} Image buffer
     */
    async downloadImage(url) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: this.config.generation.timeout
            });
            return Buffer.from(response.data, 'binary');
        } catch (error) {
            throw new Error(`Failed to download image: ${error.message}`);
        }
    }

    /**
     * Validate image meets quality requirements
     * @param {string} imagePath - Path to image file
     * @returns {Promise<boolean>} Validation result
     */
    async validateImage(imagePath) {
        try {
            const stats = await fs.stat(imagePath);
            
            // Check file size (should be at least 50KB for quality image)
            if (stats.size < 50000) {
                console.warn(`  ⚠️  Image file size too small: ${stats.size} bytes`);
                return false;
            }

            return true;
        } catch (error) {
            console.error(`  ❌ Image validation failed:`, error.message);
            return false;
        }
    }

    /**
     * Build complete prompt with base template
     * @param {string} themePrompt - Theme-specific prompt
     * @returns {string} Complete prompt
     */
    buildPrompt(themePrompt) {
        const { basePrefix, baseSuffix } = this.config.prompts;
        return `${basePrefix}${themePrompt}${baseSuffix}`;
    }

    /**
     * Sleep utility
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get provider status
     * @returns {Object} Provider status
     */
    getStatus() {
        return {
            name: 'OpenAI',
            model: this.config.primary.model,
            enabled: this.config.primary.enabled,
            apiKeyPresent: !!process.env.OPENAI_API_KEY
        };
    }
}

module.exports = OpenAIProvider;
