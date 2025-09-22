// js/checker.js

/**
 * Handles the logic for checking website status and analyzing content.
 */
NetworkMonitor.Checker = {
    // Content analysis patterns
    patterns: {
        parking: [
            /domain\s+for\s+sale/gi, /this\s+domain\s+is\s+for\s+sale/gi, /buy\s+this\s+domain/gi,
            /domain\s+parking/gi, /parked\s+domain/gi, /coming\s+soon/gi, /under\s+construction/gi,
            /page\s+not\s+found/gi, /404\s+error/gi, /default\s+page/gi, /welcome\s+to\s+nginx/gi,
            /apache.*default\s+page/gi
        ],
        invalid: [
            /access\s+denied/gi, /forbidden/gi, /internal\s+server\s+error/gi, /service\s+unavailable/gi,
            /bad\s+gateway/gi, /gateway\s+timeout/gi, /maintenance\s+mode/gi, /^\s*$/, /^.{0,50}$/,
            /lorem\s+ipsum/gi
        ],
        social: {
            facebook: /facebook\.com\/([a-zA-Z0-9._-]+)/gi,
            twitter: /twitter\.com\/([a-zA-Z0-9._-]+)|x\.com\/([a-zA-Z0-9._-]+)/gi,
            instagram: /instagram\.com\/([a-zA-Z0-9._-]+)/gi,
            linkedin: /linkedin\.com\/(?:in|company)\/([a-zA-Z0-9._-]+)/gi,
            youtube: /youtube\.com\/(?:c\/|channel\/|user\/|@)([a-zA-Z0-9._-]+)/gi,
            tiktok: /tiktok\.com\/@([a-zA-Z0-9._-]+)/gi,
            github: /github\.com\/([a-zA-Z0-9._-]+)/gi
        }
    },

    async checkAll(silent = false) {
        if (NetworkMonitor.state.isChecking) {
            NetworkMonitor.Utils.Notifications.show('Check already in progress', 'warning');
            return;
        }

        NetworkMonitor.state.isChecking = true;
        const checkBtn = document.getElementById('checkAllBtn');
        
        if (!silent && checkBtn) {
            checkBtn.disabled = true;
            checkBtn.innerHTML = '<div class="loading"></div> Checking...';
        }

        const promises = NetworkMonitor.state.websites.map((website, index) => {
            return new Promise(resolve => {
                setTimeout(async () => {
                    try {
                        await this.checkWebsite(website.id);
                    } catch (error) {
                        console.error(`Failed to check ${website.url}:`, error);
                    }
                    resolve();
                }, index * 200); // Stagger checks
            });
        });

        await Promise.all(promises);

        NetworkMonitor.state.isChecking = false;
        
        if (!silent && checkBtn) {
            checkBtn.disabled = false;
            checkBtn.innerHTML = '<i class="fas fa-sync-alt"></i> <span style="margin-left: 0.5rem;">Check All</span>';
            NetworkMonitor.Utils.Notifications.show('All websites checked', 'success');
        }
    },

    async checkWebsite(websiteId) {
        const website = NetworkMonitor.state.websites.find(w => w.id === websiteId);
        if (!website) return;

        const previousStatus = website.status;
        website.status = 'checking';
        website.errorMessage = null;
        
        NetworkMonitor.UI.updateWebsiteInMatrix(website);
        NetworkMonitor.UI.updateWebsiteInList(website);

        // Fetch screenshot URL asynchronously
        try {
            website.screenshotUrl = NetworkMonitor.API.fetchScreenshot(website.url);
        } catch (e) {
            console.error("Could not fetch screenshot for", website.url);
            website.screenshotUrl = null;
        }

        const startTime = Date.now();

        try {
            const result = await this.fetchWithProxy(website.url);
            const endTime = Date.now();
            
            website.responseTime = endTime - startTime;
            website.lastChecked = new Date().toISOString();
            
            this.analyzeContent(website, result.text);
            website.ssl = website.url.startsWith('https://');
            website.mobile = Math.random() > 0.3; // Mock mobile readiness
            
            this.addToHistory(website, 'online', website.responseTime);
            
            if (previousStatus === 'offline' && website.status === 'online' && NetworkMonitor.state.settings.notifications?.online) {
                NetworkMonitor.Utils.Notifications.show(`${website.name} is back online!`, 'success');
            }
            
        } catch (error) {
            console.error(`Error checking ${website.url}:`, error);
            website.status = 'offline';
            website.lastChecked = new Date().toISOString();
            website.responseTime = null;
            website.errorMessage = error.message;
            
            this.addToHistory(website, 'offline', null, error.message);
            
            if (previousStatus === 'online' && NetworkMonitor.state.settings.notifications?.offline) {
                NetworkMonitor.Utils.Notifications.show(`${website.name} is offline!`, 'error');
            }
        }

        if (website.responseTime > NetworkMonitor.state.settings.slowResponseThreshold && NetworkMonitor.state.settings.notifications?.slowResponse) {
            NetworkMonitor.Utils.Notifications.show(`${website.name} is responding slowly (${website.responseTime}ms)`, 'warning');
        }

        NetworkMonitor.saveState();
        NetworkMonitor.UI.updateWebsiteInMatrix(website);
        NetworkMonitor.UI.updateWebsiteInList(website);
        NetworkMonitor.UI.renderStats();
    },

    async fetchWithProxy(url) {
        const errors = [];
        
        for (const proxy of NetworkMonitor.config.corsProxies) {
            try {
                const proxyUrl = proxy + encodeURIComponent(url);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), NetworkMonitor.config.requestTimeout);
                
                const response = await fetch(proxyUrl, { method: 'GET', signal: controller.signal });
                clearTimeout(timeoutId);

                if (response.ok) {
                    let text;
                    if (proxy.includes('allorigins')) {
                        const json = await response.json();
                        text = json.contents;
                    } else {
                        text = await response.text();
                    }
                    return { ok: true, status: response.status, text: text || '' };
                }
                errors.push(`${proxy}: HTTP ${response.status}`);
            } catch (error) {
                errors.push(`${proxy}: ${error.message}`);
            }
        }
        
        throw new Error(`All proxies failed: ${errors.join(', ')}`);
    },

    analyzeContent(website, html) {
        // Determine status
        if (this.patterns.parking.some(p => p.test(html))) {
            website.status = 'parking';
        } else if (this.patterns.invalid.some(p => p.test(html))) {
            website.status = 'invalid';
        } else {
            website.status = 'online';
        }

        // Extract metadata
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        website.title = titleMatch ? titleMatch[1].trim() : '';
        
        // ========================================================
        //                  FIXED DESCRIPTION PARSING
        // ========================================================

        // BEFORE (The old, flawed regex):
        // const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
        // if (!website.description && descMatch) {
        //     website.description = descMatch[1].trim();
        // }

        // AFTER (The new, robust regex with a backreference):
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=(["'])(.+?)\1[^>]*>/i);
        // The description is now in the second captured group (descMatch[2])
        if (!website.description && descMatch && descMatch[2]) {
            website.description = descMatch[2].trim();
        }
        
        // ========================================================

        website.socialLinks = this.findSocialLinks(html);
        this.extractFavicon(website, html);
    },

    findSocialLinks(html) {
        const socialLinks = [];
        const foundUrls = new Set();

        Object.entries(this.patterns.social).forEach(([platform, pattern]) => {
            let matches;
            // Reset regex state for global patterns before each execution
            pattern.lastIndex = 0;
            while ((matches = pattern.exec(html)) !== null) {
                // The actual URL might be in group 0 or a later group depending on the regex
                const url = matches[0];
                if (!foundUrls.has(url)) {
                    foundUrls.add(url);
                    socialLinks.push({
                        platform,
                        url: url.startsWith('http') ? url : 'https://' + url
                    });
                }
            }
        });
        return socialLinks;
    },

    extractFavicon(website, html) {
        const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']*)["'][^>]*>/i);
        if (faviconMatch) {
            let faviconUrl = faviconMatch[1];
            try {
                // Resolve the URL relative to the website's base URL
                website.favicon = new URL(faviconUrl, website.url).href;
            } catch {
                website.favicon = null;
            }
        } else {
            // If no favicon is declared, check the default location
            try {
                website.favicon = new URL('/favicon.ico', website.url).href;
            } catch {
                website.favicon = null;
            }
        }
    },

    addToHistory(website, status, responseTime, error = null) {
        if (!website.checkHistory) website.checkHistory = [];
        
        website.checkHistory.push({
            timestamp: new Date().toISOString(),
            status,
            responseTime,
            error
        });

        // Keep only last 100 checks
        if (website.checkHistory.length > 100) {
            website.checkHistory.shift();
        }
    }
};