// ============================================
// Admin Dashboard Functionality
// ============================================

let adminAssessments = [];
let adminQuestions = [];
let currentAssessmentId = null;
let currentQuestion = null;
let optionCount = 4;

// Initialize admin page
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('admin.html')) return;
    
    console.log('⚙️ Initializing admin dashboard...');
    
    // Check authentication and admin role
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'auth.html';
        return;
    }
    
    const isAdmin = await checkAdminRole();
    if (!isAdmin) {
        showToast('غير مصرح لك بالوصول إلى لوحة التحكم', 'error');
        window.location.href = '../index.html';
        return;
    }
    
    await loadAdminData();
    setupAdminEventListeners();
});

// Check if user is admin
async function checkAdminRole() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (error) throw error;
        
        return profile?.role === 'admin';
        
    } catch (error) {
        console.error('❌ Error checking admin role:', error);
        return false;
    }
}

// Load admin data
async function loadAdminData() {
    try {
        showLoading(true);
        await Promise.all([
            loadAdminAssessments(),
            loadStats()
        ]);
    } catch (error) {
        console.error('❌ Error loading admin data:', error);
        showToast('حدث خطأ في تحميل البيانات', 'error');
    } finally {
        showLoading(false);
    }
}

// Load assessments for admin
async function loadAdminAssessments() {
    const { data: assessments, error } = await supabase
        .from('assessments')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    adminAssessments = assessments || [];
    renderAdminAssessments();
    renderAssessmentSelect();
}

