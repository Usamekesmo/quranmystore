// =============================================================
// ==      وحدة الاتصالات (API) - نسخة مستقرة ومُصححة        ==
// =============================================================

import { supabase } from './config.js';

const QURAN_API_BASE_URL = "https://api.alquran.cloud/v1";

// --- 1. دوال المصادقة (Authentication ) ---
export async function signUpUser(email, password, username) {
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
        return { data, error: null };
    }
    if (error && error.message.includes("Invalid login credentials")) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username: username } }
        });
        return { data: signUpData, error: signUpError };
    }
    return { data, error };
}

// --- 2. دوال جلب البيانات (Read Operations) ---
export async function fetchPlayer() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from('players').select('*').eq('id', user.id).single();
    if (error) {
        console.error("خطأ في جلب بيانات اللاعب:", error);
        return null;
    }
    return data;
}

export async function fetchStoreConfig() {
    const { data, error } = await supabase.from('store_config').select('*').order('sort_order', { ascending: true });
    if (error) console.error(`خطأ في جلب جدول store_config:`, error);
    return data || [];
}

export async function fetchQuestionsConfig() {
    const { data, error } = await supabase.from('questions_config').select('*');
    if (error || !data || data.length === 0) {
        return [
            { id: 'generateChooseNextQuestion', level_required: 1 },
            { id: 'generateLocateAyahQuestion', level_required: 1 },
        ];
    }
    return data;
}

export async function fetchProgressionConfig() {
    const { data, error } = await supabase.from('progression_config').select('settings').eq('id', 1).single();
    if (error) {
        console.error("خطأ في جلب إعدادات التقدم:", error);
        return null;
    }
    return data ? data.settings : null;
}

export async function fetchLeaderboard() {
    const { data, error } = await supabase.from('players').select('username, xp').order('xp', { ascending: false }).limit(10);
    if (error) {
        console.error("خطأ في جلب لوحة الصدارة:", error);
        return [];
    }
    return data || [];
}

export async function fetchPageData(pageNumber) {
    try {
        const response = await fetch(`${QURAN_API_BASE_URL}/page/${pageNumber}/quran-uthmani`);
        if (!response.ok) throw new Error('فشل استجابة الشبكة.');
        const data = await response.json();
        return data.data.ayahs;
    } catch (error) {
        console.error("Error fetching page data:", error);
        alert('لا يمكن الوصول إلى خادم القرآن. تحقق من اتصالك بالإنترنت.');
        return null;
    }
}

// --- 3. دوال حفظ البيانات (Write Operations) ---
export async function savePlayer(playerData) {
    const { id, ...updatableData } = playerData;
    if (!id) {
        console.error("خطأ فادح: محاولة تحديث لاعب بدون ID.");
        return;
    }
    const { error } = await supabase.from('players').update(updatableData).eq('id', id);
    if (error) {
        console.error("خطأ في حفظ بيانات اللاعب:", error);
    } else {
        console.log("تم حفظ بيانات اللاعب بنجاح في قاعدة البيانات.");
    }
}

export async function saveResult(resultData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const dataToSave = {
        user_id: user.id,
        page_number: resultData.pageNumber,
        score: resultData.score,
        total_questions: resultData.totalQuestions,
        xp_earned: resultData.xpEarned,
        errors: resultData.errorLog
    };
    const { error } = await supabase.from('quiz_results').insert([dataToSave]);
    if (error) console.error("خطأ في حفظ نتيجة الاختبار:", error);
}
