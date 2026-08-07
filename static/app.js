/**
 * X Profile Viewer - Main Application
 */

const API_BASE = '';

/**
 * Proxy settings with defaults
 * Stored in localStorage as JSON
 */
const DEFAULT_PROXY_SETTINGS = {
    imageEnabled: true,
    imageProxies: [
        'https://still-glitter-af7b.1571314213.workers.dev?url=',
        'https://pz.v88.qzz.io?url='
    ],
    imageProxyIndex: 1,
    videoEnabled: false,
    videoProxies: [
        'https://still-glitter-af7b.1571314213.workers.dev?url=',
        'https://pz.v88.qzz.io?url='
    ],
    videoProxyIndex: 1,
};

function getProxySettings() {
    try {
        const saved = localStorage.getItem('proxy_settings');
        if (saved) return { ...DEFAULT_PROXY_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {}
    return { ...DEFAULT_PROXY_SETTINGS };
}

function saveProxySettings(settings) {
    localStorage.setItem('proxy_settings', JSON.stringify(settings));
}

/**
 * Export all settings to x_config.json for local backup
 */
function exportSettings() {
    const data = {
        proxy_settings: getProxySettings(),
        niutrans_appid: localStorage.getItem('niutrans_appid') || '',
        niutrans_apikey: localStorage.getItem('niutrans_apikey') || '',
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'x_config.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('设置已导出为 x_config.json', 'success', 2000);
}

/**
 * Import settings from a local x_config.json file
 */
function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.proxy_settings) {
                    saveProxySettings({ ...DEFAULT_PROXY_SETTINGS, ...data.proxy_settings });
                }
                if (data.niutrans_appid !== undefined) {
                    localStorage.setItem('niutrans_appid', data.niutrans_appid);
                }
                if (data.niutrans_apikey !== undefined) {
                    localStorage.setItem('niutrans_apikey', data.niutrans_apikey);
                }
                // Refresh settings UI if modal is open
                if (!document.getElementById('settingsModal').classList.contains('hidden')) {
                    openSettings();
                }
                showToast('设置已导入', 'success', 2000);
            } catch (err) {
                showToast('导入失败：文件格式错误', 'error', 3000);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

/**
 * Check if any user settings exist in localStorage
 */
function hasLocalSettings() {
    return !!localStorage.getItem('proxy_settings') || !!localStorage.getItem('niutrans_appid') || !!localStorage.getItem('niutrans_apikey');
}

function proxyUrl(url, isVideo = false) {
    if (!url) return '';
    const settings = getProxySettings();
    if (isVideo) {
        if (!settings.videoEnabled) return url;
        const prefix = settings.videoProxies[settings.videoProxyIndex] || settings.videoProxies[0];
        return prefix ? prefix + encodeURIComponent(url) : url;
    } else {
        if (!settings.imageEnabled) return url;
        const prefix = settings.imageProxies[settings.imageProxyIndex] || settings.imageProxies[0];
        return prefix ? prefix + encodeURIComponent(url) : url;
    }
}

/**
 * Render proxy list as radio buttons
 */
function renderProxyList(containerId, proxies, selectedIndex) {
    const container = document.getElementById(containerId);
    container.innerHTML = proxies.map((proxy, i) => `
        <div class="proxy-item">
            <label class="proxy-radio">
                <input type="radio" name="${containerId}" value="${i}" ${i === selectedIndex ? 'checked' : ''}>
                <span class="proxy-url" title="${proxy}">${proxy}</span>
            </label>
            <button class="proxy-delete-btn" onclick="removeProxy('${containerId}', ${i})" title="删除">×</button>
        </div>
    `).join('');
}

/**
 * Add an image proxy
 */
function addImageProxy() {
    const input = document.getElementById('newImageProxy');
    const url = input.value.trim();
    if (!url) return;
    const settings = getProxySettings();
    if (settings.imageProxies.includes(url)) {
        showToast('该代理已存在', 'error', 2000);
        return;
    }
    settings.imageProxies.push(url);
    settings.imageProxyIndex = settings.imageProxies.length - 1;
    saveProxySettings(settings);
    input.value = '';
    renderProxyList('imageProxyList', settings.imageProxies, settings.imageProxyIndex);
    showToast('图片代理已添加', 'success', 2000);
}

/**
 * Add a video proxy
 */
function addVideoProxy() {
    const input = document.getElementById('newVideoProxy');
    const url = input.value.trim();
    if (!url) return;
    const settings = getProxySettings();
    if (settings.videoProxies.includes(url)) {
        showToast('该代理已存在', 'error', 2000);
        return;
    }
    settings.videoProxies.push(url);
    settings.videoProxyIndex = settings.videoProxies.length - 1;
    saveProxySettings(settings);
    input.value = '';
    renderProxyList('videoProxyList', settings.videoProxies, settings.videoProxyIndex);
    showToast('视频代理已添加', 'success', 2000);
}

/**
 * Remove a proxy from the list
 */
function removeProxy(containerId, index) {
    const settings = getProxySettings();
    const isImage = containerId === 'imageProxyList';
    const proxies = isImage ? settings.imageProxies : settings.videoProxies;
    if (proxies.length <= 1) {
        showToast('至少保留一个代理', 'error', 2000);
        return;
    }
    proxies.splice(index, 1);
    if (isImage) {
        settings.imageProxies = proxies;
        if (settings.imageProxyIndex >= proxies.length) settings.imageProxyIndex = 0;
    } else {
        settings.videoProxies = proxies;
        if (settings.videoProxyIndex >= proxies.length) settings.videoProxyIndex = 0;
    }
    saveProxySettings(settings);
    renderProxyList(containerId, isImage ? settings.imageProxies : settings.videoProxies,
        isImage ? settings.imageProxyIndex : settings.videoProxyIndex);
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - 'error', 'success', or 'info'
 * @param {number} duration - Duration in milliseconds (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// State
let currentUser = null;
let currentView = 'home';
let currentTab = 'media';
let homeFeedType = 'foryou'; // 'foryou' or 'following'
let homeCursor = '';
let homeTweets = [];
let homeLoadedIds = new Set();
let isLoadingHome = false;
let hasMoreHome = true;
let mediaCursor = '';
let followingCache = {};
let followersCache = {};
let followingScreenName = '';
let followingCursor = '';
let allFollowingUsers = [];
let isLoadingFollowing = false;
let hasMoreFollowing = true;
let loadedFollowingIds = new Set();
let followersScreenName = '';
let followersCursor = '';
let allFollowersUsers = [];
let isLoadingFollowers = false;
let hasMoreFollowers = true;
let loadedFollowersIds = new Set();
let tweetsCursor = '';
let allTweets = [];
let allMedia = [];
let isLoadingPosts = false;
let isLoadingMedia = false;
let hasMoreMedia = true;
let hasMorePosts = true;
let loadedMediaIds = new Set();
let loadedTweetIds = new Set();

// Tweet media lightbox state
let tweetLightboxMedia = [];  // Media array for current tweet lightbox
let isTweetLightbox = false;   // Whether lightbox is showing tweet media (vs profile media grid)
let tweetMediaMap = {};        // Store media arrays keyed by tweet ID

// DOM Elements
const homeView = document.getElementById('homeView');
const profileView = document.getElementById('profileView');
const followingView = document.getElementById('followingView');
const followersView = document.getElementById('followersView');
const backBtn = document.getElementById('backBtn');
const headerTitle = document.getElementById('headerTitle');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get screen name and view from URL or use default
    const params = new URLSearchParams(window.location.search);
    const screenName = params.get('user');
    const view = params.get('view') || 'home';
    
    // Push an initial safe anchor state to prevent Android edge-swipe from
    // closing the page when the history stack is shallow (e.g., direct access).
    // This ensures there's always at least one history entry to fall back to.
    if (!history.state || !history.state._anchor) {
        history.replaceState({ _anchor: true, view: 'home' }, '', window.location.href);
    }
    
    // Load appropriate view based on URL
    if (view === 'following' && screenName) {
        showFollowing(screenName);
    } else if (view === 'followers' && screenName) {
        showFollowers(screenName);
    } else if (screenName) {
        // Default: show user profile when user param is present
        loadUserProfile(screenName);
    } else {
        // No user param: show home timeline
        showHome();
    }
    
    // Event listeners
    document.getElementById('followingLink').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUser) {
            navigateToFollowing(currentUser.screen_name);
        }
    });
    
    document.getElementById('followersLink').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUser) {
            navigateToFollowers(currentUser.screen_name);
        }
    });
    
    backBtn.addEventListener('click', goBack);
    
    // Tab click handlers (profile tabs)
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Home feed tabs
    document.querySelectorAll('.home-tab').forEach(tab => {
        tab.addEventListener('click', () => switchHomeFeed(tab.dataset.feed));
    });
    
    // Infinite scroll with Intersection Observer
    setupInfiniteScroll();
});

