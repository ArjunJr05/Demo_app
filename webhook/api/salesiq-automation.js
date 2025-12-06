// 🚀 SalesIQ JavaScript Automation for Cliqtrix
// Advanced chat automation with custom behavior

// Initialize SalesIQ automation
window.$zoho = window.$zoho || {};
$zoho.salesiq = $zoho.salesiq || {};

// 🎯 MAIN AUTOMATION CONTROLLER
$zoho.salesiq.ready = function() {
    console.log('🚀 SalesIQ Automation Ready - Cliqtrix Widget Active');
    
    // Auto-capture visitor data if available
    autoCapturVisitorData();
    
    // Auto-send welcome message after 2 seconds
    setTimeout(() => {
        sendWelcomeMessage();
    }, 2000);
    
    // Auto-open chat for new visitors (optional)
    // autoOpenChatForNewVisitors();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start behavior tracking
    startBehaviorTracking();
};

// 🎯 AUTO-SEND WELCOME MESSAGE
function sendWelcomeMessage() {
    const welcomeMessages = [
        "Hi! Welcome to Cliqtrix 👋 How can I help you today?",
        "Hello! I'm here to assist you with orders, returns, and support 🛍️",
        "Welcome! Need help with your shopping? I'm here for you! 😊"
    ];
    
    // Random welcome message for variety
    const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    
    $zoho.salesiq.chat.send(randomMessage);
    console.log('✅ Auto-sent welcome message:', randomMessage);
}

// 🎯 AUTO-CAPTURE VISITOR DATA
function autoCapturVisitorData() {
    // Try to get user data from various sources
    const userData = detectUserData();
    
    if (userData.name) {
        $zoho.salesiq.visitor.name(userData.name);
        console.log('✅ Auto-captured name:', userData.name);
    }
    
    if (userData.email) {
        $zoho.salesiq.visitor.email(userData.email);
        console.log('✅ Auto-captured email:', userData.email);
    }
    
    if (userData.phone) {
        $zoho.salesiq.visitor.phone(userData.phone);
        console.log('✅ Auto-captured phone:', userData.phone);
    }
    
    // Set custom visitor info
    $zoho.salesiq.visitor.info({
        'App': 'Cliqtrix E-commerce',
        'Platform': 'Flutter Mobile App',
        'Version': '1.0.0',
        'Last Visit': new Date().toISOString()
    });
}

// 🔍 DETECT USER DATA FROM VARIOUS SOURCES
function detectUserData() {
    let userData = {};
    
    // Method 1: Check localStorage/sessionStorage
    try {
        const storedUser = localStorage.getItem('user_data') || sessionStorage.getItem('user_data');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            userData = { ...userData, ...parsed };
        }
    } catch (e) {
        console.log('No stored user data found');
    }
    
    // Method 2: Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('user_email')) userData.email = urlParams.get('user_email');
    if (urlParams.get('user_name')) userData.name = urlParams.get('user_name');
    
    // Method 3: Check for logged-in user (if available)
    if (window.currentUser) {
        userData = { ...userData, ...window.currentUser };
    }
    
    // Method 4: Check Firebase Auth (if available)
    if (window.firebase && window.firebase.auth) {
        const user = window.firebase.auth().currentUser;
        if (user) {
            userData.name = user.displayName;
            userData.email = user.email;
            userData.phone = user.phoneNumber;
        }
    }
    
    return userData;
}

// 🎯 AUTO-OPEN CHAT FOR NEW VISITORS
function autoOpenChatForNewVisitors() {
    // Check if visitor is new (hasn't visited in last 24 hours)
    const lastVisit = localStorage.getItem('salesiq_last_visit');
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    if (!lastVisit || parseInt(lastVisit) < oneDayAgo) {
        // New visitor - auto-open chat after 5 seconds
        setTimeout(() => {
            $zoho.salesiq.floatwindow.visible("show");
            console.log('✅ Auto-opened chat for new visitor');
        }, 5000);
        
        // Store current visit time
        localStorage.setItem('salesiq_last_visit', now.toString());
    }
}

// 🎯 SETUP EVENT LISTENERS
function setupEventListeners() {
    // Listen for chat events
    $zoho.salesiq.chat.onmessage = function(data) {
        console.log('💬 Chat message received:', data);
        handleIncomingMessage(data);
    };
    
    // Listen for chat open/close
    $zoho.salesiq.floatwindow.onopen = function() {
        console.log('📖 Chat window opened');
        trackEvent('chat_opened');
    };
    
    $zoho.salesiq.floatwindow.onclose = function() {
        console.log('📕 Chat window closed');
        trackEvent('chat_closed');
    };
}

