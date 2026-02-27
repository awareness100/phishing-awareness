// ============================================
// User Results & Profile Functionality
// ============================================

let userResults = [];
let userProfile = null;

// Initialize results page
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('my-results.html')) return;
    
    console.log('📊 Initializing results page...');
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'auth.html';
        return;
    }
    
    await loadUserProfile();
    await loadUserResults();
    setupResultsEventListeners();
});

// Load user profile
async function loadUserProfile() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        userProfile = profile || { id: user.id, email: user.email };
        
        // Update profile UI
        document.getElementById('userName').textContent = userProfile.full_name || 'مستخدم';
        document.getElementById('userEmail').textContent = user.email;
        
        if (userProfile.full_name) {
            document.getElementById('profileName').value = userProfile.full_name;
        }
        
    } catch (error) {
        console.error('❌ Error loading profile:', error);
    }
}

// Load user test results
async function loadUserResults() {
    try {
        showLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: results, error } = await supabase
            .from('test_sessions')
            .select(`
                *,
                assessments:assessment_id (title, description, passing_score)
            `)
            .eq('user_id', user.id)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false });
        
        if (error) throw error;
        
        userResults = results || [];
        
        renderStats();
        renderResultsList();
        renderCharts();
        
    } catch (error) {
        console.error('❌ Error loading results:', error);
        showToast('حدث خطأ في تحميل النتائج', 'error');
    } finally {
        showLoading(false);
    }
}

// Render statistics cards
function renderStats() {
    const totalTests = userResults.length;
    const passedTests = userResults.filter(r => r.passed).length;
    const averageScore = totalTests > 0 
        ? Math.round(userResults.reduce((sum, r) => sum + r.score, 0) / totalTests) 
        : 0;
    const highestScore = totalTests > 0 
        ? Math.max(...userResults.map(r => r.score)) 
        : 0;
    
    document.getElementById('totalTests').textContent = totalTests;
    document.getElementById('passedTests').textContent = passedTests;
    document.getElementById('averageScore').textContent = averageScore + '%';
    document.getElementById('highestScore').textContent = highestScore + '%';
}

// Render results list
function renderResultsList() {
    const container = document.getElementById('resultsList');
    
    if (userResults.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">📋</div>
                <h3 class="text-xl font-semibold text-slate-300 mb-2">لا توجد نتائج بعد</h3>
                <p class="text-slate-400 mb-4">لم تقم بإجراء أي اختبار بعد</p>
                <a href="../index.html" class="btn-primary inline-block">ابدأ اختبار الآن</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userResults.map(result => {
        const date = new Date(result.completed_at).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const time = new Date(result.completed_at).toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all">
                <div class="flex items-center justify-between flex-wrap gap-4">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${
                            result.passed 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : 'bg-red-500/20 text-red-400'
                        }">
                            ${result.score}%
                        </div>
                        <div>
                            <h4 class="font-semibold text-slate-200">${result.assessments?.title || 'اختبار'}</h4>
                            <p class="text-sm text-slate-400">${date} - ${time}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="px-3 py-1 rounded-full text-sm ${
                            result.passed 
                                ? 'bg-emerald-500/20 text-emerald-400' 
                                : 'bg-red-500/20 text-red-400'
                        }">
                            ${result.passed ? '✅ ناجح' : '❌ راسب'}
                        </span>
                        <button onclick="viewResultDetails('${result.id}')" class="btn-secondary text-sm">
                            التفاصيل
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Render charts
function renderCharts() {
    renderScoreChart();
    renderProgressChart();
}

// Render score distribution chart
function renderScoreChart() {
    const ctx = document.getElementById('scoreChart')?.getContext('2d');
    if (!ctx || userResults.length === 0) return;
    
    const scoreRanges = {
        '90-100': 0,
        '80-89': 0,
        '70-79': 0,
        '60-69': 0,
        '0-59': 0
    };
    
    userResults.forEach(r => {
        if (r.score >= 90) scoreRanges['90-100']++;
        else if (r.score >= 80) scoreRanges['80-89']++;
        else if (r.score >= 70) scoreRanges['70-79']++;
        else if (r.score >= 60) scoreRanges['60-69']++;
        else scoreRanges['0-59']++;
    });
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(scoreRanges),
            datasets: [{
                data: Object.values(scoreRanges),
                backgroundColor: [
                    '#10b981',
                    '#34d399',
                    '#fbbf24',
                    '#f97316',
                    '#ef4444'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Cairo' }
                    }
                }
            }
        }
    });
}

