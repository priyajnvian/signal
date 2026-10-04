// Signal by ELI - PR Media Monitoring Extension
console.log('Signal: Extension loaded');

class SignalExtension {
    constructor() {
        console.log('Signal: Initializing...');
        
        // Initialize properties
        this.clients = [];
        this.mentions = [];
        
        // Get DOM elements
        this.initElements();
        
        // Load existing data and setup
        this.init();
    }
    
    initElements() {
        // Main containers
        this.dashboard = document.getElementById('dashboard');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        
        // Client management
        this.clientsContainer = document.getElementById('clients-container');
        this.noClientsState = document.getElementById('no-clients');
        this.addClientBtn = document.getElementById('add-client-btn');
        this.addFirstClientBtn = document.getElementById('add-first-client');
        
        // Modal elements
        this.modal = document.getElementById('add-client-modal');
        this.closeModalBtn = document.getElementById('close-modal');
        this.cancelClientBtn = document.getElementById('cancel-client');
        this.saveClientBtn = document.getElementById('save-client');
        
        // Form inputs
        this.clientNameInput = document.getElementById('client-name');
        this.clientCompanyInput = document.getElementById('client-company');
        this.clientKeywordsInput = document.getElementById('client-keywords');
        
        // Mentions
        this.mentionsContainer = document.getElementById('mentions-container');
        this.noMentionsState = document.getElementById('no-mentions');
        
        // Header buttons
        this.refreshBtn = document.getElementById('refresh-btn');
        this.settingsBtn = document.getElementById('settings-btn');
        this.retryBtn = document.getElementById('retry-btn');
        
        // Status
        this.lastCheckTime = document.getElementById('last-check-time');
        
        console.log('Signal: DOM elements initialized');
    }
    
    async init() {
        try {
            // Setup event listeners
            this.setupEventListeners();
            
            // Load saved data
            await this.loadData();
            
            // Render initial state
            this.renderClients();
            this.renderMentions();
            
            // Update last check time
            this.updateLastCheckTime();
            
            console.log('Signal: Initialization complete');
        } catch (error) {
            console.error('Signal: Initialization error:', error);
            this.showError('Failed to initialize Signal');
        }
    }
    
