// js/api.js

/**
 * Handles all third-party API interactions for the NetworkMonitor.
 */
NetworkMonitor.API = {
    /**
     * Fetches a website screenshot using the WordPress mShots API.
     * This is a free service that doesn't require an API key.
     * @param {string} targetUrl The URL of the website to screenshot.
     * @returns {string} The URL of the generated screenshot image.
     */
    fetchScreenshot(targetUrl) {
        // We encode the component to ensure the URL is valid.
        const encodedUrl = encodeURIComponent(targetUrl);
        // We can add width (w) and height (h) parameters if needed.
        return `https://s0.wp.com/mshots/v1/${encodedUrl}?w=800`;
    },

    /**
     * Fetches the list of available generative models from the Google AI API.
     * @param {string} apiKey The user's Google AI API key.
     * @returns {Promise<Array>} A promise that resolves to an array of model objects.
     */
    async fetchGoogleAIModels(apiKey) {
        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        
        try {
            const response = await fetch(apiEndpoint);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erreur API Google AI : ${errorData.error?.message || response.statusText}`);
            }
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Failed to fetch Google AI models:', error);
            throw error; // Re-throw the error to be caught by the caller
        }
    }
};