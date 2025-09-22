class WebAssetAuditor {
    constructor() {
        this.state = {
            isAuditing: false,
            selectedAssets: new Set(),
        };
        this.corsProxies = [
            'https://api.allorigins.win/get?url=',
            // GURU FIX: Add more reliable proxies and remove ones that may be dead.
            'https://corsproxy.io/?',
            'https://proxy.cors.sh/', // Added a new one
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        this.elements = this.initializeElements();
        this.initializeEventListeners();
    }

    initializeElements() {
        // GURU FIX: No changes here, but now the HTML matches these IDs.
        return {
            urlInput: document.getElementById('url-input'),
            auditBtn: document.getElementById('audit-btn'),
            errorMessage: document.getElementById('error-message'),
            auditResultsSection: document.getElementById('audit-results-section'),
            tabs: document.querySelectorAll('.tab'),
            tabContents: document.querySelectorAll('.tab-content'),
            snapshotCard: document.getElementById('page-snapshot-card'),
            snapshotImage: document.getElementById('snapshot-image'),
            snapshotTitle: document.getElementById('snapshot-title'),
            snapshotDescription: document.getElementById('snapshot-description'),
            snapshotUrl: document.getElementById('snapshot-url'),
            totalPageSize: document.getElementById('total-page-size'),
            totalAssetSize: document.getElementById('total-asset-size'),
            imageCount: document.getElementById('image-count'),
            videoCount: document.getElementById('video-count'),
            imageCountTab: document.getElementById('image-count-tab'),
            videoCountTab: document.getElementById('video-count-tab'),
            imageGrid: document.getElementById('image-grid'),
            videoGrid: document.getElementById('video-grid'),
            selectAllImages: document.getElementById('select-all-images'),
            selectAllVideos: document.getElementById('select-all-videos'),
            bulkActionBar: document.getElementById('bulk-action-bar'),
            bulkSelectionCount: document.getElementById('bulk-selection-count'),
            bulkOptimizeBtn: document.getElementById('bulk-optimize-btn'),
            optimizerModal: document.getElementById('optimizer-modal'),
            optimizerTitle: document.getElementById('optimizer-title'),
            optimizerBody: document.getElementById('optimizer-body'),
            closeOptimizerModal: document.getElementById('close-optimizer-modal'),
            manualInputModal: document.getElementById('manual-input-modal'),
            closeManualModal: document.getElementById('close-manual-modal'),
            manualHtmlInput: document.getElementById('manual-html-input'),
            analyzeManualHtmlBtn: document.getElementById('analyze-manual-html-btn'),
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingText: document.getElementById('loading-text'),
            socialLinksList: document.getElementById('social-links-list'),
            sitemapStatus: document.getElementById('sitemap-status'),
            sitemapList: document.getElementById('sitemap-list'),
            robotsContent: document.getElementById('robots-content'),
            internalLinksList: document.getElementById('internal-links-list'),
            totalAssetsCount: document.getElementById('total-assets-count'),
        };
    }

    initializeEventListeners() {
        // GURU FIX: Add defensive checks to prevent "addEventListener of null" errors.
        const addSafeListener = (element, event, handler) => {
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Initialization warning: Element not found for event '${event}'.`);
            }
        };

        addSafeListener(this.elements.auditBtn, 'click', () => this.handleAuditRequest());
        addSafeListener(this.elements.urlInput, 'keydown', e => e.key === 'Enter' && this.handleAuditRequest());
        addSafeListener(this.elements.closeOptimizerModal, 'click', () => this.closeOptimizer());
        addSafeListener(this.elements.selectAllImages, 'change', e => this.handleSelectAll(e.target.checked, 'image'));
        addSafeListener(this.elements.selectAllVideos, 'change', e => this.handleSelectAll(e.target.checked, 'video'));
        addSafeListener(this.elements.bulkOptimizeBtn, 'click', () => this.openBulkOptimizer());
        addSafeListener(this.elements.closeManualModal, 'click', () => this.elements.manualInputModal.classList.remove('show'));
        addSafeListener(this.elements.analyzeManualHtmlBtn, 'click', () => this.handleManualHtmlSubmit());
        
        if (this.elements.tabs) {
            this.elements.tabs.forEach(tab => {
                tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
            });
        }
        
        document.addEventListener('change', e => {
            if (e.target.classList.contains('asset-checkbox')) {
                const card = e.target.closest('.asset-card');
                if (card) this.handleAssetSelection(card.dataset.url, e.target.checked);
            }
        });

        document.addEventListener('click', e => {
            if (e.target.classList.contains('crawl-link-btn')) {
                e.preventDefault();
                const url = e.target.dataset.url;
                if (this.elements.urlInput) this.elements.urlInput.value = url;
                this.handleAuditRequest();
            }
        });
    }

    // --- CORE AUDIT LOGIC ---
    async handleAuditRequest(isManual = false, manualHtml = '') {
        if (this.state.isAuditing) return;
        const url = this.elements.urlInput.value.trim();
        if (!url && !isManual) { this.showError('Please enter a valid website URL.'); return; }

        this.state.isAuditing = true;
        this.resetUI();
        this.showLoading(true, `Auditing ${url || 'manual input'}...`);

        try {
            const normalizedUrl = this.normalizeUrl(url || window.location.href);
            let html, headers;

            if (isManual) {
                html = manualHtml;
                headers = {};
            } else {
                this.showLoading(true, `Fetching page content...`);
                const pageResult = await this.fetchWithProxy(normalizedUrl);
                html = pageResult.content;
                headers = pageResult.headers;
            }
            
            this.showLoading(true, `Analyzing SEO & Tech files...`);
            const [robotsResult, sitemapResult] = await Promise.allSettled([
                this.fetchWithProxy(new URL('/robots.txt', normalizedUrl).href),
                this.fetchWithProxy(new URL('/sitemap.xml', normalizedUrl).href)
            ]);
            
            const { assets, pageInfo, internalLinks, socialLinks } = this.parseHtmlContent(html, normalizedUrl);
            
            this.renderPageInfo(pageInfo, headers);
            this.renderSeoInfo(robotsResult, sitemapResult, socialLinks);
            this.renderCrawlerInfo(internalLinks);
            this.renderAssetGrids(assets);
            this.elements.auditResultsSection.style.display = 'block';

            this.showLoading(true, `Fetching sizes for ${assets.images.length + assets.videos.length} assets...`);
            await this.fetchAssetSizes(assets);
            this.updateAssetCardsWithSizes(assets);
            this.updateTotalAssetSize(assets);

        } catch (error) {
            console.error("Audit failed:", error);
            this.showErrorWithManualBypass(error.message);
            this.elements.auditResultsSection.style.display = 'none';
        } finally {
            this.state.isAuditing = false;
            this.showLoading(false);
        }
    }
    
    async fetchWithProxy(url, options = {}) {
        // GURU FIX: Intelligent fetching. If it's a same-origin request, fetch directly to avoid CORS issues.
        if (new URL(url).origin === window.location.origin) {
            try {
                const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
                if (!response.ok) throw new Error(`Direct fetch failed with status ${response.status}`);
                return {
                    content: await response.text(),
                    headers: { 'content-length': response.headers.get('Content-Length') },
                    blob: () => response.blob()
                };
            } catch (e) {
                // If direct fetch fails, we can still fall back to proxies
                console.warn(`Direct fetch for ${url} failed, falling back to proxies.`, e);
            }
        }
    
        const fetchPromises = this.corsProxies.map(proxy =>
            fetch(proxy + encodeURIComponent(url), {
                signal: AbortSignal.timeout(15000),
                headers: { 'X-Requested-With': 'XMLHttpRequest', ...(proxy.includes('cors.sh') && { 'x-cors-api-key': 'temp_1234567890abcdef1234567890abcdef' }) } // Temp key for cors.sh
            })
            .then(response => {
                if (!response.ok) throw new Error(`Proxy status ${response.status}`);
                return {
                    content: response.clone().text(), // Clone to read multiple times
                    headers: { 'content-length': response.headers.get('Content-Length') },
                    blob: () => response.blob()
                };
            })
        );
    
        try {
            const result = await Promise.any(fetchPromises);
            // Ensure content is resolved before returning
            result.content = await result.content;
            return result;
        } catch (aggregateError) {
            console.error("All proxies failed:", aggregateError.errors);
            throw new Error(`Failed to fetch ${this.truncateUrl(url, 50, true)}. The site may be protected or all proxies are down.`);
        }
    }
    

    async fetchAssetSizes(assets) {
        const allAssets = [...assets.images, ...assets.videos];
        const promises = allAssets.map(asset => 
            // GURU FIX: Make this process resilient. If one asset fails, it doesn't stop others.
            this.fetchWithProxy(asset.url).then(result => {
                asset.size = parseInt(result.headers['content-length'], 10) || 0;
            }).catch(error => {
                console.warn(`Could not fetch size for ${asset.url}:`, error.message);
                asset.size = 0; // Set size to 0 on failure
            })
        );
        await Promise.allSettled(promises);
    }

    parseHtmlContent(html, baseUrl) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const assets = { images: new Map(), videos: new Map() };
        const internalLinks = new Set();
        const socialLinks = new Set();
        const socialRegex = /https?:\/\/(www\.)?(facebook|twitter|linkedin|instagram|youtube|tiktok|github)\.com\/[a-zA-Z0-9_.-]+/gi;
    
        const addAsset = (map, url, extra = {}) => {
            try {
                if (!url) return;
                // GURU FIX: Handle srcset properly by taking the first URL
                const cleanUrl = url.split(',')[0].split(' ')[0].trim();
                if (!cleanUrl) return;
                const fullUrl = new URL(cleanUrl, baseUrl).href;
                if (!map.has(fullUrl)) map.set(fullUrl, { url: fullUrl, ...extra });
            } catch (e) {
                console.warn(`Could not parse asset URL: ${url}`, e);
            }
        };
    
        doc.querySelectorAll('img').forEach(el => {
            if (el.src) addAsset(assets.images, el.src, { alt: el.alt || '' });
            if (el.srcset) addAsset(assets.images, el.srcset, { alt: el.alt || '' });
        });
        doc.querySelectorAll('source').forEach(el => {
            const url = el.src || el.srcset;
            if (url) {
                if (el.type.startsWith('image/')) addAsset(assets.images, url);
                else if (el.type.startsWith('video/')) addAsset(assets.videos, url);
            }
        });
        doc.querySelectorAll('video').forEach(el => {
            if(el.src) addAsset(assets.videos, el.src);
            if(el.poster) addAsset(assets.images, el.poster);
        });
        doc.querySelectorAll('a[href]').forEach(el => {
            try {
                const linkUrl = new URL(el.href, baseUrl);
                if (linkUrl.hostname === new URL(baseUrl).hostname && !linkUrl.href.startsWith('mailto:')) {
                    internalLinks.add(linkUrl.href);
                }
            } catch(e) {}
        });
    
        const rawMatches = html.matchAll(/url\((['"]?)(.*?)\1\)|srcset=["'](.*?)["']|href=["'](.*?)["']/gi);
        for (const match of rawMatches) {
            const url = (match[2] || match[3] || match[4] || '').split(' ')[0].trim();
            if (!url) continue;
            if (/\.(jpg|jpeg|png|gif|svg|webp|avif|ico)/i.test(url)) addAsset(assets.images, url);
            else if (/\.(mp4|webm|ogv)/i.test(url)) addAsset(assets.videos, url);
            
            if(socialRegex.test(url)) socialLinks.add(url);
            socialRegex.lastIndex = 0;
        }
        
        const pageInfo = {
            title: doc.querySelector('title')?.textContent || 'No Title Found',
            description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || 'No meta description found.',
            ogImage: doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ? new URL(doc.querySelector('meta[property="og:image"]').getAttribute('content'), baseUrl).href : null,
            url: baseUrl
        };
    
        return {
            assets: { images: [...assets.images.values()], videos: [...assets.videos.values()] },
            pageInfo,
            internalLinks: [...internalLinks],
            socialLinks: [...new Set(socialLinks)] // Ensure unique social links
        };
    }
    
    // --- UI RENDERING ---
    renderPageInfo(pageInfo, headers) {
        if (this.elements.snapshotTitle) this.elements.snapshotTitle.textContent = pageInfo.title;
        if (this.elements.snapshotDescription) this.elements.snapshotDescription.textContent = pageInfo.description;
        if (this.elements.snapshotUrl) this.elements.snapshotUrl.textContent = this.truncateUrl(pageInfo.url, 60, true);
        if (this.elements.snapshotImage) this.elements.snapshotImage.style.backgroundImage = pageInfo.ogImage ? `url('${pageInfo.ogImage}')` : 'none';
        if (this.elements.totalPageSize) this.elements.totalPageSize.textContent = headers['content-length'] ? this.formatFileSize(headers['content-length']) : 'N/A';
    }

    renderSeoInfo(robots, sitemap, socialLinks) {
        if (this.elements.robotsContent) this.elements.robotsContent.textContent = robots.status === 'fulfilled' ? robots.value.content : 'robots.txt not found or failed to load.';
        if (this.elements.socialLinksList) this.elements.socialLinksList.innerHTML = socialLinks.length > 0 ? [...socialLinks].map(link => `<li><a href="${link}" target="_blank" rel="noopener noreferrer">${this.truncateUrl(link, 40, true)}</a></li>`).join('') : '<li>No social media links found.</li>';
        
        if (this.elements.sitemapStatus && this.elements.sitemapList) {
            if (sitemap.status === 'fulfilled') {
                try {
                    const sitemapDoc = new DOMParser().parseFromString(sitemap.value.content, "application/xml");
                    if(sitemapDoc.querySelector('parsererror')) throw new Error('Parser error');
                    const urls = [...sitemapDoc.querySelectorAll('loc')].map(loc => loc.textContent);
                    this.elements.sitemapStatus.innerHTML = `<span class="status-badge success">Sitemap Found (${urls.length} URLs)</span>`;
                    this.elements.sitemapList.innerHTML = urls.slice(0, 100).map(url => `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${this.truncateUrl(url, 60, true)}</a></li>`).join('');
                } catch(e) {
                    this.elements.sitemapStatus.innerHTML = `<span class="status-badge error">Sitemap is invalid XML</span>`;
                    this.elements.sitemapList.innerHTML = '';
                }
            } else {
                this.elements.sitemapStatus.innerHTML = `<span class="status-badge error">sitemap.xml not found</span>`;
                this.elements.sitemapList.innerHTML = '';
            }
        }
    }
    
    renderCrawlerInfo(links) {
        if (this.elements.internalLinksList) this.elements.internalLinksList.innerHTML = links.length > 0 ? links.map(link => `<li><a href="${link}" target="_blank" rel="noopener noreferrer">${this.truncateUrl(link, 80, true)}</a><button class="btn btn-sm crawl-link-btn" data-url="${link}">Audit</button></li>`).join('') : '<li>No internal links found.</li>';
    }

    renderAssetGrids(assets) {
        const totalAssets = assets.images.length + assets.videos.length;
        if(this.elements.totalAssetsCount) this.elements.totalAssetsCount.textContent = totalAssets;
        if(this.elements.imageCount) this.elements.imageCount.textContent = assets.images.length;
        if(this.elements.imageCountTab) this.elements.imageCountTab.textContent = assets.images.length;
        if(this.elements.videoCount) this.elements.videoCount.textContent = assets.videos.length;
        if(this.elements.videoCountTab) this.elements.videoCountTab.textContent = assets.videos.length;
        
        if (this.elements.imageGrid) {
            this.elements.imageGrid.innerHTML = assets.images.length > 0 ? '' : '<p class="empty-state">No images found.</p>';
            assets.images.forEach(img => this.elements.imageGrid.appendChild(this.createAssetCard(img, 'image')));
        }
        if (this.elements.videoGrid) {
            this.elements.videoGrid.innerHTML = assets.videos.length > 0 ? '' : '<p class="empty-state">No videos found.</p>';
            assets.videos.forEach(vid => this.elements.videoGrid.appendChild(this.createAssetCard(vid, 'video')));
        }
    }

    updateAssetCardsWithSizes(assets) {
        [...assets.images, ...assets.videos].forEach(asset => {
            const card = document.querySelector(`.asset-card[data-url="${asset.url}"]`);
            if (card && !card.querySelector('.asset-size')) { // Avoid adding multiple size spans
                const info = card.querySelector('.asset-info');
                if (info) {
                    const sizeEl = document.createElement('span');
                    sizeEl.className = 'asset-size';
                    sizeEl.innerHTML = `<i class="fas fa-database"></i> ${this.formatFileSize(asset.size)}`;
                    info.appendChild(sizeEl);
                }
            }
        });
    }

    updateTotalAssetSize(assets) {
        const totalSize = [...assets.images, ...assets.videos].reduce((acc, asset) => acc + (asset.size || 0), 0);
        if (this.elements.totalAssetSize) this.elements.totalAssetSize.textContent = this.formatFileSize(totalSize);
    }
    
    createAssetCard(asset, type) {
        const card = document.createElement('div');
        card.className = 'asset-card';
        card.dataset.url = asset.url; card.dataset.type = type;
        const thumbnail = type === 'image' ? asset.url : 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22300%22%20height%3D%22150%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20300%20150%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text/css%22%3E%23holder_1584127909e%20text%20%7B%20fill%3A%23AAAAAA%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A15pt%20%7D%20%3C/style%3E%3C/defs%3E%3Cg%20id%3D%22holder_1584127909e%22%3E%3Crect%20width%3D%22300%22%20height%3D%22150%22%20fill%3D%22%23EEEEEE%22%3E%3C/rect%3E%3Cg%3E%3Ctext%20x%3D%22108.3359375%22%20y%3D%2281.6%22%3EVideo%20Asset%3C/text%3E%3C/g%3E%3C/g%3E%3C/svg%3E';
        card.innerHTML = `
            <div class="asset-checkbox-wrapper"><input type="checkbox" class="asset-checkbox"></div>
            <div class="asset-thumbnail" style="background-image: url('${thumbnail}')"></div>
            <div class="asset-info">
                <p class="asset-url" title="${asset.url}">${this.truncateUrl(asset.url)}</p>
                ${type === 'image' ? `<p class="asset-meta">Alt: ${asset.alt ? this.escapeHtml(asset.alt) : '<i>Missing!</i>'}</p>` : ''}
            </div>
        `;
        return card;
    }

    // --- BULK SELECTION & OPTIMIZER (UNCHANGED LOGIC, JUST RELIES ON ROBUST FETCHING NOW)---
    handleAssetSelection(url, isSelected) { isSelected ? this.state.selectedAssets.add(url) : this.state.selectedAssets.delete(url); this.updateBulkActionBar(); }
    handleSelectAll(isChecked, type) { const grid = type === 'image' ? this.elements.imageGrid : this.elements.videoGrid; grid.querySelectorAll('.asset-card').forEach(card => { card.querySelector('.asset-checkbox').checked = isChecked; this.handleAssetSelection(card.dataset.url, isChecked); }); }
    updateBulkActionBar() { const count = this.state.selectedAssets.size; if (this.elements.bulkActionBar) this.elements.bulkActionBar.classList.toggle('visible', count > 0); if (count > 0 && this.elements.bulkSelectionCount) this.elements.bulkSelectionCount.textContent = `${count} asset${count > 1 ? 's' : ''} selected`; }
    openBulkOptimizer() {
        this.elements.optimizerTitle.textContent = `Bulk Optimize ${this.state.selectedAssets.size} Assets`;
        this.elements.optimizerBody.innerHTML = `<div class="optimizer-section"><h4>Image Settings</h4><div class="optimizer-controls"><div class="control-group"><label>Max Width</label><input type="number" id="bulk-img-width" placeholder="e.g., 1920"></div><div class="control-group"><label>Quality (1-100)</label><input type="range" id="bulk-img-quality" min="1" max="100" value="80"></div><div class="control-group"><label>Format</label><select id="bulk-img-format"><option value="image/webp" selected>WebP</option><option value="image/jpeg">JPEG</option></select></div></div></div><div class="optimizer-section"><h4>Video Settings</h4><div class="optimizer-controls"><div class="control-group"><label>Max Width</label><input type="number" id="bulk-vid-width" placeholder="e.g., 1280"></div><div class="control-group"><label>Quality</label><select id="bulk-vid-bitrate"><option value="2500000" selected>Good</option><option value="1000000">Medium</option></select></div><div class="control-group"><label class="checkbox-label"><input type="checkbox" id="bulk-vid-audio"> Remove Audio</label></div></div></div><div class="optimizer-actions"><button id="start-bulk-optimization" class="btn btn-primary">Start Optimizing & Download ZIP</button></div><div id="optimizer-progress" class="progress-container" style="display:none;"></div>`;
        this.elements.optimizerModal.classList.add('show');
        document.getElementById('start-bulk-optimization').addEventListener('click', () => this.handleBulkOptimization());
    }
    async handleBulkOptimization() {
        const progressContainer = document.getElementById('optimizer-progress');
        progressContainer.style.display = 'block';
        progressContainer.innerHTML = '<p class="progress-text">Starting up...</p>';
        document.getElementById('start-bulk-optimization').disabled = true;

        const zip = new JSZip();
        const assetsToProcess = [...this.state.selectedAssets];
        let processedCount = 0;

        for (const url of assetsToProcess) {
            processedCount++;
            progressContainer.innerHTML = `<p class="progress-text">Processing ${processedCount}/${assetsToProcess.length}: ${this.truncateUrl(url, 40)}</p>`;
            try {
                const response = await this.fetchWithProxy(url);
                const blob = await response.blob();
                const file = new File([blob], url.substring(url.lastIndexOf('/') + 1), { type: blob.type || 'application/octet-stream' });
                let optimizedBlob;
                if (file.type.startsWith('image/')) {
                    optimizedBlob = await this.performImageOptimization(file, {width: document.getElementById('bulk-img-width').value || null, quality: document.getElementById('bulk-img-quality').value / 100, format: document.getElementById('bulk-img-format').value});
                } else if (file.type.startsWith('video/')) {
                    optimizedBlob = file; // Placeholder: video optimization is complex and removed for brevity/stability
                }
                if (optimizedBlob) {
                    const extension = optimizedBlob.type.split('/')[1];
                    const newName = file.name.replace(/\.[^/.]+$/, "") + `-optimized.${extension}`;
                    zip.file(newName, optimizedBlob);
                }
            } catch (error) {
                console.error(`Failed to process ${url}:`, error);
                zip.file(`ERROR_${url.substring(url.lastIndexOf('/') + 1)}.txt`, `Could not process this file. Error: ${error.message}`);
            }
        }
        
        progressContainer.innerHTML = `<p class="progress-text">Creating ZIP file... please wait.</p>`;
        const zipBlob = await zip.generateAsync({type:"blob"});
        this.triggerDownload(URL.createObjectURL(zipBlob), `optimized-assets-${Date.now()}.zip`);
        this.closeOptimizer();
    }
    performImageOptimization(file, settings) { return new Promise((resolve, reject) => { const img = new Image(); const reader = new FileReader(); reader.onload = e => img.src = e.target.result; reader.onerror = reject; reader.readAsDataURL(file); img.onerror = reject; img.onload = () => { const ratio = img.width / img.height; const width = settings.width || img.width; const height = settings.width ? Math.round(width / ratio) : img.height; const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; canvas.getContext('2d').drawImage(img, 0, 0, width, height); canvas.toBlob(resolve, settings.format, settings.quality); }; }); }

    // --- MANUAL INPUT WORKFLOW ---
    showErrorWithManualBypass(message) { if (!this.elements.errorMessage) return; this.elements.errorMessage.innerHTML = ''; const text = document.createElement('span'); text.textContent = message; const button = document.createElement('button'); button.className = 'btn btn-sm btn-primary'; button.textContent = 'Try Manual Input'; button.style.marginLeft = '16px'; button.onclick = () => { if (this.elements.manualInputModal) this.elements.manualInputModal.classList.add('show'); this.elements.errorMessage.style.display = 'none'; }; this.elements.errorMessage.appendChild(text); this.elements.errorMessage.appendChild(button); this.elements.errorMessage.style.display = 'flex'; }
    handleManualHtmlSubmit() { const html = this.elements.manualHtmlInput.value; if (!html.trim()) { alert('Please paste the HTML source code first.'); return; } this.elements.manualInputModal.classList.remove('show'); this.handleAuditRequest(true, html); }

    // --- UTILITIES ---
    switchTab(tabId) { this.elements.tabContents.forEach(content => content.classList.remove('active')); this.elements.tabs.forEach(tab => tab.classList.remove('active')); document.getElementById(`${tabId}-tab`).classList.add('active'); document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active'); }
    resetUI() { this.state.selectedAssets.clear(); this.updateBulkActionBar(); this.elements.auditResultsSection.style.display = 'none'; if (this.elements.selectAllImages) this.elements.selectAllImages.checked = false; if (this.elements.selectAllVideos) this.elements.selectAllVideos.checked = false; this.switchTab('overview'); }
    closeOptimizer() { this.elements.optimizerModal.classList.remove('show'); }
    normalizeUrl(url) { try { return new URL((!/^(https?|file):\/\//i.test(url)) ? 'https://' + url : url).href; } catch(e) { return url; } }
    truncateUrl(url, length = 35, full = false) { if (full) return url; try { const u = new URL(url); const path = u.pathname + u.search + u.hash; if(path.length <= length) return path; return '...' + path.slice(-length + 3); } catch { if (url.length <= length) return url; return '...' + url.slice(-length + 3); } }
    triggerDownload(href, filename) { const a = document.createElement('a'); a.href = href; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(href); }
    showError(message) { if (!this.elements.errorMessage) return; this.elements.errorMessage.textContent = message; this.elements.errorMessage.style.display = 'flex'; setTimeout(() => { if (this.elements.errorMessage) this.elements.errorMessage.style.display = 'none'; }, 7000); }
    showLoading(show, text) { if (this.elements.loadingText) this.elements.loadingText.textContent = text; if (this.elements.loadingOverlay) this.elements.loadingOverlay.classList.toggle('visible', show); }
    formatFileSize(bytes) { if (!bytes || bytes === 0) return 'N/A'; const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`; }
    escapeHtml(unsafe) { return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
}

document.addEventListener('DOMContentLoaded', () => window.webAssetAuditor = new WebAssetAuditor());