// ============================================
// Reports & Analytics Functionality
// ============================================

let reportData = {
    sessions: [],
    users: [],
    assessments: []
};

// Initialize reports page
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.location.pathname.includes('dashboard.html')) return;
    
    console.log('📈 Initializing reports dashboard...');
    
    // Check authentication and admin role
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'auth.html';
        return;
    }
    
    const isAdmin = await checkAdminRole();
    if (!isAdmin) {
        showToast('غير مصرح لك بالوصول إلى التقارير', 'error');
        window.location.href = '../index.html';
        return;
    }
    
    await loadReportData();
    setupReportsEventListeners();
});

// Check admin role
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

// Load report data
async function loadReportData() {
    try {
        showLoading(true);
        
        // Load all data in parallel
        const [sessionsRes, usersRes, assessmentsRes] = await Promise.all([
            supabase
                .from('test_sessions')
                .select(`
                    *,
                    assessments:assessment_id (title),
                    profiles:user_id (full_name, email)
                `)
                .not('completed_at', 'is', null)
                .order('completed_at', { ascending: false }),
            
            supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false }),
            
            supabase
                .from('assessments')
                .select('*')
                .order('created_at', { ascending: false })
        ]);
        
        if (sessionsRes.error) throw sessionsRes.error;
        if (usersRes.error) throw usersRes.error;
        if (assessmentsRes.error) throw assessmentsRes.error;
        
        reportData = {
            sessions: sessionsRes.data || [],
            users: usersRes.data || [],
            assessments: assessmentsRes.data || []
        };
        
        renderOverviewStats();
        renderCharts();
        renderRecentTests();
        renderTopPerformers();
        
    } catch (error) {
        console.error('❌ Error loading report data:', error);
        showToast('حدث خطأ في تحميل البيانات', 'error');
    } finally {
        showLoading(false);
    }
}

// Render overview statistics
function renderOverviewStats() {
    const totalUsers = reportData.users.length;
    const totalTests = reportData.sessions.length;
    const totalAssessments = reportData.assessments.length;
    
    const avgScore = totalTests > 0
        ? Math.round(reportData.sessions.reduce((sum, s) => sum + s.score, 0) / totalTests)
        : 0;
    
    const passRate = totalTests > 0
        ? Math.round((reportData.sessions.filter(s => s.passed).length / totalTests) * 100)
        : 0;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalTests').textContent = totalTests;
    document.getElementById('totalAssessments').textContent = totalAssessments;
    document.getElementById('avgScore').textContent = avgScore + '%';
    document.getElementById('passRate').textContent = passRate + '%';
}

// Render all charts
function renderCharts() {
    renderScoreDistributionChart();
    renderTestsOverTimeChart();
    renderAssessmentPerformanceChart();
    renderPassFailChart();
}

// Score distribution chart
function renderScoreDistributionChart() {
    const ctx = document.getElementById('scoreDistributionChart')?.getContext('2d');
    if (!ctx) return;
    
    const ranges = { '0-49': 0, '50-69': 0, '70-79': 0, '80-89': 0, '90-100': 0 };
    
    reportData.sessions.forEach(s => {
        if (s.score < 50) ranges['0-49']++;
        else if (s.score < 70) ranges['50-69']++;
        else if (s.score < 80) ranges['70-79']++;
        else if (s.score < 90) ranges['80-89']++;
        else ranges['90-100']++;
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(ranges),
            datasets: [{
                label: 'عدد الاختبارات',
                data: Object.values(ranges),
                backgroundColor: [
                    '#ef4444',
                    '#f97316',
                    '#fbbf24',
                    '#34d399',
                    '#10b981'
                ],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            }
        }
    });
}

// Tests over time chart
function renderTestsOverTimeChart() {
    const ctx = document.getElementById('testsOverTimeChart')?.getContext('2d');
    if (!ctx) return;
    
    // Group by date
    const dateMap = {};
    reportData.sessions.forEach(s => {
        const date = new Date(s.completed_at).toLocaleDateString('ar-SA');
        dateMap[date] = (dateMap[date] || 0) + 1;
    });
    
    // Sort dates
    const sortedDates = Object.keys(dateMap).sort((a, b) => 
        new Date(a) - new Date(b)
    );
    
    // Show last 30 days or all if less
    const recentDates = sortedDates.slice(-30);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: recentDates,
            datasets: [{
                label: 'عدد الاختبارات',
                data: recentDates.map(d => dateMap[d]),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            }
        }
    });
}

