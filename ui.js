import * as C from './constants.js';
import { loadAndRenderRecentThemes, isRecording } from './state.js';
import { forceStopRecording, stopRecordingAndDownload } from './recording.js'; // Importa funções de gravação

// --- LÓGICA DE NAVEGAÇÃO E INICIALIZAÇÃO ---

export function showScreen(screenName) {
    console.log("Mostrando tela:", screenName);
    const allOverlays = [C.lobbyModal, C.personalizationModal, C.finalizationModal, C.preGameModal];
    allOverlays.forEach(screen => screen.classList.add('hidden'));

    C.mainContent.classList.add('hidden');
    C.userHeader.classList.add('hidden');
    C.externalControls.classList.add('hidden'); // Esconde por padrão
    C.downloadContainer.innerHTML = ''; // Limpa download link
    clearTimeout(C.downloadTimeoutId); // Cancela timeout anterior

    if (!C.backgroundVideo.paused) C.backgroundVideo.pause();
    if (!C.headerBackgroundVideo.paused) C.headerBackgroundVideo.pause();

    // Só atualiza o hash se não for lobby (para evitar histórico sujo)
     if (screenName !== 'lobby' && history.state?.screen !== screenName) {
        history.pushState({ screen: screenName }, ``, `#${screenName}`);
    } else if (screenName === 'lobby') {
         history.replaceState({ screen: 'lobby'}, ``, ' '); // Limpa hash no lobby
    }


    // Lógica para telas que mostram o vídeo de fundo
    if (['quiz', 'finalization', 'pre-game'].includes(screenName)) {
        C.backgroundVideo.src = C.DEFAULT_VIDEO_URL; // Garante que a fonte está definida
        C.backgroundVideo.classList.remove('hidden');
        C.backgroundVideo.play().catch(e => console.error("Erro ao tocar vídeo de fundo:", e));
    } else {
        C.backgroundVideo.classList.add('hidden'); // Esconde explicitamente
    }

    // Mostra a tela correta e seus elementos companheiros
    if (screenName === 'lobby') {
        C.lobbyModal.classList.remove('hidden');
        loadAndRenderRecentThemes(showScreen); // Passa o callback
        forceStopRecording(); // Garante que qualquer gravação seja parada ao voltar ao lobby
    } else if (screenName === 'personalization') {
        C.personalizationModal.classList.remove('hidden');
    } else if (screenName === 'quiz') {
        C.mainContent.classList.remove('hidden');
        C.userHeader.classList.remove('hidden');
        
        if (isRecording) {
            C.externalControls.classList.remove('hidden');
            // C.stopRecordBtn.classList.remove('hidden'); // Esta linha foi removida
            C.downloadContainer.innerHTML = ''; 
        }

        if (C.headerBackgroundVideo.src) {
            C.headerBackgroundVideo.classList.remove('hidden');
            C.headerBackgroundVideo.currentTime = C.backgroundVideo.currentTime; // Sincroniza
            C.headerBackgroundVideo.play().catch(e => console.error("Erro ao tocar vídeo do header:", e));
        }
    } else if (screenName === 'finalization') {
        C.finalizationModal.classList.remove('hidden');

        C.soundFinal.currentTime = 0;
        C.soundFinal.play().catch(e => console.warn("Não foi possível tocar o som final:", e));

        if (isRecording) {
            C.downloadContainer.innerHTML = ''; 
            C.externalControls.classList.remove('hidden'); 
            
            C.downloadTimeoutId = setTimeout(() => {
                const saveBtn = document.createElement('button');
                saveBtn.textContent = 'Parar e Salvar';
                saveBtn.className = 'external-button bg-green-600 hover:bg-green-700';
                saveBtn.onclick = stopRecordingAndDownload; 
                
                C.downloadContainer.appendChild(saveBtn);
            }, 10000); // AJUSTE: Aumentado para 10 segundos
        }

    } else if (screenName === 'pre-game') {
        C.preGameModal.classList.remove('hidden');
    }
}


export function handleBackButton(event) {
    // Se o estado do histórico existe e tem a tela, usa ele, senão volta pro lobby
    const targetScreen = event.state?.screen || 'lobby';
    showScreen(targetScreen);
}