/**
 * Show home timeline view
 */
function showHome() {
    homeView.classList.remove('hidden');
    profileView.classList.add('hidden');
    followingView.classList.add('hidden');
    followersView.classList.add('hidden');
    backBtn.classList.add('hidden');
    headerTitle.textContent = 'Home';
    currentView = 'home';
    
    // Update URL
    const url = new URL(window.location);
    url.searchParams.delete('user');
    url.searchParams.delete('view');
    window.history.replaceState({ view: 'home' }, '', url);
    
    // Load home feed if not already loaded
    if (homeTweets.length === 0) {
        loadHomeTimeline();
    }
}

/**
 * Switch home feed type (foryou/following)
 */
function switchHomeFeed(feedType) {
    if (feedType === homeFeedType) return;
    homeFeedType = feedType;
    
    // Update tab styles
    document.querySelectorAll('.home-tab').forEach(tab => {
        tab.classList.toggle('active-home-tab', tab.dataset.feed === feedType);
    });
    
    // Reset and reload
    homeCursor = '';
    homeTweets = [];
    homeLoadedIds = new Set();
    hasMoreHome = true;
    loadHomeTimeline();
}

/**
 * Load home timeline tweets
 */
async function loadHomeTimeline(cursor = '') {
    if (isLoadingHome) return;
    isLoadingHome = true;
    
    try {
        if (!cursor) {
            document.getElementById('homeFeed').innerHTML = '<div class="loading">Loading...</div>';
            homeTweets = [];
            homeLoadedIds = new Set();
            hasMoreHome = true;
        }
        
        let url = `${API_BASE}/api/home/timeline?type=${homeFeedType}&count=20`;
        if (cursor) {
            url += `&cursor=${encodeURIComponent(cursor)}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            const tweets = result.data.tweets;
            const nextCursor = result.data.cursor || '';
            
            // Filter out already loaded tweets
            const newTweets = tweets.filter(t => !homeLoadedIds.has(t.id));
            newTweets.forEach(t => homeLoadedIds.add(t.id));
            
            if (!cursor) {
                homeTweets = newTweets;
                renderTweetsList(newTweets, true, 'homeFeed');
            } else if (newTweets.length > 0) {
                homeTweets = homeTweets.concat(newTweets);
                renderTweetsList(newTweets, false, 'homeFeed');
            }
            
            homeCursor = nextCursor;
            hasMoreHome = nextCursor && nextCursor !== '' && !nextCursor.startsWith('0|') && newTweets.length > 0;
        } else {
            console.error('Home timeline API error:', result.error, result.traceback);
            if (!cursor) {
                const errMsg = result.traceback ? `<details><summary>${result.error || 'Failed to load'}</summary><pre style="text-align:left;max-height:300px;overflow:auto;font-size:12px;">${result.traceback}</pre></details>` : (result.error || 'Failed to load');
                document.getElementById('homeFeed').innerHTML = `<div class="error">${errMsg}</div>`;
            }
            hasMoreHome = false;
        }
    } catch (error) {
        console.error('Error loading home timeline:', error);
        if (!cursor) {
            document.getElementById('homeFeed').innerHTML = `<div class="error">Failed to load timeline.<br><pre style="text-align:left;max-height:200px;overflow:auto;font-size:12px;">${error.stack || error}</pre></div>`;
        }
        hasMoreHome = false;
    } finally {
        isLoadingHome = false;
    }
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update tab styles
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active-tab', tab.dataset.tab === tabName);
    });
    
    // Hide all content views
    document.querySelectorAll('.content-view').forEach(view => {
        view.classList.add('hidden');
    });
    
    // Show selected view
    const viewId = tabName + 'View';
    document.getElementById(viewId).classList.remove('hidden');
    
    // Update header subtitle based on tab
    if (currentUser) {
        if (tabName === 'posts') {
            const postsCount = currentUser.stats.statuses_count || 0;
            document.getElementById('headerSubtitle').textContent = `${postsCount.toLocaleString()} posts`;
        } else if (tabName === 'media') {
            const mediaCount = currentUser.stats.media_count || 0;
            document.getElementById('headerSubtitle').textContent = `${mediaCount.toLocaleString()} Photos & videos`;
        }
    }
    
    // Load content if needed
    if (tabName === 'posts' && currentUser) {
        loadUserTweets(currentUser.screen_name);
    } else if (tabName === 'media' && currentUser) {
        loadUserMedia(currentUser.screen_name);
    }
}

/**
 * Format large numbers
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

/**
 * Format date
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format duration (seconds to mm:ss)
 */
function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Load user profile
 */
async function loadUserProfile(screenName) {
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE}/api/user/${screenName}/media`);
        const result = await response.json();
        
        if (result.success) {
            renderProfile(result.data);
        } else {
            showError(result.error || 'Failed to load user');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showError('Failed to load profile. Make sure the API server is running.');
    }
}

/**
 * Load user tweets (posts)
 */
async function loadUserTweets(screenName, cursor = '') {
    if (isLoadingPosts) return;
    
    isLoadingPosts = true;
    
    try {
        if (!cursor) {
            document.getElementById('tweetsList').innerHTML = '<div class="loading">Loading posts...</div>';
            allTweets = [];
            loadedTweetIds = new Set();
            hasMorePosts = true;
        }
        
        let url = `${API_BASE}/api/user/${screenName}/tweets`;
        if (cursor) {
            url += `?cursor=${encodeURIComponent(cursor)}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            const tweets = result.data.tweets;
            const nextCursor = result.data.cursor || '';
            
            // Filter out already loaded tweets
            const newTweets = tweets.filter(t => !loadedTweetIds.has(t.id));
            newTweets.forEach(t => loadedTweetIds.add(t.id));
            
            if (!cursor) {
                // First load - render all
                allTweets = newTweets;
                renderTweetsList(newTweets, true);
            } else if (newTweets.length > 0) {
                // Append only new tweets
                allTweets = allTweets.concat(newTweets);
                renderTweetsList(newTweets, false);
            }
            
            // Update cursor after successful load
            tweetsCursor = nextCursor;
            hasMorePosts = nextCursor && nextCursor !== '' && !nextCursor.startsWith('0|') && newTweets.length > 0;
        } else {
            if (!cursor) {
                document.getElementById('tweetsList').innerHTML = `<div class="error">${result.error}</div>`;
            }
            hasMorePosts = false;
        }
    } catch (error) {
        console.error('Error loading tweets:', error);
        if (!cursor) {
            document.getElementById('tweetsList').innerHTML = '<div class="error">Failed to load posts</div>';
        }
    } finally {
        isLoadingPosts = false;
    }
}

/**
 * Load user media
 */
async function loadUserMedia(screenName, cursor = '') {
    if (isLoadingMedia) return;
    
    isLoadingMedia = true;
    
    try {
        if (!cursor) {
            document.getElementById('mediaGrid').innerHTML = '<div class="loading">Loading media...</div>';
            allMedia = [];
            loadedMediaIds = new Set();
            hasMoreMedia = true;
        }
        
        let url = `${API_BASE}/api/user/${screenName}/media`;
        if (cursor) {
            url += `?cursor=${encodeURIComponent(cursor)}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            const media = result.data.media;
            const nextCursor = result.data.cursor || '';
            
            // Filter out already loaded media
            const newMedia = media.filter(m => !loadedMediaIds.has(m.tweet_id));
            newMedia.forEach(m => loadedMediaIds.add(m.tweet_id));
            
            if (!cursor) {
                // First load - render all
                allMedia = newMedia;
                renderMediaGrid(newMedia, true);
            } else if (newMedia.length > 0) {
                // Append only new media
                allMedia = allMedia.concat(newMedia);
                renderMediaGrid(newMedia, false);
            }
            
            // Update cursor after successful load
            mediaCursor = nextCursor;
            hasMoreMedia = nextCursor && nextCursor !== '' && !nextCursor.startsWith('0|') && newMedia.length > 0;
            
            // Update PhotoSwipe items if lightbox is open
            if (isLightboxOpen && pswp && !isTweetLightbox) {
                const currentLength = pswpItems.length;
                for (let i = currentLength; i < allMedia.length; i++) {
                    pswpItems.push(mediaToPswpItem(allMedia[i]));
                }
            }
        } else {
            if (!cursor) {
                document.getElementById('mediaGrid').innerHTML = `<div class="error">${result.error}</div>`;
            }
            hasMoreMedia = false;
        }
    } catch (error) {
        console.error('Error loading media:', error);
        if (!cursor) {
            document.getElementById('mediaGrid').innerHTML = '<div class="error">Failed to load media</div>';
        }
    } finally {
        isLoadingMedia = false;
    }
}

/**
 * Setup infinite scroll with scroll event listener
 * Preload next page when user scrolls near bottom
 */
function setupInfiniteScroll() {
    let lastTriggerTime = 0;
    
    const getScrollMetrics = () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const docHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight
        );
        return { scrollTop, windowHeight, docHeight };
    };
    
    const handleScroll = () => {
        const { scrollTop, windowHeight, docHeight } = getScrollMetrics();
        const distanceToBottom = docHeight - (scrollTop + windowHeight);
        const threshold = 1000;
        const now = Date.now();
        if (now - lastTriggerTime < 1000) return;
        
        // Home feed scroll
        if (currentView === 'home') {
            if (!hasMoreHome || isLoadingHome) return;
            if (distanceToBottom < threshold && distanceToBottom > -100 && homeCursor) {
                lastTriggerTime = now;
                console.log('Trigger load more home feed, cursor:', homeCursor);
                loadHomeTimeline(homeCursor);
            }
            return;
        }
        
        // Following list scroll
        if (currentView === 'following') {
            if (!hasMoreFollowing || isLoadingFollowing) return;
            if (distanceToBottom < threshold && distanceToBottom > -100 && followingCursor) {
                lastTriggerTime = now;
                console.log('Trigger load more following, cursor:', followingCursor);
                loadFollowing(followingScreenName, followingCursor);
            }
            return;
        }
        
        // Followers list scroll
        if (currentView === 'followers') {
            if (!hasMoreFollowers || isLoadingFollowers) return;
            if (distanceToBottom < threshold && distanceToBottom > -100 && followersCursor) {
                lastTriggerTime = now;
                console.log('Trigger load more followers, cursor:', followersCursor);
                loadFollowers(followersScreenName, followersCursor);
            }
            return;
        }
        
        const hasMore = currentTab === 'media' ? hasMoreMedia : hasMorePosts;
        const loading = currentTab === 'media' ? isLoadingMedia : isLoadingPosts;
        const cursor = currentTab === 'media' ? mediaCursor : tweetsCursor;
        
        // Profile tabs (posts / media)
        if (currentView !== 'profile') return;
        
        // Skip if no more data or already loading
        if (!hasMore || loading) return;
        
        if (distanceToBottom < threshold && distanceToBottom > -100 && cursor) {
            lastTriggerTime = now;
            if (currentTab === 'posts' && currentUser) {
                console.log('Trigger load more posts, cursor:', cursor);
                loadUserTweets(currentUser.screen_name, cursor);
            } else if (currentTab === 'media' && currentUser) {
                console.log('Trigger load more media, cursor:', cursor);
                loadUserMedia(currentUser.screen_name, cursor);
            }
        }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('wheel', handleScroll, { passive: true });
}