// 🎯 HANDLE INCOMING MESSAGES
function handleIncomingMessage(data) {
    const message = data.message || data.text || '';
    
    // Auto-respond to common queries
    if (message.toLowerCase().includes('order status')) {
        setTimeout(() => {
            $zoho.salesiq.chat.send("I can help you check your order status! Please provide your order ID or email address.");
        }, 1000);
    }
    
    if (message.toLowerCase().includes('return') || message.toLowerCase().includes('refund')) {
        setTimeout(() => {
            $zoho.salesiq.chat.send("I'll help you with returns and refunds! Let me get your order details first.");
        }, 1000);
    }
    
    if (message.toLowerCase().includes('cancel')) {
        setTimeout(() => {
            $zoho.salesiq.chat.send("I can assist with order cancellations. What's your order number?");
        }, 1000);
    }
}

// 🎯 BEHAVIOR TRACKING
function startBehaviorTracking() {
    // Track page views
    trackEvent('page_view', { page: window.location.pathname });
    
    // Track time on page
    let startTime = Date.now();
    window.addEventListener('beforeunload', () => {
        const timeSpent = Date.now() - startTime;
        trackEvent('time_on_page', { duration: timeSpent });
    });
    
    // Track scroll behavior
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
        const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        if (scrollPercent > maxScroll) {
            maxScroll = scrollPercent;
            if (maxScroll >= 50 && !localStorage.getItem('scroll_50_tracked')) {
                trackEvent('scrolled_50_percent');
                localStorage.setItem('scroll_50_tracked', 'true');
            }
        }
    });
}

// 🎯 TRACK EVENTS
function trackEvent(eventName, data = {}) {
    console.log('📊 Tracking event:', eventName, data);
    
    // Send to SalesIQ as visitor activity
    $zoho.salesiq.visitor.info({
        [`last_${eventName}`]: new Date().toISOString(),
        ...data
    });
    
    // Send to your webhook for analytics
    if (window.fetch) {
        fetch('http://localhost:3000/api/track-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: eventName,
                data: data,
                timestamp: new Date().toISOString(),
                url: window.location.href
            })
        }).catch(e => console.log('Analytics tracking failed:', e));
    }
}

// 🎯 SMART CHAT TRIGGERS
function setupSmartTriggers() {
    // Trigger chat if user seems stuck (no activity for 30 seconds)
    let inactivityTimer;
    
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            if (!localStorage.getItem('inactivity_help_shown')) {
                $zoho.salesiq.chat.send("Need any help finding what you're looking for? 🤔");
                localStorage.setItem('inactivity_help_shown', 'true');
            }
        }, 30000);
    }
    
    // Reset timer on user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });
    
    resetInactivityTimer();
}

// 🎯 CART ABANDONMENT TRIGGER
function setupCartAbandonmentTrigger() {
    // Check if user has items in cart but hasn't completed purchase
    const checkCartAbandonment = () => {
        const cartItems = localStorage.getItem('cart_items');
        const lastCartUpdate = localStorage.getItem('last_cart_update');
        
        if (cartItems && lastCartUpdate) {
            const timeSinceUpdate = Date.now() - parseInt(lastCartUpdate);
            const fiveMinutes = 5 * 60 * 1000;
            
            if (timeSinceUpdate > fiveMinutes && !localStorage.getItem('cart_reminder_sent')) {
                $zoho.salesiq.chat.send("Don't forget about the items in your cart! 🛒 Need help completing your order?");
                localStorage.setItem('cart_reminder_sent', 'true');
            }
        }
    };
    
    // Check every 2 minutes
    setInterval(checkCartAbandonment, 2 * 60 * 1000);
}

// 🎯 INITIALIZE ALL AUTOMATIONS
function initializeAllAutomations() {
    setupSmartTriggers();
    setupCartAbandonmentTrigger();
    
    console.log('🚀 All SalesIQ automations initialized successfully!');
}

// Start automations when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAllAutomations);
} else {
    initializeAllAutomations();
}

// 🎯 UTILITY FUNCTIONS FOR MANUAL CONTROL

// Manually send custom message
window.sendCustomMessage = function(message) {
    $zoho.salesiq.chat.send(message);
    console.log('✅ Sent custom message:', message);
};

// Manually open chat
window.openChat = function() {
    $zoho.salesiq.floatwindow.visible("show");
    console.log('✅ Manually opened chat');
};

// Manually close chat
window.closeChat = function() {
    $zoho.salesiq.floatwindow.visible("hide");
    console.log('✅ Manually closed chat');
};

// Set customer data manually
window.setCustomerData = function(name, email, phone) {
    if (name) $zoho.salesiq.visitor.name(name);
    if (email) $zoho.salesiq.visitor.email(email);
    if (phone) $zoho.salesiq.visitor.phone(phone);
    console.log('✅ Set customer data:', { name, email, phone });
};

console.log('🎯 SalesIQ Automation Script Loaded - Ready for Cliqtrix! 🚀');