// Render progress over time chart
function renderProgressChart() {
    const ctx = document.getElementById('progressChart')?.getContext('2d');
    if (!ctx || userResults.length === 0) return;
    
    // Sort by date ascending for chart
    const sortedResults = [...userResults].sort((a, b) => 
        new Date(a.completed_at) - new Date(b.completed_at)
    );
    
    const labels = sortedResults.map(r => 
        new Date(r.completed_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
    );
    const scores = sortedResults.map(r => r.score);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'الدرجة',
                data: scores,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: '#334155'
                    }
                },
                x: {
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Setup event listeners
function setupResultsEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Profile form
    document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
    });
}

// Switch tab
function switchTab(tab) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('hidden', content.id !== `${tab}Tab`);
    });
}

// Update profile
async function updateProfile() {
    try {
        showLoading(true);
        
        const fullName = document.getElementById('profileName').value.trim();
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                full_name: fullName,
                updated_at: new Date().toISOString()
            });
        
        if (error) throw error;
        
        document.getElementById('userName').textContent = fullName || 'مستخدم';
        showToast('تم تحديث الملف الشخصي بنجاح', 'success');
        
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        showToast('حدث خطأ في تحديث الملف الشخصي', 'error');
    } finally {
        showLoading(false);
    }
}

// View result details
async function viewResultDetails(sessionId) {
    try {
        showLoading(true);
        
        const { data: answers, error } = await supabase
            .from('test_answers')
            .select(`
                *,
                questions:question_id (*)
            `)
            .eq('session_id', sessionId);
        
        if (error) throw error;
        
        // Show modal with details
        showResultModal(answers);
        
    } catch (error) {
        console.error('❌ Error loading result details:', error);
        showToast('حدث خطأ في تحميل التفاصيل', 'error');
    } finally {
        showLoading(false);
    }
}

// Show result details modal
function showResultModal(answers) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div class="p-6 border-b border-slate-700 flex items-center justify-between">
                <h3 class="text-xl font-bold">تفاصيل الاختبار</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-slate-400 hover:text-white">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="p-6 overflow-y-auto max-h-[60vh]">
                <div class="space-y-4">
                    ${answers.map((answer, index) => {
                        const question = answer.questions;
                        const isCorrect = answer.is_correct;
                        const isSkipped = answer.selected_option === -1;
                        
                        return `
                            <div class="bg-slate-900/50 rounded-xl p-4">
                                <div class="flex items-start gap-3">
                                    <span class="text-xl">${isCorrect ? '✅' : isSkipped ? '⏭️' : '❌'}</span>
                                    <div class="flex-1">
                                        <p class="font-medium text-slate-200 mb-2">${index + 1}. ${question.question_text}</p>
                                        <div class="space-y-1 text-sm">
                                            <p class="${isCorrect ? 'text-emerald-400' : isSkipped ? 'text-yellow-400' : 'text-red-400'}">
                                                إجابتك: ${isSkipped ? 'تم التخطي' : question.options[answer.selected_option]}
                                            </p>
                                            ${!isCorrect ? `
                                                <p class="text-emerald-400">
                                                    الإجابة الصحيحة: ${question.options[question.correct_answer]}
                                                </p>
                                            ` : ''}
                                            ${question.explanation ? `
                                                <p class="text-slate-400 mt-2 bg-slate-800 p-2 rounded">
                                                    💡 ${question.explanation}
                                                </p>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Show/hide loading
function showLoading(show) {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.classList.toggle('hidden', !show);
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 ${
        type === 'error' ? 'bg-red-500' : 
        type === 'success' ? 'bg-emerald-500' : 
        'bg-blue-500'
    } text-white`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
