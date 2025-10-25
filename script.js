// --- IMPORTAÇÕES DOS MÓDULOS ---
import * as C from './constants.js';
import { initConstants } from './constants.js'; 
import { settings, loadSettings, saveSettings, supabase, checkAuth } from './state.js';
import { showScreen, handleBackButton, updateWelcomeMessage, loadKeysIntoList } from './ui.js';
import { startGame } from './game.js';
// CORREÇÃO: Adicionando 'handleSaveSupabaseUrlClick' às importações
import { handleGenerateContentClick, handleDownloadScriptClick, handleSaveKeyClick, handleSaveSupabaseUrlClick } from './api.js'; 
import { stopRecordingAndDownload } from './recording.js'; 

// --- LÓGICA DE NAVEGAÇÃO E INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializa todas as constantes de elementos (DEVE ser a primeira coisa a acontecer)
    initConstants(); 
    
    // 2. Carrega as configurações do localStorage
    loadSettings();
    
    // 3. Adiciona listeners globais
    window.addEventListener('popstate', handleBackButton);
    
    document.addEventListener('fullscreenchange', () => {
        import('./state.js').then(state => {
            if (!document.fullscreenElement && state.isRecording) {
                console.warn("Fullscreen encerrado durante a gravação. Parando gravação.");
                stopRecordingAndDownload(); 
            }
        });
    });
    
    // 4. Verifica o estado de autenticação
    const user = await checkAuth();
    if (user) {
        console.log("Usuário já autenticado:", user.email);
        updateWelcomeMessage(user.email);
        showScreen('lobby');
    } else {
        console.log("Nenhum usuário logado.");
        showScreen('login');
    }

    // 5. Conecta Event Listeners (MOVEMOS PARA DENTRO DE DOMCONTENTLOADED)
    C.personalizeBtn.addEventListener('click', () => {
        loadKeysIntoList(); 
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

    C.startBtn.addEventListener('click', () => startGame(false)); 
    C.recordBtn.addEventListener('click', () => startGame(true)); 
    C.stopRecordBtn.addEventListener('click', stopRecordingAndDownload); 

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
            // Tenta logar
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                throw error;
            }

            const { data: { user } } = await supabase.auth.getUser(); 
            
            console.log("Login bem-sucedido:", user.email);
            updateWelcomeMessage(user.email);
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
    
    // Event Listener para Salvar URL da Função
    C.saveSupabaseUrlBtn.addEventListener('click', handleSaveSupabaseUrlClick);

    // Event Listener para Logout
    C.logoutBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Erro ao sair:", error.message);
        }
        showScreen('login');
    });
});
