// --- ELEMENTOS GLOBAIS ---
export let appContainer;
export let backgroundVideo;
export let headerBackgroundVideo;
export let userHeader;
export let userInfoContainer;
export let userLogo;
export let quizTitle;
export let croppingCanvas;
export let gameArea;

// --- TELAS (MODAIS/OVERLAYS) ---
export let personalizationModal;
export let lobbyModal;
export let mainContent;
export let finalizationModal;
export let preGameModal;
export let preGameContent;
export let preGameLoading;
export let loginModal;

// --- INPUTS DE PERSONALIZAÇÃO ---
export let themeInput;
export let questionCountInput;
export let answerCountInput;
export let difficultyInput;
export let questionCountValue;
export let answerCountValue;
export let recentThemesContainer;

// --- INPUTS DE GERENCIAMENTO DE CHAVES ---
export let supabaseUrlInput;
export let keyNameInput;
export let elevenLabsApiKeyInput;
export let saveKeyBtn;
export let keysListContainer;

// --- BOTÕES DE GERAÇÃO DE CONTEÚDO ---
export let generateContentBtn;
export let generationOutput;
export let generationSuccessMsg;
export let downloadScriptBtn;

// --- BOTÕES DE NAVEGAÇÃO E JOGO ---
export let saveSettingsBtn;
export let personalizeBtn;
export let startBtn;
export let recordBtn;
export let externalControls;
export let downloadContainer;
export let stopRecordBtn;

// --- ELEMENTOS DE LOGIN ---
export let loginBtn;
export let logoutBtn;
export let loginError;
export let emailInput;
export let passwordInput;
export let welcomeMessage;

// --- ELEMENTOS DO QUIZ ---
export let quizContainer;
export let loadingMessage;

// --- EFEITOS SONOROS (ELEMENTOS DE ÁUDIO) ---
export let soundTick;
export let soundCorrect;
export let soundFinal;

// --- FUNÇÃO DE INICIALIZAÇÃO ---
// Esta função preenche todas as variáveis acima DEPOIS que o DOM estiver carregado
export function initConstants() {
    appContainer = document.getElementById('app-container');
    backgroundVideo = document.getElementById('background-video');
    headerBackgroundVideo = document.getElementById('header-background-video');
    userHeader = document.getElementById('user-header');
    userInfoContainer = document.getElementById('user-info-container');
    userLogo = document.getElementById('user-logo');
    quizTitle = document.getElementById('quiz-title');
    croppingCanvas = document.getElementById('cropping-canvas');
    gameArea = document.getElementById('game-area');

    personalizationModal = document.getElementById('personalization-modal');
    lobbyModal = document.getElementById('lobby-modal');
    mainContent = document.getElementById('main-content');
    finalizationModal = document.getElementById('finalization-modal');
    preGameModal = document.getElementById('pre-game-modal');
    preGameContent = document.getElementById('pre-game-content');
    preGameLoading = document.getElementById('pre-game-loading');
    loginModal = document.getElementById('login-modal');

    themeInput = document.getElementById('quiz-theme-input');
    questionCountInput = document.getElementById('question-count-input');
    answerCountInput = document.getElementById('answer-count-input');
    difficultyInput = document.getElementById('difficulty-input');
    questionCountValue = document.getElementById('question-count-value');
    answerCountValue = document.getElementById('answer-count-value');
    recentThemesContainer = document.getElementById('recent-themes-container');

    supabaseUrlInput = document.getElementById('supabase-url-input');
    keyNameInput = document.getElementById('key-name-input');
    elevenLabsApiKeyInput = document.getElementById('elevenlabs-api-key');
    saveKeyBtn = document.getElementById('save-key-btn');
    keysListContainer = document.getElementById('keys-list-container');

    generateContentBtn = document.getElementById('generate-content-btn');
    generationOutput = document.getElementById('generation-output');
    generationSuccessMsg = document.getElementById('generation-success-msg');
    downloadScriptBtn = document.getElementById('download-script-btn');

    saveSettingsBtn = document.getElementById('save-settings-btn');
    personalizeBtn = document.getElementById('personalize-btn');
    startBtn = document.getElementById('start-btn');
    recordBtn = document.getElementById('record-btn');
    externalControls = document.getElementById('external-controls');
    downloadContainer = document.getElementById('download-container');
    stopRecordBtn = document.getElementById('stop-record-btn');

    loginBtn = document.getElementById('login-btn');
    logoutBtn = document.getElementById('logout-btn');
    loginError = document.getElementById('login-error');
    emailInput = document.getElementById('email-input');
    passwordInput = document.getElementById('password-input');
    welcomeMessage = document.getElementById('welcome-message');

    quizContainer = document.getElementById('quiz-container');
    loadingMessage = document.getElementById('loading-message');

    soundTick = document.getElementById('sound-tick');
    soundCorrect = document.getElementById('sound-correct');
    soundFinal = document.getElementById('sound-final');
}


// --- CONSTANTES DE PADRÃO ---
export const DEFAULT_LOGO_URL = './files/logo.png';
export const DEFAULT_VIDEO_URL = './files/BG.mp4';
export const DEFAULT_LOGO_SIZE = '200'; // px

// --- VARIÁVEIS DE ESTADO ---
export let downloadTimeoutId = null;

// --- SUPABASE CLIENT (INICIALIZAÇÃO ÚNICA) ---
// Estas são as chaves PÚBLICAS do seu projeto Supabase.
// Encontre em Settings -> API.
const SUPABASE_URL = 'https://zqqyuvzlhjceqztghxex.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxcXl1dnpsaGpjZXF6dGdoeGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1NDQxMTMsImV4cCI6MjA0NTExMDExM30.bJGtI7oG_uU-k0wv9wY0E-EaxjSg23t-jrtbT-vJz-4';

// Acessa a variável global 'supabase' (carregada via script tag no index.html)
const { createClient } = supabase; 
// Inicializa o cliente Supabase
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
