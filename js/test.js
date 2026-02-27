// ============================================
// Test/Quiz Functionality
// ============================================

let currentAssessment = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let testSession = null;
let timerInterval = null;
let timeRemaining = 0;
let testStarted = false;

// Initialize test page
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('test.html')) return;
    
    console.log('📋 Initializing test page...');
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'auth.html';
        return;
    }
    
    // Load assessment and start test
    const urlParams = new URLSearchParams(window.location.search);
    const assessmentId = urlParams.get('id');
    
    if (!assessmentId) {
        showToast('لم يتم تحديد الاختبار', 'error');
        setTimeout(() => window.location.href = '../index.html', 2000);
        return;
    }
    
    await loadAssessment(assessmentId);
    setupTestEventListeners();
});

// Load assessment details
async function loadAssessment(assessmentId) {
    try {
        showLoading(true);
        
        // Get assessment
        const { data: assessment, error: assessmentError } = await supabase
            .from('assessments')
            .select('*')
            .eq('id', assessmentId)
            .eq('status', 'published')
            .single();
        
        if (assessmentError || !assessment) {
            throw new Error('الاختبار غير موجود أو غير منشور');
        }
        
        currentAssessment = assessment;
        
        // Get questions
        const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('assessment_id', assessmentId)
            .eq('is_active', true)
            .order('order_num', { ascending: true });
        
        if (questionsError) throw questionsError;
        
        if (!questions || questions.length === 0) {
            throw new Error('لا توجد أسئلة في هذا الاختبار');
        }
        
        currentQuestions = questions;
        
        // Update UI
        document.getElementById('assessmentTitle').textContent = assessment.title;
        document.getElementById('totalQuestions').textContent = questions.length;
        document.getElementById('progressBar').style.width = '0%';
        
        // Show intro screen
        showScreen('introScreen');
        
    } catch (error) {
        console.error('❌ Error loading assessment:', error);
        showToast(error.message, 'error');
        setTimeout(() => window.location.href = '../index.html', 2000);
    } finally {
        showLoading(false);
    }
}

// Setup event listeners
function setupTestEventListeners() {
    // Start test button
    document.getElementById('startTestBtn')?.addEventListener('click', startTest);
    
    // Navigation buttons
    document.getElementById('nextBtn')?.addEventListener('click', nextQuestion);
    document.getElementById('prevBtn')?.addEventListener('click', prevQuestion);
    document.getElementById('submitBtn')?.addEventListener('click', submitTest);
    document.getElementById('finishReviewBtn')?.addEventListener('click', () => {
        window.location.href = 'my-results.html';
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!testStarted) return;
        
        if (e.key === 'ArrowRight') nextQuestion();
        if (e.key === 'ArrowLeft') prevQuestion();
        if (e.key >= '1' && e.key <= '4') {
            const optionIndex = parseInt(e.key) - 1;
            selectOption(optionIndex);
        }
    });
}

