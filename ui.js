import * as C from './constants.js';
import { loadAndRenderRecentThemes, isRecording, settings } from './state.js';
import { forceStopRecording, stopRecordingAndDownload } from './recording.js'; 

// --- LÓGICA DE NAVEGAÇÃO E INICIALIZAÇÃO ---

// Função auxiliar para tocar um áudio e esperar ele terminar (usada aqui para o CTA)
function playAudioAndWait(audioUrl) {
    return new Promise((resolve) => {
        if (!audioUrl) {
            console.warn("URL de áudio vazia, pulando.");
            resolve();
            return;
        }
        const audio = new Audio(audioUrl);
        audio.play().catch(e => {
            console.error("Erro ao tocar áudio:", e);
            resolve(); 
        });
        audio.onended = resolve;
        audio.onerror = (e) => {
             console.error("Erro no elemento de áudio:", e);
             resolve(); 
        };
    });
}


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
            C.downloadContainer.innerHTML = ''; 
        }

        if (C.headerBackgroundVideo.src) {
            C.headerBackgroundVideo.classList.remove('hidden');
            C.headerBackgroundVideo.currentTime = C.backgroundVideo.currentTime; // Sincroniza
            C.headerBackgroundVideo.play().catch(e => console.error("Erro ao tocar vídeo do header:", e));
        }
    } else if (screenName === 'finalization') {
        C.finalizationModal.classList.remove('hidden');
        
        const startFinalSequence = async () => {
            // Toca o som de vitória primeiro
            // C.soundFinal.play()... // O som "final" agora é o áudio do CTA
            
            // AJUSTE: Adiciona delay de 300ms antes da narração do CTA
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Toca o áudio do CTA
            if (settings.generatedAudioMap && settings.generatedAudioMap['cta_final']) {
                await playAudioAndWait(settings.generatedAudioMap['cta_final']);
            }
            
            // Se estava gravando, mostra o botão após 1 segundo do fim do áudio
            if (isRecording) {
                C.downloadContainer.innerHTML = ''; 
                C.externalControls.classList.remove('hidden'); 
                
                C.downloadTimeoutId = setTimeout(() => {
                    const saveBtn = document.createElement('button');
                    saveBtn.textContent = 'Parar e Salvar Gravação';
                    saveBtn.className = 'external-button bg-green-600 hover:bg-green-700';
                    saveBtn.onclick = stopRecordingAndDownload; 
                    
                    C.downloadContainer.appendChild(saveBtn);
                }, 1000); // 1 segundo
            }
        };
        
        startFinalSequence();

    } else if (screenName === 'pre-game') {
        C.preGameModal.classList.remove('hidden');
    }
}


export function handleBackButton(event) {
    // Se o estado do histórico existe e tem a tela, usa ele, senão volta pro lobby
    const targetScreen = event.state?.screen || 'lobby';
    showScreen(targetScreen);
}

