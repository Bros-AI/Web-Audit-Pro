NetworkMonitor.ImportExport = {
    handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.parseFile(e.target.result, file.type);
            } catch (error) {
                NetworkMonitor.Utils.Notifications.show('Failed to parse file: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    },

    parseFile(content, fileType) {
        let websites;
        if (fileType.includes('csv')) {
            websites = this.parseCSV(content);
        } else if (fileType.includes('json')) {
            websites = this.parseJSON(content);
        } else {
            websites = this.parseText(content);
        }

        if (!websites || websites.length === 0) {
            NetworkMonitor.Utils.Notifications.show('No valid websites found in file', 'warning');
            return;
        }

        NetworkMonitor.state.csvData = websites;
        // Show preview in modal
        const previewBody = document.getElementById('csvPreviewBody');
        previewBody.innerHTML = `Found ${websites.length} websites. Click Import to proceed.`;
        document.getElementById('csvPreview').classList.remove('hidden');
        document.getElementById('importCsvBtn').disabled = false;
    },

    parseCSV(content) {
        // ... (Implementation from original script)
        const lines = content.trim().split('\n').slice(1); // skip header
        return lines.map(line => {
            const [url, name, tags, description] = line.split(',');
            if (url) return { url: url.trim(), name: name?.trim(), tags: tags?.trim().split(';'), description: description?.trim() };
            return null;
        }).filter(Boolean);
    },

    parseJSON(content) {
        return JSON.parse(content);
    },
    
    parseText(content) {
        return content.trim().split('\n').map(url => ({ url: url.trim() }));
    },
    
    async import() {
        if (!NetworkMonitor.state.csvData) return;
        
        const existingUrls = new Set(NetworkMonitor.state.websites.map(w => w.url));
        let importedCount = 0;
        
        NetworkMonitor.state.csvData.forEach(data => {
            try {
                const normalizedUrl = NetworkMonitor.WebsiteManager.normalizeUrl(data.url);
                if (!existingUrls.has(normalizedUrl)) {
                    const website = NetworkMonitor.WebsiteManager.createWebsite(
                        normalizedUrl, data.name, data.tags, data.description, 'default'
                    );
                    NetworkMonitor.state.websites.push(website);
                    existingUrls.add(normalizedUrl);
                    importedCount++;
                }
            } catch (e) {
                console.warn("Skipping invalid URL from import:", data.url);
            }
        });

        NetworkMonitor.saveState();
        NetworkMonitor.UI.renderAll();
        NetworkMonitor.Utils.Modals.closeImport();
        NetworkMonitor.Utils.Notifications.show(`Successfully imported ${importedCount} new websites`, 'success');
        
        if (importedCount > 0) {
            NetworkMonitor.Checker.checkAll();
        }
    },
    
    export(type) {
        const data = NetworkMonitor.state.websites.map(w => ({
            url: w.url,
            name: w.name,
            tags: w.tags,
            description: w.description,
            status: w.status,
            lastChecked: w.lastChecked,
            responseTime: w.responseTime,
            availability: NetworkMonitor.Analytics.calculateAvailability(w)
        }));
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `network-monitor-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        NetworkMonitor.Utils.Notifications.show('Export completed successfully', 'success');
    },
    
    // Drag and Drop handlers
    handleDragOver: (e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); },
    handleDragLeave: (e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); },
    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            document.getElementById('csvFileInput').files = e.dataTransfer.files;
            this.handleFile({ target: { files: e.dataTransfer.files } });
        }
    },
    
    exportSettings() { /* Logic to export settings */ },
    importSettings() { /* Logic to import settings */ },
};