// Start the test
async function startTest() {
    try {
        showLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        // Create test session
        const { data: session, error } = await supabase
            .from('test_sessions')
            .insert({
                user_id: user.id,
                assessment_id: currentAssessment.id,
                started_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        
        testSession = session;
        testStarted = true;
        
        // Initialize timer
        timeRemaining = currentQuestions.length * 60; // 1 minute per question
        startTimer();
        
        // Show first question
        showScreen('questionScreen');
        renderQuestion();
        updateNavigation();
        
    } catch (error) {
        console.error('❌ Error starting test:', error);
        showToast('حدث خطأ في بدء الاختبار', 'error');
    } finally {
        showLoading(false);
    }
}

// Start countdown timer
function startTimer() {
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            submitTest();
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerEl = document.getElementById('timer');
    if (timerEl) {
        timerEl.textContent = display;
        
        // Warning colors
        if (timeRemaining <= 60) {
            timerEl.className = 'text-2xl font-bold text-red-500 animate-pulse';
        } else if (timeRemaining <= 180) {
            timerEl.className = 'text-2xl font-bold text-yellow-400';
        } else {
            timerEl.className = 'text-2xl font-bold text-emerald-400';
        }
    }
}

// Render current question
function renderQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    
    // Update progress
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('currentQuestion').textContent = currentQuestionIndex + 1;
    
    // Update question text
    document.getElementById('questionText').textContent = question.question_text;
    
    // Render options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const optionEl = document.createElement('div');
        optionEl.className = `option-card p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
            userAnswers[question.id] === index 
                ? 'border-emerald-500 bg-emerald-500/10' 
                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'
        }`;
        optionEl.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    userAnswers[question.id] === index 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-700 text-slate-400'
                }">
                    ${String.fromCharCode(65 + index)}
                </div>
                <span class="text-slate-200">${option}</span>
            </div>
        `;
        optionEl.addEventListener('click', () => selectOption(index));
        optionsContainer.appendChild(optionEl);
    });
    
    // Update question counter dots
    renderQuestionDots();
}

// Render question navigation dots
function renderQuestionDots() {
    const dotsContainer = document.getElementById('questionDots');
    if (!dotsContainer) return;
    
    dotsContainer.innerHTML = '';
    
    currentQuestions.forEach((q, index) => {
        const dot = document.createElement('button');
        const isAnswered = userAnswers[q.id] !== undefined;
        const isCurrent = index === currentQuestionIndex;
        
        dot.className = `w-3 h-3 rounded-full transition-all duration-200 ${
            isCurrent 
                ? 'bg-emerald-500 w-6' 
                : isAnswered 
                    ? 'bg-emerald-500/60' 
                    : 'bg-slate-600 hover:bg-slate-500'
        }`;
        dot.title = `سؤال ${index + 1}`;
        dot.addEventListener('click', () => goToQuestion(index));
        dotsContainer.appendChild(dot);
    });
}

// Select an option
function selectOption(optionIndex) {
    const question = currentQuestions[currentQuestionIndex];
    userAnswers[question.id] = optionIndex;
    renderQuestion();
    updateNavigation();
}

// Navigate to specific question
function goToQuestion(index) {
    if (index < 0 || index >= currentQuestions.length) return;
    currentQuestionIndex = index;
    renderQuestion();
    updateNavigation();
}

// Next question
function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
        updateNavigation();
    }
}

// Previous question
function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
        updateNavigation();
    }
}

// Update navigation buttons
function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentQuestionIndex === 0;
        prevBtn.classList.toggle('opacity-50', currentQuestionIndex === 0);
    }
    
    if (nextBtn) {
        const isLast = currentQuestionIndex === currentQuestions.length - 1;
        nextBtn.classList.toggle('hidden', isLast);
    }
    
    if (submitBtn) {
        const isLast = currentQuestionIndex === currentQuestions.length - 1;
        submitBtn.classList.toggle('hidden', !isLast);
    }
}

// Submit test
async function submitTest() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Check if all questions answered
    const answeredCount = Object.keys(userAnswers).length;
    const totalQuestions = currentQuestions.length;
    
    if (answeredCount < totalQuestions) {
        const confirmed = confirm(`لم تجب على ${totalQuestions - answeredCount} سؤال. هل تريد التسليم anyway؟`);
        if (!confirmed) return;
    }
    
    try {
        showLoading(true);
        
        // Calculate score
        let correctCount = 0;
        const answerRecords = [];
        
        currentQuestions.forEach(question => {
            const userAnswer = userAnswers[question.id];
            const isCorrect = userAnswer === question.correct_answer;
            
            if (isCorrect) correctCount++;
            
            answerRecords.push({
                session_id: testSession.id,
                question_id: question.id,
                selected_option: userAnswer !== undefined ? userAnswer : -1,
                is_correct: isCorrect
            });
        });
        
        const score = Math.round((correctCount / totalQuestions) * 100);
        const passed = score >= currentAssessment.passing_score;
        
        // Save answers
        const { error: answersError } = await supabase
            .from('test_answers')
            .insert(answerRecords);
        
        if (answersError) throw answersError;
        
        // Update session
        const { error: sessionError } = await supabase
            .from('test_sessions')
            .update({
                completed_at: new Date().toISOString(),
                score: score,
                passed: passed
            })
            .eq('id', testSession.id);
        
        if (sessionError) throw sessionError;
        
        // Show results
        showResults(score, correctCount, totalQuestions, passed);
        
    } catch (error) {
        console.error('❌ Error submitting test:', error);
        showToast('حدث خطأ في تسليم الاختبار', 'error');
    } finally {
        showLoading(false);
    }
}

// Show results screen
function showResults(score, correctCount, totalQuestions, passed) {
    showScreen('resultScreen');
    
    // Update score display
    const scoreCircle = document.getElementById('scoreCircle');
    const scoreValue = document.getElementById('scoreValue');
    const scoreMessage = document.getElementById('scoreMessage');
    const scoreDetails = document.getElementById('scoreDetails');
    
    // Animate score
    let currentScore = 0;
    const scoreInterval = setInterval(() => {
        currentScore += 2;
        if (currentScore >= score) {
            currentScore = score;
            clearInterval(scoreInterval);
        }
        scoreValue.textContent = currentScore;
        
        // Update circle color
        if (passed) {
            scoreCircle.className = 'w-40 h-40 rounded-full border-8 border-emerald-500 flex items-center justify-center mx-auto mb-6';
            scoreMessage.textContent = 'تهانينا! لقد نجحت 🎉';
            scoreMessage.className = 'text-2xl font-bold text-emerald-400 mb-2';
        } else {
            scoreCircle.className = 'w-40 h-40 rounded-full border-8 border-red-500 flex items-center justify-center mx-auto mb-6';
            scoreMessage.textContent = 'لم تنجح هذه المرة 😔';
            scoreMessage.className = 'text-2xl font-bold text-red-400 mb-2';
        }
    }, 30);
    
    scoreDetails.textContent = `أجبت بشكل صحيح على ${correctCount} من ${totalQuestions} سؤال`;
    
    // Render review
    renderReview();
}

// Render question review
function renderReview() {
    const reviewContainer = document.getElementById('reviewContainer');
    reviewContainer.innerHTML = '';
    
    currentQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[question.id];
        const isCorrect = userAnswer === question.correct_answer;
        const isSkipped = userAnswer === undefined;
        
        const reviewEl = document.createElement('div');
        reviewEl.className = 'bg-slate-800/50 rounded-xl p-4 border border-slate-700';
        
        let statusIcon = '';
        let statusClass = '';
        
        if (isSkipped) {
            statusIcon = '⏭️';
            statusClass = 'text-yellow-400';
        } else if (isCorrect) {
            statusIcon = '✅';
            statusClass = 'text-emerald-400';
        } else {
            statusIcon = '❌';
            statusClass = 'text-red-400';
        }
        
        reviewEl.innerHTML = `
            <div class="flex items-start gap-3">
                <span class="text-xl">${statusIcon}</span>
                <div class="flex-1">
                    <p class="font-medium text-slate-200 mb-2">${index + 1}. ${question.question_text}</p>
                    <div class="space-y-1 text-sm">
                        <p class="${statusClass}">
                            إجابتك: ${isSkipped ? 'تم التخطي' : question.options[userAnswer]}
                        </p>
                        ${!isCorrect ? `
                            <p class="text-emerald-400">
                                الإجابة الصحيحة: ${question.options[question.correct_answer]}
                            </p>
                        ` : ''}
                        ${question.explanation ? `
                            <p class="text-slate-400 mt-2 bg-slate-900/50 p-2 rounded">
                                💡 ${question.explanation}
                            </p>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        reviewContainer.appendChild(reviewEl);
    });
}

// Show specific screen
function showScreen(screenId) {
    ['introScreen', 'questionScreen', 'resultScreen'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.remove('hidden');
        screen.classList.add('fade-in');
    }
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