// Render admin assessments list
function renderAdminAssessments() {
    const container = document.getElementById('adminAssessmentsList');
    
    if (adminAssessments.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-400">
                <div class="text-4xl mb-2">📋</div>
                <p>لا توجد اختبارات</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = adminAssessments.map(assessment => {
        const statusClass = assessment.status === 'published' 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-yellow-500/20 text-yellow-400';
        
        const statusText = assessment.status === 'published' ? 'منشور' : 'مسودة';
        
        return `
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-semibold text-slate-200">${assessment.title}</h4>
                        <p class="text-sm text-slate-400">${assessment.year} - ${assessment.questions_count || 0} سؤال</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 rounded text-xs ${statusClass}">${statusText}</span>
                        <button onclick="editAssessment('${assessment.id}')" class="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button onclick="deleteAssessment('${assessment.id}')" class="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Render assessment select dropdown
function renderAssessmentSelect() {
    const select = document.getElementById('assessmentSelect');
    if (!select) return;
    
    select.innerHTML = `
        <option value="">اختر الاختبار</option>
        ${adminAssessments.map(a => `
            <option value="${a.id}">${a.title} (${a.year})</option>
        `).join('')}
    `;
}

// Load statistics
async function loadStats() {
    try {
        // Total users
        const { count: usersCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        // Total tests taken
        const { count: testsCount } = await supabase
            .from('test_sessions')
            .select('*', { count: 'exact', head: true })
            .not('completed_at', 'is', null);
        
        // Total questions
        const { count: questionsCount } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true });
        
        // Average score
        const { data: avgScore } = await supabase
            .rpc('get_average_score');
        
        document.getElementById('totalUsers').textContent = usersCount || 0;
        document.getElementById('totalTests').textContent = testsCount || 0;
        document.getElementById('totalQuestions').textContent = questionsCount || 0;
        document.getElementById('averageScore').textContent = (avgScore || 0) + '%';
        
    } catch (error) {
        console.error('❌ Error loading stats:', error);
    }
}

// Setup event listeners
function setupAdminEventListeners() {
    // Tab switching
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchAdminTab(tab);
        });
    });
    
    // Assessment select
    document.getElementById('assessmentSelect')?.addEventListener('change', (e) => {
        currentAssessmentId = e.target.value;
        if (currentAssessmentId) {
            loadQuestions(currentAssessmentId);
        } else {
            adminQuestions = [];
            renderQuestionsList();
        }
    });
    
    // New assessment button
    document.getElementById('newAssessmentBtn')?.addEventListener('click', () => {
        openAssessmentModal();
    });
    
    // New question button
    document.getElementById('newQuestionBtn')?.addEventListener('click', () => {
        if (!currentAssessmentId) {
            showToast('الرجاء اختيار اختبار أولاً', 'error');
            return;
        }
        openQuestionModal();
    });
    
    // Assessment form
    document.getElementById('assessmentForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveAssessment();
    });
    
    // Question form
    document.getElementById('questionForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveQuestion();
    });
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Add option button
    document.getElementById('addOptionBtn')?.addEventListener('click', addOption);
}

// Switch admin tab
function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.toggle('hidden', content.id !== `${tab}Tab`);
    });
}

// Open assessment modal
function openAssessmentModal(assessment = null) {
    const modal = document.getElementById('assessmentModal');
    const form = document.getElementById('assessmentForm');
    const title = document.getElementById('assessmentModalTitle');
    
    form.reset();
    
    if (assessment) {
        title.textContent = 'تعديل اختبار';
        document.getElementById('assessmentId').value = assessment.id;
        document.getElementById('assessmentTitle').value = assessment.title;
        document.getElementById('assessmentDesc').value = assessment.description || '';
        document.getElementById('assessmentYear').value = assessment.year;
        document.getElementById('passingScore').value = assessment.passing_score;
        document.getElementById('assessmentStatus').value = assessment.status;
    } else {
        title.textContent = 'اختبار جديد';
        document.getElementById('assessmentId').value = '';
        document.getElementById('assessmentYear').value = new Date().getFullYear();
        document.getElementById('passingScore').value = 70;
    }
    
    modal.classList.remove('hidden');
}

// Save assessment
async function saveAssessment() {
    try {
        showLoading(true);
        
        const id = document.getElementById('assessmentId').value;
        const data = {
            title: document.getElementById('assessmentTitle').value.trim(),
            description: document.getElementById('assessmentDesc').value.trim(),
            year: parseInt(document.getElementById('assessmentYear').value),
            passing_score: parseInt(document.getElementById('passingScore').value),
            status: document.getElementById('assessmentStatus').value
        };
        
        let error;
        
        if (id) {
            ({ error } = await supabase
                .from('assessments')
                .update(data)
                .eq('id', id));
        } else {
            ({ error } = await supabase
                .from('assessments')
                .insert(data));
        }
        
        if (error) throw error;
        
        closeAllModals();
        await loadAdminAssessments();
        showToast(id ? 'تم تحديث الاختبار بنجاح' : 'تم إنشاء الاختبار بنجاح', 'success');
        
    } catch (error) {
        console.error('❌ Error saving assessment:', error);
        showToast('حدث خطأ في حفظ الاختبار', 'error');
    } finally {
        showLoading(false);
    }
}

// Edit assessment
function editAssessment(id) {
    const assessment = adminAssessments.find(a => a.id === id);
    if (assessment) {
        openAssessmentModal(assessment);
    }
}

// Delete assessment
async function deleteAssessment(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الاختبار؟ سيتم حذف جميع الأسئلة والنتائج المرتبطة به!')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const { error } = await supabase
            .from('assessments')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        await loadAdminAssessments();
        showToast('تم حذف الاختبار بنجاح', 'success');
        
    } catch (error) {
        console.error('❌ Error deleting assessment:', error);
        showToast('حدث خطأ في حذف الاختبار', 'error');
    } finally {
        showLoading(false);
    }
}

// Load questions for assessment
async function loadQuestions(assessmentId) {
    try {
        showLoading(true);
        
        const { data: questions, error } = await supabase
            .from('questions')
            .select('*')
            .eq('assessment_id', assessmentId)
            .order('order_num', { ascending: true });
        
        if (error) throw error;
        
        adminQuestions = questions || [];
        renderQuestionsList();
        
    } catch (error) {
        console.error('❌ Error loading questions:', error);
        showToast('حدث خطأ في تحميل الأسئلة', 'error');
    } finally {
        showLoading(false);
    }
}

// Render questions list
function renderQuestionsList() {
    const container = document.getElementById('questionsList');
    
    if (adminQuestions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-400">
                <div class="text-4xl mb-2">❓</div>
                <p>لا توجد أسئلة في هذا الاختبار</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = adminQuestions.map((q, index) => `
        <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <p class="font-medium text-slate-200 mb-2">${index + 1}. ${q.question_text}</p>
                    <div class="flex flex-wrap gap-2 text-sm">
                        ${q.options.map((opt, i) => `
                            <span class="px-2 py-1 rounded ${i === q.correct_answer ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}">
                                ${String.fromCharCode(65 + i)}. ${opt}
                            </span>
                        `).join('')}
                    </div>
                </div>
                <div class="flex items-center gap-2 mr-4">
                    <button onclick="editQuestion('${q.id}')" class="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button onclick="deleteQuestion('${q.id}')" class="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Open question modal
function openQuestionModal(question = null) {
    const modal = document.getElementById('questionModal');
    const form = document.getElementById('questionForm');
    const title = document.getElementById('questionModalTitle');
    
    form.reset();
    currentQuestion = question;
    optionCount = 4;
    
    if (question) {
        title.textContent = 'تعديل سؤال';
        document.getElementById('questionId').value = question.id;
        document.getElementById('questionText').value = question.question_text;
        document.getElementById('questionExplanation').value = question.explanation || '';
        document.getElementById('questionActive').checked = question.is_active;
        optionCount = question.options.length;
        renderOptions(question.options, question.correct_answer);
    } else {
        title.textContent = 'سؤال جديد';
        document.getElementById('questionId').value = '';
        document.getElementById('questionActive').checked = true;
        renderOptions();
    }
    
    modal.classList.remove('hidden');
}

// Render options inputs
function renderOptions(options = null, correctAnswer = 0) {
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    
    for (let i = 0; i < optionCount; i++) {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-3';
        div.innerHTML = `
            <input type="radio" name="correctOption" value="${i}" ${i === correctAnswer ? 'checked' : ''} 
                class="w-5 h-5 text-emerald-500 focus:ring-emerald-500">
            <input type="text" name="option${i}" placeholder="الخيار ${String.fromCharCode(65 + i)}" 
                value="${options ? options[i] || '' : ''}"
                class="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                required>
        `;
        container.appendChild(div);
    }
}

// Add option
function addOption() {
    if (optionCount >= 6) {
        showToast('الحد الأقصى 6 خيارات', 'error');
        return;
    }
    optionCount++;
    renderOptions();
}

// Save question
async function saveQuestion() {
    try {
        showLoading(true);
        
        const id = document.getElementById('questionId').value;
        const options = [];
        
        for (let i = 0; i < optionCount; i++) {
            const value = document.querySelector(`[name="option${i}"]`).value.trim();
            if (value) options.push(value);
        }
        
        if (options.length < 2) {
            showToast('يجب إدخال خيارين على الأقل', 'error');
            return;
        }
        
        const correctAnswer = parseInt(document.querySelector('input[name="correctOption"]:checked')?.value || 0);
        
        const data = {
            assessment_id: currentAssessmentId,
            question_text: document.getElementById('questionText').value.trim(),
            options: options,
            correct_answer: correctAnswer,
            explanation: document.getElementById('questionExplanation').value.trim(),
            is_active: document.getElementById('questionActive').checked,
            order_num: id ? undefined : adminQuestions.length + 1
        };
        
        let error;
        
        if (id) {
            ({ error } = await supabase
                .from('questions')
                .update(data)
                .eq('id', id));
        } else {
            ({ error } = await supabase
                .from('questions')
                .insert(data));
        }
        
        if (error) throw error;
        
        // Update questions count
        await updateQuestionsCount(currentAssessmentId);
        
        closeAllModals();
        await loadQuestions(currentAssessmentId);
        await loadAdminAssessments();
        showToast(id ? 'تم تحديث السؤال بنجاح' : 'تم إنشاء السؤال بنجاح', 'success');
        
    } catch (error) {
        console.error('❌ Error saving question:', error);
        showToast('حدث خطأ في حفظ السؤال', 'error');
    } finally {
        showLoading(false);
    }
}

// Update questions count
async function updateQuestionsCount(assessmentId) {
    const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('assessment_id', assessmentId);
    
    await supabase
        .from('assessments')
        .update({ questions_count: count })
        .eq('id', assessmentId);
}

// Edit question
function editQuestion(id) {
    const question = adminQuestions.find(q => q.id === id);
    if (question) {
        openQuestionModal(question);
    }
}

// Delete question
async function deleteQuestion(id) {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    
    try {
        showLoading(true);
        
        const { error } = await supabase
            .from('questions')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        await updateQuestionsCount(currentAssessmentId);
        await loadQuestions(currentAssessmentId);
        await loadAdminAssessments();
        showToast('تم حذف السؤال بنجاح', 'success');
        
    } catch (error) {
        console.error('❌ Error deleting question:', error);
        showToast('حدث خطأ في حذف السؤال', 'error');
    } finally {
        showLoading(false);
    }
}

// Close all modals
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
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
