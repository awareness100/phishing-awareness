// ============================================
// Assessments Module
// ============================================

// ============================================
// Load Assessments (Public)
// ============================================

async function loadAssessments() {
    console.log('📋 Loading assessments...');
    
    const container = document.getElementById('assessmentsGrid');
    if (!container) return;
    
    try {
        const { data: assessments, error } = await supabase
            .from('assessments')
            .select('*')
            .eq('status', 'published')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Get question counts
        const { data: questionCounts, error: countError } = await supabase
            .from('questions')
            .select('assessment_id, count')
            .group('assessment_id');
        
        if (countError) console.warn('Could not load question counts:', countError);
        
        // Create count map
        const countMap = {};
        if (questionCounts) {
            questionCounts.forEach(q => {
                countMap[q.assessment_id] = q.count;
            });
        }
        
        // Clear container
        container.innerHTML = '';
        
        if (!assessments || assessments.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                    </div>
                    <p class="text-slate-400">لا توجد قياسات متاحة حالياً</p>
                </div>
            `;
            return;
        }
        
        // Render assessments
        assessments.forEach(assessment => {
            const questionCount = countMap[assessment.id] || 0;
            const card = createAssessmentCard(assessment, questionCount);
            container.appendChild(card);
        });
        
        // Update stats
        updateStats(assessments.length);
        
    } catch (error) {
        console.error('❌ Error loading assessments:', error);
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-red-400">
                حدث خطأ أثناء تحميل القياسات
            </div>
        `;
    }
}

// ============================================
// Create Assessment Card
// ============================================

function createAssessmentCard(assessment, questionCount) {
    const card = document.createElement('div');
    card.className = 'bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700 p-6 hover:border-cyan-500/50 transition-all duration-300 group';
    
    card.innerHTML = `
        <div class="flex items-start justify-between mb-4">
            <div class="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <span class="text-sm text-slate-500">${assessment.year}</span>
        </div>
        <h3 class="text-xl font-bold mb-2 group-hover:text-cyan-400 transition">${assessment.title}</h3>
        <p class="text-slate-400 text-sm mb-4 line-clamp-2">${assessment.description || 'لا يوجد وصف'}</p>
        <div class="flex items-center justify-between">
            <span class="text-sm text-slate-500">${questionCount} سؤال</span>
            <a href="/pages/test.html?assessment=${assessment.id}" 
               class="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition">
                بدء القياس
            </a>
        </div>
    `;
    
    return card;
}

// ============================================
// Update Stats
// ============================================

async function updateStats(assessmentCount) {
    try {
        // Get total participants
        const { count: participantsCount, error: pError } = await supabase
            .from('test_sessions')
            .select('*', { count: 'exact', head: true });
        
        // Get total questions
        const { count: questionsCount, error: qError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true });
        
        // Get average score
        const { data: sessions, error: sError } = await supabase
            .from('test_sessions')
            .select('score_percent');
        
        let avgScore = 0;
        if (sessions && sessions.length > 0) {
            avgScore = Math.round(
                sessions.reduce((sum, s) => sum + (s.score_percent || 0), 0) / sessions.length
            );
        }
        
        // Update DOM
        const totalAssessments = document.getElementById('totalAssessments');
        const totalParticipants = document.getElementById('totalParticipants');
        const totalQuestions = document.getElementById('totalQuestions');
        const avgScoreEl = document.getElementById('avgScore');
        
        if (totalAssessments) totalAssessments.textContent = assessmentCount || 0;
        if (totalParticipants) totalParticipants.textContent = participantsCount || 0;
        if (totalQuestions) totalQuestions.textContent = questionsCount || 0;
        if (avgScoreEl) avgScoreEl.textContent = avgScore + '%';
        
    } catch (error) {
        console.error('❌ Error updating stats:', error);
    }
}

// ============================================
// Admin: Load All Assessments
// ============================================

