// js/ai.js

/**
 * Handles all Google AI interactions for website analysis.
 */
NetworkMonitor.AI = {
    /**
     * Triggers the AI analysis process for a specific website.
     * @param {string} websiteId The ID of the website to analyze.
     * @param {HTMLElement} btn The button element that triggered the analysis.
     */
    async triggerAnalysis(websiteId, btn) {
        const apiKey = NetworkMonitor.state.settings.googleApiKey;
        const model = NetworkMonitor.state.settings.googleApiModel || 'models/gemini-1.5-flash-latest'; // Use selected model

        if (!apiKey) {
            NetworkMonitor.Utils.Notifications.show("La clé API Google AI n'est pas définie. Veuillez l'ajouter dans les Paramètres.", 'error');
            return;
        }

        const website = NetworkMonitor.state.websites.find(w => w.id === websiteId);
        if (!website) {
            NetworkMonitor.Utils.Notifications.show('Site web non trouvé.', 'error');
            return;
        }

        const originalBtnText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div class="loading"></div> Analyse...';

        try {
            NetworkMonitor.Utils.Notifications.show(`Récupération du contenu pour ${website.name}...`, 'info');
            const result = await NetworkMonitor.Checker.fetchWithProxy(website.url);
            
            if (!result || !result.text) {
                throw new Error("Impossible de récupérer le contenu du site web pour l'analyse.");
            }

            NetworkMonitor.Utils.Notifications.show(`Envoi au modèle IA (${model.replace('models/', '')})...`, 'info');
            const analysisJson = await this.analyzeContent(result.text, apiKey, model);

            website.description = analysisJson.description;
            website.aiAnalyzedData = analysisJson;
            NetworkMonitor.saveState();
            NetworkMonitor.Utils.Notifications.show("Analyse IA terminée ! Mise à jour de l'affichage.", 'success');
            
            NetworkMonitor.UI.updateWebsiteInList(website);
            NetworkMonitor.UI.showAIResultModal(website.name, analysisJson);

        } catch (error) {
            console.error('AI Analysis Error:', error);
            NetworkMonitor.Utils.Notifications.show(`Échec de l'analyse IA : ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }
    },

    /**
     * Sends website content to the Google AI API for analysis.
     * @param {string} htmlContent The HTML content of the website.
     * @param {string} apiKey Your Google AI API key.
     * @param {string} model The name of the model to use (e.g., 'models/gemini-1.5-flash-latest').
     * @returns {Promise<object>} A promise that resolves to the structured JSON from the AI.
     */
    async analyzeContent(htmlContent, apiKey, model) {
        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

        const prompt = `
            Analyse le contenu HTML de site web suivant. En te basant *uniquement* sur le texte fourni, génère un objet JSON avec la structure suivante :
            {
              "description": "Un résumé concis, en un paragraphe, de l'objectif du site web.",
              "projects": [
                {
                  "name": "Nom du Projet",
                  "description": "Une courte description du projet."
                }
              ],
              "events": [
                {
                  "name": "Nom de l'Événement",
                  "date": "La date de l'événement au format AAAA-MM-JJ si trouvée, sinon 'N/A'",
                  "description": "Une courte description de l'événement."
                }
              ]
            }
            
            - Si aucun projet n'est mentionné, le tableau "projects" doit être vide.
            - Si aucun événement n'est mentionné, le tableau "events" doit être vide.
            - La sortie DOIT être un objet JSON valide uniquement, sans aucun autre texte ou formatage markdown.

            Contenu HTML:
            \`\`\`html
            ${this.cleanHtmlForAi(htmlContent)}
            \`\`\`
        `;

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erreur API Google AI : ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const jsonText = data.candidates[0].content.parts[0].text;
        
        try {
            return JSON.parse(jsonText);
        } catch (e) {
            console.error("Impossible de parser la réponse JSON de l'IA:", jsonText);
            throw new Error("L'IA a retourné une réponse JSON invalide.");
        }
    },

    /**
     * Cleans and truncates HTML to be more efficient for the AI prompt.
     * @param {string} html The raw HTML string.
     * @returns {string} The cleaned and truncated text content.
     */
    cleanHtmlForAi(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.querySelectorAll('script, style, link, meta, noscript').forEach(el => el.remove());
        let text = tempDiv.textContent || "";
        text = text.replace(/\s\s+/g, ' ').trim();
        const maxLength = 15000;
        return text.substring(0, maxLength);
    }
};