    setupEventListeners() {
        // Add client buttons
        if (this.addFirstClientBtn) {
            this.addFirstClientBtn.addEventListener('click', () => this.openAddClientModal());
        }
        if (this.addClientBtn) {
            this.addClientBtn.addEventListener('click', () => this.openAddClientModal());
        }
        
        // Modal controls
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeAddClientModal());
        }
        if (this.cancelClientBtn) {
            this.cancelClientBtn.addEventListener('click', () => this.closeAddClientModal());
        }
        if (this.saveClientBtn) {
            this.saveClientBtn.addEventListener('click', () => this.saveClient());
        }
        
        // Header buttons
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => this.refreshMentions());
        }
        if (this.retryBtn) {
            this.retryBtn.addEventListener('click', () => this.init());
        }
        
        // Modal background click to close
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeAddClientModal();
                }
            });
        }
        
        console.log('Signal: Event listeners setup complete');
    }
    
    async loadData() {
        try {
            const result = await chrome.storage.local.get(['signalClients', 'signalMentions', 'lastCheckTime']);
            
            this.clients = result.signalClients || [];
            this.mentions = result.signalMentions || [];
            
            console.log('Signal: Loaded data', {
                clients: this.clients.length,
                mentions: this.mentions.length
            });
        } catch (error) {
            console.error('Signal: Error loading data:', error);
            this.clients = [];
            this.mentions = [];
        }
    }
    
    async saveData() {
        try {
            await chrome.storage.local.set({
                signalClients: this.clients,
                signalMentions: this.mentions,
                lastSaveTime: Date.now()
            });
            console.log('Signal: Data saved successfully');
        } catch (error) {
            console.error('Signal: Error saving data:', error);
        }
    }
    
    openAddClientModal() {
        if (this.modal) {
            this.hideValidationError(); // Clear any previous errors
            this.modal.classList.remove('hidden');
            if (this.clientNameInput) {
                this.clientNameInput.focus();
            }
        }
    }
    
    closeAddClientModal() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            this.hideValidationError(); // Clear any validation errors
            // Clear form
            if (this.clientNameInput) this.clientNameInput.value = '';
            if (this.clientCompanyInput) this.clientCompanyInput.value = '';
            if (this.clientKeywordsInput) this.clientKeywordsInput.value = '';
        }
    }
    
    async saveClient() {
        try {
            const name = this.clientNameInput?.value?.trim() || '';
            const company = this.clientCompanyInput?.value?.trim() || '';
            const keywords = this.clientKeywordsInput?.value?.trim() || '';
            
            console.log('Signal: Saving client with data:', { name, company, keywords });
            
            // Validation
            if (!name || name.length === 0) {
                this.showValidationError('Please enter a client name');
                return;
            }
            
            if (!keywords || keywords.length === 0) {
                this.showValidationError('Please enter at least one keyword to track');
                return;
            }
            
            // Parse keywords (comma-separated, semicolon-separated, or line-separated)
            const keywordList = keywords
                .split(/[,;\n]/)
                .map(k => k.trim())
                .filter(k => k.length > 0);
            
            console.log('Signal: Parsed keywords:', keywordList);
            
            if (keywordList.length === 0) {
                this.showValidationError('Please enter valid keywords (separated by commas)');
                return;
            }
            
            // Create new client
            const newClient = {
                id: Date.now().toString(),
                name: name,
                company: company,
                keywords: keywordList,
                createdAt: Date.now(),
                isActive: true
            };
            
            // Add to clients list
            this.clients.push(newClient);
            
            // Save data
            await this.saveData();
            
            // Re-render UI
            this.renderClients();
            
            // Close modal
            this.closeAddClientModal();
            
            // Start monitoring for this client
            this.startMonitoring();
            
            console.log('Signal: Client added successfully:', newClient);
            
        } catch (error) {
            console.error('Signal: Error saving client:', error);
            this.showValidationError('Failed to save client. Please try again.');
        }
    }
    
    showValidationError(message) {
        // Create or update validation error display
        let errorDiv = document.querySelector('.validation-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'validation-error';
            errorDiv.style.cssText = `
                background: #fef2f2;
                border: 1px solid #fecaca;
                color: #dc2626;
                padding: 12px 16px;
                border-radius: 8px;
                margin: 16px 0;
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            this.modal.querySelector('.modal-body').prepend(errorDiv);
        }
        
        errorDiv.innerHTML = `<span>⚠️</span> ${message}`;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDiv && errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    hideValidationError() {
        const errorDiv = document.querySelector('.validation-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
    
    renderClients() {
        if (!this.clientsContainer) return;
        
        if (this.clients.length === 0) {
            // Show empty state
            if (this.noClientsState) this.noClientsState.classList.remove('hidden');
            if (this.addClientBtn) this.addClientBtn.classList.add('hidden');
        } else {
            // Hide empty state, show add button
            if (this.noClientsState) this.noClientsState.classList.add('hidden');
            if (this.addClientBtn) this.addClientBtn.classList.remove('hidden');
            
            // Render clients
            const clientsHTML = this.clients.map(client => this.createClientHTML(client)).join('');
            
            // Find or create clients list
            let clientsList = this.clientsContainer.querySelector('.clients-list');
            if (!clientsList) {
                clientsList = document.createElement('div');
                clientsList.className = 'clients-list';
                this.clientsContainer.appendChild(clientsList);
            }
            
            clientsList.innerHTML = clientsHTML;
            
            // Add event listeners for client actions
            this.setupClientEventListeners();
        }
    }
    
    createClientHTML(client) {
        const keywordsText = client.keywords.slice(0, 3).join(', ') + 
                            (client.keywords.length > 3 ? ` (+${client.keywords.length - 3} more)` : '');
        
        return `
            <div class="client-card" data-client-id="${client.id}">
                <div class="client-header">
                    <div class="client-info">
                        <h4 class="client-name">${this.escapeHtml(client.name)}</h4>
                        ${client.company ? `<span class="client-company">${this.escapeHtml(client.company)}</span>` : ''}
                    </div>
                    <div class="client-actions">
                        <button class="client-toggle ${client.isActive ? 'active' : ''}" data-client-id="${client.id}" title="${client.isActive ? 'Pause monitoring' : 'Resume monitoring'}">
                            ${client.isActive ? '⏸️' : '▶️'}
                        </button>
                        <button class="client-delete" data-client-id="${client.id}" title="Delete client">🗑️</button>
                    </div>
                </div>
                <div class="client-keywords">
                    <small>Tracking: ${this.escapeHtml(keywordsText)}</small>
                </div>
                <div class="client-status">
                    <span class="status-indicator ${client.isActive ? 'active' : 'paused'}"></span>
                    <small>${client.isActive ? 'Monitoring active' : 'Monitoring paused'}</small>
                </div>
            </div>
        `;
    }
    
    setupClientEventListeners() {
        // Toggle client monitoring
        document.querySelectorAll('.client-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clientId = e.target.dataset.clientId;
                this.toggleClientMonitoring(clientId);
            });
        });
        
        // Delete client
        document.querySelectorAll('.client-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clientId = e.target.dataset.clientId;
                this.deleteClient(clientId);
            });
        });
    }
    
    async toggleClientMonitoring(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (client) {
            client.isActive = !client.isActive;
            await this.saveData();
            this.renderClients();
            console.log(`Signal: ${client.isActive ? 'Started' : 'Stopped'} monitoring for ${client.name}`);
        }
    }
    
    async deleteClient(clientId) {
        const client = this.clients.find(c => c.id === clientId);
        if (client && confirm(`Are you sure you want to delete ${client.name}? This will also remove all their mentions.`)) {
            // Remove client
            this.clients = this.clients.filter(c => c.id !== clientId);
            
            // Remove mentions for this client
            this.mentions = this.mentions.filter(m => m.clientId !== clientId);
            
            await this.saveData();
            this.renderClients();
            this.renderMentions();
            
            console.log(`Signal: Deleted client ${client.name}`);
        }
    }
    
    renderMentions() {
        if (!this.mentionsContainer) return;
        
        // Get recent mentions (last 7 days)
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentMentions = this.mentions
            .filter(m => m.publishedAt > weekAgo)
            .sort((a, b) => b.publishedAt - a.publishedAt)
            .slice(0, 10);
        
        if (recentMentions.length === 0) {
            if (this.noMentionsState) this.noMentionsState.classList.remove('hidden');
        } else {
            if (this.noMentionsState) this.noMentionsState.classList.add('hidden');
            
            const mentionsHTML = recentMentions.map(mention => this.createMentionHTML(mention)).join('');
            this.mentionsContainer.innerHTML = mentionsHTML;
            
            // Add click listeners for mentions
            document.querySelectorAll('.mention-card').forEach(card => {
                card.addEventListener('click', () => {
                    const url = card.dataset.url;
                    if (url) {
                        chrome.tabs.create({ url: url });
                    }
                });
            });
        }
    }
    
    createMentionHTML(mention) {
        const client = this.clients.find(c => c.id === mention.clientId);
        const clientName = client ? client.name : 'Unknown Client';
        const timeAgo = this.getTimeAgo(mention.publishedAt);
        
        return `
            <div class="mention-card" data-url="${mention.url}">
                <div class="mention-header">
                    <span class="mention-client">${this.escapeHtml(clientName)}</span>
                    <span class="mention-time">${timeAgo}</span>
                </div>
                <h4 class="mention-title">${this.escapeHtml(mention.title)}</h4>
                <p class="mention-description">${this.escapeHtml(this.truncateText(mention.description, 100))}</p>
                <div class="mention-footer">
                    <span class="mention-source">${this.escapeHtml(mention.source)}</span>
                    <span class="mention-keyword">Matched: "${this.escapeHtml(mention.matchedKeyword)}"</span>
                </div>
            </div>
        `;
    }
    
    async refreshMentions() {
        if (this.clients.length === 0) {
            alert('Add some clients first to start monitoring!');
            return;
        }
        
        this.showLoading();
        
        try {
            // Trigger background monitoring
            chrome.runtime.sendMessage({ action: 'checkMentions' }, (response) => {
                if (response && response.success) {
                    console.log('Signal: Manual mention check triggered');
                    // Reload data after a short delay
                    setTimeout(() => {
                        this.loadData().then(() => {
                            this.renderMentions();
                            this.hideLoading();
                            this.updateLastCheckTime();
                        });
                    }, 2000);
                } else {
                    this.hideLoading();
                    this.showError('Failed to check for mentions');
                }
            });
        } catch (error) {
            console.error('Signal: Error refreshing mentions:', error);
            this.hideLoading();
            this.showError('Failed to refresh mentions');
        }
    }
    
    startMonitoring() {
        // Send message to background script to start monitoring
        chrome.runtime.sendMessage({ action: 'startMonitoring' }, (response) => {
            if (response && response.success) {
                console.log('Signal: Monitoring started');
            }
        });
    }
    
    updateLastCheckTime() {
        chrome.storage.local.get(['lastCheckTime'], (result) => {
            if (result.lastCheckTime) {
                const timeAgo = this.getTimeAgo(result.lastCheckTime);
                if (this.lastCheckTime) {
                    this.lastCheckTime.textContent = timeAgo;
                }
            }
        });
    }
    
    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }
    
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + '...';
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showLoading() {
        if (this.loading) this.loading.classList.remove('hidden');
        if (this.dashboard) this.dashboard.style.opacity = '0.5';
    }
    
    hideLoading() {
        if (this.loading) this.loading.classList.add('hidden');
        if (this.dashboard) this.dashboard.style.opacity = '1';
    }
    
    showError(message) {
        if (this.error) {
            this.error.classList.remove('hidden');
            const errorText = this.error.querySelector('p');
            if (errorText) errorText.textContent = message;
        }
        this.hideLoading();
    }
    
    hideError() {
        if (this.error) this.error.classList.add('hidden');
    }
}

// Initialize Signal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Signal: DOM loaded, initializing extension');
    try {
        new SignalExtension();
    } catch (error) {
        console.error('Signal: Failed to initialize:', error);
    }
});

console.log('Signal: Script loaded successfully');