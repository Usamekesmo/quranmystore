// =============================================================
// ==      وحدة إدارة ومنطق الاختبار (النسخة المستقرة) ==
// =============================================================

import * as ui from './ui.js';
import { saveResult } from './api.js';
import { fetchQuestionsConfig } from './api.js';
import { allQuestionGenerators } from './questions.js';
import * as player from './player.js';
import * as progression from './progression.js';
import * as achievements from './achievements.js';

let state = { /* ... */ };
let allActiveQuestions = [];
const shuffleArray = array => [...array].sort(() => 0.5 - Math.random());

export async function initializeQuiz() {
    const config = await fetchQuestionsConfig();
    if (config && config.length > 0) {
        allActiveQuestions = config.map(q => ({
            ...q,
            generator: allQuestionGenerators[q.id]
        })).filter(q => typeof q.generator === 'function');
    }
}

export function start(settings) {
    state = {
        ...state, ...settings, score: 0, currentQuestionIndex: 0, errorLog: [], xpEarned: 0
    };
    ui.showScreen(ui.quizScreen);
    displayNextQuestion();
}

function displayNextQuestion() {
    if (state.currentQuestionIndex >= state.totalQuestions) {
        endQuiz();
        return;
    }
    state.currentQuestionIndex++;
    ui.updateProgress(state.currentQuestionIndex, state.totalQuestions);
    const playerLevel = progression.getLevelInfo(player.playerData.xp).level;
    const availableQuestions = allActiveQuestions.filter(q => playerLevel >= q.level_required);
    if (availableQuestions.length === 0) {
        alert("لا توجد أسئلة متاحة لمستواك.");
        return;
    }
    const randomGenerator = shuffleArray(availableQuestions)[0].generator;
    const question = randomGenerator(state.pageAyahs, state.selectedQari, handleResult);
    if (question) {
        ui.questionArea.innerHTML = question.questionHTML;
        question.setupListeners(ui.questionArea);
    } else {
        displayNextQuestion();
    }
}

function handleResult(isCorrect, correctAnswerText, clickedElement) {
    ui.disableQuestionInteraction();
    const rules = progression.getGameRules();
    if (isCorrect) {
        state.score++;
        state.xpEarned += rules.xp_per_correct_answer || 10;
        ui.markAnswer(clickedElement, true);
    } else {
        state.errorLog.push({ questionHTML: ui.questionArea.innerHTML, correctAnswer: correctAnswerText });
        ui.markAnswer(clickedElement, false);
    }
    ui.showFeedback(isCorrect, correctAnswerText);
    setTimeout(displayNextQuestion, 3000);
}

async function endQuiz() {
    const rules = progression.getGameRules();
    player.playerData.total_quizzes_completed = (player.playerData.total_quizzes_completed || 0) + 1;
    if (state.score === state.totalQuestions) {
        state.xpEarned += rules.xp_bonus_all_correct || 50;
    }
    const oldXp = player.playerData.xp;
    player.playerData.xp += state.xpEarned;
    const levelUpInfo = progression.checkForLevelUp(oldXp, player.playerData.xp);
    if (levelUpInfo) {
        player.playerData.diamonds += levelUpInfo.reward || 0;
    }
    achievements.checkAchievements('quiz_completed', { isPerfect: state.score === state.totalQuestions });

    // الإصلاح النهائي: الحفظ أولاً، ثم العرض
    await player.savePlayer();
    await saveResult(state);
    ui.updateSaveMessage(true);

    if (state.errorLog.length > 0) {
        ui.displayErrorReview(state.errorLog);
    } else {
        ui.displayFinalResult(state, levelUpInfo);
    }
}

export function getCurrentState() {
    return state;
}
