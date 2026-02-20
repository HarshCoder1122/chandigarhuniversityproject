/**
 * HARDINI AUTH — Shared Firebase Authentication Module
 * Include this on every page AFTER firebase-app-compat.js, firebase-auth-compat.js, and firebase-config.js
 * Handles: auth guard, user menu injection, help/support panel, logout
 */

(function () {
    'use strict';

    // ── Globals exposed for other scripts ──
    window.hardiniAuth = {
        currentUser: null,
        authToken: null
    };

    // ── Initialize Firebase if not already done ──
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    // ── Auth State Listener ──
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            // Not logged in → redirect to login
            window.location.href = 'login.html';
            return;
        }

        // Check email verification (Google users are always verified)
        const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
        if (!user.emailVerified && !isGoogleUser) {
            window.location.href = 'login.html?unverified=true';
            return;
        }

        // Store globally
        window.hardiniAuth.currentUser = user;
        window.hardiniAuth.authToken = await user.getIdToken();

        // Refresh token every 10 minutes
        setInterval(async () => {
            window.hardiniAuth.authToken = await user.getIdToken(true);
        }, 10 * 60 * 1000);

        // Inject user menu into nav
        injectUserMenu(user);

        // Inject help/support panel
        injectHelpPanel(user);

        // Fire custom event so page-specific scripts can react
        document.dispatchEvent(new CustomEvent('hardiniAuthReady', { detail: { user } }));
    });

    // ── Inject User Menu into Nav ──
    function injectUserMenu(user) {
        // Hide login button
        const authBtn = document.getElementById('authToggleBtn');
        if (authBtn) authBtn.classList.add('hidden-auth');

        // Remove existing user menu if any
        const existing = document.getElementById('hardiniUserMenu');
        if (existing) existing.remove();

        // Remove old-style userMenu if exists
        const oldMenu = document.getElementById('userMenu');
        if (oldMenu) oldMenu.style.display = 'none';

        // Build avatar
        const avatarContent = user.photoURL
            ? `<img src="${user.photoURL}" alt="avatar">`
            : getInitials(user.displayName || user.email);

        const displayName = user.displayName || user.email.split('@')[0];

        // Create menu element
        const menuEl = document.createElement('div');
        menuEl.id = 'hardiniUserMenu';
        menuEl.className = 'hardini-user-menu';
        menuEl.title = 'Open Help & Support';
        menuEl.innerHTML = `
            <div class="user-avatar">${avatarContent}</div>
            <span class="user-name">${displayName}</span>
        `;
        menuEl.addEventListener('click', openHelpPanel);

        // Insert into nav-links or reels-nav nav-right
        const navLinks = document.querySelector('.nav-links');
        const navRight = document.querySelector('.nav-right');
        if (navLinks) {
            navLinks.appendChild(menuEl);
        } else if (navRight) {
            navRight.appendChild(menuEl);
        } else {
            // Fallback: append to first nav
            const nav = document.querySelector('nav');
            if (nav) nav.appendChild(menuEl);
        }
    }

    // ── Inject Help/Support Panel ──
    function injectHelpPanel(user) {
        // Remove existing
        const existingOverlay = document.getElementById('hardiniHelpOverlay');
        const existingPanel = document.getElementById('hardiniHelpPanel');
        if (existingOverlay) existingOverlay.remove();
        if (existingPanel) existingPanel.remove();

        const displayName = user.displayName || user.email.split('@')[0];
        const avatarContent = user.photoURL
            ? `<img src="${user.photoURL}" alt="avatar">`
            : getInitials(displayName);
        const memberDate = user.metadata?.creationTime
            ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : 'Member';

        // Overlay
        const overlay = document.createElement('div');
        overlay.id = 'hardiniHelpOverlay';
        overlay.className = 'hardini-help-overlay';
        overlay.addEventListener('click', closeHelpPanel);
        document.body.appendChild(overlay);

        // Panel
        const panel = document.createElement('div');
        panel.id = 'hardiniHelpPanel';
        panel.className = 'hardini-help-panel';
        panel.innerHTML = `
            <!-- Header -->
            <div class="help-panel-header">
                <span class="panel-brand">HARDINI 🌱</span>
                <button class="close-panel" onclick="closeHelpPanel()" aria-label="Close panel">✕</button>
            </div>

            <!-- Profile Card -->
            <div class="help-profile-card">
                <div class="profile-avatar">${avatarContent}</div>
                <div class="profile-details">
                    <h3>${displayName}</h3>
                    <p>${user.email}</p>
                    <span class="member-since">🌱 Member since ${memberDate}</span>
                </div>
            </div>

            <!-- Quick Links -->
            <div class="help-section-title">Quick Links</div>
            <ul class="help-nav-links">
                <li><a href="index.html"><span class="link-icon">🏠</span> Dashboard</a></li>
                <li><a href="index.html#outlet"><span class="link-icon">📦</span> My Orders</a></li>
                <li><a href="soil-probe.html"><span class="link-icon">🌾</span> My Farms & IoT</a></li>
                <li><a href="connect.html"><span class="link-icon">🤝</span> My Network</a></li>
                <li><a href="reels.html"><span class="link-icon">🎥</span> AgriReels</a></li>
            </ul>

            <div class="help-divider"></div>

            <!-- Help & Support -->
            <div class="help-section-title">Help & Support</div>
            <ul class="help-nav-links">
                <li>
                    <button onclick="openKnowledgeBase()">
                        <span class="link-icon">📖</span> Knowledge Base
                        <span class="link-badge">NEW</span>
                    </button>
                </li>
                <li>
                    <button onclick="openLiveChat()">
                        <span class="link-icon">💬</span> Chat with Support
                    </button>
                </li>
                <li>
                    <a href="mailto:support@hardini.com">
                        <span class="link-icon">📧</span> Email Support
                    </a>
                </li>
                <li>
                    <button onclick="reportBug()">
                        <span class="link-icon">🐛</span> Report a Bug
                    </button>
                </li>
            </ul>

            <div class="help-divider"></div>

            <!-- FAQ -->
            <div class="help-section-title">Frequently Asked Questions</div>
            <ul class="help-faq-list">
                <li class="help-faq-item">
                    <button class="help-faq-question" onclick="toggleFaq(this)">
                        How do I place an order?
                        <span class="faq-arrow">▸</span>
                    </button>
                    <div class="help-faq-answer">
                        Go to the Dashboard → Smart Farming Store section. Browse products, click "Order Now", and choose your delivery & payment options.
                    </div>
                </li>
                <li class="help-faq-item">
                    <button class="help-faq-question" onclick="toggleFaq(this)">
                        How does SoilProbe IoT work?
                        <span class="faq-arrow">▸</span>
                    </button>
                    <div class="help-faq-answer">
                        Install IoT sensors in your field, register them via Bluetooth on the SoilProbe page, then connect via WiFi or SIM card for continuous cloud monitoring of soil temperature, moisture, and ambient conditions.
                    </div>
                </li>
                <li class="help-faq-item">
                    <button class="help-faq-question" onclick="toggleFaq(this)">
                        How do I connect with experts?
                        <span class="faq-arrow">▸</span>
                    </button>
                    <div class="help-faq-answer">
                        Visit the Connect page and click "Connect with Experts" to browse available agricultural specialists. You can book consultations and get professional advice.
                    </div>
                </li>
                <li class="help-faq-item">
                    <button class="help-faq-question" onclick="toggleFaq(this)">
                        Is my data secure?
                        <span class="faq-arrow">▸</span>
                    </button>
                    <div class="help-faq-answer">
                        Yes! We use Firebase Authentication and encrypted cloud storage. Your farm data and personal information are protected with enterprise-grade security.
                    </div>
                </li>
            </ul>

            <div class="help-divider"></div>

            <!-- Logout -->
            <div class="help-logout-section">
                <button class="help-logout-btn" onclick="hardiniLogout()">
                    🚪 Logout
                </button>
            </div>
        `;
        document.body.appendChild(panel);
    }

    // ── Panel Controls (global) ──
    window.openHelpPanel = function () {
        const overlay = document.getElementById('hardiniHelpOverlay');
        const panel = document.getElementById('hardiniHelpPanel');
        if (overlay) overlay.classList.add('active');
        if (panel) panel.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeHelpPanel = function () {
        const overlay = document.getElementById('hardiniHelpOverlay');
        const panel = document.getElementById('hardiniHelpPanel');
        if (overlay) overlay.classList.remove('active');
        if (panel) panel.classList.remove('active');
        document.body.style.overflow = '';
    };

    window.hardiniLogout = function () {
        firebase.auth().signOut().then(() => {
            window.location.href = 'login.html';
        });
    };

    // Also expose as window.logout for backward compat
    window.logout = window.hardiniLogout;

    // ── FAQ Toggle ──
    window.toggleFaq = function (btn) {
        const item = btn.closest('.help-faq-item');
        const wasActive = item.classList.contains('active');
        // Close all
        document.querySelectorAll('.help-faq-item').forEach(i => i.classList.remove('active'));
        // Toggle clicked
        if (!wasActive) item.classList.add('active');
    };

    // ── Support Placeholders ──
    window.openKnowledgeBase = function () {
        showAuthNotification('Knowledge Base is coming soon! 📖', 'info');
        closeHelpPanel();
    };

    window.openLiveChat = function () {
        // Open the chatbot if it exists on this page
        const chatToggle = document.getElementById('chatbotToggle');
        if (chatToggle) {
            chatToggle.click();
            closeHelpPanel();
        } else {
            showAuthNotification('Live Chat is available on the Dashboard. Redirecting...', 'info');
            setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        }
    };

    window.reportBug = function () {
        const email = 'support@hardini.com';
        const subject = encodeURIComponent('Bug Report — Hardini Platform');
        const body = encodeURIComponent(`
Hi Hardini Support,

I'd like to report an issue:

**Page:** ${window.location.href}
**Browser:** ${navigator.userAgent}
**Description:** [Please describe the bug]

Steps to reproduce:
1. 
2. 
3. 

Expected behavior:

Actual behavior:

Thank you!
        `.trim());
        window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_self');
        closeHelpPanel();
    };

    // ── Utilities ──
    function getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0][0].toUpperCase();
    }

    function showAuthNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 99999;
            padding: 14px 24px; border-radius: 12px;
            background: ${type === 'success' ? 'rgba(76,175,80,0.15)' : type === 'error' ? 'rgba(255,82,82,0.15)' : 'rgba(76,175,80,0.1)'};
            border: 1px solid ${type === 'success' ? 'rgba(76,175,80,0.3)' : type === 'error' ? 'rgba(255,82,82,0.3)' : 'rgba(76,175,80,0.2)'};
            color: #fff; font-size: 0.9rem; font-family: 'Poppins', sans-serif;
            backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
            transform: translateX(120%); transition: transform 0.4s cubic-bezier(0.16,1,0.3,1);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        requestAnimationFrame(() => { notification.style.transform = 'translateX(0)'; });
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => notification.remove(), 400);
        }, 3500);
    }

    // Close panel on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeHelpPanel();
    });

})();