async function loadAdminAssessments() {
    console.log('📋 Loading admin assessments...');
    
    const container = document.getElementById('assessmentsList');
    if (!container) return;
    
    try {
        const { data: assessments, error } = await supabase
            .from('assessments')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Get question counts
        const { data: questions, error: qError } = await supabase
            .from('questions')
            .select('assessment_id');
        
        const countMap = {};
        if (questions) {
            questions.forEach(q => {
                countMap[q.assessment_id] = (countMap[q.assessment_id] || 0) + 1;
            });
        }
        
        container.innerHTML = '';
        
        if (!assessments || assessments.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <p class="text-slate-400">لا توجد قياسات</p>
                    <p class="text-slate-500 text-sm mt-2">أضف قياساً جديداً للبدء</p>
                </div>
            `;
            return;
        }
        
        assessments.forEach(assessment => {
            const card = createAdminAssessmentCard(assessment, countMap[assessment.id] || 0);
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('❌ Error loading admin assessments:', error);
        showToast('حدث خطأ أثناء تحميل القياسات', 'error');
    }
}

// ============================================
// Create Admin Assessment Card
// ============================================

function createAdminAssessmentCard(assessment, questionCount) {
    const card = document.createElement('div');
    card.className = 'bg-slate-800/80 backdrop-blur-xl rounded-xl border border-slate-700 p-6';
    
    const statusBadge = assessment.status === 'published' 
        ? '<span class="badge badge-success">منشور</span>'
        : '<span class="badge badge-warning">مسودة</span>';
    
    card.innerHTML = `
        <div class="flex items-start justify-between mb-4">
            <div>
                <h3 class="text-lg font-bold mb-1">${assessment.title}</h3>
                <p class="text-slate-400 text-sm">${assessment.description || 'لا يوجد وصف'}</p>
            </div>
            ${statusBadge}
        </div>
        <div class="flex items-center gap-4 text-sm text-slate-500 mb-4">
            <span>${assessment.year}</span>
            <span>•</span>
            <span>${questionCount} سؤال</span>
        </div>
        <div class="flex gap-2">
            <button onclick="selectAssessmentForQuestions('${assessment.id}')" 
                    class="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm transition">
                إدارة الأسئلة
            </button>
            <button onclick="editAssessment('${assessment.id}')" 
                    class="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
            </button>
            <button onclick="deleteAssessment('${assessment.id}')" 
                    class="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
            </button>
        </div>
    `;
    
    return card;
}

// ============================================
// Create Assessment
// ============================================

async function createAssessment(assessmentData) {
    console.log('➕ Creating assessment:', assessmentData);
    
    const { data, error } = await supabase
        .from('assessments')
        .insert([assessmentData])
        .select()
        .single();
    
    if (error) {
        console.error('❌ Error creating assessment:', error);
        throw error;
    }
    
    showToast('تم إنشاء القياس بنجاح!', 'success');
    return data;
}

// ============================================
// Update Assessment
// ============================================

async function updateAssessment(id, updates) {
    console.log('✏️ Updating assessment:', id, updates);
    
    const { data, error } = await supabase
        .from('assessments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('❌ Error updating assessment:', error);
        throw error;
    }
    
    showToast('تم تحديث القياس بنجاح!', 'success');
    return data;
}

// ============================================
// Delete Assessment
// ============================================

async function deleteAssessment(id) {
    if (!confirm('هل أنت متأكد من حذف هذا القياس؟ سيتم حذف جميع الأسئلة والنتائج المرتبطة به.')) {
        return;
    }
    
    console.log('🗑️ Deleting assessment:', id);
    
    const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('❌ Error deleting assessment:', error);
        showToast('حدث خطأ أثناء الحذف', 'error');
        return;
    }
    
    showToast('تم حذف القياس بنجاح!', 'success');
    loadAdminAssessments();
}

// ============================================
// Export
// ============================================

window.loadAssessments = loadAssessments;
window.loadAdminAssessments = loadAdminAssessments;
window.createAssessment = createAssessment;
window.updateAssessment = updateAssessment;
window.deleteAssessment = deleteAssessment;