// Assessment performance chart
function renderAssessmentPerformanceChart() {
    const ctx = document.getElementById('assessmentPerformanceChart')?.getContext('2d');
    if (!ctx) return;
    
    // Calculate average score per assessment
    const assessmentScores = {};
    const assessmentCounts = {};
    
    reportData.sessions.forEach(s => {
        const title = s.assessments?.title || 'غير معروف';
        assessmentScores[title] = (assessmentScores[title] || 0) + s.score;
        assessmentCounts[title] = (assessmentCounts[title] || 0) + 1;
    });
    
    const labels = Object.keys(assessmentScores);
    const averages = labels.map(l => Math.round(assessmentScores[l] / assessmentCounts[l]));
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'متوسط الدرجة',
                data: averages,
                backgroundColor: '#8b5cf6',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                },
                y: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            }
        }
    });
}

// Pass/Fail chart
function renderPassFailChart() {
    const ctx = document.getElementById('passFailChart')?.getContext('2d');
    if (!ctx) return;
    
    const passed = reportData.sessions.filter(s => s.passed).length;
    const failed = reportData.sessions.filter(s => !s.passed).length;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['ناجح', 'راسب'],
            datasets: [{
                data: [passed, failed],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Cairo' },
                        padding: 20
                    }
                }
            }
        }
    });
}

// Render recent tests table
function renderRecentTests() {
    const tbody = document.getElementById('recentTestsTable');
    if (!tbody) return;
    
    const recentTests = reportData.sessions.slice(0, 10);
    
    if (recentTests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400">لا توجد اختبارات</td></tr>';
        return;
    }
    
    tbody.innerHTML = recentTests.map(test => {
        const date = new Date(test.completed_at).toLocaleDateString('ar-SA');
        const name = test.profiles?.full_name || test.profiles?.email || 'غير معروف';
        
        return `
            <tr class="border-b border-slate-700">
                <td class="py-3">${name}</td>
                <td class="py-3">${test.assessments?.title || 'غير معروف'}</td>
                <td class="py-3">
                    <span class="px-2 py-1 rounded text-xs ${test.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}">
                        ${test.score}%
                    </span>
                </td>
                <td class="py-3">
                    <span class="px-2 py-1 rounded text-xs ${test.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}">
                        ${test.passed ? '✅ ناجح' : '❌ راسب'}
                    </span>
                </td>
                <td class="py-3 text-slate-400">${date}</td>
            </tr>
        `;
    }).join('');
}

// Render top performers
function renderTopPerformers() {
    const container = document.getElementById('topPerformersList');
    if (!container) return;
    
    // Get best score per user
    const userBestScores = {};
    reportData.sessions.forEach(s => {
        const userId = s.user_id;
        if (!userBestScores[userId] || s.score > userBestScores[userId].score) {
            userBestScores[userId] = s;
        }
    });
    
    const topPerformers = Object.values(userBestScores)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    
    if (topPerformers.length === 0) {
        container.innerHTML = '<p class="text-center text-slate-400 py-4">لا توجد بيانات</p>';
        return;
    }
    
    container.innerHTML = topPerformers.map((p, index) => {
        const name = p.profiles?.full_name || p.profiles?.email || 'غير معروف';
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        
        return `
            <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">${medals[index]}</span>
                    <div>
                        <p class="font-medium text-slate-200">${name}</p>
                        <p class="text-xs text-slate-400">${p.assessments?.title || ''}</p>
                    </div>
                </div>
                <span class="text-xl font-bold text-emerald-400">${p.score}%</span>
            </div>
        `;
    }).join('');
}

// Setup event listeners
function setupReportsEventListeners() {
    // Export buttons
    document.getElementById('exportExcelBtn')?.addEventListener('click', exportToExcel);
    document.getElementById('exportPdfBtn')?.addEventListener('click', exportToPDF);
    
    // Date filter
    document.getElementById('dateFilter')?.addEventListener('change', filterByDate);
    
    // Assessment filter
    document.getElementById('assessmentFilter')?.addEventListener('change', filterByAssessment);
}

