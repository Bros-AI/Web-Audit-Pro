/**
 * Manages website data (add, edit, delete).
 */
NetworkMonitor.WebsiteManager = {
    async save() {
        const url = document.getElementById('websiteUrl').value.trim();
        const name = document.getElementById('websiteName').value.trim();
        const tags = document.getElementById('websiteTags').value.split(',').map(t => t.trim()).filter(t => t);
        const description = document.getElementById('websiteDescription').value.trim();
        const checkFrequency = document.getElementById('websiteCheckFrequency').value;
        
        if (!url) {
            NetworkMonitor.Utils.Modals.showError('Veuillez entrer une URL de site web');
            return;
        }

        let normalizedUrl;
        try {
            normalizedUrl = this.normalizeUrl(url);
        } catch (error) {
            NetworkMonitor.Utils.Modals.showError('Veuillez entrer une URL valide');
            return;
        }

        const editingId = document.getElementById('saveWebsiteBtn').getAttribute('data-editing');
        
        if (!editingId && NetworkMonitor.state.websites.some(w => w.url === normalizedUrl)) {
            NetworkMonitor.Utils.Modals.showError('Ce site est déjà surveillé');
            return;
        }

        const saveBtn = document.getElementById('saveWebsiteBtn');
        const saveText = saveBtn.querySelector('span');
        
        saveBtn.disabled = true;
        saveText.innerHTML = '<div class="loading"></div> Vérification...';

        let website;
        if (editingId) {
            website = NetworkMonitor.state.websites.find(w => w.id === editingId);
            website.url = normalizedUrl;
            website.name = name || this.extractDomainName(normalizedUrl);
            website.tags = tags;
            website.description = description;
            website.checkFrequency = checkFrequency;
        } else {
            website = this.createWebsite(normalizedUrl, name, tags, description, checkFrequency);
            NetworkMonitor.state.websites.push(website);
        }
        
        NetworkMonitor.saveState();
        NetworkMonitor.UI.renderAll();

        try {
            await NetworkMonitor.Checker.checkWebsite(website.id);
            NetworkMonitor.Utils.Modals.closeAddWebsite();
            NetworkMonitor.Utils.Notifications.show(
                editingId ? 'Site web mis à jour avec succès' : 'Site web ajouté avec succès',
                'success'
            );
        } catch (error) {
            console.error('Erreur lors de la vérification du site:', error);
            NetworkMonitor.Utils.Notifications.show("Site web ajouté mais la vérification a échoué", 'warning');
        } finally {
            saveBtn.disabled = false;
            saveText.textContent = editingId ? 'Mettre à jour le site' : 'Ajouter & Vérifier';
        }
    },

    createWebsite(url, name, tags, description, checkFrequency) {
        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            url: url,
            name: name || this.extractDomainName(url),
            tags: tags,
            description: description,
            checkFrequency: checkFrequency,
            status: 'not-checked',
            lastChecked: null,
            responseTime: null,
            socialLinks: [],
            favicon: null,
            screenshotUrl: null,
            title: '',
            ssl: false,
            mobile: false,
            addedDate: new Date().toISOString(),
            errorMessage: null,
            checkHistory: [],
            aiAnalyzedData: null 
        };
    },

    edit(websiteId) {
        const website = NetworkMonitor.state.websites.find(w => w.id === websiteId);
        if (!website) return;
        
        NetworkMonitor.Utils.Modals.openAddWebsite();

        document.getElementById('websiteUrl').value = website.url;
        document.getElementById('websiteName').value = website.name;
        document.getElementById('websiteTags').value = (website.tags || []).join(', ');
        document.getElementById('websiteDescription').value = website.description || '';
        document.getElementById('websiteCheckFrequency').value = website.checkFrequency || 'default';
        
        const saveBtn = document.getElementById('saveWebsiteBtn');
        saveBtn.querySelector('span').textContent = 'Mettre à jour le site';
        saveBtn.setAttribute('data-editing', websiteId);
    },

    delete(websiteId) {
        const website = NetworkMonitor.state.websites.find(w => w.id === websiteId);
        if (!website) return;

        if (confirm(`Êtes-vous sûr de vouloir supprimer "${website.name}" ?`)) {
            NetworkMonitor.state.websites = NetworkMonitor.state.websites.filter(w => w.id !== websiteId);
            NetworkMonitor.saveState();
            NetworkMonitor.UI.renderAll();
            NetworkMonitor.Utils.Notifications.show('Site web supprimé avec succès', 'success');
        }
    },

    normalizeUrl(url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        return new URL(url).href;
    },

    extractDomainName(url) {
        try {
            const domain = new URL(url).hostname;
            return domain.replace(/^www\./, '');
        } catch {
            return url;
        }
    }
};