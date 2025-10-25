import * as C from './constants.js';

// --- ESTADO DA APLICAÇÃO E CONFIGURAÇÕES ---
export let settings = {};
export let isRecording = false; // Flag para controlar o estado da gravação

// --- CLIENTE SUPABASE ---
export const supabase = C.supabaseClient;

export function setRecordingState(value) {
    console.log("Estado de gravação alterado para:", value);
    isRecording = value;
}

// Verifica se o usuário está logado
export async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        return session.user;
    }
    return null;
}

export function saveSettings() {
    const generatedQuiz = settings.generatedQuiz;
    const generatedScript = settings.generatedScript;
    const generatedAudioMap = settings.generatedAudioMap;

    settings = {
        theme: C.themeInput.value.trim(),
        numQuestions: C.questionCountInput.value,
        numAnswers: C.answerCountInput.value,
        difficulty: C.difficultyInput.value,
        generatedQuiz: generatedQuiz,
        generatedScript: generatedScript,
        generatedAudioMap: generatedAudioMap,
        
        // Salva a URL da Função Supabase no localStorage
        supabaseFunctionUrl: C.supabaseUrlInput.value.trim()
    };
    localStorage.setItem('tioDoQuizSettings', JSON.stringify(settings));
    updateUIFromSettings();
}

export function loadSettings() {
    const savedSettings = localStorage.getItem('tioDoQuizSettings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        // Garante que os dados de áudio (que não são salvos) sejam resetados
        settings.generatedQuiz = null;
        settings.generatedScript = null;
        settings.generatedAudioMap = null;
        
    } else {
        settings = {
            theme: '',
            numQuestions: '5',
            numAnswers: '3',
            difficulty: 'Médio',
            generatedQuiz: null,
            generatedScript: null,
            generatedAudioMap: null,
            supabaseFunctionUrl: '' // Novo estado
        };
    }
    updateUIFromSettings();
}

export function updateUIFromSettings() {
    C.themeInput.value = settings.theme || '';
    C.questionCountInput.value = settings.numQuestions || '5';
    C.questionCountValue.textContent = settings.numQuestions || '5';
    C.answerCountInput.value = settings.numAnswers || '3';
    C.answerCountValue.textContent = settings.numAnswers || '3';
    C.difficultyInput.value = settings.difficulty || 'Médio';

    // Carrega a URL da função salva no campo de personalização
    C.supabaseUrlInput.value = settings.supabaseFunctionUrl || '';

    C.userLogo.src = C.DEFAULT_LOGO_URL;
    C.userLogo.onerror = () => { C.userLogo.src = 'https://placehold.co/200x200/f59e0b/1e3a8a?text=Erro'; };
    C.userLogo.style.height = `${C.DEFAULT_LOGO_SIZE}px`;
}

// --- LÓGICA DE TEMAS RECENTES ---
export function saveRecentTheme(theme) {
    if (!theme) return;
    let recentThemes = JSON.parse(localStorage.getItem('tioDoQuizRecentThemes')) || [];
    recentThemes = recentThemes.filter(t => t.toLowerCase() !== theme.toLowerCase());
    recentThemes.unshift(theme);
    if (recentThemes.length > 5) recentThemes = recentThemes.slice(0, 5);
    localStorage.setItem('tioDoQuizRecentThemes', JSON.stringify(recentThemes));
}

export function loadAndRenderRecentThemes(onThemeClickCallback) {
    const recentThemes = JSON.parse(localStorage.getItem('tioDoQuizRecentThemes')) || [];
    const recentThemesContainer = document.getElementById('recent-themes-container');
    recentThemesContainer.innerHTML = '';
    if (recentThemes.length === 0) {
        recentThemesContainer.innerHTML = '<p class="text-blue-300 text-lg">Nenhum tema recente.</p>';
        return;
    }
    recentThemes.forEach(theme => {
        const themeBtn = document.createElement('button');
        themeBtn.className = 'recent-theme-item';
        themeBtn.textContent = theme;
        themeBtn.onclick = () => {
            document.getElementById('quiz-theme-input').value = theme;
            if (onThemeClickCallback) {
                onThemeClickCallback('personalization');
            }
        };
        recentThemesContainer.appendChild(themeBtn);
    });
}