/**
 * Render user profile
 */
function renderProfile(data) {
    const user = data.user;
    currentUser = user;
    
    // Reset pagination state
    mediaCursor = data.cursor || '';
    allMedia = data.media || [];
    loadedMediaIds = new Set();
    (allMedia || []).forEach(m => { if (m.tweet_id) loadedMediaIds.add(m.tweet_id); });
    
    // Sync URL/state without adding a history entry. Callers that need a new
    // stack entry (e.g. navigateToProfile) already pushState before load.
    const currentParams = new URLSearchParams(window.location.search);
    if (currentParams.get('view') !== 'following') {
        const url = new URL(window.location);
        url.searchParams.set('user', user.screen_name);
        url.searchParams.delete('view');
        window.history.replaceState({ view: 'profile', user: user.screen_name }, '', url);
    }
    
    // Banner
    const banner = document.getElementById('banner');
    if (user.profile_banner_url) {
        banner.style.backgroundImage = `url(${proxyUrl(user.profile_banner_url)})`;
    } else {
        banner.style.backgroundImage = 'none';
        banner.style.backgroundColor = '#333';
    }
    
    // Avatar
    document.getElementById('avatar').src = proxyUrl(user.profile_image_url);
    
    // Name and verified
    document.getElementById('userName').textContent = user.name;
    const verifiedBadge = document.getElementById('verifiedBadge');
    verifiedBadge.classList.toggle('hidden', !user.verified);
    
    // Screen name
    document.getElementById('screenName').textContent = `@${user.screen_name}`;
    
    // Bio
    document.getElementById('bio').textContent = user.description || '';
    
    // Location
    const location = document.getElementById('location');
    if (user.location) {
        location.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" style="fill: currentColor;"><path d="M12 7c-1.93 0-3.5 1.57-3.5 3.5S10.07 14 12 14s3.5-1.57 3.5-3.5S13.93 7 12 7zm0 5c-.827 0-1.5-.673-1.5-1.5S11.173 9 12 9s1.5.673 1.5 1.5S12.827 12 12 12zm0-10c-2.652 0-5.092 1.025-6.929 2.862S2.2 9.148 2.2 11.8c0 2.636 1.004 5.106 2.892 7.103l6.908 7.27 6.908-7.27c1.888-1.997 2.892-4.467 2.892-7.103 0-2.652-1.025-5.092-2.862-6.938S14.652 2 12 2zm5.452 15.95L12 23.26l-5.452-5.31C5.052 16.38 4.2 14.164 4.2 11.8c0-2.066.814-4.008 2.295-5.495C7.972 4.834 9.914 4 12 4s4.028.814 5.505 2.295C18.986 7.782 19.8 9.724 19.8 11.8c0 2.364-.852 4.58-2.348 6.15z"></path></svg> ${user.location}`;
    } else {
        location.innerHTML = '';
    }
    
    // Joined date
    const joined = document.getElementById('joined');
    if (user.created_at) {
        const date = new Date(user.created_at);
        const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        joined.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" style="fill: currentColor;"><path d="M7 4V3h2v1h6V3h2v1h1.5C19.44 3 21 4.57 21 6.5v11c0 1.94-1.56 3.5-3.5 3.5h-11C4.57 21 3 19.44 3 17.5v-11C3 4.57 4.57 3 6.5 3H7zm0 2H6.5c-.83 0-1.5.67-1.5 1.5v11c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5v-11c0-.83-.67-1.5-1.5-1.5H17v1h-2V6H9v1H7V6zm0 6h2v-2H7v2zm0 4h2v-2H7v2zm4-4h2v-2h-2v2zm0 4h2v-2h-2v2zm4-4h2v-2h-2v2zm0 4h2v-2h-2v2z"></path></svg> Joined ${monthYear}`;
    } else {
        joined.innerHTML = '';
    }
    
    // Stats
    document.getElementById('followingCount').textContent = formatNumber(user.stats.friends_count);
    document.getElementById('followersCount').textContent = formatNumber(user.stats.followers_count);
    
    // Header subtitle - media count (show full number)
    const mediaCount = user.stats.media_count || 0;
    document.getElementById('headerSubtitle').textContent = `${mediaCount.toLocaleString()} Photos & videos`;
    
    // Follow/Following button
    const followBtn = document.getElementById('followBtn');
    if (user.following) {
        followBtn.textContent = 'Following';
        followBtn.classList.add('following');
    } else {
        followBtn.textContent = 'Follow';
        followBtn.classList.remove('following');
    }
    
    // Add click handler for follow/unfollow button
    followBtn.onclick = () => toggleFollow(user.id, user.following);
    
    // Media grid
    renderMediaGrid(allMedia, true);
    
    // Update header
    headerTitle.textContent = user.name;
    
    // Switch views
    homeView.classList.add('hidden');
    profileView.classList.remove('hidden');
    followingView.classList.add('hidden');
    followersView.classList.add('hidden');
    currentView = 'profile';
    backBtn.classList.remove('hidden');
    
    // Check if there's more data
    hasMoreMedia = mediaCursor && mediaCursor !== '' && !mediaCursor.startsWith('0|');
}

