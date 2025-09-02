// =============================================================
// ==      الملف الرئيسي (main.js) - النسخة المستقرة        ==
// =============================================================

import * as ui from './ui.js';
import * as api from './api.js';
import * as quiz from './quiz.js';
import * as player from './player.js';
import * as progression from './progression.js';
import * as store from './store.js';
import * as achievements from './achievements.js';

const FREE_PAGES = [1, 2, 602, 603, 604];

async function initialize() {
    await progression.initializeProgression();
    await quiz.initializeQuiz();
    await achievements.initializeAchievements();
    setupEventListeners();
    ui.showScreen(ui.startScreen);
}

function setupEventListeners() {
    ui.startButton.addEventListener('click', handleAuthentication);
    ui.startTestButton.addEventListener('click', onStartPageTestClick);
    ui.reloadButton.addEventListener('click', returnToMainMenu);
    ui.showFinalResultButton.addEventListener('click', () => {
        const quizState = quiz.getCurrentState();
        const oldXp = player.playerData.xp - quizState.xpEarned;
        const levelUpInfo = progression.checkForLevelUp(oldXp, player.playerData.xp);
        ui.displayFinalResult(quizState, levelUpInfo);
    });
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            ui.showTab(tabId);
            if (tabId === 'leaderboard-tab' && !button.dataset.loaded) {
                onLeaderboardTabClick();
                button.dataset.loaded = 'true';
            }
        });
    });
}

async function returnToMainMenu() {
    const levelInfo = progression.getLevelInfo(player.playerData.xp);
    ui.updatePlayerHeader(player.playerData, levelInfo);
    updateAvailablePages();
    const maxQuestions = progression.getMaxQuestionsForLevel(levelInfo.level);
    ui.updateQuestionsCountOptions(maxQuestions);
    const storeItems = await api.fetchStoreConfig();
    if (storeItems) {
        store.renderStoreItems(storeItems, player.playerData);
    }
    ui.showScreen(ui.mainInterface);
}

async function handleAuthentication() {
    const userName = ui.userNameInput.value.trim();
    if (!userName) return alert("يرجى إدخال اسمك للمتابعة.");
    ui.toggleLoader(true);
    const encodedUsername = btoa(unescape(encodeURIComponent(userName)));
    const safeEncodedUsername = encodedUsername.replace(/=/g, '').replace(/[^a-zA-Z0-9]/g, '');
    const email = `${safeEncodedUsername}@quran-quiz.app`;
    const password = `QURAN_QUIZ_#_${safeEncodedUsername}`;
    const { error } = await api.signUpUser(email, password, userName);
    if (error) {
        ui.toggleLoader(false);
        return alert(`حدث خطأ: ${error.message}`);
    }
    await postLoginSetup();
    ui.toggleLoader(false);
    ui.showScreen(ui.mainInterface);
}

async function postLoginSetup() {
    const playerLoaded = await player.loadPlayer();
    if (!playerLoaded) return alert("فشل تحميل بيانات اللاعب.");
    const levelInfo = progression.getLevelInfo(player.playerData.xp);
    ui.updatePlayerHeader(player.playerData, levelInfo);
    updateAvailablePages();
    ui.populateQariSelect(ui.qariSelect, player.playerData.inventory);
    const maxQuestions = progression.getMaxQuestionsForLevel(levelInfo.level);
    ui.updateQuestionsCountOptions(maxQuestions);
    const storeItems = await api.fetchStoreConfig();
    if (storeItems) {
        store.renderStoreItems(storeItems, player.playerData);
    }
}

export function updateAvailablePages() {
    const purchasedPages = (player.playerData.inventory || [])
        .filter(id => id.startsWith('page_'))
        .map(id => parseInt(id.replace('page_', ''), 10));
    const availablePages = [...new Set([...FREE_PAGES, ...purchasedPages])].sort((a, b) => a - b);
    ui.populateSelect(ui.pageSelect, availablePages, 'الصفحة');
}

function onStartPageTestClick() {
    const selectedPage = ui.pageSelect.value;
    if (!selectedPage) return alert("يرجى اختيار صفحة.");
    startTestWithSettings({
        pageNumbers: [parseInt(selectedPage, 10)],
        qari: ui.qariSelect.value,
        questionsCount: parseInt(ui.questionsCountSelect.value, 10),
        testName: `الصفحة ${selectedPage}`
    });
}

async function onLeaderboardTabClick() {
    ui.leaderboardList.innerHTML = '<p>جاري تحميل البيانات...</p>';
    const leaderboardData = await api.fetchLeaderboard();
    if (leaderboardData && leaderboardData.length > 0) {
        ui.displayLeaderboard(leaderboardData);
    } else {
        ui.leaderboardList.innerHTML = '<p>لوحة الصدارة فارغة حاليًا.</p>';
    }
}

async function startTestWithSettings(settings) {
    ui.toggleLoader(true);
    const pageAyahs = await api.fetchPageData(settings.pageNumbers[0]);
    ui.toggleLoader(false);
    if (pageAyahs) {
        quiz.start({
            pageAyahs,
            selectedQari: settings.qari,
            totalQuestions: settings.questionsCount,
            userName: player.playerData.username,
            pageNumber: settings.pageNumbers[0]
        });
    }
}

initialize();
