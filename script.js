// --- IMPORTAÇÕES DOS MÓDULOS ---
import * as C from './constants.js';
import { loadSettings, saveSettings } from './state.js';
import { showScreen, handleBackButton } from './ui.js';
import { startGame } from './game.js';
import { handleGenerateContentClick, handleDownloadScriptClick } from './api.js';
// import { stopRecordingAndDownload } from './recording.js'; // Removido, pois a UI não o chama mais diretamente

// --- LÓGICA DE NAVEGAÇÃO E INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    // A função loadAndRenderRecentThemes é chamada dentro de showScreen('lobby')
    
    window.addEventListener('popstate', handleBackButton);
    
    // Listener para sair do fullscreen (caso o usuário aperte ESC)
    document.addEventListener('fullscreenchange', () => {
        // Importa o estado de gravação e a função de parar dinamicamente para evitar dependência circular
        import('./state.js').then(state => {
            if (!document.fullscreenElement && state.isRecording) {
                console.warn("Fullscreen encerrado durante a gravação. Parando gravação.");
                import('./recording.js').then(recording => {
                    recording.stopRecordingAndDownload(); // Para a gravação se sair do fullscreen
                });
            }
        });
    });
    
    // NOVO: Listener para a tecla Espaço
    document.addEventListener('keydown', (e) => {
        // Verifica se a tela do quiz é a que está ativa
        const mainContent = document.getElementById('main-content');
        if (e.code === 'Space' && mainContent && !mainContent.classList.contains('hidden')) {
            e.preventDefault(); // Previne o scroll da página
            // Encontra o botão de timer que está visível e não desabilitado
            const activeTimer = document.querySelector('button.floating-timer-button:not(.hidden):not(:disabled)');
            if (activeTimer) {
                activeTimer.click();
            }
        }
    });
    
    const currentHash = window.location.hash.substring(1);
    const validScreens = ['personalization', 'quiz', 'finalization', 'pre-game'];
    if (validScreens.includes(currentHash)) {
        showScreen(currentHash);
    } else {
        showScreen('lobby');
    }
});


// --- EVENT LISTENERS GERAIS ---
C.personalizeBtn.addEventListener('click', () => showScreen('personalization'));

C.saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
    showScreen('lobby');
});

C.questionCountInput.addEventListener('input', (e) => {
    C.questionCountValue.textContent = e.target.value;
});

C.answerCountInput.addEventListener('input', (e) => {
    C.answerCountValue.textContent = e.target.value;
});

C.startBtn.addEventListener('click', () => startGame(false)); // Iniciar sem gravar
C.recordBtn.addEventListener('click', () => startGame(true)); // Iniciar gravando
// C.stopRecordBtn.addEventListener('click', stopRecordingAndDownload); // Removido

C.generateContentBtn.addEventListener('click', handleGenerateContentClick);
C.downloadScriptBtn.addEventListener('click', handleDownloadScriptClick);


