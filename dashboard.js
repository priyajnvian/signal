// FeedMonitor - Dashboard JavaScript
console.log('Signal Dashboard: Script loaded');

class PRBuddyDashboard {
    constructor() {
        console.log('Signal Dashboard: Initializing...');
        
        // Initialize properties
        this.companies = [];
        this.mentions = [];
        
        // Get DOM elements
        this.initElements();
        
        // Load data and setup
        this.init();
    }
    
    initElements() {
        // Navigation elements
        this.refreshAllBtn = document.getElementById('refresh-all-btn');
        this.settingsBtn = document.getElementById('settings-btn');
        this.monitoringIndicator = document.getElementById('monitoring-indicator');
        this.monitoringStatusText = document.getElementById('monitoring-status-text');
        
        // Main containers
        this.loading = document.getElementById('loading');
        this.dashboard = document.getElementById('dashboard');
        
        // Company mentions
        this.companyMentionsContainer = document.getElementById('company-mentions-container');
        this.noCompaniesState = document.getElementById('no-companies');
        this.addCompanyBtn = document.getElementById('add-company-btn');
        this.addFirstCompanyBtn = document.getElementById('add-first-company');
        
        // Analytics
        this.totalMentions = document.getElementById('total-mentions');
        this.trendingMentions = document.getElementById('trending-mentions');
        this.activeCompanies = document.getElementById('active-companies');
        this.totalSpokespersons = document.getElementById('total-spokespersons');
        this.keywordsTracked = document.getElementById('keywords-tracked');
        this.analyticsPeriod = document.getElementById('analytics-period');
        
        // Activity elements removed
        
        // Modal elements
        this.companyModal = document.getElementById('add-company-modal');
        this.spokespersonModal = document.getElementById('add-spokesperson-modal');
        this.closeModalBtn = document.getElementById('close-modal');
        this.closeSpokespersonModalBtn = document.getElementById('close-spokesperson-modal');
        this.cancelCompanyBtn = document.getElementById('cancel-company');
        this.saveCompanyBtn = document.getElementById('save-company');
        this.cancelSpokespersonBtn = document.getElementById('cancel-spokesperson');
        this.saveSpokespersonBtn = document.getElementById('save-spokesperson');
        
        // Company form inputs
        this.companyNameInput = document.getElementById('company-name');
        this.spokespersonsContainer = document.getElementById('spokespersons-container');
        this.addSpokespersonBtn = document.getElementById('add-spokesperson-btn');
        
        // Spokesperson form inputs  
        this.spokespersonCompanySelect = document.getElementById('spokesperson-company');
        this.spokespersonNameInput = document.getElementById('spokesperson-name-standalone');
        this.spokespersonTitleInput = document.getElementById('spokesperson-title-standalone');
        this.spokespersonKeywordsInput = document.getElementById('spokesperson-keywords-standalone');
        
        // Footer and top menu
        this.lastCheckTime = document.getElementById('last-check-time');
        this.lastUpdateTime = document.getElementById('last-update-time');
        
        // Debug elements removed
        
        console.log('Signal Dashboard: DOM elements initialized');
    }
    
    async init() {
        try {
            // Setup event listeners
            this.setupEventListeners();
            
            // Load saved data
            await this.loadData();
            
            // Render initial state
            this.renderCompanyMentions();
            this.renderAnalytics();
            
            // Update status
            this.updateMonitoringStatus();
            this.updateLastCheckTime();
            
            // Start auto-refresh loop
            this.startAutoRefresh();
            
            // Clean up on page unload
            window.addEventListener('beforeunload', () => {
                this.stopAutoRefresh();
            });
            
            console.log('Signal Dashboard: Initialization complete');
        } catch (error) {
            console.error('Signal Dashboard: Initialization error:', error);
        }
    }
    
