// --- ESTADO DA APLICAÇÃO E CONFIGURAÇÕES ---
export let settings = {};
export let isRecording = false; // Flag para controlar o estado da gravação

export function setRecordingState(value) {
    isRecording = value;
}

export function saveSettings() {
    const generatedQuiz = settings.generatedQuiz;
    const generatedScript = settings.generatedScript;

    settings = {
        theme: document.getElementById('quiz-theme-input').value.trim(),
        numQuestions: document.getElementById('question-count-input').value,
        numAnswers: document.getElementById('answer-count-input').value,
        difficulty: document.getElementById('difficulty-input').value,
        generatedQuiz: generatedQuiz,
        generatedScript: generatedScript,
    };
    localStorage.setItem('tioDoQuizSettings', JSON.stringify(settings));
    updateUIFromSettings();
}

export function loadSettings() {
    const savedSettings = localStorage.getItem('tioDoQuizSettings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    } else {
        settings = {
            theme: '',
            numQuestions: '5',
            numAnswers: '3',
            difficulty: 'Médio',
            generatedQuiz: null,
            generatedScript: null,
        };
    }
    updateUIFromSettings();
}

export function updateUIFromSettings() {
    document.getElementById('quiz-theme-input').value = settings.theme;
    document.getElementById('question-count-input').value = settings.numQuestions;
    document.getElementById('question-count-value').textContent = settings.numQuestions;
    document.getElementById('answer-count-input').value = settings.numAnswers;
    document.getElementById('answer-count-value').textContent = settings.numAnswers;
    document.getElementById('difficulty-input').value = settings.difficulty;

    document.getElementById('user-logo').src = './files/logo.png';
    document.getElementById('user-logo').onerror = () => { document.getElementById('user-logo').src = 'https://placehold.co/200x200/f59e0b/1e3a8a?text=Erro'; };
    document.getElementById('user-logo').style.height = '200px'; // Tamanho Padrão
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

// CORREÇÃO: A função agora aceita um callback para o clique
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
            // Executa o callback (que é a função 'showScreen')
            if (onThemeClickCallback) {
                onThemeClickCallback('personalization');
            }
        };
        recentThemesContainer.appendChild(themeBtn);
    });
}

