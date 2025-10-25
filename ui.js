import * as C from './constants.js';
import { loadAndRenderRecentThemes, settings } from './state.js';
// Funções de gravação removidas das importações

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
    } else if (screenName === 'personalization') {
        C.personalizationModal.classList.remove('hidden');
    } else if (screenName === 'quiz') {
        C.mainContent.classList.remove('hidden');
        C.userHeader.classList.remove('hidden');
        
        if (C.headerBackgroundVideo.src) {
            C.headerBackgroundVideo.classList.remove('hidden');
            C.headerBackgroundVideo.currentTime = C.backgroundVideo.currentTime; // Sincroniza
            C.headerBackgroundVideo.play().catch(e => console.error("Erro ao tocar vídeo do header:", e));
        }
    } else if (screenName === 'finalization') {
        C.finalizationModal.classList.remove('hidden');
        
        const startFinalSequence = async () => {
            // Toca o áudio do CTA
            if (settings.generatedAudioMap && settings.generatedAudioMap['cta_final']) {
                await playAudioAndWait(settings.generatedAudioMap['cta_final']);
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

