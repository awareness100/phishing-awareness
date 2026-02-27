// ============================================
// Authentication Module
// ============================================

// Current user state
let currentUser = null;
let userProfile = null;

// ============================================
// Initialize Auth
// ============================================

async function initAuth() {
    console.log('🔐 Initializing auth...');
    
    // Check for existing session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('❌ Session error:', error);
        return;
    }
    
    if (session) {
        currentUser = session.user;
        await loadUserProfile();
        updateUIForAuth();
    } else {
        updateUIForGuest();
    }
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            await loadUserProfile();
            updateUIForAuth();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            userProfile = null;
            updateUIForGuest();
        }
    });
    
    // Setup auth forms if on auth page
    setupAuthForms();
    
    // Setup logout button
    setupLogoutButton();
}

// ============================================
// Load User Profile
// ============================================

async function loadUserProfile() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (error) {
        console.error('❌ Error loading profile:', error);
        return;
    }
    
    userProfile = data;
    console.log('✅ Profile loaded:', userProfile);
}

// ============================================
// Login
// ============================================

async function login(email, password) {
    console.log('🔑 Attempting login...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        console.error('❌ Login error:', error);
        throw error;
    }
    
    currentUser = data.user;
    await loadUserProfile();
    
    console.log('✅ Login successful');
    return data;
}

// ============================================
// Register
// ============================================

async function register(email, password, fullName) {
    console.log('📝 Attempting registration...');
    
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: 'user'
            }
        }
    });
    
    if (error) {
        console.error('❌ Registration error:', error);
        throw error;
    }
    
    console.log('✅ Registration successful');
    return data;
}

// ============================================
// Logout
// ============================================

async function logout() {
    console.log('🚪 Logging out...');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        console.error('❌ Logout error:', error);
        throw error;
    }
    
    currentUser = null;
    userProfile = null;
    
    console.log('✅ Logout successful');
    
    // Redirect to home
    window.location.href = '/';
}

// ============================================
// Setup Auth Forms
// ============================================

function setupAuthForms() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const btn = document.getElementById('loginBtn');
            const spinner = document.getElementById('loginSpinner');
            
            // Show loading
            btn.disabled = true;
            spinner.classList.remove('hidden');
            
            try {
                await login(email, password);
                showToast('تم تسجيل الدخول بنجاح!', 'success');
                
                // Redirect based on role
                setTimeout(() => {
                    if (userProfile?.role === 'admin') {
                        window.location.href = '/pages/admin.html';
                    } else {
                        window.location.href = '/index.html';
                    }
                }, 1000);
            } catch (error) {
                console.error('Login error:', error);
                showToast(error.message === 'Invalid login credentials' 
                    ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' 
                    : 'حدث خطأ أثناء تسجيل الدخول', 'error');
            } finally {
                btn.disabled = false;
                spinner.classList.add('hidden');
            }
        });
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullName = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const btn = document.getElementById('registerBtn');
            const spinner = document.getElementById('registerSpinner');
            
            // Show loading
            btn.disabled = true;
            spinner.classList.remove('hidden');
            
            try {
                await register(email, password, fullName);
                showToast('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.', 'success');
                
                // Switch to login tab
                setTimeout(() => {
                    document.getElementById('loginTab').click();
                }, 1500);
            } catch (error) {
                console.error('Register error:', error);
                showToast(error.message === 'User already registered'
                    ? 'هذا البريد الإلكتروني مسجل مسبقاً'
                    : 'حدث خطأ أثناء إنشاء الحساب', 'error');
            } finally {
                btn.disabled = false;
                spinner.classList.add('hidden');
            }
        });
    }
}

// ============================================
// Setup Logout Button
// ============================================

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await logout();
            } catch (error) {
                showToast('حدث خطأ أثناء تسجيل الخروج', 'error');
            }
        });
    }
}

// ============================================
// Update UI
// ============================================

function updateUIForAuth() {
    const userSection = document.getElementById('userSection');
    const guestSection = document.getElementById('guestSection');
    const userName = document.getElementById('userName');
    const adminLink = document.getElementById('adminLink');
    
    if (userSection) userSection.classList.remove('hidden');
    if (userSection) userSection.classList.add('flex');
    if (guestSection) guestSection.classList.add('hidden');
    
    if (userName && userProfile) {
        userName.textContent = userProfile.full_name || userProfile.email;
    }
    
    // Show admin link if user is admin
    if (adminLink && userProfile?.role === 'admin') {
        adminLink.classList.remove('hidden');
    }
}

function updateUIForGuest() {
    const userSection = document.getElementById('userSection');
    const guestSection = document.getElementById('guestSection');
    const adminLink = document.getElementById('adminLink');
    
    if (userSection) userSection.classList.add('hidden');
    if (userSection) userSection.classList.remove('flex');
    if (guestSection) guestSection.classList.remove('hidden');
    if (adminLink) adminLink.classList.add('hidden');
}

// ============================================
// Check Admin Access
// ============================================

async function checkAdminAccess() {
    if (!currentUser) {
        window.location.href = '/pages/auth.html';
        return false;
    }
    
    if (!userProfile) {
        await loadUserProfile();
    }
    
    if (userProfile?.role !== 'admin') {
        const accessDenied = document.getElementById('accessDenied');
        if (accessDenied) {
            accessDenied.classList.remove('hidden');
        }
        return false;
    }
    
    return true;
}

// ============================================
// Check Auth Access
// ============================================

async function checkAuthAccess() {
    if (!currentUser) {
        const loginRequired = document.getElementById('loginRequired');
        if (loginRequired) {
            loginRequired.classList.remove('hidden');
        }
        return false;
    }
    return true;
}

// ============================================
// Export
// ============================================

window.initAuth = initAuth;
window.login = login;
window.register = register;
window.logout = logout;
window.loadUserProfile = loadUserProfile;
window.checkAdminAccess = checkAdminAccess;
window.checkAuthAccess = checkAuthAccess;

// Expose current user and profile
Object.defineProperty(window, 'currentUser', {
    get: () => currentUser
});

Object.defineProperty(window, 'userProfile', {
    get: () => userProfile
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', initAuth);
