// ============================================
// Supabase Client Configuration
// ============================================

// Supabase Configuration - Replace with your credentials
const SUPABASE_URL = 'https://cflphbcgbwggnsmphcry.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_I73mVkp6WGNcy0-OgTTJqw_yHljjWXQ';

// Initialize Supabase client
let supabase;

try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });
    console.log('✅ Supabase client initialized');
} catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    showToast('فشل الاتصال بقاعدة البيانات', 'error');
}

// ============================================
// Database Schema Setup (Run once in SQL Editor)
// ============================================
/*
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Assessments table
CREATE TABLE IF NOT EXISTS assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'phishing' CHECK (question_type IN ('phishing', 'safe', 'mixed')),
    options JSONB NOT NULL DEFAULT '[]',
    correct_option_index INTEGER NOT NULL DEFAULT 0,
    correct_explanation TEXT,
    wrong_explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test sessions table
CREATE TABLE IF NOT EXISTS test_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    total_questions INTEGER DEFAULT 0,
    total_correct INTEGER DEFAULT 0,
    total_wrong INTEGER DEFAULT 0,
    score_percent INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE
);

-- Test answers table
CREATE TABLE IF NOT EXISTS test_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES test_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    selected_option_index INTEGER NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view published assessments" 
    ON assessments FOR SELECT 
    USING (status = 'published' OR auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
    ));

CREATE POLICY "Admin can manage assessments" 
    ON assessments FOR ALL 
    TO authenticated 
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Public can view questions of published assessments" 
    ON questions FOR SELECT 
    USING (assessment_id IN (
        SELECT id FROM assessments WHERE status = 'published'
    ) OR auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
    ));

CREATE POLICY "Admin can manage questions" 
    ON questions FOR ALL 
    TO authenticated 
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Users can view own sessions" 
    ON test_sessions FOR SELECT 
    TO authenticated 
    USING (user_id = auth.uid() OR auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
    ));

CREATE POLICY "Users can create own sessions" 
    ON test_sessions FOR INSERT 
    TO authenticated 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own answers" 
    ON test_answers FOR SELECT 
    TO authenticated 
    USING (user_id = auth.uid() OR auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
    ));

CREATE POLICY "Users can create own answers" 
    ON test_answers FOR INSERT 
    TO authenticated 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public can view profiles" 
    ON profiles FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    TO authenticated 
    USING (id = auth.uid());

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
*/

// ============================================
// Utility Functions
// ============================================

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const iconMap = {
        success: '<svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
        error: '<svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
        info: '<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    
    document.getElementById('toastIcon').innerHTML = iconMap[type] || iconMap.info;
    document.getElementById('toastMessage').textContent = message;
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format number
function formatNumber(num) {
    return num?.toLocaleString('ar-SA') || '0';
}

// Export functions for global use
window.showToast = showToast;
window.formatDate = formatDate;
window.formatNumber = formatNumber;
