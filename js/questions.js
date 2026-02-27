// ============================================
// Questions Module
// ============================================

let currentAssessmentId = null;
let optionCount = 4;

// ============================================
// Load Questions for Assessment
// ============================================

async function loadQuestions(assessmentId) {
    console.log('📋 Loading questions for assessment:', assessmentId);
    
    const container = document.getElementById('questionsList');
    if (!container) return;
    
    currentAssessmentId = assessmentId;
    
    try {
        const { data: questions, error } = await supabase
            .from('questions')
            .select('*')
            .eq('assessment_id', assessmentId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        container.innerHTML = '';
        
        // Add header with add button
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-4';
        header.innerHTML = `
            <h3 class="text-lg font-bold">الأسئلة (${questions?.length || 0})</h3>
            <button onclick="openQuestionModal()" 
                    class="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                إضافة سؤال
            </button>
        `;
        container.appendChild(header);
        
        if (!questions || questions.length === 0) {
            container.innerHTML += `
                <div class="text-center py-12 bg-slate-800/50 rounded-xl">
                    <p class="text-slate-400">لا توجد أسئلة في هذا القياس</p>
                    <p class="text-slate-500 text-sm mt-2">أضف سؤالاً للبدء</p>
                </div>
            `;
            return;
        }
        
        questions.forEach((question, index) => {
            const card = createQuestionCard(question, index + 1);
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('❌ Error loading questions:', error);
        showToast('حدث خطأ أثناء تحميل الأسئلة', 'error');
    }
}

// ============================================
// Create Question Card
// ============================================

function createQuestionCard(question, index) {
    const card = document.createElement('div');
    card.className = 'bg-slate-800/80 backdrop-blur-xl rounded-xl border border-slate-700 p-6';
    
    const options = question.options || [];
    const correctOption = options[question.correct_option_index];
    
    let optionsHtml = '';
    options.forEach((opt, i) => {
        const isCorrect = i === question.correct_option_index;
        optionsHtml += `
            <div class="flex items-center gap-2 ${isCorrect ? 'text-green-400' : 'text-slate-400'}">
                <span class="w-5 h-5 rounded-full border ${isCorrect ? 'border-green-400 bg-green-400/20' : 'border-slate-600'} flex items-center justify-center text-xs">
                    ${isCorrect ? '✓' : String.fromCharCode(65 + i)}
                </span>
                <span class="text-sm truncate">${opt}</span>
            </div>
        `;
    });
    
    const typeBadge = {
        'phishing': '<span class="badge badge-danger">تصيد</span>',
        'safe': '<span class="badge badge-success">آمن</span>',
        'mixed': '<span class="badge badge-info">مختلط</span>'
    }[question.question_type] || '<span class="badge badge-info">مختلط</span>';
    
    card.innerHTML = `
        <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
                <span class="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-sm font-bold">${index}</span>
                ${typeBadge}
            </div>
            <div class="flex gap-2">
                <button onclick="editQuestion('${question.id}')" class="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                </button>
                <button onclick="deleteQuestion('${question.id}')" class="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>
        <p class="text-slate-300 mb-4 line-clamp-3">${question.question_text}</p>
        <div class="grid grid-cols-2 gap-2">
            ${optionsHtml}
        </div>
    `;
    
    return card;
}

// ============================================
// Open Question Modal
// ============================================

function openQuestionModal(question = null) {
    const modal = document.getElementById('questionModal');
    if (!modal) return;
    
    // Reset form
    document.getElementById('questionForm').reset();
    optionCount = 4;
    renderOptions();
    
    // If editing, populate form
    if (question) {
        document.getElementById('questionText').value = question.question_text;
        document.getElementById('questionType').value = question.question_type;
        document.getElementById('correctExplanation').value = question.correct_explanation || '';
        document.getElementById('wrongExplanation').value = question.wrong_explanation || '';
        
        // Set options
        const options = question.options || [];
        optionCount = options.length;
        renderOptions(options, question.correct_option_index);
        
        // Store question ID for update
        modal.dataset.questionId = question.id;
    } else {
        delete modal.dataset.questionId;
    }
    
    modal.classList.remove('hidden');
}

// ============================================
// Close Question Modal
// ============================================

function closeQuestionModal() {
    const modal = document.getElementById('questionModal');
    if (modal) {
        modal.classList.add('hidden');
        delete modal.dataset.questionId;
    }
}

// ============================================
// Render Options
// ============================================

function renderOptions(options = [], correctIndex = 0) {
    const container = document.getElementById('optionsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 0; i < optionCount; i++) {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'flex items-center gap-2';
        
        const isCorrect = i === correctIndex;
        const optionValue = options[i] || '';
        
        optionDiv.innerHTML = `
            <input type="radio" name="correctOption" value="${i}" ${isCorrect ? 'checked' : ''}
                   class="w-4 h-4 text-cyan-500 bg-slate-900 border-slate-600 focus:ring-cyan-500">
            <input type="text" name="option${i}" value="${optionValue}" required
                   class="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                   placeholder="الخيار ${String.fromCharCode(65 + i)}">
        `;
        
        container.appendChild(optionDiv);
    }
}

// ============================================
// Add Option
// ============================================

function addOption() {
    if (optionCount >= 5) {
        showToast('الحد الأقصى 5 خيارات', 'warning');
        return;
    }
    optionCount++;
    
    // Save current values
    const currentOptions = [];
    for (let i = 0; i < optionCount - 1; i++) {
        const input = document.querySelector(`input[name="option${i}"]`);
        if (input) currentOptions.push(input.value);
    }
    
    const correctRadio = document.querySelector('input[name="correctOption"]:checked');
    const correctIndex = correctRadio ? parseInt(correctRadio.value) : 0;
    
    renderOptions(currentOptions, correctIndex);
}

// ============================================
// Save Question
// ============================================

async function saveQuestion(formData) {
    const modal = document.getElementById('questionModal');
    const questionId = modal?.dataset.questionId;
    
    // Collect options
    const options = [];
    for (let i = 0; i < optionCount; i++) {
        const input = document.querySelector(`input[name="option${i}"]`);
        if (input && input.value.trim()) {
            options.push(input.value.trim());
        }
    }
    
    if (options.length < 2) {
        throw new Error('يجب إضافة خيارين على الأقل');
    }
    
    // Get correct option
    const correctRadio = document.querySelector('input[name="correctOption"]:checked');
    const correctOptionIndex = correctRadio ? parseInt(correctRadio.value) : 0;
    
    const questionData = {
        assessment_id: currentAssessmentId,
        question_text: formData.get('questionText'),
        question_type: formData.get('questionType'),
        options: options,
        correct_option_index: correctOptionIndex,
        correct_explanation: formData.get('correctExplanation'),
        wrong_explanation: formData.get('wrongExplanation')
    };
    
    if (questionId) {
        // Update
        const { error } = await supabase
            .from('questions')
            .update(questionData)
            .eq('id', questionId);
        
        if (error) throw error;
        showToast('تم تحديث السؤال بنجاح!', 'success');
    } else {
        // Create
        const { error } = await supabase
            .from('questions')
            .insert([questionData]);
        
        if (error) throw error;
        showToast('تم إضافة السؤال بنجاح!', 'success');
    }
    
    closeQuestionModal();
    loadQuestions(currentAssessmentId);
}

// ============================================
// Edit Question
// ============================================

async function editQuestion(questionId) {
    const { data: question, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single();
    
    if (error) {
        showToast('حدث خطأ أثناء تحميل السؤال', 'error');
        return;
    }
    
    openQuestionModal(question);
}

// ============================================
// Delete Question
// ============================================

async function deleteQuestion(questionId) {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
        return;
    }
    
    const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);
    
    if (error) {
        showToast('حدث خطأ أثناء الحذف', 'error');
        return;
    }
    
    showToast('تم حذف السؤال بنجاح!', 'success');
    loadQuestions(currentAssessmentId);
}

// ============================================
// Select Assessment for Questions
// ============================================

function selectAssessmentForQuestions(assessmentId) {
    // Switch to questions tab
    document.getElementById('questionsTab').click();
    
    // Select in dropdown
    const select = document.getElementById('assessmentSelect');
    if (select) {
        select.value = assessmentId;
        loadQuestions(assessmentId);
    }
}

// ============================================
// Setup Question Form
// ============================================

function setupQuestionForm() {
    const form = document.getElementById('questionForm');
    const addOptionBtn = document.getElementById('addOptionBtn');
    
    if (addOptionBtn) {
        addOptionBtn.addEventListener('click', addOption);
    }
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            
            try {
                await saveQuestion(formData);
            } catch (error) {
                console.error('❌ Error saving question:', error);
                showToast(error.message || 'حدث خطأ أثناء حفظ السؤال', 'error');
            }
        });
    }
}

// ============================================
// Export
// ============================================

window.loadQuestions = loadQuestions;
window.openQuestionModal = openQuestionModal;
window.closeQuestionModal = closeQuestionModal;
window.editQuestion = editQuestion;
window.deleteQuestion = deleteQuestion;
window.selectAssessmentForQuestions = selectAssessmentForQuestions;
window.setupQuestionForm = setupQuestionForm;
