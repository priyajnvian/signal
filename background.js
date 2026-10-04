// Signal by ELI - Background Service Worker
console.log('Signal: Background script loaded at:', new Date().toLocaleTimeString());

// Global variables for monitoring
let monitoringActive = false;
let monitoringAlarmName = 'signalMonitoring';

// API configuration
const GNEWS_API_KEY = 'YOUR_GNEWS_API_KEY'; // User needs to replace this
const GNEWS_API_URL = 'https://gnews.io/api/v4/search';

// Google Custom Search API (fallback)
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY'; // User needs to replace this
const GOOGLE_SEARCH_ENGINE_ID = 'YOUR_SEARCH_ENGINE_ID'; // User needs to replace this
const GOOGLE_SEARCH_URL = 'https://www.googleapis.com/customsearch/v1';

// RSS-based monitoring configuration
const RSS_UPDATE_INTERVAL = 5; // minutes
const MAX_RSS_RESULTS_PER_FEED = 20;

// Podcast Index API configuration (free, no API key required for basic search)
const PODCAST_INDEX_API_URL = 'https://api.podcastindex.org/api/1.0/search/byterm';

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Signal: Extension installed/updated:', details.reason);
    
    // Set up monitoring alarm (check every 5 minutes)
    chrome.alarms.create(monitoringAlarmName, {
        delayInMinutes: 1,
        periodInMinutes: 5
    });
    
    // Initialize storage
    chrome.storage.local.set({
        lastCheckTime: Date.now(),
        signalCompanies: [],
        signalMentions: [],
        signalActivities: []
    });
    
    console.log('Signal: Initialization complete');
});

// Handle alarm for periodic monitoring
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('Signal: Alarm received:', alarm.name, 'at', new Date().toLocaleTimeString());
    if (alarm.name === monitoringAlarmName) {
        console.log('Signal: Monitoring alarm triggered - checking for mentions');
        checkForMentions();
    }
});

