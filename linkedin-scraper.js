class LinkedInProfileScraper {
    constructor() {
        this.profileData = {
            name: '',
            headline: '',
            location: '',
            industry: '',
            experience: [],
            education: [],
            skills: [],
            seniority: '',
            company: '',
            jobFunction: ''
        };
        this.debugPanel = null;
        this.init();
    }

    init() {
        console.log('AI News Extension: Content script loaded!');
        if (this.isLinkedInProfile()) {
            console.log('AI News Extension: On LinkedIn profile page');
            this.createDebugPanel();
            this.log('AI News Extension: Initialized on LinkedIn profile page');
            // Auto-start scraping after a short delay
            setTimeout(() => {
                this.log('Auto-starting profile scrape...', 'info');
                this.scrapeProfile();
            }, 2000);
        } else {
            console.log('AI News Extension: Not on LinkedIn profile page');
        }
    }

    isLinkedInProfile() {
        return window.location.hostname === 'www.linkedin.com' && 
               (window.location.pathname.includes('/in/') || 
                window.location.pathname === '/in/me' ||
                window.location.pathname.includes('/profile/'));
    }

    async scrapeProfile() {
        try {
            this.log('Starting profile scraping...', 'info');
            this.log('Waiting for page to load...', 'info');
            
            await this.waitForPageLoad();
            this.log('Page loaded successfully', 'success');
            
            this.log('Extracting basic information...', 'info');
            this.extractBasicInfo();
            
            this.log('Extracting work experience...', 'info');
            this.extractExperience();
            
            this.log('Extracting education...', 'info');
            this.extractEducation();
            
            this.log('Extracting skills...', 'info');
            this.extractSkills();
            
            this.log('Completing scraping...', 'success');
            
            // IMMEDIATE SUCCESS - complete right after basic extraction
            const logsContainer = document.getElementById('debug-logs');
            if (logsContainer) {
                logsContainer.innerHTML += `
                    <div style="color: green; font-weight: bold; margin: 5px 0; border: 2px solid green; padding: 10px; background: #f0fff0;">
                        ✅ SCRAPING COMPLETED!<br>
                        Name: ${this.profileData.name || 'Not found'}<br>
                        Headline: ${this.profileData.headline || 'Not found'}<br>
                        Company: ${this.profileData.company || 'Not found'}<br>
                        🎉 SUCCESS!
                    </div>
                `;
            }
            
            // Store data
            chrome.storage.local.set({
                userProfile: this.profileData,
                profileLastUpdated: Date.now(),
                profileScrapingCompleted: true
            });
            
            // Send message
            chrome.runtime.sendMessage({
                action: 'profileScraped',
                data: this.profileData
            }, (response) => {
                // Update panel to show news fetching started
                if (logsContainer) {
                    logsContainer.innerHTML += `
                        <div style="color: blue; font-weight: bold; margin: 5px 0; padding: 8px; background: #e6f3ff; border-left: 4px solid #0073b1;">
                            🔄 Fetching personalized AI news based on your profile...<br>
                            <small>News will open automatically when ready!</small>
                        </div>
                        <div style="margin: 10px 0; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
                            <strong>✨ What happens next:</strong><br>
                            1. Extension fetches AI news based on your profile<br>
                            2. Extension icon will show a 🔥 badge when ready<br>
                            3. Click the extension icon to see your personalized news<br>
                            4. News updates every 15 minutes automatically<br><br>
                            <button id="manual-fetch-btn" style="background: #0073b1; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                                🔄 Open News Now
                            </button>
                        </div>
                    `;
                    
                    // Add event listener for the fetch button
                    setTimeout(() => {
                        const fetchBtn = document.getElementById('manual-fetch-btn');
                        if (fetchBtn) {
                            fetchBtn.addEventListener('click', () => {
                                chrome.runtime.sendMessage({action: 'openPopup'}, (response) => {
                                    if (logsContainer) {
                                        logsContainer.innerHTML += `
                                            <div style="color: green; margin: 5px 0; padding: 5px; background: #d4edda; border-radius: 3px;">
                                                ✅ Opening extension popup...
                                            </div>
                                        `;
                                    }
                                });
                            });
                        }
                    }, 100);
                }
            });
            
            // Skip the problematic functions that might hang
            // this.log('Analyzing profile context...', 'info');
            // this.analyzeProfileContext();
            
        } catch (error) {
            this.log(`Scraping error: ${error.message}`, 'error');
            console.error('LinkedIn scraping error:', error);
        }
    }

    completeScrapingDirectly() {
        // Store data immediately
        chrome.storage.local.set({
            userProfile: this.profileData,
            profileLastUpdated: Date.now(),
            profileScrapingCompleted: true
        });
        
        // Send message immediately  
        chrome.runtime.sendMessage({
            action: 'profileScraped',
            data: this.profileData
        });
        
        // Update panel immediately
        const logsContainer = document.getElementById('debug-logs');
        if (logsContainer) {
            logsContainer.innerHTML += `
                <div style="color: green; font-weight: bold; margin: 5px 0; border: 2px solid green; padding: 10px; background: #f0fff0;">
                    ✅ SCRAPING COMPLETED!<br>
                    Name: ${this.profileData.name || 'Not found'}<br>
                    Headline: ${this.profileData.headline || 'Not found'}<br>
                    Company: ${this.profileData.company || 'Not found'}<br>
                    🎉 SUCCESS!
                </div>
            `;
        }
    }

    async waitForPageLoad() {
        this.log('Checking for LinkedIn profile elements...', 'info');
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 20; // 10 seconds max wait
            
            const checkLoaded = () => {
                attempts++;
                
                // Check for various LinkedIn profile elements (new and old designs)
                const selectors = [
                    '.pv-text-details__left-panel',
                    '.ph5.pb5',
                    '[data-section="summary"]',
                    '.text-heading-xlarge', // Profile name
                    '.pv-top-card',
                    '.artdeco-card',
                    'h1', // Any h1 on profile page
                    '.profile-rail-card'
                ];
                
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        this.log(`Found LinkedIn element: ${selector}`, 'success');
                        resolve();
                        return;
                    }
                }
                
                if (attempts >= maxAttempts) {
                    this.log('Page load timeout - proceeding anyway', 'warning');
                    resolve();
                } else {
                    this.log(`Attempt ${attempts}/${maxAttempts} - retrying...`, 'info');
                    setTimeout(checkLoaded, 500);
                }
            };
            checkLoaded();
        });
    }

    extractBasicInfo() {
        try {
            // Updated selectors for current LinkedIn design
            const nameSelectors = [
                'h1.text-heading-xlarge',
                'h1[data-anonymize="person-name"]',
                '.pv-text-details__left-panel h1',
                '.ph5 h1',
                '.pv-top-card--list li:first-child h1',
                'h1' // Fallback to any h1
            ];
            
            this.log('Looking for profile name...', 'info');
            for (const selector of nameSelectors) {
                const nameElement = document.querySelector(selector);
                if (nameElement && nameElement.textContent.trim()) {
                    this.profileData.name = nameElement.textContent.trim();
                    this.log(`Found name: ${this.profileData.name}`, 'success');
                    break;
                }
            }
            
            if (!this.profileData.name) {
                this.log('Name not found with any selector', 'warning');
                // Try to find any text that looks like a name
                const allHeadings = document.querySelectorAll('h1, h2, .text-heading-xlarge');
                for (const heading of allHeadings) {
                    const text = heading.textContent.trim();
                    if (text && text.length > 2 && text.length < 50 && !text.includes('LinkedIn')) {
                        this.profileData.name = text;
                        this.log(`Found name via fallback: ${this.profileData.name}`, 'success');
                        break;
                    }
                }
            }

            const headlineSelectors = [
                '.text-body-medium.break-words',
                '.pv-text-details__left-panel .text-body-medium',
                '.ph5 .text-body-medium',
                '.pv-top-card-v2-ctas .text-body-medium',
                'div[data-anonymize="headline"]'
            ];
            
            this.log('Looking for profile headline...', 'info');
            for (const selector of headlineSelectors) {
                const headlineElement = document.querySelector(selector);
                if (headlineElement && headlineElement.textContent.trim()) {
                    this.profileData.headline = headlineElement.textContent.trim();
                    this.log(`Found headline: ${this.profileData.headline}`, 'success');
                    break;
                }
            }
            
            if (!this.profileData.headline) {
                this.log('Headline not found with standard selectors', 'warning');
            }

            const locationSelectors = [
                '.text-body-small.inline.t-black--light.break-words',
                '.pv-text-details__left-panel .text-body-small'
            ];
            
            for (const selector of locationSelectors) {
                const locationElement = document.querySelector(selector);
                if (locationElement && locationElement.textContent.trim()) {
                    this.profileData.location = locationElement.textContent.trim();
                    break;
                }
            }
        } catch (error) {
            console.error('Error extracting basic info:', error);
        }
    }

    extractExperience() {
        try {
            const experienceSection = document.querySelector('#experience') || 
                                    document.querySelector('[data-section="experience"]') ||
                                    document.querySelector('.pvs-list__container');
            
            if (experienceSection) {
                const experiences = [];
                const experienceItems = experienceSection.querySelectorAll('.pvs-list__item--line-separated, .pv-entity__summary-info, .experience-item');
                
                experienceItems.forEach((item, index) => {
                    if (index >= 5) return;
                    
                    const titleElement = item.querySelector('.mr1.t-bold span[aria-hidden="true"]') ||
                                       item.querySelector('.pv-entity__summary-info h3') ||
                                       item.querySelector('.t-16.t-black.t-bold');
                    
                    const companyElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]') ||
                                         item.querySelector('.pv-entity__secondary-title') ||
                                         item.querySelector('.t-14.t-black--light.t-normal');
                    
                    const durationElement = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]') ||
                                          item.querySelector('.pv-entity__dates');
                    
                    if (titleElement && companyElement) {
                        experiences.push({
                            title: titleElement.textContent.trim(),
                            company: companyElement.textContent.trim(),
                            duration: durationElement ? durationElement.textContent.trim() : ''
                        });
                    }
                });
                
                this.profileData.experience = experiences;
                
                if (experiences.length > 0) {
                    this.profileData.company = experiences[0].company;
                }
            }
        } catch (error) {
            console.error('Error extracting experience:', error);
        }
    }

    extractEducation() {
        try {
            const educationSection = document.querySelector('#education') || 
                                   document.querySelector('[data-section="education"]');
            
            if (educationSection) {
                const educations = [];
                const educationItems = educationSection.querySelectorAll('.pvs-list__item--line-separated, .pv-entity__summary-info');
                
                educationItems.forEach((item, index) => {
                    if (index >= 3) return;
                    
                    const schoolElement = item.querySelector('.mr1.t-bold span[aria-hidden="true"]') ||
                                        item.querySelector('.pv-entity__school-name');
                    
                    const degreeElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]') ||
                                        item.querySelector('.pv-entity__degree-name');
                    
                    if (schoolElement) {
                        educations.push({
                            school: schoolElement.textContent.trim(),
                            degree: degreeElement ? degreeElement.textContent.trim() : ''
                        });
                    }
                });
                
                this.profileData.education = educations;
            }
        } catch (error) {
            console.error('Error extracting education:', error);
        }
    }

    extractSkills() {
        try {
            const skillsSection = document.querySelector('#skills') || 
                                document.querySelector('[data-section="skills"]');
            
            if (skillsSection) {
                const skills = [];
                const skillItems = skillsSection.querySelectorAll('.mr1.t-bold span[aria-hidden="true"], .pv-skill-category-entity__name');
                
                skillItems.forEach((item, index) => {
                    if (index >= 10) return;
                    const skillText = item.textContent.trim();
                    if (skillText) {
                        skills.push(skillText);
                    }
                });
                
                this.profileData.skills = skills;
            }
        } catch (error) {
            console.error('Error extracting skills:', error);
        }
    }

    analyzeProfileContext() {
        try {
            this.profileData.seniority = this.determineSeniority();
            this.profileData.jobFunction = this.determineJobFunction();
            this.profileData.industry = this.determineIndustry();
        } catch (error) {
            console.error('Error analyzing profile context:', error);
        }
    }

    determineSeniority() {
        const headline = this.profileData.headline.toLowerCase();
        const experience = this.profileData.experience;
        
        const seniorKeywords = ['ceo', 'cto', 'vp', 'vice president', 'director', 'head of', 'chief', 'senior', 'lead', 'principal', 'founder'];
        const midKeywords = ['manager', 'senior', 'lead', 'coordinator'];
        const juniorKeywords = ['associate', 'junior', 'intern', 'trainee', 'analyst', 'assistant'];
        
        if (seniorKeywords.some(keyword => headline.includes(keyword))) {
            return 'senior';
        } else if (midKeywords.some(keyword => headline.includes(keyword))) {
            return 'mid';
        } else if (juniorKeywords.some(keyword => headline.includes(keyword))) {
            return 'junior';
        } else if (experience.length >= 10) {
            return 'senior';
        } else if (experience.length >= 5) {
            return 'mid';
        } else {
            return 'junior';
        }
    }

    determineJobFunction() {
        const headline = this.profileData.headline.toLowerCase();
        const skills = this.profileData.skills.map(s => s.toLowerCase());
        const allText = (headline + ' ' + skills.join(' ')).toLowerCase();
        
        const functions = {
            'technical': ['engineer', 'developer', 'programmer', 'architect', 'devops', 'ai', 'ml', 'data scientist', 'software', 'technical'],
            'business': ['business', 'strategy', 'consulting', 'operations', 'analyst', 'manager', 'executive'],
            'marketing': ['marketing', 'growth', 'digital marketing', 'content', 'social media', 'brand'],
            'sales': ['sales', 'account', 'business development', 'revenue'],
            'product': ['product', 'pm', 'product manager', 'ux', 'ui', 'design'],
            'finance': ['finance', 'accounting', 'financial', 'cfo', 'investment'],
            'hr': ['hr', 'human resources', 'people', 'talent', 'recruitment'],
            'other': []
        };
        
        for (const [func, keywords] of Object.entries(functions)) {
            if (keywords.some(keyword => allText.includes(keyword))) {
                return func;
            }
        }
        
        return 'other';
    }

    determineIndustry() {
        const headline = this.profileData.headline.toLowerCase();
        const company = this.profileData.company.toLowerCase();
        const allText = (headline + ' ' + company).toLowerCase();
        
        const industries = {
            'technology': ['tech', 'software', 'ai', 'artificial intelligence', 'saas', 'startup', 'google', 'microsoft', 'amazon', 'meta'],
            'finance': ['bank', 'finance', 'fintech', 'investment', 'trading', 'financial services'],
            'healthcare': ['healthcare', 'medical', 'pharma', 'biotech', 'hospital'],
            'consulting': ['consulting', 'mckinsey', 'deloitte', 'accenture', 'pwc'],
            'education': ['education', 'university', 'school', 'academic'],
            'retail': ['retail', 'ecommerce', 'amazon', 'walmart'],
            'manufacturing': ['manufacturing', 'automotive', 'industrial'],
            'media': ['media', 'entertainment', 'content', 'publishing'],
            'other': []
        };
        
        for (const [industry, keywords] of Object.entries(industries)) {
            if (keywords.some(keyword => allText.includes(keyword))) {
                return industry;
            }
        }
        
        return 'other';
    }

    createDebugPanel() {
        if (this.debugPanel) return;

        this.debugPanel = document.createElement('div');
        this.debugPanel.id = 'ai-news-debug-panel';
        this.debugPanel.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                width: 300px;
                max-height: 400px;
                background: #fff;
                border: 2px solid #0073b1;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 12px;
                overflow: hidden;
            ">
                <div style="
                    background: #0073b1;
                    color: white;
                    padding: 10px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <span>AI News Scraper</span>
                    <button id="close-debug-panel" style="
                        background: none;
                        border: none;
                        color: white;
                        cursor: pointer;
                        font-size: 16px;
                    ">×</button>
                </div>
                <div id="debug-content" style="
                    padding: 10px;
                    max-height: 350px;
                    overflow-y: auto;
                    background: #f8f9fa;
                ">
                    <button id="manual-scrape-btn" style="
                        width: 100%;
                        padding: 8px;
                        background: #0073b1;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-bottom: 10px;
                        font-weight: bold;
                    ">Start Manual Scrape</button>
                    <div id="debug-logs"></div>
                </div>
            </div>
        `;

        document.body.appendChild(this.debugPanel);

        document.getElementById('close-debug-panel').addEventListener('click', () => {
            this.hideDebugPanel();
        });

        document.getElementById('manual-scrape-btn').addEventListener('click', () => {
            this.log('Manual scrape triggered', 'info');
            this.scrapeProfile();
        });
    }

    hideDebugPanel() {
        if (this.debugPanel) {
            this.debugPanel.style.display = 'none';
        }
    }

    showDebugPanel() {
        if (this.debugPanel) {
            this.debugPanel.style.display = 'block';
        }
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logElement = document.createElement('div');
        
        const colors = {
            info: '#333',
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107'
        };

        logElement.innerHTML = `
            <div style="
                margin-bottom: 5px;
                padding: 5px;
                border-left: 3px solid ${colors[type]};
                background: white;
                border-radius: 3px;
            ">
                <span style="color: #666; font-size: 10px;">[${timestamp}]</span><br>
                <span style="color: ${colors[type]};">${message}</span>
            </div>
        `;

        const logsContainer = document.getElementById('debug-logs');
        if (logsContainer) {
            logsContainer.appendChild(logElement);
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }

        console.log(`[AI News] ${message}`);
    }

    sendProfileToExtension() {
        // Just store the data and update panel - no console logging
        try {
            chrome.storage.local.set({
                userProfile: this.profileData,
                profileLastUpdated: Date.now(),
                profileScrapingCompleted: true
            });
        } catch (e) {}
        
        try {
            chrome.runtime.sendMessage({
                action: 'profileScraped',
                data: this.profileData
            });
        } catch (e) {}
        
        // Update panel directly
        try {
            const logsContainer = document.getElementById('debug-logs');
            if (logsContainer) {
                logsContainer.innerHTML += `
                    <div style="color: green; font-weight: bold; margin: 5px 0;">✅ COMPLETED!</div>
                    <div style="color: black; margin: 2px 0;">Name: ${this.profileData.name || 'Not found'}</div>
                    <div style="color: black; margin: 2px 0;">Headline: ${this.profileData.headline || 'Not found'}</div>
                    <div style="color: black; margin: 2px 0;">Company: ${this.profileData.company || 'Not found'}</div>
                    <div style="color: green; font-weight: bold; margin: 5px 0;">🎉 SCRAPING FINISHED!</div>
                `;
            }
        } catch (e) {}
    }

    showResults() {
        this.log('Profile data processing complete!', 'success');
        this.log(`Found: ${this.profileData.name || 'No name'}, ${this.profileData.headline || 'No headline'}`, 'success');
        this.log(`Company: ${this.profileData.company || 'No company'}`, 'info');
        this.log(`Industry: ${this.profileData.industry || 'No industry'}`, 'info');
        this.log(`Seniority: ${this.profileData.seniority || 'No seniority'}`, 'info');
        this.log(`Job Function: ${this.profileData.jobFunction || 'No job function'}`, 'info');
        
        console.log('Profile data processed:', this.profileData);
        
        // Show final success immediately
        this.log('✅ Profile scraping completed successfully!', 'success');
        this.log('✅ Data processing finished', 'success');
        
        // Try simple message send without waiting for response
        try {
            chrome.runtime.sendMessage({
                action: 'profileScraped',
                data: this.profileData
            });
            this.log('Message sent to background (fire and forget)', 'info');
        } catch (error) {
            this.log('Background message failed (this is normal)', 'warning');
        }
    }
}

// Simple test to verify script loads
console.log('🤖 AI News Extension: linkedin-scraper.js loaded at', new Date().toLocaleTimeString());

// Force creation of debug indicator
function createIndicator() {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #0073b1;
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        z-index: 999999;
        font-size: 14px;
        font-family: Arial;
        font-weight: bold;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    indicator.textContent = '🤖 AI News Extension Active';
    
    if (document.body) {
        document.body.appendChild(indicator);
        console.log('🤖 Extension indicator added');
        // Remove indicator after 5 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
                console.log('🤖 Extension indicator removed');
            }
        }, 5000);
    } else {
        setTimeout(createIndicator, 100);
    }
}

createIndicator();

function initScraper() {
    console.log('🤖 Initializing scraper...');
    if (!window.linkedInScraper) {
        window.linkedInScraper = new LinkedInProfileScraper();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScraper);
} else {
    initScraper();
}

// Also listen for URL changes in case LinkedIn is a SPA
let currentUrl = location.href;
setInterval(() => {
    if (location.href !== currentUrl) {
        currentUrl = location.href;
        console.log('🤖 URL changed, reinitializing...');
        setTimeout(initScraper, 1000);
    }
}, 1000);

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'scrapeProfile') {
        // Find existing scraper or create new one
        let scraper = window.linkedInScraper;
        if (!scraper) {
            scraper = new LinkedInProfileScraper();
            window.linkedInScraper = scraper;
        }
        
        scraper.showDebugPanel();
        scraper.log('Received scrape command from extension', 'info');
        scraper.scrapeProfile();
        sendResponse({ success: true });
    } else if (request.action === 'ping') {
        sendResponse({ success: true });
    }
});