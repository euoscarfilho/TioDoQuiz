// --- ELEMENTOS GLOBAIS ---
export const appContainer = document.getElementById('app-container');
export const backgroundVideo = document.getElementById('background-video');
export const headerBackgroundVideo = document.getElementById('header-background-video');
export const userHeader = document.getElementById('user-header');
export const userInfoContainer = document.getElementById('user-info-container');
export const userLogo = document.getElementById('user-logo');
export const quizTitle = document.getElementById('quiz-title');
export const croppingCanvas = document.getElementById('cropping-canvas');
export const gameArea = document.getElementById('game-area');

// --- TELAS (MODAIS/OVERLAYS) ---
export const personalizationModal = document.getElementById('personalization-modal');
export const lobbyModal = document.getElementById('lobby-modal');
export const mainContent = document.getElementById('main-content');
export const finalizationModal = document.getElementById('finalization-modal');
export const preGameModal = document.getElementById('pre-game-modal');

// --- INPUTS DE PERSONALIZAÇÃO ---
export const themeInput = document.getElementById('quiz-theme-input');
export const questionCountInput = document.getElementById('question-count-input');
export const answerCountInput = document.getElementById('answer-count-input');
export const difficultyInput = document.getElementById('difficulty-input');
export const questionCountValue = document.getElementById('question-count-value');
export const answerCountValue = document.getElementById('answer-count-value');
export const recentThemesContainer = document.getElementById('recent-themes-container');

// --- BOTÕES DE GERAÇÃO DE CONTEÚDO ---
export const generateContentBtn = document.getElementById('generate-content-btn');
export const generationOutput = document.getElementById('generation-output');
export const generationSuccessMsg = document.getElementById('generation-success-msg');
export const downloadScriptBtn = document.getElementById('download-script-btn');

// --- BOTÕES DE NAVEGAÇÃO E JOGO ---
export const saveSettingsBtn = document.getElementById('save-settings-btn');
export const personalizeBtn = document.getElementById('personalize-btn');
export const startBtn = document.getElementById('start-btn');
export const recordBtn = document.getElementById('record-btn');
export const externalControls = document.getElementById('external-controls');
export const downloadContainer = document.getElementById('download-container');
// export const stopRecordBtn = document.getElementById('stop-record-btn'); // Removido


// --- ELEMENTOS DO QUIZ ---
export const quizContainer = document.getElementById('quiz-container');
export const loadingMessage = document.getElementById('loading-message');

// --- EFEITOS SONOROS (ELEMENTOS DE ÁUDIO) ---
export const soundTick = document.getElementById('sound-tick');
export const soundCorrect = document.getElementById('sound-correct');
// export const soundFinal = document.getElementById('sound-final'); // Removido, será dinâmico

// --- CONSTANTES DE PADRÃO ---
export const DEFAULT_LOGO_URL = './files/logo.png';
export const DEFAULT_VIDEO_URL = './files/BG.mp4';
export const DEFAULT_LOGO_SIZE = '200'; // px

// --- VARIÁVEIS DE ESTADO ---
export let downloadTimeoutId = null;

