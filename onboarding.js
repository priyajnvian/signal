class OnboardingManager {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.profileData = {};
        this.scanningInterval = null;
        
        this.init();
    }

    init() {
        this.updateProgress();
        this.bindEvents();
        this.checkExistingProfile();
    }

    async checkExistingProfile() {
        try {
            const result = await chrome.storage.local.get(['userProfile', 'onboardingCompleted']);
            if (result.onboardingCompleted && result.userProfile) {
                this.showStep(4);
                this.displayProfileSummary(result.userProfile);
            }
        } catch (error) {
            console.error('Error checking existing profile:', error);
        }
    }

    bindEvents() {
        document.getElementById('start-setup').addEventListener('click', () => {
            this.nextStep();
        });

        document.getElementById('open-linkedin').addEventListener('click', () => {
            chrome.tabs.create({ url: 'https://www.linkedin.com/in/me/' });
            document.getElementById('scan-profile').disabled = false;
        });

        document.getElementById('scan-profile').addEventListener('click', () => {
            this.startLinkedInScan();
        });

        document.getElementById('skip-linkedin').addEventListener('click', () => {
            this.showStep(5);
            this.updateStepIndicator('Manual Setup');
        });

        document.getElementById('edit-profile').addEventListener('click', () => {
            this.showStep(5);
            this.updateStepIndicator('Edit Profile');
        });

        document.getElementById('finish-setup').addEventListener('click', () => {
            this.completeOnboarding();
        });

        document.getElementById('manual-profile-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleManualProfileSubmit();
        });

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'profileScraped') {
                this.handleProfileScraped(request.data);
            }
        });
    }

    showStep(stepNumber) {
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        document.getElementById(`step${stepNumber}`).classList.add('active');
        this.currentStep = stepNumber;
        this.updateProgress();
    }

    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.showStep(this.currentStep);
        }
    }

    updateProgress() {
        const progress = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
        document.getElementById('progress').style.width = `${progress}%`;
        
        if (this.currentStep <= this.totalSteps) {
            document.getElementById('step-text').textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
        }
    }

    updateStepIndicator(text) {
        document.getElementById('step-text').textContent = text;
    }

    async startLinkedInScan() {
        this.showStep(3);
        this.updateStepIndicator('Scanning Profile...');
        
        try {
            const tabs = await chrome.tabs.query({ url: '*://www.linkedin.com/*' });
            
            if (tabs.length === 0) {
                this.showScanError('Please open your LinkedIn profile first.');
                return;
            }

            this.startScanningAnimation();
            
            // Wait for page to load and inject content script if needed
            await this.ensureContentScriptInjected(tabs[0].id);
            
            // Wait a bit more for LinkedIn page to fully load
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            await chrome.tabs.sendMessage(tabs[0].id, { action: 'scrapeProfile' });
            
            setTimeout(() => {
                if (this.currentStep === 3) {
                    this.showScanError('Profile scanning is taking longer than expected. Please try manual setup.');
                }
            }, 20000);
            
        } catch (error) {
            console.error('LinkedIn scan error:', error);
            this.showScanError('Error accessing LinkedIn. Please try manual setup.');
        }
    }

    async ensureContentScriptInjected(tabId) {
        try {
            // Try to ping the content script
            await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        } catch (error) {
            // If content script not responding, inject it manually
            console.log('Injecting content script manually...');
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['linkedin-scraper.js']
            });
            // Wait for injection to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    startScanningAnimation() {
        const steps = [
            { id: 'scan-basic', delay: 1000 },
            { id: 'scan-experience', delay: 2500 },
            { id: 'scan-skills', delay: 4000 },
            { id: 'scan-context', delay: 5500 }
        ];

        steps.forEach(({ id, delay }) => {
            setTimeout(() => {
                const element = document.getElementById(id);
                element.classList.add('completed');
                element.querySelector('.check-icon').textContent = '✅';
            }, delay);
        });
    }

    handleProfileScraped(profileData) {
        if (this.currentStep === 3) {
            this.profileData = profileData;
            setTimeout(() => {
                this.showStep(4);
                this.displayProfileSummary(profileData);
                this.updateStepIndicator('Profile Complete');
            }, 6000);
        }
    }

    displayProfileSummary(profileData) {
        const summaryContainer = document.getElementById('profile-summary');
        
        summaryContainer.innerHTML = `
            <div class="profile-detail">
                <strong>Name:</strong>
                <span>${profileData.name || 'Not available'}</span>
            </div>
            <div class="profile-detail">
                <strong>Role:</strong>
                <span>${profileData.headline || 'Not available'}</span>
            </div>
            <div class="profile-detail">
                <strong>Company:</strong>
                <span>${profileData.company || 'Not available'}</span>
            </div>
            <div class="profile-detail">
                <strong>Industry:</strong>
                <span>${this.capitalizeFirst(profileData.industry) || 'Not available'}</span>
            </div>
            <div class="profile-detail">
                <strong>Seniority:</strong>
                <span>${this.capitalizeFirst(profileData.seniority) || 'Not available'}</span>
            </div>
            <div class="profile-detail">
                <strong>Function:</strong>
                <span>${this.capitalizeFirst(profileData.jobFunction) || 'Not available'}</span>
            </div>
        `;

        this.displayFocusAreas(profileData);
    }

    displayFocusAreas(profileData) {
        const focusContainer = document.getElementById('focus-areas');
        const focusAreas = this.generateFocusAreas(profileData);
        
        focusContainer.innerHTML = focusAreas.map(area => 
            `<span class="focus-tag">${area}</span>`
        ).join('');
    }

    generateFocusAreas(profileData) {
        const areas = [];
        
        const jobFunctionMap = {
            'technical': ['Technical AI Implementations', 'AI Development Tools', 'Machine Learning'],
            'business': ['AI Business Strategy', 'AI ROI & Analytics', 'Enterprise AI'],
            'product': ['AI Product Features', 'AI UX/UI', 'AI-Powered Products'],
            'marketing': ['AI Marketing Tools', 'Personalization AI', 'Content Generation'],
            'sales': ['AI Sales Tools', 'CRM AI', 'Sales Automation'],
            'finance': ['AI in Finance', 'Algorithmic Trading', 'FinTech AI'],
            'hr': ['AI Recruitment', 'HR Analytics', 'Workforce AI'],
            'other': ['General Mentions', 'AI Industry Trends']
        };

        const seniorityMap = {
            'senior': ['AI Leadership', 'Strategic AI', 'AI Governance'],
            'mid': ['AI Implementation', 'Team AI Tools', 'AI Best Practices'],
            'junior': ['AI Learning', 'AI Career Growth', 'Basic AI Tools']
        };

        const industryMap = {
            'technology': ['AI Startups', 'Tech AI Innovation', 'AI Funding'],
            'finance': ['AI Banking', 'Financial AI Regulation', 'Investment AI'],
            'healthcare': ['Medical AI', 'Healthcare AI Ethics', 'AI Diagnostics'],
            'consulting': ['AI Consulting', 'AI Strategy Services', 'Client AI Solutions'],
            'education': ['AI in Education', 'EdTech AI', 'Academic AI Research'],
            'other': ['Cross-Industry AI', 'AI Adoption Trends']
        };

        if (profileData.jobFunction && jobFunctionMap[profileData.jobFunction]) {
            areas.push(...jobFunctionMap[profileData.jobFunction].slice(0, 2));
        }

        if (profileData.seniority && seniorityMap[profileData.seniority]) {
            areas.push(seniorityMap[profileData.seniority][0]);
        }

        if (profileData.industry && industryMap[profileData.industry]) {
            areas.push(industryMap[profileData.industry][0]);
        }

        areas.push('AI Ethics & Society');

        return [...new Set(areas)].slice(0, 5);
    }

    handleManualProfileSubmit() {
        const form = document.getElementById('manual-profile-form');
        const formData = new FormData(form);
        
        const interests = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        
        this.profileData = {
            name: 'Manual Setup User',
            jobFunction: formData.get('job-function'),
            seniority: formData.get('seniority'),
            industry: formData.get('industry'),
            interests: interests,
            manualSetup: true
        };

        this.showStep(4);
        this.displayProfileSummary(this.profileData);
        this.updateStepIndicator('Profile Complete');
    }

    async completeOnboarding() {
        try {
            await chrome.storage.local.set({
                userProfile: this.profileData,
                onboardingCompleted: true,
                profileCreated: Date.now()
            });

            chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
            window.close();
        } catch (error) {
            console.error('Error completing onboarding:', error);
        }
    }

    showScanError(message) {
        document.getElementById('scanning-status').textContent = message;
        document.getElementById('scanning-status').style.color = '#e74c3c';
        
        setTimeout(() => {
            this.showStep(5);
            this.updateStepIndicator('Manual Setup');
        }, 3000);
    }

    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new OnboardingManager();
});