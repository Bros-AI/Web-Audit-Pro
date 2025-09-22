NetworkMonitor.UI = {
    initRender() {
        this.renderModals();
        this.renderAll();
        this.switchTab('network-status');
    },

    renderAll() {
        this.renderStats();
        this.renderTagFilter();
        const activeTab = document.querySelector('.tab.active')?.dataset.tab || 'network-status';
        this.renderTabContent(activeTab);
    },

    renderStats() {
        const stats = NetworkMonitor.Analytics.calculateStats();
        document.getElementById('totalWebsites').textContent = stats.total;
        document.getElementById('onlineWebsites').textContent = stats.online;
        document.getElementById('issueWebsites').textContent = stats.issues;
        document.getElementById('averageAvailability').textContent = stats.availability + '%';
    },
    
    renderTabContent(tabName) {
        const container = document.getElementById('main-content-area');
        container.innerHTML = ''; 

        let content = '';
        switch(tabName) {
            case 'network-status':
                content = this.getMatrixViewHTML();
                container.innerHTML = content;
                this.renderMatrix();
                document.getElementById('refreshMatrixBtn')?.addEventListener('click', () => NetworkMonitor.Checker.checkAll());
                document.getElementById('exportMatrixBtn')?.addEventListener('click', () => NetworkMonitor.ImportExport.export('matrix'));
                document.getElementById('matrixFilter')?.addEventListener('change', () => this.renderMatrix());
                document.getElementById('selectAllMatrix')?.addEventListener('change', (e) => NetworkMonitor.Utils.BulkActions.selectAll(e.target.checked));
                break;
            case 'detailed-view':
                content = this.getDetailedViewHTML();
                container.innerHTML = content;
                this.renderWebsites();
                this.renderTagFilter();
                document.getElementById('filterBtn')?.addEventListener('click', () => this.toggleFilterOptions());
                document.getElementById('bulkActionsBtn')?.addEventListener('click', () => NetworkMonitor.Utils.BulkActions.showMenu());
                document.getElementById('exportBtn')?.addEventListener('click', () => NetworkMonitor.ImportExport.export('detailed'));
                document.getElementById('statusFilter')?.addEventListener('change', () => this.renderWebsites());
                document.getElementById('tagFilter')?.addEventListener('change', () => this.renderWebsites());
                document.getElementById('sortBy')?.addEventListener('change', () => this.renderWebsites());
                break;
            case 'analytics':
                content = this.getAnalyticsViewHTML();
                container.innerHTML = content;
                NetworkMonitor.Analytics.refresh();
                document.getElementById('analyticsRange')?.addEventListener('change', () => NetworkMonitor.Analytics.refresh());
                document.getElementById('generateReportBtn')?.addEventListener('click', () => NetworkMonitor.Analytics.generateReport());
                break;
            case 'settings':
                content = this.getSettingsViewHTML();
                container.innerHTML = content;
                this.loadSettings();
                // Listeners for settings
                document.getElementById('googleApiKey').addEventListener('input', (e) => {
                    NetworkMonitor.state.settings.googleApiKey = e.target.value.trim();
                    NetworkMonitor.saveState();
                });
                document.getElementById('loadAiModelsBtn').addEventListener('click', () => this.loadAIModels());
                document.getElementById('googleApiModelSelect').addEventListener('change', (e) => {
                    NetworkMonitor.state.settings.googleApiModel = e.target.value;
                    NetworkMonitor.saveState();
                });
                document.getElementById('checkInterval').addEventListener('change', (e) => {
                    NetworkMonitor.state.settings.checkInterval = parseInt(e.target.value);
                    NetworkMonitor.saveState();
                    NetworkMonitor.startAutoCheck();
                });
                document.getElementById('notifyOffline').addEventListener('change', (e) => {
                    NetworkMonitor.state.settings.notifications.offline = e.target.checked;
                    NetworkMonitor.saveState();
                });
                document.getElementById('notifyOnline').addEventListener('change', (e) => {
                    NetworkMonitor.state.settings.notifications.online = e.target.checked;
                    NetworkMonitor.saveState();
                });
                document.getElementById('notifySlowResponse').addEventListener('change', (e) => {
                    NetworkMonitor.state.settings.notifications.slowResponse = e.target.checked;
                    NetworkMonitor.saveState();
                });
                document.getElementById('clearHistory').addEventListener('click', () => NetworkMonitor.Utils.DataManager.clearHistory());
                document.getElementById('resetApp').addEventListener('click', () => NetworkMonitor.Utils.DataManager.resetApplication());
                document.getElementById('exportSettings').addEventListener('click', () => NetworkMonitor.ImportExport.exportSettings());
                document.getElementById('importSettings').addEventListener('click', () => NetworkMonitor.ImportExport.importSettings());
                break;
        }
    },

    getMatrixViewHTML() {
        return `
            <div class="tab-content active" id="network-status-content">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Matrice d'état du réseau des sites</h2>
                        <div class="d-flex gap-1">
                            <select class="form-control" id="matrixFilter" style="width: auto;">
                                <option value="all">Tous les sites</option>
                                <option value="online">En ligne</option>
                                <option value="offline">Hors ligne</option>
                                <option value="issues">Avec problèmes</option>
                            </select>
                            <button class="btn btn-outline" id="refreshMatrixBtn"><i class="fas fa-sync-alt"></i><span style="margin-left: 0.5rem;">Rafraîchir</span></button>
                            <button class="btn btn-outline" id="exportMatrixBtn"><i class="fas fa-download"></i><span style="margin-left: 0.5rem;">Exporter</span></button>
                        </div>
                    </div>
                    <div class="card-body" style="padding: 0; overflow-x: auto;">
                        <table class="status-table" id="statusMatrix">
                            <thead>
                                <tr>
                                    <th><input type="checkbox" id="selectAllMatrix"> Site web</th>
                                    <th><i class="fas fa-globe"></i><br>Statut</th>
                                    <th><i class="fas fa-clock"></i><br>Réponse</th>
                                    <th><i class="fas fa-percentage"></i><br>Disponibilité</th>
                                    <th><i class="fas fa-tags"></i><br>Tags</th>
                                    <th><i class="fas fa-share-alt"></i><br>Social</th>
                                    <th><i class="fas fa-shield-alt"></i><br>SSL</th>
                                </tr>
                            </thead>
                            <tbody id="statusMatrixBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    },

    getDetailedViewHTML() {
        return `
            <div class="tab-content active" id="detailed-view-content">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Surveillance détaillée des sites</h2>
                        <div class="d-flex gap-1">
                            <button class="btn btn-outline" id="filterBtn"><i class="fas fa-filter"></i><span style="margin-left: 0.5rem;">Filtrer</span></button>
                            <button class="btn btn-outline" id="bulkActionsBtn"><i class="fas fa-tasks"></i><span style="margin-left: 0.5rem;">Actions de masse</span></button>
                            <button class="btn btn-outline" id="exportBtn"><i class="fas fa-download"></i><span style="margin-left: 0.5rem;">Exporter</span></button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="filter-options hidden" id="filterOptions">
                            <div class="filter-group">
                                <label class="filter-label">Statut :</label>
                                <select class="form-control" id="statusFilter" style="width: 150px;">
                                    <option value="">Tous</option>
                                    <option value="online">En ligne</option>
                                    <option value="offline">Hors ligne</option>
                                    <option value="parking">Parking</option>
                                    <option value="invalid">Invalide</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label class="filter-label">Tags :</label>
                                <select class="form-control" id="tagFilter" style="width: 150px;"><option value="">Tous les tags</option></select>
                            </div>
                            <div class="filter-group">
                                <label class="filter-label">Trier par :</label>
                                <select class="form-control" id="sortBy" style="width: 150px;">
                                    <option value="name">Nom</option>
                                    <option value="status">Statut</option>
                                    <option value="responseTime">Temps de réponse</option>
                                    <option value="availability">Disponibilité</option>
                                    <option value="lastChecked">Dernière vérif.</option>
                                </select>
                            </div>
                        </div>
                        <div class="website-list" id="websiteList"></div>
                    </div>
                </div>
            </div>`;
    },

    getAnalyticsViewHTML() {
        return `
        <div class="tab-content active" id="analytics-content">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Analytique & Rapports</h2>
                    <div class="d-flex gap-1">
                        <select class="form-control" id="analyticsRange" style="width: auto;">
                            <option value="24h">Dernières 24 heures</option>
                            <option value="7d">7 derniers jours</option>
                            <option value="30d">30 derniers jours</option>
                        </select>
                        <button class="btn btn-outline" id="generateReportBtn"><i class="fas fa-file-pdf"></i><span style="margin-left: 0.5rem;">Générer un rapport</span></button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="chart-container"><canvas id="availabilityCanvas"></canvas></div>
                    <div class="chart-container"><canvas id="responseTimeCanvas"></canvas></div>
                </div>
            </div>
        </div>`;
    },

    getSettingsViewHTML() {
        return `
        <div class="tab-content active" id="settings-content">
            <div class="card">
                <div class="card-header"><h2 class="card-title">Paramètres & Configuration</h2></div>
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label" for="googleApiKey">Clé API Google AI</label>
                        <input type="password" class="form-control" id="googleApiKey" placeholder="Entrez votre clé API Google AI">
                        <small style="color: var(--text-muted); margin-top: 0.5rem; display: block;">Votre clé API est stockée localement dans votre navigateur et n'est jamais partagée.</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="googleApiModelSelect">Modèle d'IA Google</label>
                        <div class="d-flex gap-1">
                            <select class="form-control" id="googleApiModelSelect" disabled>
                                <option value="">Chargez les modèles avec votre clé API</option>
                            </select>
                            <button class="btn btn-outline" id="loadAiModelsBtn" style="white-space: nowrap;">
                                <i class="fas fa-sync-alt"></i> Charger les modèles
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="checkInterval">Intervalle de vérification</label>
                        <select class="form-control" id="checkInterval">
                            <option value="60000">Toutes les minutes</option>
                            <option value="300000">Toutes les 5 minutes</option>
                            <option value="600000">Toutes les 10 minutes</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Notifications</label>
                        <div class="checkbox-group">
                            <div class="checkbox-item"><input type="checkbox" id="notifyOffline"><label for="notifyOffline">Notifier quand un site passe hors ligne</label></div>
                            <div class="checkbox-item"><input type="checkbox" id="notifyOnline"><label for="notifyOnline">Notifier quand un site revient en ligne</label></div>
                            <div class="checkbox-item"><input type="checkbox" id="notifySlowResponse"><label for="notifySlowResponse">Notifier si réponse lente (>3s)</label></div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Gestion des données</label>
                        <div class="d-flex gap-1">
                             <button class="btn btn-outline" id="exportSettings"><i class="fas fa-download"></i> Exporter Config</button>
                             <button class="btn btn-outline" id="importSettings"><i class="fas fa-upload"></i> Importer Config</button>
                             <button class="btn btn-warning" id="clearHistory"><i class="fas fa-broom"></i> Vider l'historique</button>
                             <button class="btn btn-danger" id="resetApp"><i class="fas fa-redo"></i> Réinitialiser l'application</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    },
    
    // ... renderModals is unchanged ...
    renderModals() {
        const addModal = document.createElement('div');
        addModal.className = 'modal-backdrop';
        addModal.id = 'addWebsiteModal';
        addModal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Ajouter un nouveau site web</h3>
                    <button class="modal-close" id="closeAddModal"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div id="modalError" class="error-message hidden"></div>
                    <form id="addWebsiteForm">
                        <div class="form-group"><label class="form-label">URL du site</label><input type="url" class="form-control" id="websiteUrl" placeholder="https://example.com" required></div>
                        <div class="form-group"><label class="form-label">Nom du site (Optionnel)</label><input type="text" class="form-control" id="websiteName"></div>
                        <div class="form-group"><label class="form-label">Tags (séparés par des virgules)</label><input type="text" class="form-control" id="websiteTags"></div>
                        <div class="form-group"><label class="form-label">Description (Optionnel)</label><textarea class="form-control" id="websiteDescription"></textarea></div>
                        <div class="form-group"><label class="form-label">Fréquence de vérification</label>
                            <select class="form-control" id="websiteCheckFrequency">
                                <option value="default">Par défaut</option>
                                <option value="60000">Toutes les minutes</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancelAddBtn">Annuler</button>
                    <button class="btn btn-primary" id="saveWebsiteBtn"><span>Ajouter & Vérifier</span></button>
                </div>
            </div>`;
        document.body.appendChild(addModal);

        const importModal = document.createElement('div');
        importModal.className = 'modal-backdrop';
        importModal.id = 'csvImportModal';
        importModal.innerHTML = `
            <div class="modal">
                <div class="modal-header"><h3 class="modal-title">Importer des sites</h3><button class="modal-close" id="closeCsvModal"><i class="fas fa-times"></i></button></div>
                <div class="modal-body">
                    <div class="csv-upload-area" id="csvUploadArea">
                        <h4>Glissez un fichier ici ou cliquez pour parcourir</h4>
                        <input type="file" id="csvFileInput" class="file-input" accept=".csv,.json,.txt">
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('csvFileInput').click()">Choisir un fichier</button>
                    </div>
                    <div id="csvPreview" class="hidden">
                        <h4>Aperçu :</h4>
                        <div id="csvPreviewBody" style="max-height: 200px; overflow-y: auto;"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancelCsvBtn">Annuler</button>
                    <button class="btn btn-primary" id="importCsvBtn" disabled>Importer</button>
                </div>
            </div>`;
        document.body.appendChild(importModal);

        const aiModal = document.createElement('div');
        aiModal.className = 'modal-backdrop';
        aiModal.id = 'aiResultModal';
        aiModal.innerHTML = `
            <div class="modal" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title" id="aiModalTitle">Résultat de l'analyse IA</h3>
                    <button class="modal-close" id="closeAiModal"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <pre><code id="aiResultJson" class="json-highlight"></code></pre>
                </div>
                <div class="modal-footer">
                     <button class="btn btn-outline" id="copyAiJsonBtn"><i class="fas fa-copy"></i> Copier JSON</button>
                    <button class="btn btn-primary" id="okAiBtn">OK</button>
                </div>
            </div>`;
        document.body.appendChild(aiModal);
        
        document.getElementById('closeAddModal').addEventListener('click', () => NetworkMonitor.Utils.Modals.closeAddWebsite());
        document.getElementById('cancelAddBtn').addEventListener('click', () => NetworkMonitor.Utils.Modals.closeAddWebsite());
        document.getElementById('saveWebsiteBtn').addEventListener('click', () => NetworkMonitor.WebsiteManager.save());
        document.getElementById('addWebsiteForm').addEventListener('submit', (e) => { e.preventDefault(); NetworkMonitor.WebsiteManager.save(); });
        
        document.getElementById('closeCsvModal').addEventListener('click', () => NetworkMonitor.Utils.Modals.closeImport());
        document.getElementById('cancelCsvBtn').addEventListener('click', () => NetworkMonitor.Utils.Modals.closeImport());
        document.getElementById('importCsvBtn').addEventListener('click', () => NetworkMonitor.ImportExport.import());
        document.getElementById('csvFileInput').addEventListener('change', (e) => NetworkMonitor.ImportExport.handleFile(e));
        const uploadArea = document.getElementById('csvUploadArea');
        uploadArea.addEventListener('dragover', NetworkMonitor.ImportExport.handleDragOver);
        uploadArea.addEventListener('dragleave', NetworkMonitor.ImportExport.handleDragLeave);
        uploadArea.addEventListener('drop', (e) => NetworkMonitor.ImportExport.handleDrop(e));

        document.getElementById('closeAiModal').addEventListener('click', () => this.closeAIResultModal());
        document.getElementById('okAiBtn').addEventListener('click', () => this.closeAIResultModal());
        document.getElementById('copyAiJsonBtn').addEventListener('click', () => this.copyAIJson());
    },

    // ... renderMatrix and createMatrixRow are unchanged ...
    renderMatrix() {
        const tbody = document.getElementById('statusMatrixBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (NetworkMonitor.state.websites.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7">${this.getEmptyStateHTML()}</td></tr>`;
            return;
        }

        const filteredWebsites = NetworkMonitor.Utils.Filter.getFilteredWebsites('matrix');
        filteredWebsites.forEach(website => tbody.appendChild(this.createMatrixRow(website)));
    },
    
    createMatrixRow(website) {
        const row = document.createElement('tr');
        row.dataset.id = website.id;

        const availability = NetworkMonitor.Analytics.calculateAvailability(website);
        const statusClass = this.getStatusClass(website.status);
        const socialHtml = this.getSocialIconsHTML(website.socialLinks || []);
        const tagsHtml = this.getTagsHTML(website.tags || []);

        row.innerHTML = `
            <td>
                <input type="checkbox" class="matrix-checkbox" data-id="${website.id}">
                <a href="${website.url}" target="_blank" class="website-link">${website.name}</a>
            </td>
            <td>
                <div class="status-cell" onclick="NetworkMonitor.Checker.checkWebsite('${website.id}')">
                    <div class="status-indicator ${statusClass}">
                        ${website.status === 'checking' ? '<div class="loading"></div>' : '<i class="fas fa-circle"></i>'}
                    </div>
                    <div class="status-text">${website.status}</div>
                </div>
            </td>
            <td>${website.responseTime ? website.responseTime + 'ms' : 'N/A'}</td>
            <td>${availability}%</td>
            <td>${tagsHtml}</td>
            <td><div class="social-matrix">${socialHtml}</div></td>
            <td><div class="status-indicator ${website.ssl ? 'online' : 'offline'}"><i class="fas fa-lock"></i></div></td>
        `;
        row.querySelector('.matrix-checkbox').addEventListener('change', (e) => {
            NetworkMonitor.Utils.BulkActions.toggleSelection(website.id, e.target.checked);
        });
        return row;
    },
    
    renderWebsites() {
        const container = document.getElementById('websiteList');
        if (!container) return;
        container.innerHTML = '';

        if (NetworkMonitor.state.websites.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        const filteredWebsites = NetworkMonitor.Utils.Filter.getFilteredWebsites('list');
        filteredWebsites.forEach(website => container.appendChild(this.createWebsiteElement(website)));
    },
    
    // ... createCalendarLink is unchanged ...
    createCalendarLink(event) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!event.date || !dateRegex.test(event.date)) {
            return null;
        }

        const startDate = new Date(event.date);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1);

        const startDateStr = startDate.toISOString().slice(0, 10).replace(/-/g, '');
        const endDateStr = endDate.toISOString().slice(0, 10).replace(/-/g, '');

        const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
        const params = new URLSearchParams({
            text: event.name || 'Événement',
            details: event.description || '',
            dates: `${startDateStr}/${endDateStr}`
        });

        return `${baseUrl}&${params.toString()}`;
    },

    createWebsiteElement(website) {
        const element = document.createElement('div');
        element.className = 'website-item';
        element.dataset.id = website.id;
        if (website.status === 'parking') element.classList.add('parking');
        if (website.status === 'invalid') element.classList.add('invalid');

        const availability = NetworkMonitor.Analytics.calculateAvailability(website);
        const statusClass = `status-${website.status || 'checking'}`;
        const availabilityClass = availability >= 90 ? 'availability-high' : availability >= 70 ? 'availability-medium' : 'availability-low';

        const screenshotHtml = website.screenshotUrl ? `
            <div class="website-screenshot" 
                 style="background-image: url('${website.screenshotUrl}');"
                 onclick="window.open('${website.url}', '_blank');"
                 title="Voir un aperçu de ${website.name}">
            </div>` : `
            <div class="website-screenshot website-screenshot--placeholder">
                <i class="fas fa-image"></i>
            </div>`;
        
        let aiContentHtml = '';
        if (website.aiAnalyzedData) {
            const { projects, events } = website.aiAnalyzedData;
            if (projects && projects.length > 0) {
                aiContentHtml += `
                    <div class="ai-content-section">
                        <h4><i class="fas fa-tasks"></i> Projets identifiés par l'IA</h4>
                        <ul>
                            ${projects.map(p => `<li><strong>${p.name || 'Projet sans nom'}:</strong> ${p.description || ''}</li>`).join('')}
                        </ul>
                    </div>`;
            }
            if (events && events.length > 0) {
                aiContentHtml += `
                    <div class="ai-content-section">
                        <h4><i class="fas fa-calendar-alt"></i> Événements identifiés par l'IA</h4>
                        <ul>
                            ${events.map(e => {
                                const calendarLink = this.createCalendarLink(e);
                                const calendarButton = calendarLink 
                                    ? `<a href="${calendarLink}" target="_blank" class="btn-calendar" title="Ajouter à Google Agenda"><i class="fas fa-calendar-plus"></i></a>` 
                                    : '';
                                return `<li>
                                            <div class="event-item">
                                                <span><strong>${e.name || 'Événement sans nom'}</strong> (${e.date || 'N/A'}): ${e.description || ''}</span>
                                                ${calendarButton}
                                            </div>
                                        </li>`;
                            }).join('')}
                        </ul>
                    </div>`;
            }
        }
        
        element.innerHTML = `
            ${screenshotHtml}
            <div class="website-header">
                <div class="website-info">
                    <div class="website-favicon">${website.favicon ? `<img src="${website.favicon}" alt="">` : `<i class="fas fa-globe"></i>`}</div>
                    <div class="website-details">
                        <h3>${website.name}</h3>
                        <div class="website-url"><a href="${website.url}" target="_blank">${website.url}</a></div>
                    </div>
                </div>
                <span class="status-badge ${statusClass}">${this.getStatusIcon(website.status)} ${website.status}</span>
            </div>
            ${website.description ? `<div class="website-description">${website.description}</div>` : ''}
            <div class="tags-container">${this.getTagsHTML(website.tags || [])}</div>
            <div class="website-meta">
                <span><i class="fas fa-clock"></i> ${website.lastChecked ? new Date(website.lastChecked).toLocaleString('fr-FR') : 'Jamais'}</span>
                <span class="availability-badge ${availabilityClass}">${availability}% disponible</span>
                ${website.responseTime ? `<span><i class="fas fa-stopwatch"></i> ${website.responseTime}ms</span>` : ''}
            </div>
            ${aiContentHtml}
            <div class="website-actions">
                <button class="btn btn-outline btn-sm" onclick="NetworkMonitor.Checker.checkWebsite('${website.id}')">Revérifier</button>
                <button class="btn btn-outline btn-sm" onclick="NetworkMonitor.WebsiteManager.edit('${website.id}')">Modifier</button>
                <button class="btn btn-danger btn-sm" onclick="NetworkMonitor.WebsiteManager.delete('${website.id}')">Supprimer</button>
                <button class="btn btn-ai btn-sm" onclick="NetworkMonitor.AI.triggerAnalysis('${website.id}', this)">
                    <i class="fas fa-brain"></i> Analyser avec IA
                </button>
            </div>
        `;
        return element;
    },

    // ... other functions ...
    renderTagFilter() {
        const select = document.getElementById('tagFilter');
        if (!select) return;
        const tags = [...new Set(NetworkMonitor.state.websites.flatMap(w => w.tags || []))];
        select.innerHTML = '<option value="">Tous les Tags</option>';
        tags.sort().forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            select.appendChild(option);
        });
    },

    loadSettings() {
        const settings = NetworkMonitor.state.settings;
        document.getElementById('googleApiKey').value = settings.googleApiKey || '';
        document.getElementById('checkInterval').value = settings.checkInterval || NetworkMonitor.config.defaultCheckInterval;
        document.getElementById('notifyOffline').checked = settings.notifications?.offline !== false;
        document.getElementById('notifyOnline').checked = settings.notifications?.online !== false;
        document.getElementById('notifySlowResponse').checked = settings.notifications?.slowResponse === true;
        
        // Populate AI models if they were fetched before
        if (NetworkMonitor.state.aiModels.length > 0) {
            this.populateAIModelsDropdown(NetworkMonitor.state.aiModels);
        }
        document.getElementById('googleApiModelSelect').value = settings.googleApiModel || 'models/gemini-1.5-flash-latest';
    },

    async loadAIModels() {
        const apiKey = document.getElementById('googleApiKey').value;
        if (!apiKey) {
            NetworkMonitor.Utils.Notifications.show("Veuillez d'abord entrer votre clé API Google AI.", 'warning');
            return;
        }

        const btn = document.getElementById('loadAiModelsBtn');
        const originalBtnText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div class="loading"></div>';

        try {
            const models = await NetworkMonitor.API.fetchGoogleAIModels(apiKey);
            this.populateAIModelsDropdown(models);
            NetworkMonitor.Utils.Notifications.show('Modèles IA chargés avec succès.', 'success');
        } catch (error) {
            NetworkMonitor.Utils.Notifications.show(`Échec du chargement des modèles : ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }
    },

    populateAIModelsDropdown(models) {
        const select = document.getElementById('googleApiModelSelect');
        select.innerHTML = '';
        select.disabled = false;

        // Filter for compatible models (Gemini family, supporting 'generateContent')
        const compatibleModels = models.filter(model => 
            model.supportedGenerationMethods.includes('generateContent') && model.name.includes('gemini')
        );

        if (compatibleModels.length === 0) {
            select.innerHTML = '<option value="">Aucun modèle compatible trouvé</option>';
            select.disabled = true;
            return;
        }

        compatibleModels.forEach(model => {
            const option = document.createElement('option');
            // 'models/gemini-pro' -> 'gemini-pro'
            const displayName = model.displayName || model.name.split('/').pop();
            option.value = model.name;
            option.textContent = displayName;
            select.appendChild(option);
        });

        NetworkMonitor.state.aiModels = compatibleModels; // Save the filtered list
        select.value = NetworkMonitor.state.settings.googleApiModel || 'models/gemini-1.5-flash-latest';
    },
    
    getEmptyStateHTML() {
        return `
            <div class="text-center" style="padding: 4rem;">
                <h3 style="margin-bottom: 0.75rem;">Aucun site web ajouté pour le moment</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Cliquez sur 'Ajouter un site' pour commencer la surveillance.</p>
                <button class="btn btn-primary" onclick="NetworkMonitor.Utils.Modals.openAddWebsite()">Ajouter votre premier site</button>
            </div>
        `;
    },
    
    showAIResultModal(websiteName, jsonData) {
        document.getElementById('aiModalTitle').textContent = `Analyse IA pour : ${websiteName}`;
        const codeElement = document.getElementById('aiResultJson');
        const formattedJson = JSON.stringify(jsonData, null, 2);
        
        codeElement.innerHTML = formattedJson
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
            .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
            .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
            .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
            .replace(/: null/g, ': <span class="json-null">null</span>');

        document.getElementById('aiResultModal').classList.add('show');
    },

    closeAIResultModal() {
        document.getElementById('aiResultModal').classList.remove('show');
    },

    copyAIJson() {
        const jsonText = document.getElementById('aiResultJson').textContent;
        navigator.clipboard.writeText(jsonText).then(() => {
            NetworkMonitor.Utils.Notifications.show('JSON copié dans le presse-papiers !', 'success');
        }, () => {
            NetworkMonitor.Utils.Notifications.show('La copie du JSON a échoué.', 'error');
        });
    },

    getStatusClass: (status) => ({ 'online': 'online', 'offline': 'offline', 'checking': 'checking', 'parking': 'parking', 'invalid': 'invalid' }[status] || 'not-checked'),
    getStatusIcon: (status) => ({ 'checking': '<div class="loading"></div>', 'online': '<i class="fas fa-check"></i>', 'offline': '<i class="fas fa-times"></i>'}[status] || '<i class="fas fa-question"></i>'),
    getSocialIconsHTML: (links) => links.map(link => `<a href="${link.url}" target="_blank" class="social-icon social-${link.platform}" title="${link.platform}"><i class="fab fa-${link.platform}"></i></a>`).join(''),
    getTagsHTML: (tags) => tags.map(tag => `<span class="tag tag-primary">${tag}</span>`).join(''),
    
    toggleDarkMode() {
        NetworkMonitor.state.darkMode = document.body.classList.toggle('dark-mode');
        document.getElementById('darkModeToggle').innerHTML = NetworkMonitor.state.darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        NetworkMonitor.saveState();
        if(document.getElementById('analytics-content')) {
             this.renderTabContent('analytics');
        }
    },
    toggleSidebar: () => document.getElementById('sidebar').classList.toggle('sidebar-collapsed'),
    toggleFilterOptions: () => document.getElementById('filterOptions')?.classList.toggle('hidden'),

    switchSection(section) {
        document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.section === section));
        const tabMap = { 'dashboard': 'network-status', 'network-view': 'network-status', 'detailed-view': 'detailed-view', 'analytics': 'analytics', 'settings': 'settings' };
        this.switchTab(tabMap[section]);
    },
    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
        this.renderTabContent(tabName);
    },
    
    updateWebsiteInMatrix(website) {
        const row = document.querySelector(`#statusMatrixBody tr[data-id="${website.id}"]`);
        if (row) row.replaceWith(this.createMatrixRow(website));
    },
    updateWebsiteInList(website) {
        const element = document.querySelector(`#websiteList .website-item[data-id="${website.id}"]`);
        if (element) element.replaceWith(this.createWebsiteElement(website));
    },
};