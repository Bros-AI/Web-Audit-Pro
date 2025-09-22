NetworkMonitor.Utils = {
    /**
     * Handles displaying notifications to the user.
     */
    Notifications: {
        show(message, type = 'info', duration = 5000) {
            const container = document.getElementById('notificationContainer');
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            const icon = { 'success': 'check-circle', 'error': 'exclamation-circle', 'warning': 'exclamation-triangle', 'info': 'info-circle'}[type];
            notification.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
            
            container.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('hiding');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    },

    /**
     * Manages opening and closing of modal dialogs.
     */
    Modals: {
        openAddWebsite() {
            document.getElementById('addWebsiteForm').reset();
            const saveBtn = document.getElementById('saveWebsiteBtn');
            saveBtn.removeAttribute('data-editing');
            saveBtn.querySelector('span').textContent = 'Ajouter & Vérifier le site';
            this.hideError();
            document.getElementById('addWebsiteModal').classList.add('show');
        },
        closeAddWebsite: () => document.getElementById('addWebsiteModal').classList.remove('show'),
        openImport: () => document.getElementById('csvImportModal').classList.add('show'),
        closeImport() {
            const modal = document.getElementById('csvImportModal');
            modal.classList.remove('show');
            document.getElementById('csvFileInput').value = '';
            document.getElementById('csvPreview').classList.add('hidden');
            document.getElementById('importCsvBtn').disabled = true;
            NetworkMonitor.state.csvData = null;
        },
        showError: (message) => {
            const errDiv = document.getElementById('modalError');
            errDiv.textContent = message;
            errDiv.classList.remove('hidden');
        },
        hideError: () => document.getElementById('modalError').classList.add('hidden'),
    },

    /**
     * Handles filtering and sorting of the website lists.
     */
    Filter: {
        search(term) {
            const searchTerm = term.toLowerCase();
            document.querySelectorAll('.website-item, #statusMatrixBody tr').forEach(el => {
                el.style.display = el.textContent.toLowerCase().includes(searchTerm) ? '' : 'none';
            });
        },
        getFilteredWebsites(view) {
            let websites = [...NetworkMonitor.state.websites];
            const filterId = view === 'matrix' ? 'matrixFilter' : 'statusFilter';
            const statusFilter = document.getElementById(filterId)?.value;

            if (statusFilter && statusFilter !== 'all') {
                if (statusFilter === 'issues') {
                    websites = websites.filter(w => ['offline', 'parking', 'invalid'].includes(w.status));
                } else if (statusFilter !== '') {
                    websites = websites.filter(w => w.status === statusFilter);
                }
            }

            if (view === 'list') {
                const tagFilter = document.getElementById('tagFilter')?.value;
                if (tagFilter) {
                    websites = websites.filter(w => (w.tags || []).includes(tagFilter));
                }

                const sortBy = document.getElementById('sortBy')?.value;
                websites.sort((a, b) => {
                    switch (sortBy) {
                        case 'name': return a.name.localeCompare(b.name);
                        case 'status': return (a.status || '').localeCompare(b.status || '');
                        case 'responseTime': return (a.responseTime || 99999) - (b.responseTime || 99999);
                        case 'availability': return NetworkMonitor.Analytics.calculateAvailability(b) - NetworkMonitor.Analytics.calculateAvailability(a);
                        case 'lastChecked': return new Date(b.lastChecked || 0) - new Date(a.lastChecked || 0);
                        default: return 0;
                    }
                });
            }
            return websites;
        }
    },

    /**
     * Manages bulk actions on selected websites.
     */
    BulkActions: {
        toggleSelection(websiteId, checked) {
            if (checked) NetworkMonitor.state.selectedWebsites.add(websiteId);
            else NetworkMonitor.state.selectedWebsites.delete(websiteId);
        },
        selectAll(checked) {
            document.querySelectorAll('.matrix-checkbox').forEach(cb => {
                cb.checked = checked;
                this.toggleSelection(cb.dataset.id, checked);
            });
        },
        showMenu() {
            if (NetworkMonitor.state.selectedWebsites.size === 0) {
                this.Notifications.show('Aucun site sélectionné', 'warning');
                return;
            }
            this.Notifications.show(`${NetworkMonitor.state.selectedWebsites.size} sites sélectionnés. Actions de masse bientôt disponibles !`, 'info');
        }
    },
    
    /**
     * Manages application data like history and resets.
     */
    DataManager: {
        clearHistory() {
            if (confirm("Êtes-vous sûr de vouloir vider tout l'historique de vérification ? Cette action est irréversible.")) {
                NetworkMonitor.state.websites.forEach(website => { website.checkHistory = []; });
                NetworkMonitor.saveState();
                NetworkMonitor.UI.renderAll();
                NetworkMonitor.Utils.Notifications.show("Tout l'historique a été vidé", 'success');
            }
        },
        resetApplication() {
            if (confirm("DANGER ! Êtes-vous sûr de vouloir réinitialiser l'application ? TOUTES LES DONNÉES seront perdues de manière permanente.")) {
                Object.values(NetworkMonitor.config.localStorage).forEach(key => localStorage.removeItem(key));
                location.reload();
            }
        }
    }
};