// Debug: Log all active alarms every 30 seconds
setInterval(async () => {
    const alarms = await chrome.alarms.getAll();
    console.log('Signal: Active alarms:', alarms.map(a => ({name: a.name, when: new Date(a.scheduledTime).toLocaleTimeString()})));
}, 30000);

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Signal: Message received:', request.action);
    
    if (request.action === 'startMonitoring') {
        startMonitoring();
        sendResponse({ success: true });
        return true;
    } 
    else if (request.action === 'checkMentions') {
        checkForMentions();
        sendResponse({ success: true });
        return true;
    }
    else if (request.action === 'getMonitoringStatus') {
        sendResponse({ 
            success: true, 
            active: monitoringActive,
            lastCheck: Date.now()
        });
        return true;
    }
    else if (request.action === 'testRSS') {
        // Test RSS functionality
        testRSSAccess().then(result => {
            sendResponse({ success: true, result: result });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
    else if (request.action === 'debugRSS') {
        // Debug RSS with specific company
        debugRSSForCompany(request.company).then(result => {
            sendResponse({ success: true, result: result });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
});

// Test RSS access function
async function testRSSAccess() {
    console.log('Signal: Testing RSS access...');
    
    try {
        // Test with a simple RSS feed first
        const testUrl = 'https://news.google.com/rss?hl=en&gl=US&ceid=US:en';
        console.log(`Signal: Testing RSS URL: ${testUrl}`);
        
        const response = await fetch(testUrl);
        console.log(`Signal: Test RSS response status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`RSS test failed: ${response.status}`);
        }
        
        const text = await response.text();
        console.log(`Signal: Test RSS response length: ${text.length}`);
        console.log(`Signal: Test RSS preview: ${text.substring(0, 300)}...`);
        
        return { success: true, length: text.length, preview: text.substring(0, 200) };
        
    } catch (error) {
        console.error('Signal: RSS test failed:', error);
        return { success: false, error: error.message };
    }
}

// Debug RSS for specific company
async function debugRSSForCompany(company) {
    console.log('Signal: Starting debug RSS for company:', company.name);
    
    const debugLog = [];
    
    try {
        debugLog.push(`🏢 Testing company: ${company.name}`);
        debugLog.push(`📝 Keywords: ${company.keywords.join(', ')}`);
        
        // Generate RSS URLs
        const rssUrls = generateRSSUrls(company);
        debugLog.push(`🔗 Generated ${rssUrls.length} RSS URLs`);
        
        for (const rssConfig of rssUrls) {
            debugLog.push(`\n📡 Testing RSS feed: ${rssConfig.source}`);
            debugLog.push(`🔍 Query: ${rssConfig.query}`);
            debugLog.push(`🌐 URL: ${rssConfig.url}`);
            
            try {
                const startTime = Date.now();
                
                // Fetch RSS
                const response = await fetch(rssConfig.url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/rss+xml, application/xml, text/xml',
                        'User-Agent': 'Signal-Chrome-Extension/1.0'
                    }
                });
                
                const fetchTime = Date.now() - startTime;
                debugLog.push(`⏱️ Fetch time: ${fetchTime}ms`);
                debugLog.push(`📊 Response status: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    debugLog.push(`❌ HTTP Error: ${response.status} ${response.statusText}`);
                    continue;
                }
                
                const xmlText = await response.text();
                debugLog.push(`📄 Response size: ${xmlText.length} characters`);
                debugLog.push(`📋 Content preview: ${xmlText.substring(0, 200)}...`);
                
                // Debug XML structure using regex (no DOM APIs needed)
                const itemMatches = xmlText.match(/<item[^>]*>/gi) || [];
                const entryMatches = xmlText.match(/<entry[^>]*>/gi) || [];
                const channelMatch = xmlText.match(/<channel[^>]*>/i);
                const feedMatch = xmlText.match(/<feed[^>]*>/i);
                
                debugLog.push(`🔍 XML structure analysis:`);
                debugLog.push(`   - <item> elements found: ${itemMatches.length}`);
                debugLog.push(`   - <entry> elements found: ${entryMatches.length}`);
                debugLog.push(`   - <channel> found: ${channelMatch ? 'Yes' : 'No'}`);
                debugLog.push(`   - <feed> found: ${feedMatch ? 'Yes' : 'No'}`);
                
                // Try to parse
                const parseStartTime = Date.now();
                
                // Enable detailed console logging for debugging
                const originalConsoleLog = console.log;
                const logs = [];
                console.log = (...args) => {
                    logs.push(args.join(' '));
                    originalConsoleLog(...args);
                };
                
                const results = parseRSSXML(xmlText, company, rssConfig.keywords, rssConfig);
                
                // Restore console.log
                console.log = originalConsoleLog;
                
                const parseTime = Date.now() - parseStartTime;
                
                debugLog.push(`⚙️ Parse time: ${parseTime}ms`);
                debugLog.push(`🎯 Articles found: ${results.length}`);
                
                // Add captured console logs to debug output
                if (logs.length > 0) {
                    debugLog.push(`\n📋 Parsing console logs:`);
                    logs.forEach(log => {
                        if (log.includes('Signal:')) {
                            debugLog.push(`   ${log}`);
                        }
                    });
                } else {
                    debugLog.push(`\n📋 No console logs captured`);
                }
                
                // Debug why no articles were found if we have items but no results
                if (itemMatches.length > 0 && results.length === 0) {
                    debugLog.push(`\n🔍 Debugging why ${itemMatches.length} items resulted in 0 articles:`);
                    
                    // Look at first raw item
                    const firstItemMatch = xmlText.match(/<item[^>]*>([\s\S]*?)<\/item>/i);
                    if (firstItemMatch) {
                        const firstItem = firstItemMatch[1];
                        debugLog.push(`📋 First item raw content (1000 chars):`);
                        debugLog.push(firstItem.substring(0, 1000) + '...');
                        
                        // Test date extraction specifically
                        const dateMatch = firstItem.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
                                        firstItem.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
                                        firstItem.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
                        const dateStr = dateMatch ? cleanXMLContent(dateMatch[1]) : '';
                        
                        debugLog.push(`\n📅 Date extraction analysis:`);
                        debugLog.push(`   Raw date string: "${dateStr}"`);
                        
                        let publishedAt = Date.now();
                        if (dateStr) {
                            const parsedDate = new Date(dateStr);
                            if (!isNaN(parsedDate.getTime())) {
                                publishedAt = parsedDate.getTime();
                            }
                        }
                        
                        const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
                        debugLog.push(`   Parsed publishedAt: ${publishedAt} (${new Date(publishedAt).toISOString()})`);
                        debugLog.push(`   14 days ago threshold: ${fourteenDaysAgo} (${new Date(fourteenDaysAgo).toISOString()})`);
                        debugLog.push(`   Is recent enough: ${publishedAt >= fourteenDaysAgo}`);
                        debugLog.push(`   Time difference: ${Math.round((Date.now() - publishedAt) / (1000 * 60 * 60))} hours ago`);
                        
                        // Look for any date-like content
                        const allDateMatches = firstItem.match(/<[^>]*(?:date|time|published|updated)[^>]*>[\s\S]*?<\/[^>]*>/gi);
                        if (allDateMatches) {
                            debugLog.push(`   All date-like fields: ${allDateMatches.join(', ')}`);
                        } else {
                            debugLog.push(`   No date fields found in RSS item`);
                        }
                        
                        // Test our regex on first item
                        const titleMatch = firstItem.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                        const linkMatch = firstItem.match(/<link[^>]*href=["']([^"']+)["']/i) ||
                                        firstItem.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ||
                                        firstItem.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
                        
                        debugLog.push(`\n🔍 Element extraction:`);
                        debugLog.push(`   🏷️ Title match: ${titleMatch ? 'Found' : 'Not found'}`);
                        debugLog.push(`   🔗 Link match: ${linkMatch ? 'Found' : 'Not found'}`);
                        
                        if (titleMatch) {
                            const title = cleanXMLContent(titleMatch[1]);
                            debugLog.push(`   📝 Extracted title: ${title.substring(0, 100)}...`);
                        }
                        if (linkMatch) {
                            const link = cleanXMLContent(linkMatch[1]);
                            debugLog.push(`   🌐 Extracted link: ${link.substring(0, 100)}...`);
                        }
                        
                        // Test the full parsing logic on first item
                        if (titleMatch && linkMatch) {
                            const title = cleanXMLContent(titleMatch[1]);
                            const link = cleanXMLContent(linkMatch[1]);
                            const content = (title).toLowerCase();
                            const companyNameLower = company.name.toLowerCase();
                            const foundKeywords = content.includes(companyNameLower) ? [company.name] : [];
                            const hasRelevantContent = foundKeywords.length > 0 || rssConfig.type === 'google_search';
                            
                            debugLog.push(`\n✅ Final validation check:`);
                            debugLog.push(`   📝 Title length: ${title.length} (need >10) ✓`);
                            debugLog.push(`   🌐 Link starts with http: ${link.startsWith('http')} ✓`);
                            debugLog.push(`   🎯 Has relevant content: ${hasRelevantContent} ✓`);
                            debugLog.push(`   📅 Is recent enough: ${publishedAt >= fourteenDaysAgo} ${publishedAt >= fourteenDaysAgo ? '✓' : '❌ FAILED'}`);
                            debugLog.push(`   🔍 Content includes "${companyNameLower}": ${content.includes(companyNameLower)}`);
                            debugLog.push(`   📊 RSS config type: ${rssConfig.type}`);
                            
                            const allConditionsMet = hasRelevantContent && title.length > 10 && link.startsWith('http') && publishedAt >= fourteenDaysAgo;
                            debugLog.push(`   🎯 ALL CONDITIONS MET: ${allConditionsMet} ${allConditionsMet ? '✅' : '❌'}`);
                        }
                    }
                }
                
                if (results.length > 0) {
                    debugLog.push(`\n📰 Sample articles:`);
                    results.slice(0, 3).forEach((article, i) => {
                        debugLog.push(`  ${i + 1}. ${article.title}`);
                        debugLog.push(`     📅 ${new Date(article.publishedAt).toLocaleString()}`);
                        debugLog.push(`     🔗 ${article.url.substring(0, 60)}...`);
                    });
                } else {
                    debugLog.push(`⚠️ No articles found in RSS feed`);
                }
                
            } catch (error) {
                debugLog.push(`❌ RSS Error: ${error.message}`);
                if (error.name === 'TypeError') {
                    debugLog.push(`🚫 Possible CORS issue or network error`);
                }
            }
        }
        
        return {
            success: true,
            company: company.name,
            logs: debugLog,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        debugLog.push(`💥 Fatal error: ${error.message}`);
        return {
            success: false,
            error: error.message,
            logs: debugLog,
            timestamp: new Date().toISOString()
        };
    }
}

// Start monitoring function
async function startMonitoring() {
    try {
        const result = await chrome.storage.local.get(['signalCompanies']);
        const companies = result.signalCompanies || [];
        
        if (companies.length === 0) {
            console.log('Signal: No companies to monitor');
            return;
        }
        
        const activeCompanies = companies.filter(company => company.isActive);
        if (activeCompanies.length === 0) {
            console.log('Signal: No active companies to monitor');
            return;
        }
        
        monitoringActive = true;
        console.log(`Signal: Started monitoring ${activeCompanies.length} active companies`);
        
        // Immediately check for mentions
        checkForMentions();
        
    } catch (error) {
        console.error('Signal: Error starting monitoring:', error);
    }
}

// Check for mentions function
async function checkForMentions() {
    try {
        console.log('Signal: Checking for new mentions...');
        
        const result = await chrome.storage.local.get(['signalCompanies', 'signalMentions']);
        const companies = result.signalCompanies || [];
        const existingMentions = result.signalMentions || [];
        
        const activeCompanies = companies.filter(company => company.isActive);
        
        if (activeCompanies.length === 0) {
            console.log('Signal: No active companies to monitor');
            return;
        }
        
        let newMentions = [];
        
        for (const company of activeCompanies) {
            console.log(`Signal: Checking mentions for company: ${company.name}`);
            
            // Use RSS-based monitoring for this company
            try {
                console.log(`Signal: Starting RSS monitoring for ${company.name}`);
                
                // Get RSS results for this company
                let mentions = await searchWithRSS(company);
                
                // Filter out existing mentions and ensure quality
                const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
                const filteredMentions = mentions.filter(mention => {
                    // Check for duplicates
                    const isNotDuplicate = !existingMentions.some(existing => 
                        existing.url === mention.url && existing.companyId === company.id
                    );
                    
                    // Strict date validation
                    const publishedDate = mention.publishedAt;
                    const isValidDate = publishedDate && !isNaN(publishedDate) && publishedDate > 0;
                    const isRecent = isValidDate && publishedDate > fourteenDaysAgo;
                    const isNotFuture = isValidDate && publishedDate <= Date.now();
                    
                    // Additional checks for content quality
                    const hasValidTitle = mention.title && mention.title.length > 10;
                    const hasValidUrl = mention.url && mention.url.startsWith('http');
                    
                    const isValid = isNotDuplicate && isRecent && isNotFuture && hasValidTitle && hasValidUrl;
                    
                    if (!isValid && isNotDuplicate) {
                        console.log(`Signal: Filtered out mention - Recent: ${isRecent}, Valid Date: ${isValidDate}, Title: ${hasValidTitle}, URL: ${hasValidUrl}, Published: ${new Date(publishedDate).toISOString()}`);
                    }
                    
                    return isValid;
                });
                
                // Add company info to mentions and determine which keyword matched
                const companyMentions = filteredMentions.map(mention => {
                    // Use the first matched keyword as the primary match
                    const primaryKeyword = mention.matchedKeywords && mention.matchedKeywords.length > 0 
                        ? mention.matchedKeywords[0] 
                        : company.keywords[0];
                    
                    return {
                        ...mention,
                        companyId: company.id,
                        companyName: company.name,
                        matchedKeyword: primaryKeyword,
                        allMatchedKeywords: mention.matchedKeywords || [primaryKeyword],
                        foundAt: Date.now()
                    };
                });
                
                newMentions.push(...companyMentions);
                
                console.log(`Signal: RSS monitoring found ${companyMentions.length} new mentions for ${company.name}`);
                
                // Small delay before processing next company
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`Signal: Error in RSS monitoring for ${company.name}:`, error);
            }
        }
        
        if (newMentions.length > 0) {
            // Clean up any old mentions before saving new ones
            const cleanedExistingMentions = cleanupOldMentions(existingMentions);
            const allMentions = [...cleanedExistingMentions, ...newMentions];
            
            await chrome.storage.local.set({ 
                signalMentions: allMentions,
                lastCheckTime: Date.now()
            });
            
            console.log(`Signal: Found ${newMentions.length} new mentions total`);
            
            // Notifications disabled per user request
            
            // Update badge
            chrome.action.setBadgeText({
                text: newMentions.length.toString()
            });
            chrome.action.setBadgeBackgroundColor({
                color: '#f17020'
            });
            
        } else {
            console.log('Signal: No new mentions found');
            
            // Update last check time
            await chrome.storage.local.set({ lastCheckTime: Date.now() });
        }
        
    } catch (error) {
        console.error('Signal: Error checking mentions:', error);
        await chrome.storage.local.set({ lastCheckTime: Date.now() });
    }
}

// Search GNews API with focus on recent content
async function searchGNews(keyword) {
    // Skip GNews if no API key is configured
    if (!GNEWS_API_KEY || GNEWS_API_KEY === 'YOUR_GNEWS_API_KEY') {
        console.log('Signal: GNews API key not configured, skipping');
        throw new Error('GNews API key not configured');
    }
    
    try {
        // Calculate date for "today only" - last 24 hours
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const fromDate = twentyFourHoursAgo.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        const params = new URLSearchParams({
            q: keyword,
            token: GNEWS_API_KEY,
            lang: 'en',
            max: 10, // Reduced to focus on most relevant results
            sortby: 'publishedAt',
            from: fromDate, // Only get articles from last 24 hours
            to: now.toISOString().split('T')[0], // Up to today
            country: 'us' // Focus on US news for better relevance
        });
        
        const response = await fetch(`${GNEWS_API_URL}?${params}`);
        
        if (!response.ok) {
            throw new Error(`GNews API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.articles && Array.isArray(data.articles)) {
            const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
            
            return data.articles
                .map(article => {
                    const publishedTime = new Date(article.publishedAt).getTime();
                    return {
                        title: article.title,
                        description: article.description,
                        url: article.url,
                        source: article.source?.name || 'Unknown',
                        publishedAt: publishedTime,
                        image: article.image
                    };
                })
                .filter(article => {
                    // Double-check date filtering at source level
                    const isRecent = article.publishedAt > twentyFourHoursAgo;
                    const isValidDate = !isNaN(article.publishedAt) && article.publishedAt > 0;
                    const isNotFuture = article.publishedAt <= Date.now();
                    
                    if (!isRecent && isValidDate) {
                        console.log(`Signal: GNews filtered old article: ${article.title} (${new Date(article.publishedAt).toISOString()})`);
                    }
                    
                    return isRecent && isValidDate && isNotFuture;
                });
        }
        
        return [];
        
    } catch (error) {
        console.error('Signal: GNews API error:', error);
        return [];
    }
}

// RSS-based search system (no API limits!)
async function searchWithRSS(company) {
    let allResults = [];
    
    try {
        console.log(`Signal: Starting RSS monitoring for company: ${company.name}`);
        console.log(`Signal: Company keywords:`, company.keywords);
        
        // Generate RSS URLs for this company
        const rssUrls = generateRSSUrls(company);
        console.log(`Signal: Generated ${rssUrls.length} RSS URLs for ${company.name}`);
        
        // Check each RSS feed
        for (let i = 0; i < rssUrls.length; i++) {
            const rssConfig = rssUrls[i];
            try {
                console.log(`Signal: [${i + 1}/${rssUrls.length}] Fetching RSS feed for ${company.name}...`);
                console.log(`Signal: RSS URL: ${rssConfig.url}`);
                
                const feedResults = await fetchAndParseRSS(rssConfig, company);
                console.log(`Signal: Feed ${i + 1} returned ${feedResults.length} results`);
                
                allResults.push(...feedResults);
                
                // Small delay between feeds to be respectful
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`Signal: RSS feed ${i + 1} failed for ${company.name}:`, error);
            }
        }
        
        // Podcast Index API requires authentication, so skip for now
        // Twitter RSS via Nitter is unreliable, so skip for now
        // Stick with the 3 working RSS sources
        
        console.log(`Signal: RSS monitoring completed for ${company.name}. Total results: ${allResults.length}`);
        return allResults;
        
    } catch (error) {
        console.error(`Signal: RSS monitoring error for ${company.name}:`, error);
        return [];
    }
}

// Generate RSS URLs for a company - ALL SOURCES RESTORED
function generateRSSUrls(company) {
    const urls = [];
    const searchQuery = `"${company.name}"`;
    
    // 1. GOOGLE NEWS - General mentions (most reliable)
    const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en&gl=US&ceid=US:en&when=1d`;
    urls.push({
        url: googleNewsUrl,
        type: 'google_search',
        keywords: [company.name],
        source: 'Google News',
        query: searchQuery
    });
    
    // 2. PODCAST NEWS COVERAGE (improved detection)
    const podcastNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery + ' podcast OR interview OR episode')}&hl=en&gl=US&ceid=US:en&when=7d`;
    urls.push({
        url: podcastNewsUrl,
        type: 'google_search',
        keywords: [company.name],
        source: 'Podcast Coverage',
        query: searchQuery + ' podcast OR interview OR episode'
    });
    
    // 3. YOUTUBE CONTENT
    const youtubeUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery + ' site:youtube.com')}&hl=en&gl=US&ceid=US:en&when=1d`;
    urls.push({
        url: youtubeUrl,
        type: 'google_search',
        keywords: [company.name],
        source: 'YouTube',
        query: searchQuery + ' site:youtube.com'
    });
    
    // 4. REDDIT DISCUSSIONS
    const redditUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery + ' site:reddit.com')}&hl=en&gl=US&ceid=US:en&when=1d`;
    urls.push({
        url: redditUrl,
        type: 'google_search',
        keywords: [company.name],
        source: 'Reddit',
        query: searchQuery + ' site:reddit.com'
    });
    
    console.log(`Signal: Generated ${urls.length} RSS URLs for ${company.name} (ALL PLATFORMS):`);
    console.log(`  - Google News: ${googleNewsUrl.substring(0, 80)}...`);
    console.log(`  - Podcast News: ${podcastNewsUrl.substring(0, 80)}...`);
    console.log(`  - YouTube: ${youtubeUrl.substring(0, 80)}...`);
    console.log(`  - Reddit: ${redditUrl.substring(0, 80)}...`);
    
    return urls;
}

// Fetch podcasts from Podcast Index API
async function fetchPodcastMentions(company) {
    try {
        console.log(`Signal: Searching podcasts for ${company.name} via Podcast Index API`);
        
        const searchUrl = `${PODCAST_INDEX_API_URL}?q=${encodeURIComponent(company.name)}&max=20&fulltext=true`;
        
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Signal-Chrome-Extension/1.0'
            }
        });
        
        if (!response.ok) {
            console.log(`Signal: Podcast API request failed: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        console.log(`Signal: Podcast API returned ${data.feeds?.length || 0} results`);
        
        if (!data.feeds || data.feeds.length === 0) {
            return [];
        }
        
        const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
        const mentions = [];
        
        data.feeds.forEach(podcast => {
            // Check if podcast was updated recently
            const lastUpdate = podcast.lastUpdateTime ? podcast.lastUpdateTime * 1000 : 0;
            
            if (lastUpdate > fourteenDaysAgo) {
                // Check if company name appears in title or description
                const title = podcast.title || '';
                const description = podcast.description || '';
                const searchText = (title + ' ' + description).toLowerCase();
                const companyLower = company.name.toLowerCase();
                
                if (searchText.includes(companyLower)) {
                    mentions.push({
                        id: `podcast_${podcast.id}_${Date.now()}`,
                        companyId: company.id,
                        title: title,
                        description: cleanDescription(description),
                        url: podcast.link || podcast.url || `https://podcastindex.org/podcast/${podcast.id}`,
                        source: 'Podcast Index',
                        publishedAt: lastUpdate,
                        foundAt: Date.now(),
                        matchedKeyword: company.name,
                        type: 'podcast',
                        podcastData: {
                            podcastTitle: title,
                            author: podcast.author || 'Unknown',
                            categories: podcast.categories || {},
                            episodeCount: podcast.episodeCount || 0
                        }
                    });
                }
            }
        });
        
        console.log(`Signal: Found ${mentions.length} podcast mentions for ${company.name}`);
        return mentions;
        
    } catch (error) {
        console.error(`Signal: Error fetching podcast mentions for ${company.name}:`, error);
        return [];
    }
}

