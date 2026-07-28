# 🌿 نظام إدارة الإجازات - HR Leave Management System

نظام متكامل لإدارة إجازات الموظفين مع QR Codes لكل إدارة، يعمل على GitHub Pages + Supabase.

## 📋 المميزات

- **QR Code لكل إدارة** — موظفين + مدير + HR
- **تسجيل الدخول** بالكود الوظيفي + الرقم السري
- **تقديم إجازة** — الموظف يقدم إجازته بسهولة
- **اعتماد المدير** — مدير الإدارة يقبل/يرفض إجازات إدارته
- **الموارد البشرية** — تحكم كامل في كل الطلبات
- **رصيد الإجازات** — يظهر تلقائياً
- **تصدير Excel** — تقارير جاهزة
- **لوحات تحكم** منفصلة لكل دور

## 🚀 طريقة التثبيت

### 1. إنشاء Supabase Project
1. ادخل على [supabase.com](https://supabase.com) وإنشئ مشروع جديد
2. افتح **SQL Editor**
3. اعمل **Copy** لمحتوى ملف `supabase-schema.sql`
4. **Paste** و **Run**

### 2. رفع بيانات الموظفين
1. في **SQL Editor**، افتح ملف `seed-data.sql`
2. **Run** — هيرفع كل الموظفين + الباسوردات

### 3. ضبط Supabase Keys
1. افتح `assets/supabase-client.js`
2. استبدل:
   - `YOUR-PROJECT` بـ Project URL
   - `your-anon-key-here` بـ anon public key
3. (من Supabase Dashboard → Settings → API)

### 4. رفع الملفات على GitHub Pages
1. اعمل **New Repository** على GitHub
2. ارفع كل الملفات (مجلد LEAVE-SYSTEM كله)
3. **Settings → Pages** →
   - Source: `main`
   - Folder: `/ (root)`
4. الرابط يبقى: `https://your-username.github.io/REPO-NAME/`

### 5. طباعة QR Codes
1. افتح `qr/index.html` من المتصفح
2. اطبع كل QR Code لحالته:
   - **👤 موظف + الإدارة** — علقها في كل إدارة
   - **👔 مدير + الإدارة** — في مكتب المدير
   - **👑 HR** — في مكتب الموارد البشرية

## 📱 طريقة الاستخدام

### الموظف
1. يمسح QR Code إدارته ← يفتح صفحة تسجيل الدخول
2. يدخل **الكود الوظيفي** و **الرقم السري**
3. يقدّم إجازته ويشوف الرصيد

### مدير الإدارة
1. يمسح QR Code المدير الخاص بإدارته
2. يدخل حسابه (لازم يكون مدير في النظام)
3. يشوف طلبات إدارته ويقبل/يرفض

### الموارد البشرية
1. تمسح QR Code HR
2. تدخل حساب HR
3. تشوف كل الطلبات لكل الإدارات وتصدر تقارير

## 🔐 الرقم السري الافتراضي
الرقم السري لكل موظف هو نفس الموجود في ملف Excel (عمود **رقم سرى**). لو عاوز تغيره، تقدر تعمل "تغيير كلمة المرور" من واجهة HR.

## 🗄️ هيكل الملفات
```
LEAVE-SYSTEM/
├── index.html              ← صفحة الهبوط (تقرأ QR)
├── employee-login.html     ← دخول الموظف
├── employee-form.html      ← تقديم إجازة
├── employee-status.html    ← إجازات الموظف
├── manager-dashboard.html  ← لوحة المدير
├── hr-dashboard.html       ← لوحة HR
├── supabase-schema.sql     ← هيكل قاعدة البيانات
├── seed-data.sql           ← بيانات الموظفين
├── employees.json          ← نسخة احتياطية JSON
├── assets/
│   ├── supabase-client.js  ← إعدادات Supabase
│   ├── auth.js             ← تسجيل الدخول
│   ├── leave-utils.js      ← دوال الإجازات
│   └── styles.css          ← التنسيق RTL
├── qr/
│   └── index.html          ← كل QR Codes للطباعة
└── scripts/
    └── generate-seed.py    ← توليد SQL من Excel
```