    setupEventListeners() {
        // Navigation buttons
        if (this.refreshAllBtn) {
            this.refreshAllBtn.addEventListener('click', () => this.refreshAllData());
        }
        
        // Company management
        if (this.addFirstCompanyBtn) {
            this.addFirstCompanyBtn.addEventListener('click', () => this.openAddCompanyModal());
        }
        if (this.addCompanyBtn) {
            this.addCompanyBtn.addEventListener('click', () => this.openAddCompanyModal());
        }
        
        // Company modal controls
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeAddCompanyModal());
        }
        if (this.cancelCompanyBtn) {
            this.cancelCompanyBtn.addEventListener('click', () => this.closeAddCompanyModal());
        }
        if (this.saveCompanyBtn) {
            this.saveCompanyBtn.addEventListener('click', () => this.saveCompany());
        }
        
        // Spokesperson modal controls
        if (this.closeSpokespersonModalBtn) {
            this.closeSpokespersonModalBtn.addEventListener('click', () => this.closeAddSpokespersonModal());
        }
        if (this.cancelSpokespersonBtn) {
            this.cancelSpokespersonBtn.addEventListener('click', () => this.closeAddSpokespersonModal());
        }
        if (this.saveSpokespersonBtn) {
            this.saveSpokespersonBtn.addEventListener('click', () => this.saveSpokesperson());
        }
        
        // Add spokesperson button in company form
        if (this.addSpokespersonBtn) {
            this.addSpokespersonBtn.addEventListener('click', () => this.addSpokespersonField());
        }
        
        // Filters
        if (this.mentionsFilter) {
            this.mentionsFilter.addEventListener('change', () => this.renderMentions());
        }
        if (this.analyticsPeriod) {
            this.analyticsPeriod.addEventListener('change', () => this.renderAnalytics());
        }
        
        // Activity and Debug event listeners removed
        
        // Modal backdrop click to close
        if (this.companyModal) {
            this.companyModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-backdrop')) {
                    this.closeAddCompanyModal();
                }
            });
        }
        
        if (this.spokespersonModal) {
            this.spokespersonModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-backdrop')) {
                    this.closeAddSpokespersonModal();
                }
            });
        }
        
        console.log('Signal Dashboard: Event listeners setup complete');
    }
    
    async loadData() {
        try {
            const result = await chrome.storage.local.get([
                'signalCompanies', 
                'signalMentions', 
                'lastCheckTime'
            ]);
            
            this.companies = result.signalCompanies || [];
            this.mentions = result.signalMentions || [];
            
            console.log('Signal Dashboard: Loaded data', {
                companies: this.companies.length,
                mentions: this.mentions.length,
            });
        } catch (error) {
            console.error('Signal Dashboard: Error loading data:', error);
            this.companies = [];
            this.mentions = [];
        }
    }
    
    async saveData() {
        try {
            await chrome.storage.local.set({
                signalCompanies: this.companies,
                signalMentions: this.mentions,
                lastSaveTime: Date.now()
            });
            console.log('Signal Dashboard: Data saved successfully');
        } catch (error) {
            console.error('Signal Dashboard: Error saving data:', error);
        }
    }
    
    async refreshAllData() {
        this.showLoading();
        
        try {
            console.log('Signal Dashboard: Starting manual refresh...');
            
            // Reload data from storage
            await this.loadData();
            
            // Check if we have companies first
            if (this.companies.length === 0) {
                console.log('Signal Dashboard: No companies to monitor');
                this.hideLoading();
                this.showMessage('Please add a company first before refreshing', 'warning');
                return;
            }

            // Trigger background monitoring check
            chrome.runtime.sendMessage({ action: 'checkMentions' }, async (response) => {
                console.log('Signal Dashboard: Manual check triggered', response);
                if (response && response.success) {
                    // Reload data after background check completes
                    // Calculate timeout based on number of companies (more companies = more time needed)
                    const timeoutMs = Math.max(3000, this.companies.length * 2000);
                    console.log(`Signal Dashboard: Waiting ${timeoutMs}ms for ${this.companies.length} companies to be processed`);
                    setTimeout(async () => {
                        await this.loadData();
                        this.renderCompanyMentions();
                        this.renderAnalytics();
                        console.log('Signal Dashboard: Data reloaded after background check');
                    }, timeoutMs);
                } else {
                    console.error('Signal Dashboard: Manual check failed', response);
                }
            });
            
            // Also trigger start monitoring to ensure alarms are active
            chrome.runtime.sendMessage({ action: 'startMonitoring' }, (response) => {
                console.log('Signal Dashboard: Start monitoring triggered', response);
            });
            
            // Test RSS access and show in debug panel
            chrome.runtime.sendMessage({ action: 'testRSS' }, (response) => {
                console.log('Signal Dashboard: RSS test result', response);
                if (response && !response.success) {
                    console.error('Signal Dashboard: RSS test failed', response.error);
                }
            });
            
            // Re-render everything
            this.renderCompanyMentions();
            this.renderMentions();
            this.renderAnalytics();
            this.updateMonitoringStatus();
            this.updateLastCheckTime();
            
            setTimeout(() => {
                this.hideLoading();
            }, 2000); // Give more time for background processing
            
        } catch (error) {
            console.error('Signal Dashboard: Error refreshing data:', error);
            this.hideLoading();
        }
    }
    
    openAddCompanyModal() {
        if (this.companyModal) {
            this.hideValidationError();
            this.companyModal.classList.remove('hidden');
            if (this.companyNameInput) {
                this.companyNameInput.focus();
            }
        }
    }
    
    closeAddCompanyModal() {
        if (this.companyModal) {
            this.companyModal.classList.add('hidden');
            this.hideValidationError();
            // Clear form
            if (this.companyNameInput) this.companyNameInput.value = '';
        }
    }
    
    openAddSpokespersonModal() {
        if (this.spokespersonModal) {
            this.hideValidationError();
            this.updateCompanyDropdown();
            this.spokespersonModal.classList.remove('hidden');
            if (this.spokespersonNameInput) {
                this.spokespersonNameInput.focus();
            }
        }
    }
    
    closeAddSpokespersonModal() {
        if (this.spokespersonModal) {
            this.spokespersonModal.classList.add('hidden');
            this.hideValidationError();
            // Clear form
            if (this.spokespersonCompanySelect) this.spokespersonCompanySelect.value = '';
            if (this.spokespersonNameInput) this.spokespersonNameInput.value = '';
            if (this.spokespersonTitleInput) this.spokespersonTitleInput.value = '';
            if (this.spokespersonKeywordsInput) this.spokespersonKeywordsInput.value = '';
        }
    }
    
    async saveCompany() {
        try {
            const name = this.companyNameInput?.value?.trim() || '';
            
            // Validation
            if (!name) {
                this.showValidationError('Please enter a company name');
                return;
            }
            
            // Create new company with just the name as the keyword
            const newCompany = {
                id: Date.now().toString(),
                name: name,
                keywords: [name], // Use company name as the only keyword
                createdAt: Date.now(),
                isActive: true
            };
            
            // Add to companies list
            this.companies.push(newCompany);
            
            // Save data
            await this.saveData();
            
            // Re-render
            this.renderCompanyMentions();
            this.renderAnalytics();
            
            // Close modal
            this.closeAddCompanyModal();
            
            
            console.log('Signal Dashboard: Company added successfully:', newCompany);
            
            // Start monitoring and wait for it to complete, then refresh
            this.startMonitoringAndRefresh();
            
        } catch (error) {
            console.error('Signal Dashboard: Error saving company:', error);
            this.showValidationError('Failed to save company. Please try again.');
        }
    }
    
    async saveSpokesperson() {
        try {
            const companyId = this.spokespersonCompanySelect?.value || '';
            const name = this.spokespersonNameInput?.value?.trim() || '';
            const title = this.spokespersonTitleInput?.value?.trim() || '';
            const keywords = this.spokespersonKeywordsInput?.value?.trim() || '';
            
            // Validation
            if (!companyId) {
                this.showValidationError('Please select a company');
                return;
            }
            
            if (!name) {
                this.showValidationError('Please enter a spokesperson name');
                return;
            }
            
            if (!keywords) {
                this.showValidationError('Please enter at least one keyword for this spokesperson');
                return;
            }
            
            // Parse keywords
            const keywordList = keywords
                .split(/[,;\n]/)
                .map(k => k.trim())
                .filter(k => k.length > 0);
            
            if (keywordList.length === 0) {
                this.showValidationError('Please enter valid keywords (separated by commas)');
                return;
            }
            
            // Find the company
            const company = this.companies.find(c => c.id === companyId);
            if (!company) {
                this.showValidationError('Selected company not found');
                return;
            }
            
            // Create new spokesperson
            const newSpokesperson = {
                id: Date.now().toString(),
                name: name,
                title: title,
                keywords: keywordList,
                createdAt: Date.now()
            };
            
            // Add to company's spokespersons
            company.spokespersons.push(newSpokesperson);
            
            // Save data
            await this.saveData();
            
            // Re-render
            this.renderCompanyMentions();
            this.renderAnalytics();
            
            // Close modal
            this.closeAddSpokespersonModal();
            
            
            console.log('Signal Dashboard: Spokesperson added successfully:', newSpokesperson);
            
        } catch (error) {
            console.error('Signal Dashboard: Error saving spokesperson:', error);
            this.showValidationError('Failed to save spokesperson. Please try again.');
        }
    }
    
    // Helper methods for spokespersons
    getSpokespersonsFromForm() {
        const spokespersons = [];
        const spokespersonItems = this.spokespersonsContainer?.querySelectorAll('.spokesperson-item') || [];
        
        console.log('Signal Dashboard: Found', spokespersonItems.length, 'spokesperson items');
        
        spokespersonItems.forEach((item, index) => {
            const nameInput = item.querySelector('.spokesperson-name');
            const titleInput = item.querySelector('.spokesperson-title');
            const keywordsInput = item.querySelector('.spokesperson-keywords');
            
            const name = nameInput?.value?.trim() || '';
            const title = titleInput?.value?.trim() || '';
            const keywords = keywordsInput?.value?.trim() || '';
            
            console.log(`Signal Dashboard: Spokesperson ${index + 1}:`, { name, title, keywords });
            
            if (name && keywords) {
                const keywordList = keywords
                    .split(/[,;\n]/)
                    .map(k => k.trim())
                    .filter(k => k.length > 0);
                
                if (keywordList.length > 0) {
                    spokespersons.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        name: name,
                        title: title,
                        keywords: keywordList,
                        createdAt: Date.now()
                    });
                    console.log('Signal Dashboard: Added spokesperson to list:', name);
                }
            } else {
                console.log('Signal Dashboard: Skipping spokesperson due to missing name or keywords');
            }
        });
        
        console.log('Signal Dashboard: Final spokespersons array:', spokespersons);
        return spokespersons;
    }
    
    addSpokespersonField() {
        if (!this.spokespersonsContainer) return;
        
        const spokespersonCount = this.spokespersonsContainer.querySelectorAll('.spokesperson-item').length;
        
        const spokespersonItem = document.createElement('div');
        spokespersonItem.className = 'spokesperson-item';
        spokespersonItem.innerHTML = `
            <div class="spokesperson-fields">
                <div class="form-group">
                    <label>Spokesperson Name *</label>
                    <input type="text" class="spokesperson-name" placeholder="e.g., Jane Doe" required>
                </div>
                <div class="form-group">
                    <label>Title/Position</label>
                    <input type="text" class="spokesperson-title" placeholder="e.g., CEO, CMO, Spokesperson">
                </div>
                <div class="form-group">
                    <label>Keywords for this Person</label>
                    <textarea class="spokesperson-keywords" placeholder="Jane Doe, CEO of Acme, Jane D, J. Doe"></textarea>
                </div>
            </div>
            <button type="button" class="remove-spokesperson-btn btn-secondary">Remove</button>
        `;
        
        this.spokespersonsContainer.appendChild(spokespersonItem);
        
        // Add remove functionality
        const removeBtn = spokespersonItem.querySelector('.remove-spokesperson-btn');
        removeBtn.addEventListener('click', () => {
            spokespersonItem.remove();
            this.updateRemoveButtons();
        });
        
        this.updateRemoveButtons();
    }
    
    updateRemoveButtons() {
        const spokespersonItems = this.spokespersonsContainer?.querySelectorAll('.spokesperson-item') || [];
        spokespersonItems.forEach((item, index) => {
            const removeBtn = item.querySelector('.remove-spokesperson-btn');
            if (removeBtn) {
                // Show remove button only if there's more than one spokesperson
                removeBtn.style.display = spokespersonItems.length > 1 ? 'block' : 'none';
            }
        });
    }
    
    setupSpokespersonFields() {
        if (!this.spokespersonsContainer) return;
        
        // Clear existing fields and ensure we have at least one
        const existingItems = this.spokespersonsContainer.querySelectorAll('.spokesperson-item');
        if (existingItems.length === 0) {
            this.spokespersonsContainer.innerHTML = `
                <div class="spokesperson-item">
                    <div class="spokesperson-fields">
                        <div class="form-group">
                            <label>Spokesperson Name *</label>
                            <input type="text" class="spokesperson-name" placeholder="e.g., Jane Doe" required>
                        </div>
                        <div class="form-group">
                            <label>Title/Position</label>
                            <input type="text" class="spokesperson-title" placeholder="e.g., CEO, CMO, Spokesperson">
                        </div>
                        <div class="form-group">
                            <label>Keywords for this Person</label>
                            <textarea class="spokesperson-keywords" placeholder="Jane Doe, CEO of Acme, Jane D, J. Doe"></textarea>
                        </div>
                    </div>
                    <button type="button" class="remove-spokesperson-btn btn-secondary" style="display: none;">Remove</button>
                </div>
            `;
        } else {
            // Clear existing values
            existingItems.forEach(item => {
                const nameInput = item.querySelector('.spokesperson-name');
                const titleInput = item.querySelector('.spokesperson-title');
                const keywordsInput = item.querySelector('.spokesperson-keywords');
                
                if (nameInput) nameInput.value = '';
                if (titleInput) titleInput.value = '';
                if (keywordsInput) keywordsInput.value = '';
            });
        }
        
        this.updateRemoveButtons();
    }
    
    resetSpokespersonFields() {
        if (!this.spokespersonsContainer) return;
        
        // Clear all spokesperson items
        this.spokespersonsContainer.innerHTML = `
            <div class="spokesperson-item">
                <div class="spokesperson-fields">
                    <div class="form-group">
                        <label>Spokesperson Name *</label>
                        <input type="text" class="spokesperson-name" placeholder="e.g., Jane Doe" required>
                    </div>
                    <div class="form-group">
                        <label>Title/Position</label>
                        <input type="text" class="spokesperson-title" placeholder="e.g., CEO, CMO, Spokesperson">
                    </div>
                    <div class="form-group">
                        <label>Keywords for this Person</label>
                        <textarea class="spokesperson-keywords" placeholder="Jane Doe, CEO of Acme, Jane D, J. Doe"></textarea>
                    </div>
                </div>
                <button type="button" class="remove-spokesperson-btn btn-secondary" style="display: none;">Remove</button>
            </div>
        `;
    }
    
    updateCompanyDropdown() {
        if (!this.spokespersonCompanySelect) return;
        
        // Clear existing options
        this.spokespersonCompanySelect.innerHTML = '<option value="">Choose a company...</option>';
        
        // Add company options
        this.companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company.id;
            option.textContent = company.name;
            this.spokespersonCompanySelect.appendChild(option);
        });
    }
    
    openAddSpokespersonModalForCompany(companyId) {
        if (this.spokespersonModal) {
            this.hideValidationError();
            this.updateCompanyDropdown();
            
            // Pre-select the company
            if (this.spokespersonCompanySelect) {
                this.spokespersonCompanySelect.value = companyId;
            }
            
            this.spokespersonModal.classList.remove('hidden');
            if (this.spokespersonNameInput) {
                this.spokespersonNameInput.focus();
            }
        }
    }
    
    async deleteSpokesperson(companyId, spokespersonId) {
        const company = this.companies.find(c => c.id === companyId);
        if (!company) return;
        
        const spokesperson = (company.spokespersons || []).find(s => s.id === spokespersonId);
        if (spokesperson && confirm(`Are you sure you want to delete spokesperson ${spokesperson.name}?`)) {
            // Remove spokesperson from company
            company.spokespersons = (company.spokespersons || []).filter(s => s.id !== spokespersonId);
            
            await this.saveData();
            this.renderCompanyMentions();
            this.renderAnalytics();
            
            
            console.log(`Signal Dashboard: Deleted spokesperson ${spokesperson.name}`);
        }
    }
    
    editSpokesperson(companyId, spokespersonId) {
        // TODO: Implement edit functionality
        console.log('Edit spokesperson:', companyId, spokespersonId);
    }
    
    showValidationError(message) {
        let errorDiv = document.querySelector('.validation-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'validation-error';
            errorDiv.style.cssText = `
                background: linear-gradient(145deg, #fef2f2 0%, #fee2e2 100%);
                border: 2px solid #dc2626;
                color: #dc2626;
                padding: 12px 16px;
                border-radius: 12px;
                margin: 16px 0;
                font-size: 14px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                animation: shake 0.5s ease-in-out;
            `;
            
            // Find which modal is open and add error to it
            const activeModal = document.querySelector('.modal:not(.hidden)');
            if (activeModal) {
                const modalBody = activeModal.querySelector('.modal-body');
                if (modalBody) {
                    modalBody.prepend(errorDiv);
                }
            }
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
    
    renderCompanies() {
        if (!this.companiesContainer) return;
        
        if (this.companies.length === 0) {
            // Show empty state
            if (this.noCompaniesState) this.noCompaniesState.classList.remove('hidden');
        } else {
            // Hide empty state
            if (this.noCompaniesState) this.noCompaniesState.classList.add('hidden');
            
            // Render companies
            const companiesHTML = this.companies.map(company => this.createCompanyHTML(company)).join('');
            
            // Find or create companies list
            let companiesList = this.companiesContainer.querySelector('.companies-list');
            if (!companiesList) {
                companiesList = document.createElement('div');
                companiesList.className = 'companies-list';
                this.companiesContainer.appendChild(companiesList);
            }
            
            companiesList.innerHTML = companiesHTML;
            
            // Add event listeners
            this.setupCompanyEventListeners();
        }
    }
    
    createCompanyHTML(company) {
        const keywordsText = company.keywords.slice(0, 5).join(', ') + 
                            (company.keywords.length > 5 ? ` (+${company.keywords.length - 5} more)` : '');
        
        return `
            <div class="company-card" data-company-id="${company.id}">
                <div class="company-header">
                    <div class="company-info">
                        <h3>${this.escapeHtml(company.name)}</h3>
                    </div>
                    <div class="company-actions">
                        <button class="company-toggle ${company.isActive ? 'active' : ''}" data-company-id="${company.id}" title="${company.isActive ? 'Pause monitoring' : 'Resume monitoring'}">
                            ${company.isActive ? '⏸️' : '▶️'}
                        </button>
                        <button class="company-delete" data-company-id="${company.id}" title="Delete company">🗑️</button>
                    </div>
                </div>
                <div class="company-keywords">
                    <strong>Monitoring:</strong> ${this.escapeHtml(company.name)}
                </div>
                <div class="company-status">
                    <div class="company-status-left">
                        <span class="status-indicator ${company.isActive ? 'active' : 'paused'}"></span>
                        <small>${company.isActive ? 'Monitoring active' : 'Monitoring paused'}</small>
                    </div>
                    <div class="keywords-count">1 keyword</div>
                </div>
            </div>
        `;
    }
    
    setupCompanyEventListeners() {
        // Toggle company monitoring
        document.querySelectorAll('.company-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const companyId = e.target.dataset.companyId;
                this.toggleCompanyMonitoring(companyId);
            });
        });
        
        // Delete company
        document.querySelectorAll('.company-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const companyId = e.target.dataset.companyId;
                this.deleteCompany(companyId);
            });
        });
        
        // Add spokesperson to company
        document.querySelectorAll('.add-spokesperson-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const companyId = e.target.dataset.companyId;
                this.openAddSpokespersonModalForCompany(companyId);
            });
        });
        
        // Edit spokesperson
        document.querySelectorAll('.edit-spokesperson-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const spokespersonId = e.target.dataset.spokespersonId;
                const companyId = e.target.dataset.companyId;
                this.editSpokesperson(companyId, spokespersonId);
            });
        });
        
        // Delete spokesperson
        document.querySelectorAll('.delete-spokesperson-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const spokespersonId = e.target.dataset.spokespersonId;
                const companyId = e.target.dataset.companyId;
                this.deleteSpokesperson(companyId, spokespersonId);
            });
        });
    }
    
    async toggleCompanyMonitoring(companyId) {
        const company = this.companies.find(c => c.id === companyId);
        if (company) {
            company.isActive = !company.isActive;
            await this.saveData();
            this.renderCompanyMentions();
            this.renderAnalytics();
            
            
            console.log(`Signal Dashboard: ${company.isActive ? 'Started' : 'Stopped'} monitoring for ${company.name}`);
        }
    }
    
    async deleteCompany(companyId) {
        const company = this.companies.find(c => c.id === companyId);
        if (company && confirm(`Are you sure you want to delete ${company.name}? This will also remove all their mentions.`)) {
            // Remove company
            this.companies = this.companies.filter(c => c.id !== companyId);
            
            // Remove mentions for this company
            this.mentions = this.mentions.filter(m => m.companyId !== companyId);
            
            await this.saveData();
            this.renderCompanyMentions();
            this.renderMentions();
            this.renderAnalytics();
            
            
            console.log(`Signal Dashboard: Deleted company ${company.name}`);
        }
    }
    
    renderCompanyMentions() {
        if (!this.companyMentionsContainer) return;
        
        if (this.companies.length === 0) {
            // Show empty state and clear company container
            if (this.noCompaniesState) this.noCompaniesState.style.display = 'block';
            this.companyMentionsContainer.innerHTML = '';
            return;
        } else {
            // Hide empty state
            if (this.noCompaniesState) this.noCompaniesState.style.display = 'none';
        }
        
        // Group mentions by company
        const mentionsByCompany = {};
        this.mentions.forEach(mention => {
            if (!mentionsByCompany[mention.companyId]) {
                mentionsByCompany[mention.companyId] = [];
            }
            mentionsByCompany[mention.companyId].push(mention);
        });
        
        // Create panels for each company
        const companyPanelsHTML = this.companies.map(company => {
            const companyMentions = mentionsByCompany[company.id] || [];
            const recentMentions = this.filterMentionsByPeriod(companyMentions, 'week');
            
            return this.createCompanyMentionPanel(company, recentMentions);
        }).join('');
        
        this.companyMentionsContainer.innerHTML = companyPanelsHTML;
        
        // Add event listeners for company controls
        this.setupCompanyEventListeners();
    }
    
    createCompanyMentionPanel(company, mentions) {
        // Sort mentions by publishedAt (newest first) to ensure consistency
        const sortedMentions = mentions.sort((a, b) => b.publishedAt - a.publishedAt);
        
        // Get most recent mention info (first in sorted array)
        const mostRecentMention = sortedMentions.length > 0 ? sortedMentions[0] : null;
        
        const mostRecentText = mostRecentMention ? 
            this.getTimeAgo(mostRecentMention.publishedAt) : 
            'No mentions yet';
        
        // Assign a color theme to each company based on its ID
        const colorThemes = ['blue', 'green', 'purple', 'orange', 'pink', 'red', 'indigo', 'teal'];
        const companyIndex = this.companies.findIndex(c => c.id === company.id);
        const themeColor = colorThemes[companyIndex % colorThemes.length];
            
        return `
            <section class="dashboard-section company-mentions-section" data-company-id="${company.id}" data-theme="${themeColor}">
                <div class="section-header">
                    <div class="company-header">
                        <h2>${company.name}</h2>
                        <div class="company-status">
                            <span class="status-indicator ${company.isActive ? 'active' : 'paused'}"></span>
                            <span class="status-text">${company.isActive ? 'Monitoring' : 'Paused'}</span>
                        </div>
                    </div>
                    <div class="company-actions">
                        <button class="company-delete btn-secondary" 
                                data-company-id="${company.id}" 
                                title="Delete company">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
                
                <div class="section-content">
                    <div class="company-stats">
                        <div class="stat-item">
                            <span class="stat-number">${sortedMentions.length}</span>
                            <span class="stat-label">Recent Mentions</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-text">${mostRecentText}</span>
                            <span class="stat-label">Most Recent</span>
                        </div>
                    </div>
                    
                    <div class="mentions-container">
                        ${sortedMentions.length > 0 ? 
                            sortedMentions.slice(0, 10).map(mention => this.createMentionHTML(mention)).join('') :
                            `<div class="empty-state small">
                                <div class="empty-icon">📰</div>
                                <p>No recent mentions for ${company.name}</p>
                                <small>Click refresh to check for new mentions</small>
                            </div>`
                        }
                    </div>
                </div>
            </section>
        `;
    }
    
    setupCompanyEventListeners() {
        // Company delete buttons
        document.querySelectorAll('.company-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const companyId = e.target.dataset.companyId;
                this.deleteCompany(companyId);
            });
        });
        
        // Mention card clicks
        document.querySelectorAll('.mention-card').forEach(card => {
            card.addEventListener('click', () => {
                const url = card.dataset.url;
                if (url) {
                    chrome.tabs.create({ url: url });
                }
            });
        });
    }
    
    filterMentionsByPeriod(mentions, period) {
        const now = Date.now();
        let timeThreshold;
        
        switch (period) {
            case 'today':
                timeThreshold = now - (24 * 60 * 60 * 1000);
                break;
            case 'week':
                timeThreshold = now - (7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                timeThreshold = now - (30 * 24 * 60 * 60 * 1000);
                break;
            default:
                return mentions;
        }
        
        return mentions.filter(mention => mention.foundAt > timeThreshold);
    }
    
    renderMentions() {
        if (!this.mentionsContainer) return;
        
        // Get filtered mentions based on selected period
        const filteredMentions = this.getFilteredMentions();
        
        if (filteredMentions.length === 0) {
            if (this.noMentionsState) this.noMentionsState.classList.remove('hidden');
        } else {
            if (this.noMentionsState) this.noMentionsState.classList.add('hidden');
            
            const mentionsHTML = filteredMentions.map(mention => this.createMentionHTML(mention)).join('');
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
    
    getFilteredMentions() {
        const filter = this.mentionsFilter?.value || 'all';
        const now = Date.now();
        
        let cutoffTime = 0;
        switch (filter) {
            case 'today':
                cutoffTime = now - (24 * 60 * 60 * 1000);
                break;
            case 'week':
                cutoffTime = now - (7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                cutoffTime = now - (30 * 24 * 60 * 60 * 1000);
                break;
            default:
                cutoffTime = 0;
        }
        
        return this.mentions
            .filter(m => m.publishedAt > cutoffTime)
            .sort((a, b) => b.publishedAt - a.publishedAt)
            .slice(0, 20); // Limit to 20 most recent
    }
    
    createMentionHTML(mention) {
        const company = this.companies.find(c => c.id === mention.companyId);
        const companyName = company ? company.name : 'Unknown Company';
        const timeAgo = this.getTimeAgo(mention.publishedAt);
        
        // Get source icon based on mention type or source
        const sourceIcon = this.getSourceIcon(mention);
        
        return `
            <div class="mention-card" data-url="${mention.url}">
                <div class="mention-header">
                    <div class="mention-content">
                        <h4 class="mention-title">
                            <span class="emoji">${sourceIcon}</span>
                            <span>${this.escapeHtml(mention.title)}</span>
                        </h4>
                    </div>
                    <span class="mention-time">${timeAgo}</span>
                </div>
                <span class="mention-client">${this.escapeHtml(companyName)}</span>
            </div>
        `;
    }
    
    getSourceIcon(mention) {
        const source = mention.source.toLowerCase();
        const type = mention.type?.toLowerCase();
        
        // Check by type first, then by source name
        if (type === 'podcast' || source.includes('podcast')) {
            return '🎙️';
        } else if (source.includes('youtube')) {
            return '🎥';
        } else if (source.includes('twitter') || source.includes('nitter') || source.includes('x (')) {
            return '🐦'; // Still using bird icon for X/Twitter
        } else if (source.includes('reddit')) {
            return '🗨️';
        } else if (source.includes('linkedin')) {
            return '💼';
        } else if (source.includes('google news') || source.includes('news')) {
            return '📰';
        } else {
            return '📡'; // Default icon for other sources
        }
    }
    
    renderAnalytics() {
        const period = this.analyticsPeriod?.value || 'week';
        const cutoffTime = this.getAnalyticsCutoffTime(period);
        
        // Calculate stats
        const recentMentions = this.mentions.filter(m => m.publishedAt > cutoffTime);
        const totalMentionsCount = recentMentions.length;
        const activeCompaniesCount = this.companies.filter(c => c.isActive).length;
        const keywordsCount = this.companies.reduce((total, company) => total + company.keywords.length, 0);
        
        // Calculate trending (mentions in last week vs previous week)
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
        const thisWeekMentions = this.mentions.filter(m => m.publishedAt > weekAgo).length;
        const lastWeekMentions = this.mentions.filter(m => m.publishedAt > twoWeeksAgo && m.publishedAt <= weekAgo).length;
        const trendingCount = Math.max(0, thisWeekMentions - lastWeekMentions);
        
        // Update display
        if (this.totalMentions) this.totalMentions.textContent = totalMentionsCount;
        if (this.trendingMentions) this.trendingMentions.textContent = `+${trendingCount}`;
        if (this.activeCompanies) this.activeCompanies.textContent = activeCompaniesCount;
        if (this.totalSpokespersons) this.totalSpokespersons.textContent = this.companies.length;
        if (this.keywordsTracked) this.keywordsTracked.textContent = keywordsCount;
    }
    
    getAnalyticsCutoffTime(period) {
        const now = Date.now();
        switch (period) {
            case 'week':
                return now - (7 * 24 * 60 * 60 * 1000);
            case 'month':
                return now - (30 * 24 * 60 * 60 * 1000);
            case 'quarter':
                return now - (90 * 24 * 60 * 60 * 1000);
            default:
                return now - (7 * 24 * 60 * 60 * 1000);
        }
    }
    
    
    startMonitoring() {
        chrome.runtime.sendMessage({ action: 'startMonitoring' }, (response) => {
            if (response && response.success) {
                console.log('Signal Dashboard: Monitoring started');
                this.updateMonitoringStatus();
            }
        });
    }
    
    async startMonitoringAndRefresh() {
        try {
            console.log('Signal Dashboard: Starting monitoring and refresh sequence...');
            
            // Calculate wait time based on number of companies
            // Each company has ~4 RSS feeds, each taking ~2-3 seconds
            const baseWaitTime = 3000; // Base 3 seconds
            const perCompanyTime = 5000; // 5 seconds per company (4 RSS feeds × ~1.25s each)
            const totalWaitTime = baseWaitTime + (this.companies.length * perCompanyTime);
            
            console.log(`Signal Dashboard: Will wait ${totalWaitTime/1000}s for ${this.companies.length} companies to process`);
            
            // First start monitoring
            await new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: 'startMonitoring' }, (response) => {
                    if (response && response.success) {
                        console.log('Signal Dashboard: Monitoring started successfully');
                        this.updateMonitoringStatus();
                        resolve();
                    } else {
                        console.error('Signal Dashboard: Failed to start monitoring');
                        resolve(); // Continue anyway
                    }
                });
            });
            
            // Wait a bit for initial processing
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Then trigger manual check to ensure data is fresh
            await new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: 'checkMentions' }, (response) => {
                    console.log('Signal Dashboard: Manual check completed:', response);
                    resolve();
                });
            });
            
            // Show progress message
            this.showMessage(`Processing ${this.companies.length} companies (${Math.ceil(totalWaitTime/1000)}s)...`, 'info');
            
            // Wait for background processing to complete based on company count
            let remainingTime = totalWaitTime;
            const updateInterval = 1000; // Update every second
            
            const progressTimer = setInterval(() => {
                remainingTime -= updateInterval;
                const secondsLeft = Math.ceil(remainingTime / 1000);
                if (secondsLeft > 0) {
                    this.showMessage(`Processing ${this.companies.length} companies (${secondsLeft}s remaining)...`, 'info');
                } else {
                    clearInterval(progressTimer);
                }
            }, updateInterval);
            
            await new Promise(resolve => setTimeout(resolve, totalWaitTime));
            clearInterval(progressTimer);
            
            // Finally refresh the dashboard
            console.log('Signal Dashboard: Refreshing dashboard with new data...');
            this.showMessage(`Loading mentions for ${this.companies.length} companies...`, 'info');
            await this.refreshAllData();
            
            console.log('Signal Dashboard: Complete monitoring and refresh sequence finished');
            
        } catch (error) {
            console.error('Signal Dashboard: Error in monitoring and refresh sequence:', error);
            this.showMessage('Error loading company data: ' + error.message, 'error');
        }
    }
    
    startAutoRefresh() {
        // Clear any existing interval
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        console.log('Signal Dashboard: Starting auto-refresh every 5 minutes');
        
        // Set up 5-minute auto-refresh
        this.autoRefreshInterval = setInterval(() => {
            // Only auto-refresh if we have companies
            if (this.companies.length > 0) {
                console.log('Signal Dashboard: Auto-refresh triggered (5-minute interval)');
                this.refreshAllData();
            } else {
                console.log('Signal Dashboard: Auto-refresh skipped (no companies)');
            }
        }, 5 * 60 * 1000); // 5 minutes in milliseconds
        
    }
    
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('Signal Dashboard: Auto-refresh stopped');
        }
    }
    
    updateMonitoringStatus() {
        const activeCompanies = this.companies.filter(c => c.isActive).length;
        const totalKeywords = this.companies.reduce((total, company) => {
            return total + (company.isActive ? company.keywords.length : 0);
        }, 0);
        
        if (activeCompanies > 0) {
            if (this.monitoringIndicator) {
                this.monitoringIndicator.classList.add('active');
            }
            if (this.monitoringStatusText) {
                this.monitoringStatusText.textContent = `📰 Auto-monitoring ${totalKeywords} keywords from ${activeCompanies} compan${activeCompanies !== 1 ? 'ies' : 'y'} every 5 min`;
            }
        } else {
            if (this.monitoringIndicator) {
                this.monitoringIndicator.classList.remove('active');
            }
            if (this.monitoringStatusText) {
                this.monitoringStatusText.textContent = '⏸️ No active monitoring - Add companies to start RSS scanning';
            }
        }
    }
    
    updateLastCheckTime() {
        chrome.storage.local.get(['lastCheckTime'], (result) => {
            if (result.lastCheckTime) {
                const timeAgo = this.getTimeAgo(result.lastCheckTime);
                // Update footer
                if (this.lastCheckTime) {
                    this.lastCheckTime.textContent = `Last scan: ${timeAgo}`;
                }
                // Update top menu bar
                if (this.lastUpdateTime) {
                    this.lastUpdateTime.textContent = `Last check: ${timeAgo}`;
                }
            } else {
                if (this.lastCheckTime) {
                    this.lastCheckTime.textContent = 'No scans yet';
                }
                if (this.lastUpdateTime) {
                    this.lastUpdateTime.textContent = 'Last check: --';
                }
            }
        });
        
        // Update every 30 seconds for real-time display
        setTimeout(() => this.updateLastCheckTime(), 30000);
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
        if (this.dashboard) this.dashboard.style.opacity = '0.6';
    }
    
    hideLoading() {
        if (this.loading) this.loading.classList.add('hidden');
        if (this.dashboard) this.dashboard.style.opacity = '1';
    }
    
    showMessage(message, type = 'info') {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `message-toast ${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'warning' ? '#f59e0b' : type === 'error' ? '#ef4444' : '#10b981'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-weight: 500;
        `;
        document.body.appendChild(messageEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }
    
}


// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Signal Dashboard: DOM loaded, initializing dashboard');
    try {
        new PRBuddyDashboard();
    } catch (error) {
        console.error('Signal Dashboard: Failed to initialize:', error);
    }
});

console.log('Signal Dashboard: Script setup complete');