import * as C from './constants.js';
import { loadAndRenderRecentThemes, isRecording, settings, supabase } from './state.js';
import { forceStopRecording, stopRecordingAndDownload } from './recording.js'; 

// --- LÓGICA DE NAVEGAÇÃO E INICIALIZAÇÃO ---

// Função auxiliar para tocar um áudio e esperar ele terminar
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

// Nova função para atualizar a mensagem de boas-vindas
export function updateWelcomeMessage(email) {
    if (email) {
        C.welcomeMessage.textContent = `Bem-vindo, ${email.split('@')[0]}!`;
    } else {
        C.welcomeMessage.textContent = "Pronto para o desafio?";
    }
}


export function showScreen(screenName) {
    console.log("Mostrando tela:", screenName);
    const allOverlays = [C.lobbyModal, C.personalizationModal, C.finalizationModal, C.preGameModal, C.loginModal];
    allOverlays.forEach(screen => screen.classList.add('hidden'));

    C.mainContent.classList.add('hidden');
    C.userHeader.classList.add('hidden');
    C.externalControls.classList.add('hidden'); 
    C.downloadContainer.innerHTML = '';
    clearTimeout(C.downloadTimeoutId); 

    if (!C.backgroundVideo.paused) C.backgroundVideo.pause();
    if (!C.headerBackgroundVideo.paused) C.headerBackgroundVideo.pause();

    if (screenName !== 'lobby' && screenName !== 'login' && history.state?.screen !== screenName) {
        history.pushState({ screen: screenName }, ``, `#${screenName}`);
    } else if (screenName === 'lobby') {
         history.replaceState({ screen: 'lobby'}, ``, ' '); 
    } else if (screenName === 'login') {
         history.replaceState({ screen: 'login'}, ``, ' '); 
    }

    // Lógica para telas que mostram o vídeo de fundo
    if (['quiz', 'finalization', 'pre-game'].includes(screenName)) {
        C.backgroundVideo.src = C.DEFAULT_VIDEO_URL;
        C.backgroundVideo.classList.remove('hidden');
        C.backgroundVideo.play().catch(e => console.error("Erro ao tocar vídeo de fundo:", e));
    } else {
        C.backgroundVideo.classList.add('hidden');
    }

    // Mostra a tela correta e seus elementos companheiros
    if (screenName === 'lobby') {
        C.lobbyModal.classList.remove('hidden');
        loadAndRenderRecentThemes(showScreen); 
        forceStopRecording();
    } else if (screenName === 'personalization') {
        C.personalizationModal.classList.remove('hidden');
        loadKeysIntoList(); // Carrega as chaves salvas ao abrir
    } else if (screenName === 'quiz') {
        C.mainContent.classList.remove('hidden');
        C.userHeader.classList.remove('hidden');
        
        if (isRecording) {
            C.externalControls.classList.remove('hidden');
            C.stopRecordBtn.classList.remove('hidden'); // Mostra o botão de parar
            C.downloadContainer.innerHTML = ''; 
        }

        if (C.headerBackgroundVideo.src) {
            C.headerBackgroundVideo.classList.remove('hidden');
            C.headerBackgroundVideo.currentTime = C.backgroundVideo.currentTime; 
            C.headerBackgroundVideo.play().catch(e => console.error("Erro ao tocar vídeo do header:", e));
        }
    } else if (screenName === 'finalization') {
        C.finalizationModal.classList.remove('hidden');
        
        const startFinalSequence = async () => {
            // Toca o som de vitória (se existir localmente)
            // C.soundFinal.play()... (removido, pois estamos usando áudio dinâmico)
            
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Toca o áudio do CTA
            if (settings.generatedAudioMap && settings.generatedAudioMap['cta_final']) {
                await playAudioAndWait(settings.generatedAudioMap['cta_final']);
            }
            
            // Se estava gravando, mostra o botão "Parar e Salvar" após 5s
            if (isRecording) {
                C.downloadContainer.innerHTML = ''; 
                C.externalControls.classList.remove('hidden'); 
                C.stopRecordBtn.classList.add('hidden'); // Esconde o botão de parar
                
                C.downloadTimeoutId = setTimeout(() => {
                    const saveBtn = document.createElement('button');
                    saveBtn.textContent = 'Parar e Salvar Gravação';
                    saveBtn.className = 'external-button bg-green-600 hover:bg-green-700';
                    saveBtn.onclick = stopRecordingAndDownload; 
                    
                    C.downloadContainer.appendChild(saveBtn);
                }, 5000); // 5 segundos
            }
        };
        
        startFinalSequence();

    } else if (screenName === 'pre-game') {
        C.preGameModal.classList.remove('hidden');
    } else if (screenName === 'login') {
        C.loginModal.classList.remove('hidden');
    }
}


export function handleBackButton(event) {
    // Se o usuário está logado, volta para o lobby. Se não, volta para o login.
    if (sessionStorage.getItem('tioDoQuizAutenticado') === 'true') {
        showScreen('lobby');
    } else {
        showScreen('login');
    }
}

// Nova função para carregar as chaves salvas na lista
export async function loadKeysIntoList() {
    C.keysListContainer.innerHTML = `<p class="text-blue-300">Carregando chaves...</p>`;
    try {
        const { data: keys, error } = await supabase
            .from('elevenlabs_keys')
            .select('id, nome_da_chave, created_at');

        if (error) {
            throw error;
        }
        
        if (keys.length === 0) {
            C.keysListContainer.innerHTML = `<p class="text-blue-300">Nenhuma chave salva.</p>`;
            return;
        }

        C.keysListContainer.innerHTML = ''; // Limpa a lista
        keys.forEach(key => {
            const keyEl = document.createElement('div');
            keyEl.className = "flex justify-between items-center bg-blue-800 p-2 rounded";
            keyEl.innerHTML = `<span>${key.nome_da_chave} (Adicionada em: ${new Date(key.created_at).toLocaleDateString()})</span>
                             <button data-id="${key.id}" class="delete-key-btn bg-red-600 text-white px-2 py-1 rounded text-sm">Excluir</button>`;
            C.keysListContainer.appendChild(keyEl);
        });

        // Adiciona event listeners aos novos botões de deletar
        document.querySelectorAll('.delete-key-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm("Tem certeza que deseja excluir esta chave?")) {
                    await handleDeleteKeyClick(id);
                }
            });
        });
    } catch (error) {
         console.error("Erro ao buscar chaves:", error);
         C.keysListContainer.innerHTML = `<p class="text-red-400">Erro ao carregar chaves.</p>`;
    }
}

// Função para deletar a chave
async function handleDeleteKeyClick(id) {
    try {
        const { error } = await supabase
            .from('elevenlabs_keys')
            .delete()
            .match({ id: id });

        if (error) {
            throw error;
        }
        
        console.log("Chave excluída:", id);
        loadKeysIntoList(); // Recarrega a lista
    } catch (error) {
        console.error("Erro ao excluir chave:", error);
        alert("Erro ao excluir chave.");
    }
}