/**
 * Render a single media item (image or video thumbnail)
 */
function renderSingleMedia(mediaItem, tweetId, index) {
    const isVideo = mediaItem.type === 'video' || mediaItem.type === 'animated_gif';
    const duration = isVideo && mediaItem.duration ? formatDuration(mediaItem.duration) : '';
    const isGif = mediaItem.type === 'animated_gif';
    const clickHandler = tweetId ? `onclick="openTweetLightbox('${tweetId}', ${index})"` : '';
    return `
        <div class="tweet-media-item ${isVideo ? 'tweet-media-video' : ''}" ${clickHandler}>
            <img src="${proxyUrl(mediaItem.url)}" alt="">
            ${isVideo ? `
                <div class="video-play-btn">
                    <svg viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                </div>
                ${isGif ? `<span class="gif-badge">GIF</span>` : ''}
                ${duration ? `<span class="video-duration">${duration}</span>` : ''}
            ` : ''}
        </div>
    `;
}

/**
 * Render tweet media (images or video)
 */
function renderTweetMedia(media, tweetId) {
    if (!media || media.length === 0) return '';
    
    // Store media in map for lightbox access
    if (tweetId) {
        tweetMediaMap[tweetId] = media;
    }
    
    const count = media.length;
    if (count === 1) {
        return renderSingleMedia(media[0], tweetId, 0);
    } else if (count === 2) {
        return `
            <div class="tweet-media tweet-media-2">
                ${renderSingleMedia(media[0], tweetId, 0)}
                ${renderSingleMedia(media[1], tweetId, 1)}
            </div>
        `;
    } else if (count === 3) {
        return `
            <div class="tweet-media tweet-media-3">
                ${renderSingleMedia(media[0], tweetId, 0)}
                <div class="tweet-media-3-right">
                    ${renderSingleMedia(media[1], tweetId, 1)}
                    ${renderSingleMedia(media[2], tweetId, 2)}
                </div>
            </div>
        `;
    } else {
        return `
            <div class="tweet-media tweet-media-4">
                ${renderSingleMedia(media[0], tweetId, 0)}
                ${renderSingleMedia(media[1], tweetId, 1)}
                ${renderSingleMedia(media[2], tweetId, 2)}
                <div class="tweet-media-4th" ${tweetId ? `onclick="openTweetLightbox('${tweetId}', 3)"` : ''}>
                    <img src="${proxyUrl(media[3].url)}" alt="">
                    ${count > 4 ? `<span class="more-images">+${count - 4}</span>` : ''}
                    ${media[3].type === 'video' || media[3].type === 'animated_gif' ? `
                        <div class="video-play-btn">
                            <svg viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
}

/**
 * Render tweets list
 */
function renderTweetsList(tweets, replace = true, containerId = 'tweetsList') {
    const list = document.getElementById(containerId);
    
    if (!tweets || tweets.length === 0) {
        if (replace) list.innerHTML = '<div class="loading">No posts found</div>';
        return;
    }
    
    const retweetIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></svg>';
    
    const translateBtnHtml = (tweetId) => `
        <div class="tweet-translate-area" id="translate-${tweetId}">
            <button class="translate-btn" onclick="translateTweet('${tweetId}', this)">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12.651 15.32l-1.997-3.769c-.471-.887-.7-1.327-.7-1.751 0-.613.478-1.05 1.096-1.05.532 0 .988.389 1.09.904l.022.166h.03l-.022-.166C12.078 9.385 11.478 8 9.749 8 8.525 8 7.5 8.95 7.5 10.2c0 .657.268 1.173.688 1.959l.022.041 1.997 3.769-2.615 4.937c-.471.887-.7 1.327-.7 1.751 0 .613.478 1.05 1.096 1.05.532 0 .988-.389 1.09-.904l.022-.166h.03l-.022.166c.092.369.692 1.754 2.421 1.754 1.224 0 2.249-.95 2.249-2.2 0-.657-.268-1.173-.688-1.959l-.022-.041-1.997-3.769zm9.349-7.32h-5v-2h-2v2h-5v2h8.899l-2.3 4.6 1.789.894 2.655-5.311.057-.183h.7v-2z"></path></svg>
                翻译
            </button>
            <div class="tweet-translation hidden"></div>
        </div>
    `;
    
    const renderTweetHeader = (name, handle, avatar, date) => `
        <div class="tweet-header">
            <img class="tweet-avatar" src="${proxyUrl(avatar)}" alt="" onclick="navigateToProfile('${handle}')">
            <div class="tweet-author" onclick="navigateToProfile('${handle}')">
                <span class="tweet-author-name">${escapeHtml(name)}</span>
                <span class="tweet-author-handle">@${handle}</span>
            </div>
            <span class="tweet-date">${formatDate(date)}</span>
        </div>
    `;
    
    const renderTweetStats = (stats) => `
        <div class="tweet-stats">
            <span class="tweet-stat">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"></path></svg>
                ${formatNumber(stats.reply_count)}
            </span>
            <span class="tweet-stat">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></svg>
                ${formatNumber(stats.retweet_count)}
            </span>
            <span class="tweet-stat">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.697 5.5c-1.222-.35-2.808-.499-3.897-.499-2.563 0-4.8.897-6.198 2.292C5.204 8.69 4.5 10.616 4.5 12.5c0 1.86.79 3.665 2.176 5.015.232.555.49 1.06.77 1.508.266.43.538.782.801 1.048.273.276.47.387.593.427.123-.04.32-.151.593-.427.263-.266.535-.618.801-1.048.28-.448.538-.953.77-1.508C12.21 16.165 13 14.36 13 12.5c0-1.884-.704-3.81-2.102-5.207C9.5 5.897 7.263 5 4.7 5c-1.089 0-2.675.149-3.897.5l-.453-.893C2.067 3.803 4.097 3.5 4.7 3.5c2.938 0 5.635 1.05 7.394 2.81C13.854 8.07 14.7 10.267 14.7 12.5c0 2.323-.846 4.43-2.606 6.19-.46.46-.97.87-1.523 1.228-.545.352-1.142.662-1.779.917-.623.249-1.274.446-1.943.583C6.182 21.558 5.5 21.5 5.5 21.5s-.682.058-1.349-.082c-.669-.137-1.32-.334-1.943-.583-.637-.255-1.234-.565-1.779-.917-.553-.358-1.063-.768-1.523-1.228C-1.854 16.93-2.7 14.823-2.7 12.5c0-2.233.846-4.43 2.606-6.19C1.665 4.55 4.362 3.5 7.3 3.5c.603 0 2.633.303 4.35 1.107l-.453.893z"></path></svg>
                ${formatNumber(stats.favorite_count)}
            </span>
            <span class="tweet-stat">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.75 21V3h2v18h-2zM18 21V11.5h2V21h-2zM4 21l.004-7.5h2L6 21H4zm9.248 0v-9h2v9h-2z"></path></svg>
                ${formatNumber(stats.view_count)}
            </span>
        </div>
    `;
    
    const renderNestedCard = (nestedTweet) => {
        const qName = nestedTweet.user_name || currentUser.name;
        const qHandle = nestedTweet.screen_name || currentUser.screen_name;
        const qAvatar = nestedTweet.profile_image_url || currentUser.profile_image_url;
        return `
            <div class="tweet-nested-card">
                ${renderTweetHeader(qName, qHandle, qAvatar, nestedTweet.created_at)}
                <div class="tweet-text">${linkifyText(nestedTweet.text)}</div>
                ${translateBtnHtml(nestedTweet.id)}
                ${renderTweetMedia(nestedTweet.media, nestedTweet.id)}
            </div>
        `;
    };
    
    const html = tweets.map(tweet => {
        const isRetweet = !!tweet.retweeted_tweet;
        const isQuote = !!tweet.quoted_tweet;
        
        // Use tweet's own author info or currentUser as fallback
        const authorName = tweet.user_name || currentUser.name;
        const authorHandle = tweet.screen_name || currentUser.screen_name;
        const authorAvatar = tweet.profile_image_url || currentUser.profile_image_url;
        
        // === Retweet ===
        if (isRetweet) {
            const displayTweet = tweet.retweeted_tweet;
            const retweeterName = tweet.user_name;
            // Extract comment text from retweet (non "RT @user:" prefix means user added comment)
            let retweetComment = '';
            if (tweet.text && !tweet.text.startsWith('RT @')) {
                retweetComment = tweet.text;
            }
            
            return `
                <div class="tweet-item">
                    <div class="tweet-retweet-label">
                        ${retweetIcon}
                        ${escapeHtml(retweeterName)} 转发了
                    </div>
                    ${retweetComment ? `<div class="tweet-retweet-comment">${escapeHtml(retweetComment)}</div>` : ''}
                    ${renderNestedCard(displayTweet)}
                    ${renderTweetStats(displayTweet.stats)}
                </div>
            `;
        }
        
        // === Quote tweet ===
        if (isQuote) {
            const quotedTweet = tweet.quoted_tweet;
            // Clean quote text: remove the quoted tweet URL from the end
            let quoteText = tweet.text;
            const quoteUrlPattern = /\s*https?:\/\/\S+$/;
            if (quoteUrlPattern.test(quoteText)) {
                quoteText = quoteText.replace(quoteUrlPattern, '');
            }
            
            return `
                <div class="tweet-item">
                    ${renderTweetHeader(authorName, authorHandle, authorAvatar, tweet.created_at)}
                    ${quoteText ? `<div class="tweet-text">${linkifyText(quoteText)}</div>` : ''}
                    ${translateBtnHtml(tweet.id)}
                    ${renderTweetMedia(tweet.media, tweet.id)}
                    ${renderNestedCard(quotedTweet)}
                    ${renderTweetStats(tweet.stats)}
                </div>
            `;
        }
        
        // === Normal tweet ===
        return `
            <div class="tweet-item">
                ${renderTweetHeader(authorName, authorHandle, authorAvatar, tweet.created_at)}
                <div class="tweet-text">${linkifyText(tweet.text)}</div>
                ${translateBtnHtml(tweet.id)}
                ${renderTweetMedia(tweet.media, tweet.id)}
                ${renderTweetStats(tweet.stats)}
            </div>
        `;
    }).join('');
    
    if (replace) {
        list.innerHTML = html;
    } else {
        // Append new tweets
        const existingItems = list.querySelectorAll('.tweet-item');
        if (existingItems.length === 0) {
            list.innerHTML = html;
        } else {
            list.insertAdjacentHTML('beforeend', html);
        }
    }
}

/**
 * Render media grid
 */
function renderMediaGrid(mediaList, replace = true) {
    const grid = document.getElementById('mediaGrid');
    
    if (!mediaList || mediaList.length === 0) {
        if (replace) grid.innerHTML = '<div class="loading">No media found</div>';
        return;
    }
    
    // Calculate index offset for appended items
    const offset = replace ? 0 : allMedia.length - mediaList.length;
    
    const html = mediaList.map((media, index) => {
        const globalIndex = offset + index;
        const isVideo = media.type === 'video' || media.type === 'animated_gif';
        const isGif = media.type === 'animated_gif';
        const duration = isVideo && media.duration ? formatDuration(media.duration) : '';
        return `
            <div class="media-item ${isVideo ? 'video' : ''}" onclick="openLightbox(${globalIndex})" data-index="${globalIndex}">
                <img src="${proxyUrl(media.url)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'">
                ${isVideo ? `
                    <div class="video-icon">
                        <svg viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    ${isGif ? `<span class="gif-badge">GIF</span>` : ''}
                    ${duration ? `<span class="video-duration">${duration}</span>` : ''}
                ` : ''}
            </div>
        `;
    }).join('');
    
    if (replace) {
        grid.innerHTML = html;
    } else {
        // Append new media
        const existingItems = grid.querySelectorAll('.media-item');
        if (existingItems.length === 0) {
            grid.innerHTML = html;
        } else {
            grid.insertAdjacentHTML('beforeend', html);
        }
    }
}

/**
 * PhotoSwipe-based Media Lightbox
 */
let pswp = null;
let isLightboxOpen = false;
let pswpItems = [];
let isLightboxClosingFromPopstate = false;

/**
 * Convert a media item to PhotoSwipe item format
 */
function mediaToPswpItem(m) {
    const isVideo = m.type === 'video' || m.type === 'animated_gif';
    return {
        src: proxyUrl(m.url),
        w: m.width || 0,
        h: m.height || 0,
        isVideo,
        videoUrl: isVideo ? proxyUrl(m.video_url || m.url, true) : null,
    };
}

/**
 * Initialize PhotoSwipe lightbox
 */
function initPhotoSwipe(startIndex) {
    if (pswp) {
        pswp.close();
        pswp = null;
    }
    
    pswp = new PhotoSwipe({
        dataSource: pswpItems,
        index: startIndex,
        history: false,
        bgOpacity: 1,
        showHideOpacity: true,
        spacing: 0.1,
        zoom: true,
        closeOnVerticalDrag: true,
        pinchToClose: true,
        counter: true,
        arrowKeys: true,
        clickToCloseNonZoomable: false,
    });
    
    // Use <video> (not iframe) so playback cannot push extra history entries
    // that force users to swipe-back many times to leave the page.
    pswp.on('contentLoad', (e) => {
        const { content } = e;
        if (content.data.isVideo) {
            e.preventDefault();
            const container = document.createElement('div');
            container.className = 'pswp-video-container';
            const video = document.createElement('video');
            video.dataset.videoSrc = content.data.videoUrl;
            video.controls = true;
            video.playsInline = true;
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
            video.preload = 'metadata';
            container.appendChild(video);
            content.element = container;
            content.onLoaded();
        }
    });
    
    // Play video when slide becomes active
    pswp.on('contentActivate', (e) => {
        const { content } = e;
        if (content.element) {
            const video = content.element.querySelector('video');
            if (video && video.dataset.videoSrc && !video.src) {
                video.src = video.dataset.videoSrc;
                video.play().catch(() => {});
            }
        }
    });
    
    // Pause video when slide is no longer active
    pswp.on('contentDeactivate', (e) => {
        const { content } = e;
        if (content.element) {
            const video = content.element.querySelector('video');
            if (video) {
                video.pause();
                video.removeAttribute('src');
                video.load();
            }
        }
    });
    
    // Preload more media & preload more media
    pswp.on('slideChange', () => {
        // Preload more media if near the end (profile media grid only)
        if (!isTweetLightbox && allMedia.length - pswp.currIndex <= 3 && hasMoreMedia && !isLoadingMedia && currentUser) {
            loadUserMedia(currentUser.screen_name, mediaCursor);
        }
    });
    
    pswp.on('afterOpen', () => {
        isLightboxOpen = true;
        history.pushState({ lightbox: true }, '');
    });
    
    pswp.on('close', () => {
        // Stop all videos
        if (pswp && pswp.element) {
            pswp.element.querySelectorAll('.pswp-video-container video').forEach(video => {
                video.pause();
                video.removeAttribute('src');
                video.load();
            });
        }
        isLightboxOpen = false;
        // Only pop history if the close was user-initiated (not triggered by
        // browser back/popstate). On Android, edge-swipe triggers popstate which
        // already consumed the history entry, so we must not call history.back().
        if (!isLightboxClosingFromPopstate && history.state && history.state.lightbox) {
            try {
                history.back();
            } catch (e) {
                // Ignore errors from rapid back navigation
            }
        }
        isLightboxClosingFromPopstate = false;
        pswp = null;
    });
    
    pswp.init();
}

/**
 * Open lightbox for profile media grid
 */
function openLightbox(index) {
    isTweetLightbox = false;
    pswpItems = allMedia.map(mediaToPswpItem);
    initPhotoSwipe(index);
    
    // Preload more media if near the end
    if (allMedia.length - index <= 3 && hasMoreMedia && !isLoadingMedia && currentUser) {
        loadUserMedia(currentUser.screen_name, mediaCursor);
    }
}

/**
 * Open lightbox for tweet media (supports multiple images/videos in one tweet)
 */
function openTweetLightbox(tweetId, startIndex) {
    const mediaItems = tweetMediaMap[tweetId];
    if (!mediaItems || mediaItems.length === 0) return;
    
    isTweetLightbox = true;
    pswpItems = mediaItems.map(mediaToPswpItem);
    initPhotoSwipe(startIndex);
}

/**
 * Close lightbox
 */
function closeLightbox() {
    if (pswp) {
        pswp.close();
    }
}

/**
 * Navigate to following page with URL update
 */
function navigateToFollowing(screenName) {
    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('user', screenName);
    url.searchParams.set('view', 'following');
    window.history.pushState({ view: 'following', user: screenName }, '', url);
    
    showFollowing(screenName);
}

/**
 * Navigate to user profile with URL update
 */
function navigateToProfile(screenName) {
    // Switch views
    homeView.classList.add('hidden');
    followingView.classList.add('hidden');
    followersView.classList.add('hidden');
    profileView.classList.remove('hidden');
    backBtn.classList.remove('hidden');
    currentView = 'profile';
    
    // Reset state - clear currentUser first so switchTab won't load stale data
    currentUser = null;
    mediaCursor = '';
    tweetsCursor = '';
    allTweets = [];
    allMedia = [];
    loadedMediaIds = new Set();
    loadedTweetIds = new Set();
    isLoadingMedia = false;
    isLoadingPosts = false;
    hasMoreMedia = true;
    hasMorePosts = true;
    
    // Reset tab to media (won't load data since currentUser is null)
    switchTab('media');
    
    // Show loading state
    showLoading();
    
    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('user', screenName);
    url.searchParams.delete('view');
    window.history.pushState({ view: 'profile', user: screenName }, '', url);
    
    loadUserProfile(screenName);
}

/**
 * Show following list
 */
async function showFollowing(screenName) {
    try {
        followingView.classList.remove('hidden');
        followersView.classList.add('hidden');
        homeView.classList.add('hidden');
        profileView.classList.add('hidden');
        
        document.getElementById('followingTitle').textContent = `People @${screenName} follows`;
        followingScreenName = screenName;
        
        // Check cache first
        if (followingCache[screenName]) {
            const cached = followingCache[screenName];
            allFollowingUsers = cached.data || [];
            followingCursor = cached.cursor || '';
            hasMoreFollowing = cached.hasMore ?? !!followingCursor;
            loadedFollowingIds = new Set(allFollowingUsers.map(u => u.id));
            renderFollowingList(allFollowingUsers, true);
            currentUser = cached.user;
            headerTitle.textContent = 'Following';
            backBtn.classList.remove('hidden');
            currentView = 'following';
            return;
        }
        
        await loadFollowing(screenName);
        
        headerTitle.textContent = 'Following';
        backBtn.classList.remove('hidden');
        currentView = 'following';
        
    } catch (error) {
        console.error('Error loading following:', error);
        document.getElementById('followingList').innerHTML = '<div class="error">Failed to load following list</div>';
    }
}

/**
 * Load following list (with pagination)
 */
async function loadFollowing(screenName, cursor = '') {
    if (isLoadingFollowing) return;
    isLoadingFollowing = true;
    
    try {
        if (!cursor) {
            document.getElementById('followingList').innerHTML = '<div class="loading">Loading following...</div>';
            allFollowingUsers = [];
            loadedFollowingIds = new Set();
            hasMoreFollowing = true;
            followingScreenName = screenName;
        }
        
        let url = `${API_BASE}/api/user/${screenName}/following?count=50`;
        if (cursor) {
            url += `&cursor=${encodeURIComponent(cursor)}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            const users = result.data.following || [];
            const nextCursor = result.data.cursor || '';
            
            const newUsers = users.filter(u => !loadedFollowingIds.has(u.id));
            newUsers.forEach(u => loadedFollowingIds.add(u.id));
            
            if (!cursor) {
                allFollowingUsers = newUsers;
                renderFollowingList(newUsers, true);
                currentUser = result.data.user;
            } else if (newUsers.length > 0) {
                allFollowingUsers = allFollowingUsers.concat(newUsers);
                renderFollowingList(newUsers, false);
            }
            
            followingCursor = nextCursor;
            hasMoreFollowing = nextCursor && nextCursor !== '' && !nextCursor.startsWith('0|') && newUsers.length > 0;
            
            followingCache[screenName] = {
                data: [...allFollowingUsers],
                user: result.data.user,
                cursor: followingCursor,
                hasMore: hasMoreFollowing
            };
        } else {
            if (!cursor) {
                document.getElementById('followingList').innerHTML = `<div class="error">${result.error}</div>`;
            }
            hasMoreFollowing = false;
        }
    } catch (error) {
        console.error('Error loading following:', error);
        if (!cursor) {
            document.getElementById('followingList').innerHTML = '<div class="error">Failed to load following list</div>';
        }
    } finally {
        isLoadingFollowing = false;
    }
}

/**
 * Build HTML for a single following/followers list item
 */
function renderFollowingUserItem(user) {
    return `
        <div class="following-item">
            <img class="avatar" src="${proxyUrl(user.profile_image_url)}" alt="" onclick="navigateToProfile('${user.screen_name}')">
            <div class="info" onclick="navigateToProfile('${user.screen_name}')">
                <div class="name">
                    <span class="name-text">${escapeHtml(user.name)}</span>
                    ${user.verified ? '<svg viewBox="0 0 22 22" width="18" height="18" style="fill: #1d9bf0;"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path></svg>' : ''}
                </div>
                <div class="handle">@${user.screen_name}</div>
                ${user.description ? `<div class="bio">${escapeHtml(user.description)}</div>` : ''}
            </div>
            <button class="follow-btn ${user.following ? 'following' : ''}" 
                    onclick="event.stopPropagation(); toggleFollowInList('${user.id}', ${user.following}, this)">
                ${user.following ? 'Following' : 'Follow'}
            </button>
        </div>
    `;
}

/**
 * Render following list
 */
function renderFollowingList(users, replace = true) {
    const list = document.getElementById('followingList');
    
    if (!users || users.length === 0) {
        if (replace) list.innerHTML = '<div class="loading">Not following anyone</div>';
        return;
    }
    
    const html = users.map(renderFollowingUserItem).join('');
    
    if (replace) {
        list.innerHTML = html;
    } else {
        const existingItems = list.querySelectorAll('.following-item');
        if (existingItems.length === 0) {
            list.innerHTML = html;
        } else {
            list.insertAdjacentHTML('beforeend', html);
        }
    }
}

/**
 * Navigate to followers list with URL update
 */
function navigateToFollowers(screenName) {
    const url = new URL(window.location);
    url.searchParams.set('user', screenName);
    url.searchParams.set('view', 'followers');
    window.history.pushState({ view: 'followers', user: screenName }, '', url);
    
    showFollowers(screenName);
}

/**
 * Show followers list
 */
async function showFollowers(screenName) {
    try {
        followersView.classList.remove('hidden');
        followingView.classList.add('hidden');
        homeView.classList.add('hidden');
        profileView.classList.add('hidden');
        
        document.getElementById('followersTitle').textContent = `Followers of @${screenName}`;
        followersScreenName = screenName;
        
        // Check cache first
        if (followersCache[screenName]) {
            const cached = followersCache[screenName];
            allFollowersUsers = cached.data || [];
            followersCursor = cached.cursor || '';
            hasMoreFollowers = cached.hasMore ?? !!followersCursor;
            loadedFollowersIds = new Set(allFollowersUsers.map(u => u.id));
            renderFollowersList(allFollowersUsers, true);
            currentUser = cached.user;
            headerTitle.textContent = 'Followers';
            backBtn.classList.remove('hidden');
            currentView = 'followers';
            return;
        }
        
        await loadFollowers(screenName);
        
        headerTitle.textContent = 'Followers';
        backBtn.classList.remove('hidden');
        currentView = 'followers';
        
    } catch (error) {
        console.error('Error loading followers:', error);
        document.getElementById('followersList').innerHTML = '<div class="error">Failed to load followers list</div>';
    }
}

/**
 * Load followers list (with pagination)
 */
async function loadFollowers(screenName, cursor = '') {
    if (isLoadingFollowers) return;
    isLoadingFollowers = true;
    
    try {
        if (!cursor) {
            document.getElementById('followersList').innerHTML = '<div class="loading">Loading followers...</div>';
            allFollowersUsers = [];
            loadedFollowersIds = new Set();
            hasMoreFollowers = true;
            followersScreenName = screenName;
        }
        
        let url = `${API_BASE}/api/user/${screenName}/followers?count=50`;
        if (cursor) {
            url += `&cursor=${encodeURIComponent(cursor)}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            const users = result.data.followers || [];
            const nextCursor = result.data.cursor || '';
            
            const newUsers = users.filter(u => !loadedFollowersIds.has(u.id));
            newUsers.forEach(u => loadedFollowersIds.add(u.id));
            
            if (!cursor) {
                allFollowersUsers = newUsers;
                renderFollowersList(newUsers, true);
                currentUser = result.data.user;
            } else if (newUsers.length > 0) {
                allFollowersUsers = allFollowersUsers.concat(newUsers);
                renderFollowersList(newUsers, false);
            }
            
            followersCursor = nextCursor;
            hasMoreFollowers = nextCursor && nextCursor !== '0' && newUsers.length > 0;
            
            followersCache[screenName] = {
                data: [...allFollowersUsers],
                user: result.data.user,
                cursor: followersCursor,
                hasMore: hasMoreFollowers
            };
        } else {
            if (!cursor) {
                document.getElementById('followersList').innerHTML = `<div class="error">${result.error}</div>`;
            }
            hasMoreFollowers = false;
        }
    } catch (error) {
        console.error('Error loading followers:', error);
        if (!cursor) {
            document.getElementById('followersList').innerHTML = '<div class="error">Failed to load followers list</div>';
        }
    } finally {
        isLoadingFollowers = false;
    }
}

/**
 * Render followers list (reuses following-item styling)
 */
function renderFollowersList(users, replace = true) {
    const list = document.getElementById('followersList');
    
    if (!users || users.length === 0) {
        if (replace) list.innerHTML = '<div class="loading">No followers</div>';
        return;
    }
    
    const html = users.map(renderFollowingUserItem).join('');
    
    if (replace) {
        list.innerHTML = html;
    } else {
        const existingItems = list.querySelectorAll('.following-item');
        if (existingItems.length === 0) {
            list.innerHTML = html;
        } else {
            list.insertAdjacentHTML('beforeend', html);
        }
    }
}

/**
 * Go back to previous view
 */
async function toggleFollow(userId, isFollowing) {
    const followBtn = document.getElementById('followBtn');
    
    try {
        followBtn.disabled = true;
        
        const url = isFollowing 
            ? `${API_BASE}/api/user/${userId}/unfollow`
            : `${API_BASE}/api/user/${userId}/follow`;
        
        const response = await fetch(url, { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            // Update button state
            if (isFollowing) {
                followBtn.textContent = 'Follow';
                followBtn.classList.remove('following');
            } else {
                followBtn.textContent = 'Following';
                followBtn.classList.add('following');
            }
            
            // Update currentUser state
            if (currentUser && currentUser.id === userId) {
                currentUser.following = !isFollowing;
            }
            showToast(isFollowing ? 'Unfollowed successfully' : 'Followed successfully', 'success', 2000);
        } else {
            console.error('Failed to toggle follow:', result.error);
            // Show user-friendly error message
            if (result.error && result.error.includes('Query not found')) {
                showToast('Follow/unfollow feature is temporarily unavailable. Please try again later.', 'error');
            } else {
                showToast('Failed to update follow status: ' + result.error, 'error');
            }
        }
    } catch (error) {
        console.error('Error toggling follow:', error);
        showToast('Network error occurred while trying to update follow status.', 'error');
    } finally {
        followBtn.disabled = false;
    }
}

/**
 * Toggle follow for a user in the following list
 */
async function toggleFollowInList(userId, isFollowing, button) {
    try {
        button.disabled = true;
        
        const url = isFollowing 
            ? `${API_BASE}/api/user/${userId}/unfollow`
            : `${API_BASE}/api/user/${userId}/follow`;
        
        const response = await fetch(url, { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            // Update button state
            if (isFollowing) {
                button.textContent = 'Follow';
                button.classList.remove('following');
                button.onclick = () => toggleFollowInList(userId, false, button);
            } else {
                button.textContent = 'Following';
                button.classList.add('following');
                button.onclick = () => toggleFollowInList(userId, true, button);
            }
            showToast(isFollowing ? 'Unfollowed successfully' : 'Followed successfully', 'success', 2000);
        } else {
            console.error('Failed to toggle follow:', result.error);
            // Show user-friendly error message
            if (result.error && result.error.includes('Query not found')) {
                showToast('Follow/unfollow feature is temporarily unavailable. Please try again later.', 'error');
            } else {
                showToast('Failed to update follow status: ' + result.error, 'error');
            }
        }
    } catch (error) {
        console.error('Error toggling follow:', error);
        showToast('Network error occurred while trying to update follow status.', 'error');
    } finally {
        button.disabled = false;
    }
}

/**
 * Go back to previous view via history so the stack stays consistent with
 * edge-swipe / browser back. popstate handler updates the UI.
 */
function goBack() {
    if (isLightboxOpen && pswp) {
        pswp.close();
        return;
    }
    window.history.back();
}

/**
 * Open media in new tab
 */
function openMedia(url) {
    window.open(url, '_blank');
}

/**
 * Show loading state
 */
function showLoading() {
    document.getElementById('mediaGrid').innerHTML = '<div class="loading">Loading media...</div>';
}

/**
 * Show error state
 */
function showError(message) {
    document.getElementById('mediaGrid').innerHTML = `<div class="error">${message}</div>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escape HTML and convert URLs to clickable links
 */
function linkifyText(text) {
    if (!text) return '';
    const escaped = escapeHtml(text);
    const urlPattern = /(https?:\/\/[^\s<]+)/g;
    return escaped.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

// Translation functions are in translate.js

// Handle browser back/forward button
window.addEventListener('popstate', (event) => {
    // If lightbox is open, close it instead of navigating away.
    // This catches Android edge-swipe gesture, which fires popstate.
    // Do NOT pushState here — that left ghost entries so users had to
    // swipe back many times to leave the profile page.
    if (isLightboxOpen && pswp) {
        isLightboxClosingFromPopstate = true;
        pswp.close();
        return;
    }
    
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const user = params.get('user');
    
    if (view === 'following' && user) {
        showFollowing(user);
    } else if (view === 'followers' && user) {
        showFollowers(user);
    } else if (user) {
        // Go back to profile view
        followingView.classList.add('hidden');
        followersView.classList.add('hidden');
        profileView.classList.remove('hidden');
        homeView.classList.add('hidden');
        
        if (currentUser) {
            headerTitle.textContent = currentUser.name;
        }
        backBtn.classList.remove('hidden');
        currentView = 'profile';
    } else {
        // No user param = home view
        showHome();
    }
});