// Fetch and parse RSS feed
async function fetchAndParseRSS(rssConfig, company) {
    try {
        console.log(`Signal: Attempting to fetch RSS: ${rssConfig.url.substring(0, 100)}...`);
        
        const response = await fetch(rssConfig.url, {
            method: 'GET',
            headers: {
                'Accept': 'application/rss+xml, application/xml, text/xml',
                'User-Agent': 'Signal-Chrome-Extension/1.0'
            }
        });
        
        console.log(`Signal: RSS response status: ${response.status}`);
        console.log(`Signal: RSS response headers:`, Object.fromEntries(response.headers.entries()));
        
        // Special handling for different RSS sources
        if (rssConfig.source === 'YouTube') {
            console.log(`Signal: YouTube RSS URL: ${rssConfig.url}`);
            console.log(`Signal: YouTube response status: ${response.status}`);
        } else if (rssConfig.source === 'LinkedIn News') {
            console.log(`Signal: LinkedIn News RSS URL: ${rssConfig.url}`);
            console.log(`Signal: LinkedIn News response status: ${response.status}`);
            console.log(`Signal: LinkedIn News response headers:`, Object.fromEntries(response.headers.entries()));
        } else if (rssConfig.source.includes('Podcast')) {
            console.log(`Signal: PODCAST DEBUG - Source: ${rssConfig.source}`);
            console.log(`Signal: PODCAST DEBUG - URL: ${rssConfig.url}`);
            console.log(`Signal: PODCAST DEBUG - Response status: ${response.status}`);
            console.log(`Signal: PODCAST DEBUG - Response headers:`, Object.fromEntries(response.headers.entries()));
        }
        
        if (!response.ok) {
            if (rssConfig.source === 'YouTube') {
                console.log(`Signal: YouTube RSS failed with status ${response.status} - might not support search RSS`);
            } else if (rssConfig.source === 'LinkedIn News') {
                console.log(`Signal: LinkedIn News RSS failed with status ${response.status} - might require authentication or different URL`);
            } else if (rssConfig.source.includes('Podcast')) {
                console.log(`Signal: PODCAST DEBUG - FAILED with status ${response.status}`);
                console.log(`Signal: PODCAST DEBUG - Error: ${response.statusText}`);
                console.log(`Signal: PODCAST DEBUG - This might indicate the RSS endpoint doesn't exist or requires authentication`);
            }
            throw new Error(`RSS fetch failed: ${response.status} ${response.statusText}`);
        }
        
        const xmlText = await response.text();
        console.log(`Signal: RSS XML length: ${xmlText.length} characters`);
        console.log(`Signal: RSS XML preview: ${xmlText.substring(0, 200)}...`);
        
        // Special handling for iTunes podcast search
        if (rssConfig.type === 'itunes_podcast_search') {
            console.log(`Signal: PODCAST DEBUG - Processing iTunes API response`);
            const results = await parseItunesPodcastSearch(xmlText, company, rssConfig);
            console.log(`Signal: Parsed ${results.length} podcast episodes from iTunes search`);
            return results;
        }
        
        // Special debugging for other podcast responses
        if (rssConfig.source.includes('Podcast')) {
            console.log(`Signal: PODCAST DEBUG - SUCCESS! Got ${xmlText.length} characters`);
            console.log(`Signal: PODCAST DEBUG - XML preview: ${xmlText.substring(0, 500)}...`);
            console.log(`Signal: PODCAST DEBUG - Content type check: ${xmlText.includes('<?xml') ? 'Valid XML' : 'Not XML'}`);
            console.log(`Signal: PODCAST DEBUG - RSS check: ${xmlText.includes('<rss') || xmlText.includes('<feed') ? 'Contains RSS/Feed tags' : 'No RSS/Feed tags found'}`);
        }
        
        const results = parseRSSXML(xmlText, company, rssConfig.keywords, rssConfig);
        
        console.log(`Signal: Parsed ${results.length} articles from RSS for ${company.name}`);
        return results;
        
    } catch (error) {
        console.error(`Signal: RSS fetch/parse error for ${company.name}:`, error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.error('Signal: This might be a CORS issue. RSS feeds might not be accessible from Chrome extension.');
        }
        return [];
    }
}