// Filter by date
function filterByDate(e) {
    const days = parseInt(e.target.value);
    if (!days) {
        renderRecentTests();
        return;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filtered = reportData.sessions.filter(s => 
        new Date(s.completed_at) >= cutoffDate
    );
    
    renderFilteredTests(filtered);
}

// Filter by assessment
function filterByAssessment(e) {
    const assessmentId = e.target.value;
    if (!assessmentId) {
        renderRecentTests();
        return;
    }
    
    const filtered = reportData.sessions.filter(s => 
        s.assessment_id === assessmentId
    );
    
    renderFilteredTests(filtered);
}

// Render filtered tests
function renderFilteredTests(tests) {
    const tbody = document.getElementById('recentTestsTable');
    
    if (tests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-400">لا توجد نتائج</td></tr>';
        return;
    }
    
    tbody.innerHTML = tests.map(test => {
        const date = new Date(test.completed_at).toLocaleDateString('ar-SA');
        const name = test.profiles?.full_name || test.profiles?.email || 'غير معروف';
        
        return `
            <tr class="border-b border-slate-700">
                <td class="py-3">${name}</td>
                <td class="py-3">${test.assessments?.title || 'غير معروف'}</td>
                <td class="py-3">
                    <span class="px-2 py-1 rounded text-xs ${test.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}">
                        ${test.score}%
                    </span>
                </td>
                <td class="py-3">
                    <span class="px-2 py-1 rounded text-xs ${test.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}">
                        ${test.passed ? '✅ ناجح' : '❌ راسب'}
                    </span>
                </td>
                <td class="py-3 text-slate-400">${date}</td>
            </tr>
        `;
    }).join('');
}

// Export to Excel
function exportToExcel() {
    try {
        const data = reportData.sessions.map(s => ({
            'التاريخ': new Date(s.completed_at).toLocaleDateString('ar-SA'),
            'المستخدم': s.profiles?.full_name || s.profiles?.email || 'غير معروف',
            'الاختبار': s.assessments?.title || 'غير معروف',
            'الدرجة': s.score + '%',
            'النتيجة': s.passed ? 'ناجح' : 'راسب',
            'الوقت': new Date(s.completed_at).toLocaleTimeString('ar-SA')
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'التقارير');
        
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `تقارير_الاختبارات_${date}.xlsx`);
        
        showToast('تم تصدير التقرير بنجاح', 'success');
        
    } catch (error) {
        console.error('❌ Error exporting to Excel:', error);
        showToast('حدث خطأ في تصدير التقرير', 'error');
    }
}

// Export to PDF
function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Title
        doc.setFontSize(20);
        doc.text('تقرير الاختبارات', 105, 20, { align: 'center' });
        
        // Date
        doc.setFontSize(12);
        doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}`, 105, 30, { align: 'center' });
        
        // Summary
        doc.setFontSize(14);
        doc.text('ملخص', 20, 45);
        doc.setFontSize(11);
        doc.text(`إجمالي الاختبارات: ${reportData.sessions.length}`, 20, 55);
        doc.text(`إجمالي المستخدمين: ${reportData.users.length}`, 20, 62);
        doc.text(`متوسط الدرجات: ${document.getElementById('avgScore').textContent}`, 20, 69);
        doc.text(`نسبة النجاح: ${document.getElementById('passRate').textContent}`, 20, 76);
        
        // Table header
        doc.setFontSize(12);
        doc.text('أحدث الاختبارات:', 20, 90);
        
        let y = 100;
        doc.setFontSize(9);
        
        // Headers
        doc.setFillColor(59, 130, 246);
        doc.rect(20, y - 5, 170, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('المستخدم', 25, y);
        doc.text('الاختبار', 80, y);
        doc.text('الدرجة', 130, y);
        doc.text('النتيجة', 155, y);
        doc.text('التاريخ', 180, y);
        
        y += 8;
        doc.setTextColor(0, 0, 0);
        
        // Data rows
        reportData.sessions.slice(0, 20).forEach((s, i) => {
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            
            const name = (s.profiles?.full_name || s.profiles?.email || 'غير معروف').substring(0, 20);
            const assessment = (s.assessments?.title || 'غير معروف').substring(0, 15);
            const date = new Date(s.completed_at).toLocaleDateString('ar-SA');
            
            if (i % 2 === 0) {
                doc.setFillColor(243, 244, 246);
                doc.rect(20, y - 4, 170, 6, 'F');
            }
            
            doc.text(name, 25, y);
            doc.text(assessment, 80, y);
            doc.text(s.score + '%', 130, y);
            doc.text(s.passed ? 'ناجح' : 'راسب', 155, y);
            doc.text(date, 180, y);
            
            y += 6;
        });
        
        const date = new Date().toISOString().split('T')[0];
        doc.save(`تقرير_الاختبارات_${date}.pdf`);
        
        showToast('تم تصدير التقرير بنجاح', 'success');
        
    } catch (error) {
        console.error('❌ Error exporting to PDF:', error);
        showToast('حدث خطأ في تصدير التقرير', 'error');
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
