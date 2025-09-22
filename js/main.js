// js/main.js

/**
 * Main application object. Acts as a namespace and holds
 * configuration, state, and initialization logic.
 */
const NetworkMonitor = {
    // Configuration
    config: {
        version: '2.1.0-fr', // Updated version
        defaultCheckInterval: 300000, // 5 minutes
        maxRetries: 3,
        requestTimeout: 15000,
        corsProxies: [
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://api.allorigins.win/get?url=',
            'https://corsproxy.io/?'
        ],
        localStorage: {
            websites: 'nm_websites',
            settings: 'nm_settings',
            darkMode: 'nm_darkMode',
            analytics: 'nm_analytics'
        }
    },

    // State Management
    state: {
        websites: [],
        settings: {},
        darkMode: false,
        csvData: null,
        selectedWebsites: new Set(),
        isChecking: false,
        charts: {},
        aiModels: [] // ADDED: To store fetched AI models
    },

    /**
     * Initialize the application
     */
    init() {
        this.loadState();
        this.UI.initRender();
        this.setupEventListeners();
        this.startAutoCheck();
        console.log('NetworkMonitor Pro initialisé v' + this.config.version);
    },

    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            this.state.websites = JSON.parse(localStorage.getItem(this.config.localStorage.websites)) || [];
            this.state.settings = JSON.parse(localStorage.getItem(this.config.localStorage.settings)) || this.getDefaultSettings();
            this.state.darkMode = localStorage.getItem(this.config.localStorage.darkMode) === 'true';
            
            if (this.state.darkMode) {
                document.body.classList.add('dark-mode');
                document.getElementById('darkModeToggle').innerHTML = '<i class="fas fa-sun"></i>';
            }
        } catch (error) {
            console.error('Error loading state:', error);
            this.Utils.Notifications.show('Erreur lors du chargement des données sauvegardées', 'error');
        }
    },

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            checkInterval: this.config.defaultCheckInterval,
            notifications: {
                offline: true,
                online: true,
                slowResponse: false
            },
            slowResponseThreshold: 3000,
            googleApiKey: '',
            googleApiModel: 'models/gemini-1.5-flash-latest' // UPDATED: Default model
        };
    },

    /**
     * Save state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem(this.config.localStorage.websites, JSON.stringify(this.state.websites));
            localStorage.setItem(this.config.localStorage.settings, JSON.stringify(this.state.settings));
            localStorage.setItem(this.config.localStorage.darkMode, this.state.darkMode);
        } catch (error) {
            console.error('Error saving state:', error);
            this.Utils.Notifications.show('Erreur lors de la sauvegarde des données', 'error');
        }
    },

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        document.getElementById('darkModeToggle').addEventListener('click', () => this.UI.toggleDarkMode());
        document.getElementById('toggleSidebar').addEventListener('click', () => this.UI.toggleSidebar());
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.UI.switchSection(link.dataset.section);
            });
        });
        
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => this.UI.switchTab(tab.dataset.tab));
        });
        
        let searchTimeout;
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => this.Utils.Filter.search(e.target.value), 300);
        });
        
        document.getElementById('addWebsiteBtn').addEventListener('click', () => this.Utils.Modals.openAddWebsite());
        document.getElementById('csvImportBtn').addEventListener('click', () => this.Utils.Modals.openImport());
        document.getElementById('checkAllBtn').addEventListener('click', () => this.Checker.checkAll());
        
        window.addEventListener('beforeunload', () => this.saveState());
    },

    /**
     * Start the automatic checking timer
     */
    startAutoCheck() {
        if (this.autoCheckTimer) {
            clearInterval(this.autoCheckTimer);
        }
        
        this.autoCheckTimer = setInterval(() => {
            if (this.state.websites.length > 0 && !this.state.isChecking) {
                console.log('Auto-vérification des sites web...');
                this.Checker.checkAll(true); // silent check
            }
        }, this.state.settings.checkInterval || this.config.defaultCheckInterval);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    NetworkMonitor.init();
});