// Parse iTunes podcast search response and fetch actual podcast RSS feeds
async function parseItunesPodcastSearch(jsonText, company, rssConfig) {
    try {
        console.log(`Signal: PODCAST - Parsing iTunes API response for ${company.name}`);
        
        const data = JSON.parse(jsonText);
        const podcasts = data.results || [];
        
        console.log(`Signal: PODCAST - Found ${podcasts.length} podcasts from iTunes search`);
        
        if (podcasts.length === 0) {
            console.log(`Signal: PODCAST - No podcasts found for ${company.name}`);
            return [];
        }
        
        let allEpisodes = [];
        const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
        
        // Check first 3 podcasts for relevant episodes
        for (let i = 0; i < Math.min(3, podcasts.length); i++) {
            const podcast = podcasts[i];
            const feedUrl = podcast.feedUrl;
            
            if (!feedUrl) {
                console.log(`Signal: PODCAST - No RSS feed for podcast: ${podcast.trackName || podcast.collectionName}`);
                continue;
            }
            
            console.log(`Signal: PODCAST - Checking podcast: ${podcast.trackName || podcast.collectionName}`);
            console.log(`Signal: PODCAST - RSS URL: ${feedUrl.substring(0, 80)}...`);
            
            try {
                // Fetch the actual podcast RSS feed
                const rssResponse = await fetch(feedUrl, {
                    headers: {
                        'Accept': 'application/rss+xml, application/xml, text/xml',
                        'User-Agent': 'Signal-Chrome-Extension/1.0'
                    }
                });
                
                if (!rssResponse.ok) {
                    console.log(`Signal: PODCAST - RSS fetch failed for ${podcast.trackName}: ${rssResponse.status}`);
                    continue;
                }
                
                const rssXml = await rssResponse.text();
                console.log(`Signal: PODCAST - RSS feed length: ${rssXml.length} characters`);
                
                // Parse the RSS feed for episodes
                const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
                const matches = [...rssXml.matchAll(itemRegex)];
                
                console.log(`Signal: PODCAST - Found ${matches.length} episodes in ${podcast.trackName}`);
                
                // Check each episode for company mentions
                for (let j = 0; j < Math.min(5, matches.length); j++) {
                    const itemContent = matches[j][1];
                    
                    try {
                        // Extract episode data
                        const titleMatch = itemContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                        const title = titleMatch ? cleanXMLContent(titleMatch[1]) : '';
                        
                        const descMatch = itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
                                        itemContent.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ||
                                        itemContent.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
                        const description = descMatch ? cleanXMLContent(descMatch[1]) : '';
                        
                        const linkMatch = itemContent.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ||
                                        itemContent.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
                        const link = linkMatch ? cleanXMLContent(linkMatch[1]) : '';
                        
                        const dateMatch = itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
                                        itemContent.match(/<published[^>]*>([\s\S]*?)<\/published>/i);
                        const dateStr = dateMatch ? cleanXMLContent(dateMatch[1]) : '';
                        
                        // Parse publication date
                        let publishedAt = Date.now();
                        if (dateStr) {
                            const parsedDate = new Date(dateStr);
                            if (!isNaN(parsedDate.getTime())) {
                                publishedAt = parsedDate.getTime();
                            }
                        }
                        
                        // Check if recent
                        if (publishedAt < fourteenDaysAgo) {
                            continue;
                        }
                        
                        // Check if episode mentions the company
                        const episodeContent = (title + ' ' + description).toLowerCase();
                        const companyNameLower = company.name.toLowerCase();
                        
                        if (episodeContent.includes(companyNameLower)) {
                            console.log(`Signal: PODCAST - ✅ FOUND MENTION: ${title.substring(0, 50)}...`);
                            
                            allEpisodes.push({
                                title: title.trim(),
                                description: cleanDescription(description),
                                url: link || feedUrl,
                                source: `${podcast.trackName || podcast.collectionName}`,
                                publishedAt: publishedAt,
                                matchedKeywords: [company.name],
                                type: 'podcast',
                                podcastData: {
                                    podcastName: podcast.trackName || podcast.collectionName,
                                    artistName: podcast.artistName || 'Unknown',
                                    feedUrl: feedUrl
                                }
                            });
                        }
                        
                    } catch (episodeError) {
                        console.log(`Signal: PODCAST - Error parsing episode: ${episodeError.message}`);
                    }
                }
                
                // Small delay between RSS fetches
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (rssError) {
                console.log(`Signal: PODCAST - Error fetching RSS for ${podcast.trackName}: ${rssError.message}`);
            }
        }
        
        console.log(`Signal: PODCAST - Total relevant episodes found: ${allEpisodes.length}`);
        return allEpisodes;
        
    } catch (error) {
        console.error(`Signal: PODCAST - Error parsing iTunes response: ${error.message}`);
        return [];
    }
}

// Parse RSS XML and extract article data (without DOM APIs)
function parseRSSXML(xmlText, company, matchedKeywords, rssConfig) {
    try {
        console.log('Signal: Starting XML parsing without DOM APIs');
        
        // Simple regex-based XML parsing for service worker context
        const articles = [];
        // Extend to 14 days to match Google News RSS behavior (they return older articles even with when=1d)
        const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
        
        // Extract items using regex (since DOMParser isn't available in service workers)
        const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
        const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
        
        let matches = [...xmlText.matchAll(itemRegex), ...xmlText.matchAll(entryRegex)];
        console.log(`Signal: Found ${matches.length} items/entries using regex`);
        console.log(`Signal: RSS source: ${rssConfig.source}`);
        
        // Special debugging for YouTube
        if (rssConfig.source === 'YouTube') {
            console.log(`Signal: YouTube XML preview: ${xmlText.substring(0, 500)}...`);
            const entriesFound = xmlText.match(entryRegex) || [];
            console.log(`Signal: YouTube entries found: ${entriesFound.length}`);
            if (entriesFound.length === 0) {
                console.log('Signal: No YouTube entries found - checking if feed exists');
                if (xmlText.includes('<feed')) {
                    console.log('Signal: YouTube feed structure detected but no entries');
                } else {
                    console.log('Signal: YouTube feed structure not found - might be error response');
                }
            }
        }
        
        // Special debugging for Podcasts
        if (rssConfig.source.includes('Podcast')) {
            const itemsFound = xmlText.match(itemRegex) || [];
            const entriesFound = xmlText.match(entryRegex) || [];
            console.log(`Signal: PODCAST DEBUG - Items found: ${itemsFound.length}`);
            console.log(`Signal: PODCAST DEBUG - Entries found: ${entriesFound.length}`);
            console.log(`Signal: PODCAST DEBUG - Total matches: ${matches.length}`);
            
            if (matches.length === 0) {
                console.log('Signal: PODCAST DEBUG - No items/entries found. Checking XML structure...');
                if (xmlText.includes('<rss')) {
                    console.log('Signal: PODCAST DEBUG - Valid RSS structure detected');
                } else if (xmlText.includes('<feed')) {
                    console.log('Signal: PODCAST DEBUG - Atom feed structure detected');
                } else if (xmlText.includes('<html')) {
                    console.log('Signal: PODCAST DEBUG - Got HTML response instead of XML - endpoint might not be RSS');
                } else {
                    console.log('Signal: PODCAST DEBUG - Unknown response format');
                }
            }
        }
        
        for (let i = 0; i < Math.min(matches.length, 20); i++) { // Limit to 20 items
            const itemContent = matches[i][1];
            
            try {
                // Extract title
                const titleMatch = itemContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                const title = titleMatch ? cleanXMLContent(titleMatch[1]) : '';
                
                // Extract description
                const descMatch = itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
                                itemContent.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ||
                                itemContent.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
                const description = descMatch ? cleanXMLContent(descMatch[1]) : '';
                
                // Extract link
                const linkMatch = itemContent.match(/<link[^>]*href=["']([^"']+)["']/i) ||
                                itemContent.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ||
                                itemContent.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
                let link = linkMatch ? cleanXMLContent(linkMatch[1]) : '';
                
                // Extract date
                const dateMatch = itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
                                itemContent.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
                                itemContent.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
                const dateStr = dateMatch ? cleanXMLContent(dateMatch[1]) : '';
                
                // Parse publication date
                let publishedAt = Date.now();
                if (dateStr) {
                    const parsedDate = new Date(dateStr);
                    if (!isNaN(parsedDate.getTime())) {
                        publishedAt = parsedDate.getTime();
                    }
                }
                
                // Debug date parsing for first few items
                if (i < 3) {
                    console.log(`Signal: Date parsing for item ${i + 1}:`);
                    console.log(`  Raw item content (first 200 chars): "${itemContent.substring(0, 200)}"`);
                    console.log(`  Raw date string: "${dateStr}"`);
                    console.log(`  Parsed publishedAt: ${publishedAt} (${new Date(publishedAt).toISOString()})`);
                    console.log(`  14 days ago threshold: ${fourteenDaysAgo} (${new Date(fourteenDaysAgo).toISOString()})`);
                    console.log(`  Is recent: ${publishedAt >= fourteenDaysAgo}`);
                    
                    // Try to find any date-like content
                    const allDateMatches = itemContent.match(/<[^>]*(?:date|time|published|updated)[^>]*>[\s\S]*?<\/[^>]*>/gi);
                    if (allDateMatches) {
                        console.log(`  All date-like fields found: ${allDateMatches.join(', ')}`);
                    } else {
                        console.log(`  No date fields found in item`);
                    }
                }
                
                // Filter for recent articles only (14 days to match Google News RSS)
                if (publishedAt < fourteenDaysAgo) {
                    if (i < 3) {
                        console.log(`Signal: Item ${i + 1} filtered out due to old date`);
                    }
                    continue;
                }
                
                // Improved keyword matching for podcast content
                const content = (title + ' ' + description).toLowerCase();
                const companyNameLower = company.name.toLowerCase();
                
                // Check for company name or podcast-related keywords for podcast sources
                let foundKeywords = [];
                if (content.includes(companyNameLower)) {
                    foundKeywords.push(company.name);
                }
                
                // Enhanced podcast detection - look for podcast content more broadly
                const isPodcastSource = rssConfig.source && rssConfig.source.toLowerCase().includes('podcast');
                const hasPodcastKeywords = content.includes('podcast') || 
                                         content.includes('episode') || 
                                         content.includes('interview') ||
                                         content.includes('spotify') ||
                                         content.includes('audio') ||
                                         content.includes('show') ||
                                         content.includes('discussion');
                
                // For podcast searches, be very permissive - if the search query included podcast terms,
                // and the article mentions podcast/episode/interview, it's likely relevant
                const isPodcastSearch = rssConfig.query && (
                    rssConfig.query.includes('podcast') || 
                    rssConfig.query.includes('interview') || 
                    rssConfig.query.includes('episode')
                );
                
                // For Google News search feeds, trust that results are relevant
                // For podcast sources, be more permissive if content has podcast keywords
                // For podcast searches, trust results if they contain podcast-related terms
                const hasRelevantContent = foundKeywords.length > 0 || 
                                         rssConfig.type === 'google_search' ||
                                         (isPodcastSource && hasPodcastKeywords) ||
                                         (isPodcastSearch && hasPodcastKeywords);
                
                // Debug individual item parsing
                if (articles.length < 3) {
                    console.log(`Signal: Parsing item ${articles.length + 1}:`);
                    console.log(`  Title: ${title.substring(0, 50)}...`);
                    console.log(`  Link: ${link.substring(0, 50)}...`);
                    console.log(`  Has relevant content: ${hasRelevantContent}`);
                    console.log(`  Title length: ${title.length}`);
                    console.log(`  Link starts with http: ${link.startsWith('http')}`);
                    console.log(`  Found keywords: ${foundKeywords.join(', ')}`);
                    console.log(`  Published at: ${new Date(publishedAt).toLocaleString()}`);
                    console.log(`  Is recent: ${publishedAt > fourteenDaysAgo}`);
                    console.log(`  Content includes company name: ${content.includes(companyNameLower)}`);
                    console.log(`  All conditions met: ${hasRelevantContent && title.length > 10 && link.startsWith('http')}`);
                }
                
                if (hasRelevantContent && title.length > 10 && link.startsWith('http')) {
                    try {
                        const cleanedDescription = cleanDescription(description);
                        let source = extractSourceFromLink(link) || 'Google News';
                        
                        // Override source for podcast content to show proper icon
                        if (isPodcastSource || hasPodcastKeywords) {
                            source = rssConfig.source || 'Podcast';
                        }
                        
                        articles.push({
                            title: title.trim(),
                            description: cleanedDescription,
                            url: link,
                            source: source,
                            publishedAt: publishedAt,
                            matchedKeywords: foundKeywords.length > 0 ? foundKeywords : [company.name],
                            type: isPodcastSource ? 'podcast' : 'article',
                            image: null
                        });
                        
                        // Debug log for first few successful additions
                        if (articles.length <= 3) {
                            console.log(`Signal: Successfully added article ${articles.length}: ${title.substring(0, 50)}...`);
                            if (isPodcastSource || hasPodcastKeywords) {
                                console.log(`Signal: ✅ PODCAST CONTENT DETECTED AND ADDED!`);
                            }
                        }
                    } catch (addError) {
                        console.error('Signal: Error adding article to array:', addError.message);
                        console.error('Signal: Article details - Title:', title.substring(0, 50), 'Link:', link.substring(0, 50));
                    }
                }
                
            } catch (itemError) {
                console.log('Signal: Error parsing RSS item:', itemError.message);
            }
        }
        
        // Sort by publication date (newest first)
        articles.sort((a, b) => b.publishedAt - a.publishedAt);
        
        return articles.slice(0, MAX_RSS_RESULTS_PER_FEED);
        
    } catch (error) {
        console.error('Signal: RSS XML parsing error:', error);
        return [];
    }
}

// Clean XML content (remove CDATA, HTML tags, decode entities)
function cleanXMLContent(content) {
    if (!content) return '';
    
    // Remove CDATA wrapper
    content = content.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
    
    // Remove HTML tags
    content = content.replace(/<[^>]*>/g, '');
    
    // Decode common HTML entities
    content = content.replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&nbsp;/g, ' ');
    
    return content.trim();
}

