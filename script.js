// --- IMPORTAÇÕES DOS MÓDULOS ---
import * as C from './constants.js';
// CORREÇÃO: Importa a nova função 'initConstants'
import { initConstants } from './constants.js'; 
import { settings, loadSettings, saveSettings, supabase, checkAuth } from './state.js';
import { showScreen, handleBackButton, updateWelcomeMessage } from './ui.js';
import { startGame } from './game.js';
import { handleGenerateContentClick, handleDownloadScriptClick, handleSaveKeyClick } from './api.js';
import { stopRecordingAndDownload } from './recording.js'; 

// --- LÓGICA DE NAVEGAÇÃO E INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    // CORREÇÃO: Inicializa todas as constantes de elementos primeiro
    initConstants(); 
    
    loadSettings();
    
    window.addEventListener('popstate', handleBackButton);
    
    document.addEventListener('fullscreenchange', () => {
        // Importa o estado de gravação dinamicamente
        import('./state.js').then(state => {
            if (!document.fullscreenElement && state.isRecording) {
                console.warn("Fullscreen encerrado durante a gravação. Parando gravação.");
                stopRecordingAndDownload(); 
            }
        });
    });
    
    // Verifica se o usuário já está logado no Supabase
    const user = await checkAuth();
    if (user) {
        console.log("Usuário já autenticado:", user.email);
        updateWelcomeMessage(user.email);
        showScreen('lobby');
    } else {
        console.log("Nenhum usuário logado.");
        showScreen('login');
    }

    // --- EVENT LISTENERS GERAIS (MOVIMOS PARA DENTRO DO DOMCONTENTLOADED) ---
    C.personalizeBtn.addEventListener('click', () => {
        // Carrega a lista de chaves do DB ao abrir a personalização
        import('./ui.js').then(ui => ui.loadKeysIntoList()); 
        showScreen('personalization');
    });

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
    C.stopRecordBtn.addEventListener('click', stopRecordingAndDownload); // Parar gravação

    C.generateContentBtn.addEventListener('click', handleGenerateContentClick);
    C.downloadScriptBtn.addEventListener('click', handleDownloadScriptClick);

    // Event Listener para Login
    C.loginBtn.addEventListener('click', async () => {
        const email = C.emailInput.value;
        const password = C.passwordInput.value;
        C.loginBtn.disabled = true;
        C.loginBtn.textContent = "Entrando...";
        C.loginError.classList.add('hidden');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                throw error;
            }

            console.log("Login bem-sucedido:", data.user.email);
            updateWelcomeMessage(data.user.email);
            showScreen('lobby');
            C.passwordInput.value = ''; 

        } catch (error) {
            console.error("Erro no login:", error.message);
            C.loginError.textContent = "E-mail ou senha incorretos.";
            C.loginError.classList.remove('hidden');
        } finally {
            C.loginBtn.disabled = false;
            C.loginBtn.textContent = "Entrar";
        }
    });

    // Event Listener para Salvar Chave
    C.saveKeyBtn.addEventListener('click', handleSaveKeyClick);

    // Event Listener para Logout
    C.logoutBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Erro ao sair:", error.message);
        }
        showScreen('login');
    });
});

