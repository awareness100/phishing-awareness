# منصة فحص التصيد الاحتيالي - Phishing Awareness Platform

منصة متكاملة لقياس وتحسين الوعي الأمني لدى الموظفين حول مخاطر التصيد الاحتيالي (Phishing) والهندسة الاجتماعية.

## 📋 المتطلبات

- متصفح حديث (Chrome, Firefox, Edge)
- اتصال بالإنترنت
- حساب Supabase (مجاني)

## 🚀 خطوات التثبيت

### 1. إنشاء مشروع Supabase

1. اذهب إلى [https://supabase.com](https://supabase.com) وسجل حساب جديد
2. انقر على "New Project" وأنشئ مشروع جديد
3. اكتب اسم المشروع وكلمة المرور للقاعدة البيانات
4. انتظر حتى يكتمل إنشاء المشروع (2-3 دقائق)

### 2. إعداد قاعدة البيانات

1. في لوحة تحكم Supabase، اذهب إلى **SQL Editor**
2. انقر على **New Query**
3. انسخ والصق الكود التالي:

```sql
-- إنشاء جدول الملفات الشخصية
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الاختبارات
CREATE TABLE IF NOT EXISTS assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    passing_score INTEGER DEFAULT 70,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    questions_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الأسئلة
CREATE TABLE IF NOT EXISTS questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assessment_id UUID REFERENCES assessments ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options TEXT[] NOT NULL,
    correct_answer INTEGER NOT NULL,
    explanation TEXT,
    is_active BOOLEAN DEFAULT true,
    order_num INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول جلسات الاختبار
CREATE TABLE IF NOT EXISTS test_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    score INTEGER,
    passed BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول إجابات الاختبار
CREATE TABLE IF NOT EXISTS test_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES test_sessions ON DELETE CASCADE,
    question_id UUID REFERENCES questions ON DELETE CASCADE,
    selected_option INTEGER,
    is_correct BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للملفات الشخصية
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- سياسات RLS للاختبارات
CREATE POLICY "Anyone can view published assessments" ON assessments
    FOR SELECT USING (status = 'published');

CREATE POLICY "Admin can manage assessments" ON assessments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- سياسات RLS للأسئلة
CREATE POLICY "Anyone can view active questions" ON questions
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage questions" ON questions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- سياسات RLS لجلسات الاختبار
CREATE POLICY "Users can view own sessions" ON test_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON test_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON test_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all sessions" ON test_sessions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- سياسات RLS لإجابات الاختبار
CREATE POLICY "Users can view own answers" ON test_answers
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM test_sessions WHERE id = session_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can create own answers" ON test_answers
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM test_sessions WHERE id = session_id AND user_id = auth.uid())
    );

CREATE POLICY "Admin can view all answers" ON test_answers
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- دالة لإنشاء ملف شخصي عند تسجيل مستخدم جديد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger لتفعيل الدالة عند إنشاء مستخدم جديد
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- دالة لحساب المتوسط
CREATE OR REPLACE FUNCTION get_average_score()
RETURNS INTEGER AS $$
DECLARE
    avg_score INTEGER;
BEGIN
    SELECT ROUND(AVG(score)) INTO avg_score
    FROM test_sessions
    WHERE completed_at IS NOT NULL;
    RETURN COALESCE(avg_score, 0);
END;
$$ LANGUAGE plpgsql;
```

4. انقر على **Run** لتنفيذ الكود

### 3. الحصول على مفاتيح Supabase

1. اذهب إلى **Project Settings** (الإعدادات)
2. اختر **API** من القائمة الجانبية
3. انسخ القيم التالية:
   - **Project URL** (سيكون شيئاً مثل: `https://xxxxxx.supabase.co`)
   - **anon public** API Key

### 4. تعديل ملف الإعدادات

1. افتح ملف `js/supabaseClient.js`
2. استبدل القيم بالقيم الخاصة بك:

```javascript
const SUPABASE_URL = 'https://your-project-url.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 5. إنشاء حساب المسؤول (Admin)

1. في لوحة تحكم Supabase، اذهب إلى **Authentication** > **Users**
2. انقر على **Add User** > **Create New User**
3. أدخل البريد الإلكتروني وكلمة المرور
4. بعد إنشاء المستخدم، اذهب إلى **Table Editor** > **profiles**
5. ابحث عن المستخدم وغير قيمة `role` إلى `admin`

## 📁 هيكل المجلدات

```
phishing-awareness-v2/
├── index.html              # الصفحة الرئيسية
├── css/
│   └── styles.css          # أنماط CSS
├── js/
│   ├── supabaseClient.js   # إعداد Supabase
│   ├── main.js             # الملف الرئيسي
│   ├── auth.js             # مصادقة المستخدمين
│   ├── assessments.js      # إدارة الاختبارات
│   ├── questions.js        # إدارة الأسئلة
│   ├── test.js             # واجهة الاختبار
│   ├── results.js          # نتائج المستخدم
│   ├── admin.js            # لوحة تحكم المسؤول
│   └── reports.js          # التقارير والإحصائيات
├── pages/
│   ├── auth.html           # تسجيل الدخول/التسجيل
│   ├── test.html           # واجهة الاختبار
│   ├── my-results.html     # نتائجي
│   ├── admin.html          # لوحة تحكم المسؤول
│   └── dashboard.html      # تقارير المسؤول
└── README.md               # هذا الملف
```

## 🖥️ تشغيل المشروع محلياً

### الطريقة 1: فتح الملف مباشرة

1. افتح ملف `index.html` في المتصفح
2. يمكنك استخدام إضافة **Live Server** في VS Code لتشغيل خادم محلي

### الطريقة 2: استخدام Python

```bash
# انتقل إلى مجلد المشروع
cd phishing-awareness-v2

# تشغيل خادم Python
python -m http.server 8000

# افتح المتصفح واذهب إلى
http://localhost:8000
```

### الطريقة 3: استخدام Node.js

```bash
# تثبيت http-server
npm install -g http-server

# انتقل إلى مجلد المشروع
cd phishing-awareness-v2

# تشغيل الخادم
http-server -p 8000

# افتح المتصفح واذهب إلى
http://localhost:8000
```

## 👥 الصلاحيات

### المستخدم العادي (User)
- تسجيل الدخول والتسجيل
- عرض الاختبارات المنشورة
- إجراء الاختبارات
- مشاهدة نتائجه
- تعديل ملفه الشخصي

### المسؤول (Admin)
- جميع صلاحيات المستخدم العادي
- إنشاء وتحرير الاختبارات
- إدارة الأسئلة
- مشاهدة جميع النتائج
- تصدير التقارير (Excel/PDF)
- إدارة المستخدمين

## 📊 التقارير

يمكن للمسؤول تصدير التقارير بصيغ:
- **Excel** (.xlsx) - باستخدام مكتبة SheetJS
- **PDF** (.pdf) - باستخدام مكتبة jsPDF

## 🎨 التخصيص

### تغيير الألوان

افتح ملف `css/styles.css` وعدل متغيرات CSS:

```css
:root {
    --primary: #10b981;      /* اللون الأساسي */
    --secondary: #3b82f6;    /* اللون الثانوي */
    --danger: #ef4444;       /* لون الخطأ */
    --warning: #f59e0b;      /* لون التحذير */
}
```

### تغيير النصوص

جميع النصوص موجودة في ملفات HTML ويمكن تعديلها مباشرة.

## 🔧 استكشاف الأخطاء

### مشكلة: لا يمكن تسجيل الدخول

**الحل:**
1. تأكد من صحة مفاتيح Supabase في `supabaseClient.js`
2. تأكد من إنشاء المستخدم في قسم Authentication
3. تحقق من وجود المستخدم في جدول profiles

### مشكلة: لا تظهر الاختبارات

**الحل:**
1. تأكد من إنشاء اختبارات مع حالة "published"
2. تحقق من سياسات RLS في Supabase
3. افتح Console المتصفح (F12) وتحقق من الأخطاء

### مشكلة: لا يمكن إنشاء أسئلة

**الحل:**
1. تأكد من تسجيل الدخول كمسؤول
2. تحقق من أن role = 'admin' في جدول profiles
3. تأكد من اختيار اختبار قبل إضافة الأسئلة

## 📱 الدعم

للدعم الفني أو الاستفسارات:
- البريد: support@example.com
- واتساب: +966XXXXXXXX

## 📄 الترخيص

هذا المشروع مفتوح المصدر ومتاح للاستخدام الشخصي والتجاري.

## 🙏 الشكر

- [Supabase](https://supabase.com) - قاعدة البيانات والمصادقة
- [Tailwind CSS](https://tailwindcss.com) - إطار العمل CSS
- [Chart.js](https://chartjs.org) - الرسوم البيانية
- [jsPDF](https://parall.ax/products/jspdf) - تصدير PDF
- [SheetJS](https://sheetjs.com) - تصدير Excel

---

**تم التطوير بواسطة فريق الأمن السيبراني** 🔒