// Helper function to extract source from URL
function extractSourceFromLink(link) {
    try {
        const url = new URL(link);
        let hostname = url.hostname.replace('www.', '');
        
        // Clean up common domain patterns
        if (hostname.includes('google.com/url?')) {
            // Extract actual URL from Google redirect
            const urlParam = url.searchParams.get('url');
            if (urlParam) {
                const actualUrl = new URL(decodeURIComponent(urlParam));
                hostname = actualUrl.hostname.replace('www.', '');
            }
        }
        
        return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
    } catch (error) {
        return 'Unknown Source';
    }
}

// Clean up RSS description (remove HTML tags, etc.)
function cleanDescription(description) {
    if (!description) return '';
    
    // Remove HTML tags
    let cleaned = description.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities without DOM APIs (service worker compatible)
    cleaned = cleaned.replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&#x27;/g, "'")
                    .replace(/&#x2F;/g, '/')
                    .replace(/&#x60;/g, '`')
                    .replace(/&#x3D;/g, '=');
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Truncate if too long
    return cleaned.length > 200 ? cleaned.substring(0, 200) + '...' : cleaned;
}

// Google Custom Search API
async function searchGoogleCustom(keyword) {
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY') {
        console.log('Signal: Google API key not configured, skipping');
        throw new Error('Google API key not configured');
    }
    
    try {
        // Focus on news sites and recent content
        const query = `${keyword} site:reuters.com OR site:bbc.com OR site:cnn.com OR site:bloomberg.com OR site:techcrunch.com`;
        const params = new URLSearchParams({
            key: GOOGLE_API_KEY,
            cx: GOOGLE_SEARCH_ENGINE_ID,
            q: query,
            num: 5, // Reduced for more focused results
            sort: 'date',
            dateRestrict: 'd1' // Last day only
        });
        
        const response = await fetch(`${GOOGLE_SEARCH_URL}?${params}`);
        
        if (!response.ok) {
            throw new Error(`Google Search API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.items && Array.isArray(data.items)) {
            const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
            
            return data.items.map(item => {
                // Try to extract actual publish date from meta data
                let publishedAt = Date.now() - (2 * 60 * 60 * 1000); // Default to 2 hours ago
                
                // Check for actual publish date in page metadata
                if (item.pagemap?.article?.[0]?.datepublished) {
                    const metaDate = new Date(item.pagemap.article[0].datepublished).getTime();
                    if (!isNaN(metaDate) && metaDate > twentyFourHoursAgo) {
                        publishedAt = metaDate;
                    }
                } else if (item.pagemap?.metatags?.[0]?.['article:published_time']) {
                    const metaDate = new Date(item.pagemap.metatags[0]['article:published_time']).getTime();
                    if (!isNaN(metaDate) && metaDate > twentyFourHoursAgo) {
                        publishedAt = metaDate;
                    }
                }
                
                return {
                    title: item.title,
                    description: item.snippet,
                    url: item.link,
                    source: extractDomain(item.link),
                    publishedAt: publishedAt,
                    image: item.pagemap?.cse_thumbnail?.[0]?.src || null
                };
            }).filter(item => {
                // Final validation - only return items from last 24 hours
                const isRecent = item.publishedAt > twentyFourHoursAgo;
                if (!isRecent) {
                    console.log(`Signal: Google filtered old result: ${item.title} (${new Date(item.publishedAt).toISOString()})`);
                }
                return isRecent;
            });
        }
        
        return [];
        
    } catch (error) {
        console.error('Signal: Google Custom Search error:', error);
        return [];
    }
}

// Alternative news search using free APIs
async function searchAlternativeNews(keyword) {
    try {
        // Using NewsAPI.org free tier (you'll need to register for a key)
        // This is a fallback when other methods fail
        
        const results = [];
        
        // Search Reddit for recent mentions (often faster than traditional news)
        const redditResults = await searchReddit(keyword);
        results.push(...redditResults);
        
        // Search Twitter/X via web scraping (simplified approach)
        const socialResults = await searchSocialMentions(keyword);
        results.push(...socialResults);
        
        return results.slice(0, 10); // Limit results
        
    } catch (error) {
        console.error('Signal: Alternative news search error:', error);
        return [];
    }
}

// Search Reddit for mentions
async function searchReddit(keyword) {
    try {
        // Use Reddit's JSON API (no auth required)
        const response = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&sort=new&t=day&limit=3`);
        
        if (!response.ok) {
            throw new Error(`Reddit API error: ${response.status}`);
        }
        
        const data = await response.json();
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        if (data.data && data.data.children) {
            return data.data.children
                .map(post => {
                    const publishedTime = post.data.created_utc * 1000;
                    return {
                        title: post.data.title,
                        description: post.data.selftext || post.data.title,
                        url: `https://reddit.com${post.data.permalink}`,
                        source: 'Reddit',
                        publishedAt: publishedTime,
                        image: null
                    };
                })
                .filter(post => {
                    // Strict date validation for Reddit posts
                    const isRecent = post.publishedAt > twentyFourHoursAgo;
                    const isValidDate = !isNaN(post.publishedAt) && post.publishedAt > 0;
                    const isNotFuture = post.publishedAt <= Date.now();
                    
                    if (!isRecent && isValidDate) {
                        console.log(`Signal: Reddit filtered old post: ${post.title} (${new Date(post.publishedAt).toISOString()})`);
                    }
                    
                    return isRecent && isValidDate && isNotFuture;
                });
        }
        
        return [];
        
    } catch (error) {
        console.error('Signal: Reddit search error:', error);
        return [];
    }
}

// Search for social media mentions (disabled - use only real APIs)
async function searchSocialMentions(keyword) {
    try {
        // Disabled to prevent fake/old results
        // Only return real results from actual APIs with verified timestamps
        console.log(`Signal: Social media search disabled for "${keyword}" to prevent fake results`);
        return [];
        
    } catch (error) {
        console.error('Signal: Social mentions search error:', error);
        return [];
    }
}

// Helper function to extract domain from URL
function extractDomain(url) {
    try {
        const domain = new URL(url).hostname;
        return domain.replace('www.', '');
    } catch (error) {
        return 'Unknown Source';
    }
}

// Clean up old mentions to prevent storage bloat
function cleanupOldMentions(mentions) {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const cleaned = mentions.filter(mention => {
        const isRecent = mention.publishedAt > sevenDaysAgo;
        if (!isRecent) {
            console.log(`Signal: Cleaned up old mention: ${mention.title} (${new Date(mention.publishedAt).toISOString()})`);
        }
        return isRecent;
    });
    
    if (cleaned.length !== mentions.length) {
        console.log(`Signal: Cleaned up ${mentions.length - cleaned.length} old mentions`);
    }
    
    return cleaned;
}

// Generate test results for demonstration when APIs are not configured
async function generateTestResults(keyword) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const now = Date.now();
    const testResults = [];
    
    // 30% chance of finding results (simulate real-world sparsity)
    if (Math.random() > 0.7) {
        const sampleTitles = [
            `Breaking: ${keyword} announces major partnership deal`,
            `${keyword} CEO speaks at industry conference`,
            `Market analysis: ${keyword} shows strong Q4 performance`,
            `${keyword} launches innovative new product line`,
            `Industry experts praise ${keyword}'s latest initiative`
        ];
        
        const sampleSources = ['TechCrunch', 'Reuters', 'Bloomberg', 'Industry Weekly', 'Business Times'];
        
        // Generate 1-3 test results
        const numResults = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numResults; i++) {
            const hoursAgo = Math.floor(Math.random() * 6) + 1; // 1-6 hours ago
            const publishedTime = now - (hoursAgo * 60 * 60 * 1000);
            
            testResults.push({
                title: sampleTitles[Math.floor(Math.random() * sampleTitles.length)],
                description: `This is a test article mentioning ${keyword}. In test mode, Signal generates sample results to demonstrate the notification system.`,
                url: `https://example.com/news/${keyword.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                source: sampleSources[Math.floor(Math.random() * sampleSources.length)],
                publishedAt: publishedTime,
                image: null
            });
        }
        
        console.log(`Signal: TEST MODE generated ${testResults.length} sample results for "${keyword}"`);
    } else {
        console.log(`Signal: TEST MODE - No results generated for "${keyword}" (simulating real-world sparsity)`);
    }
    
    return testResults;
}

// Notification system disabled per user request

// Urgency indicator function disabled (was for notifications)

// Time ago text function disabled (was for notifications)

// Notification click handlers disabled per user request

// Notification button handlers disabled per user request

// Handle extension icon clicks - open dashboard
chrome.action.onClicked.addListener(() => {
    chrome.action.setBadgeText({ text: '' });
    
    // Open dashboard in new tab
    chrome.tabs.create({
        url: chrome.runtime.getURL('dashboard.html')
    });
});

// Also clear notifications when dashboard opens
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url && tab.url.includes('dashboard.html')) {
            chrome.action.setBadgeText({ text: '' });
        }
    });
});

console.log('Signal: Background script setup complete');