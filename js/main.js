// ============================================
// Main Application Initialization
// ============================================

// Global state
let currentUser = null;
let isAdmin = false;

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Phishing Awareness Platform Starting...');
    
    // Initialize Supabase
    await initSupabase();
    
    // Check authentication status
    await checkAuthStatus();
    
    // Setup global event listeners
    setupGlobalEventListeners();
    
    // Update UI based on auth status
    updateUIForAuth();
});

// Initialize Supabase
async function initSupabase() {
    try {
        // Supabase is initialized in supabaseClient.js
        console.log('✅ Supabase client ready');
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
    }
}

// Check authentication status
async function checkAuthStatus() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            currentUser = session.user;
            await checkUserRole();
            console.log('✅ User authenticated:', currentUser.email);
        } else {
            currentUser = null;
            isAdmin = false;
            console.log('ℹ️ No active session');
        }
        
    } catch (error) {
        console.error('❌ Error checking auth status:', error);
    }
}

// Check user role
async function checkUserRole() {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        isAdmin = profile?.role === 'admin';
        
    } catch (error) {
        console.error('❌ Error checking user role:', error);
        isAdmin = false;
    }
}

// Setup global event listeners
function setupGlobalEventListeners() {
    // Auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth state changed:', event);
        
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            checkUserRole().then(() => {
                updateUIForAuth();
            });
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            isAdmin = false;
            updateUIForAuth();
        }
    });
    
    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    
    menuToggle?.addEventListener('click', () => {
        mobileMenu?.classList.toggle('hidden');
    });
    
    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('mobileLogoutBtn')?.addEventListener('click', logout);
}

// Update UI based on authentication
function updateUIForAuth() {
    const authLinks = document.getElementById('authLinks');
    const userMenu = document.getElementById('userMenu');
    const adminLink = document.getElementById('adminLink');
    const mobileAdminLink = document.getElementById('mobileAdminLink');
    
    if (currentUser) {
        // User is logged in
        if (authLinks) authLinks.classList.add('hidden');
        if (userMenu) {
            userMenu.classList.remove('hidden');
            document.getElementById('userName').textContent = currentUser.email.split('@')[0];
        }
        
        // Show admin links if admin
        if (isAdmin) {
            if (adminLink) adminLink.classList.remove('hidden');
            if (mobileAdminLink) mobileAdminLink.classList.remove('hidden');
        } else {
            if (adminLink) adminLink.classList.add('hidden');
            if (mobileAdminLink) mobileAdminLink.classList.add('hidden');
        }
        
    } else {
        // User is logged out
        if (authLinks) authLinks.classList.remove('hidden');
        if (userMenu) userMenu.classList.add('hidden');
        if (adminLink) adminLink.classList.add('hidden');
        if (mobileAdminLink) mobileAdminLink.classList.add('hidden');
    }
}

// Logout
async function logout() {
    try {
        showLoading(true);
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        isAdmin = false;
        
        showToast('تم تسجيل الخروج بنجاح', 'success');
        
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error logging out:', error);
        showToast('حدث خطأ في تسجيل الخروج', 'error');
    } finally {
        showLoading(false);
    }
}

// Show loading overlay
function showLoading(show) {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.classList.toggle('hidden', !show);
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    // Remove existing toasts
    document.querySelectorAll('.toast-notification').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-notification fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 ${
        type === 'error' ? 'bg-red-500' : 
        type === 'success' ? 'bg-emerald-500' : 
        'bg-blue-500'
    } text-white animate-fade-in`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('animate-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format time
function formatTime(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Validate email
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate password
function isValidPassword(password) {
    return password.length >= 6;
}

// Sanitize input
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('تم النسخ إلى الحافظة', 'success');
    } catch (err) {
        showToast('فشل النسخ', 'error');
    }
}

// Download file
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Scroll to element
function scrollToElement(elementId, offset = 80) {
    const element = document.getElementById(elementId);
    if (element) {
        const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
    }
}

// Animate number counter
function animateCounter(element, target, duration = 1000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 16);
}

// Intersection Observer for animations
function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// Handle errors globally
window.onerror = function(message, source, lineno, colno, error) {
    console.error('🚨 Global error:', { message, source, lineno, colno, error });
    return false;
};

// Handle unhandled promise rejections
window.onunhandledrejection = function(event) {
    console.error('🚨 Unhandled promise rejection:', event.reason);
};

// Initialize scroll animations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupScrollAnimations();
});
