// =============================================================
// ==      وحدة إدارة بيانات اللاعب (مع Supabase) (النسخة المستقرة) ==
// =============================================================

import { fetchPlayer as fetchPlayerFromApi, savePlayer as savePlayerToApi } from './api.js';
import * as achievements from './achievements.js';

export let playerData = {};

const delay = ms => new Promise(res => setTimeout(res, ms));

export async function loadPlayer() {
    let fetchedData = null;
    for (let i = 0; i < 5; i++) {
        fetchedData = await fetchPlayerFromApi();
        if (fetchedData) break;
        await delay(500);
    }

    if (!fetchedData) {
        console.error("فشل تحميل بيانات اللاعب بعد عدة محاولات.");
        return false;
    }

    playerData = { ...fetchedData };
    console.log(`تم تحميل بيانات اللاعب: ${playerData.username}`);
    achievements.checkAchievements('login');
    return true;
}

export async function savePlayer() {
    if (!playerData || !playerData.id) {
        console.error("لا يمكن حفظ بيانات لاعب غير صالحة.");
        return;
    }
    // نقوم بإنشاء نسخة نظيفة من البيانات التي سيتم حفظها
    const dataToSave = {
        id: playerData.id,
        username: playerData.username,
        xp: playerData.xp,
        diamonds: playerData.diamonds,
        inventory: playerData.inventory,
        achievements: playerData.achievements,
        total_quizzes_completed: playerData.total_quizzes_completed,
    };
    await savePlayerToApi(dataToSave);
}
