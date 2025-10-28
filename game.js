import * as C from './constants.js';
import { settings, setRecordingState, isRecording } from './state.js';
// ATUALIZAÇÃO: Importa a nova função do botão
import { showScreen, showSaveButton } from './ui.js';
import { startRecording } from './recording.js';
// REMOVIDO: import { generateAudioFromScript } from './api.js';

// --- LÓGICA DO JOGO ---

let currentAudio = null; // Armazena o áudio que está tocando
let audioQueue = []; // Fila de áudios a serem gerados/tocados
let isProcessingQueue = false; // Flag para evitar processamento concorrente

// Função para parar qualquer áudio em reprodução
export function stopCurrentAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
        currentAudio = null;
    }
    // Para o som de tick, se estiver tocando
    C.soundTick.pause();
    C.soundTick.currentTime = 0;
    
    // Limpa a fila e para o processamento
    audioQueue = [];
    isProcessingQueue = false;
}

// Função para tentar entrar em Fullscreen
async function requestFullscreen() {
    try {
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) { /* Safari */
            await document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) { /* IE11 */
            await document.documentElement.msRequestFullscreen();
        }
         console.log("Entrou em fullscreen.");
         return true;
    } catch (err) {
        console.warn("Não foi possível entrar em fullscreen:", err.message);
        return false; // Retorna false se falhar
    }
}


export async function startGame(withRecording = false) {
    // --- ATUALIZAÇÃO (Refatoração de Áudio) ---
    // Verifica se tanto o quiz QUANTO os áudios foram gerados
    if (!settings.generatedQuiz || !settings.generatedAudio) {
        alert('Por favor, gere o quiz e os áudios na tela de personalização primeiro!');
        showScreen('personalization');
        return;
    }
    // --- Fim da Atualização ---

    // Limpa qualquer áudio anterior
    stopCurrentAudio();
    
    const fullscreenSuccess = await requestFullscreen();
    setRecordingState(withRecording); // Define o estado de gravação

    // Define a fonte dos vídeos
    C.backgroundVideo.src = C.DEFAULT_VIDEO_URL;
    C.headerBackgroundVideo.src = C.DEFAULT_VIDEO_URL;

    // Constrói o HTML do quiz
    C.quizTitle.textContent = `Quiz: ${settings.theme}`;
    document.getElementById('final-logo').src = C.DEFAULT_LOGO_URL;
    buildQuiz(settings.generatedQuiz); // <-- Agora também reseta a timer-bar

    // Função interna para iniciar o pré-jogo e gravação (se aplicável)
    const proceedToPreGame = async () => {
        showScreen('pre-game');
        document.getElementById('pre-game-logo').src = C.DEFAULT_LOGO_URL;

        if (withRecording) {
            await new Promise(resolve => setTimeout(resolve, 500)); 
            const recordingStarted = await startRecording();
            if (!recordingStarted) {
                setRecordingState(false); // Reseta se a gravação falhar
            }
        }
        
        // Inicia a sequência de áudio (agora lendo blobs)
        enqueueAudioFlow();
    };

    proceedToPreGame(); 
}

// 1. Constrói a fila de narração (lendo chaves)
function enqueueAudioFlow() {
    // 1. Intro
    audioQueue.push({ type: 'intro', key: 'intro' });

    // 2. Perguntas e Respostas
    settings.generatedQuiz.forEach((item, index) => {
        audioQueue.push({ type: 'question', key: `q${index}`, index: index });
        audioQueue.push({ type: 'answer', key: `a${index}`, index: index });
    });

    // 3. Outro (Finalização)
    audioQueue.push({ type: 'outro', key: 'outro' });
    
    // Inicia o processamento da fila
    isProcessingQueue = true; // Define como true aqui
    processAudioQueue();
}

// 2. Processa o próximo item da fila (Refatorado)
async function processAudioQueue() {
    if (!isProcessingQueue || audioQueue.length === 0) {
        if (audioQueue.length === 0) isProcessingQueue = false;
        return; 
    }
    
    const item = audioQueue.shift(); // Pega o próximo item
    console.log("Processando:", item.type, item.key);

    // --- ATUALIZAÇÃO (BUG 2 - Delay Final) ---
    if (item.type === 'outro') {
        showScreen('finalization');
        
        // Delay de 300ms
        setTimeout(async () => {
            if (!isProcessingQueue) return; 
            
            const audioUrl = settings.generatedAudio[item.key];
            if (!audioUrl) {
                console.error("Áudio 'outro' não encontrado!");
                isProcessingQueue = false;
                showSaveButton();
                return;
            }
            
            currentAudio = new Audio(audioUrl);
            currentAudio.onended = () => {
                isProcessingQueue = false;
                setTimeout(() => {
                    showSaveButton();
                }, 1000); // 1 segundo de delay
            };
            if (currentAudio) await currentAudio.play();
            
        }, 300); // <-- Delay de 300ms
        
        return; 
    }
    // --- Fim da Atualização ---

    // Lógica padrão (instantânea, sem 'try/catch' para API)
    const audioUrl = settings.generatedAudio[item.key];
    if (!audioUrl) {
         console.error(`Áudio para a chave ${item.key} não foi encontrado!`);
         // Pula para o próximo item
         isProcessingQueue = false;
         processAudioQueue();
         return;
    }
    
    currentAudio = new Audio(audioUrl);
    
    currentAudio.onended = () => {
        // (Não precisamos mais revogar o Blob URL, faremos isso no final)
        
        if (item.type === 'question') {
            startVisualTimer(item.index); 
        } 
        else { 
            let delay = (item.type === 'answer') ? 2000 : 1000;
            if (item.type === 'answer' && item.index === settings.generatedQuiz.length - 1) {
                delay = 1000; // Reduz o delay se for a ÚLTIMA resposta
            }
            
            setTimeout(() => {
                isProcessingQueue = false;
                if (audioQueue.length > 0) {
                    isProcessingQueue = true;
                    processAudioQueue(); 
                }
            }, delay);
        }
    };
    
    // Ações visuais
    if (item.type === 'intro') {
        // A tela 'pre-game' já deve estar visível
    } 
    else if (item.type === 'question') {
        showScreen('quiz'); 
        const questionBlock = document.getElementById(`question-block-${item.index}`);
        if (questionBlock) {
            questionBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    else if (item.type === 'answer') {
        const correctAlternative = document.getElementById(`q${item.index}-ans${settings.generatedQuiz[item.index].correctIndex}`);
        if (correctAlternative) {
            correctAlternative.classList.add('correct-answer');
            C.soundCorrect.play().catch(e => console.warn("Não foi possível tocar o som de acerto:", e));
        }
    }
    
    if (currentAudio) await currentAudio.play();
}

// 3. --- ATUALIZAÇÃO (BUG 1 - Animação) ---
// (Lógica de Reflow mantida)
function startVisualTimer(questionIndex) {
    console.log("Iniciando timer 5s para pergunta:", questionIndex);
    
    const wrapper = document.getElementById(`timer-bar-wrapper-${questionIndex}`);
    const fill = document.getElementById(`timer-bar-fill-${questionIndex}`);
    
    if (!wrapper || !fill) {
        console.error("Não foi possível encontrar a barra de timer para:", questionIndex);
        isProcessingQueue = false;
        if (audioQueue.length > 0) {
            isProcessingQueue = true;
            processAudioQueue();
        }
        return;
    }

    wrapper.classList.remove('hidden');
    
    // Força o reset da animação (Bug 1)
    fill.style.transition = 'none';
    fill.style.width = '100%';
    void fill.offsetWidth; // Força reflow
    fill.style.transition = 'width 5s linear';
    fill.style.width = '0%';

    C.soundTick.currentTime = 0;
    C.soundTick.play().catch(e => console.warn("Não foi possível tocar o som de tick:", e));
    
    // Após 5 segundos
    setTimeout(() => {
        C.soundTick.pause();
        C.soundTick.currentTime = 0;
        
        if (isProcessingQueue) { 
            isProcessingQueue = false;
            if (audioQueue.length > 0) {
                isProcessingQueue = true;
                processAudioQueue(); // Chama o próximo item (a resposta)
            }
        }
    }, 5000); // 5 segundos
}


// --- ATUALIZAÇÃO (BUG 1 - Animação) ---
function buildQuiz(data) {
    C.quizContainer.innerHTML = '';
    C.mainContent.scrollTop = 0; 

    data.forEach((item, index) => {
        const questionBlock = document.createElement('div');
        questionBlock.id = `question-block-${index}`;
        questionBlock.className = 'bg-white p-3 rounded-lg shadow-lg question-block';
        
        const questionTitle = document.createElement('h2');
        questionTitle.className = 'question-title text-gray-800 mb-2';
        questionTitle.textContent = `${index + 1}. ${item.question}`;
        questionBlock.appendChild(questionTitle);
        
        const alternativesContainer = document.createElement('div');
        alternativesContainer.className = 'space-y-1';
        item.answers.forEach((answer, answerIndex) => {
            const p = document.createElement('p');
            p.className = 'alternative-text text-gray-700 p-1 rounded-md';
            p.id = `q${index}-ans${answerIndex}`;
            const letter = String.fromCharCode(65 + answerIndex);
            p.textContent = `${letter}) ${answer.text}`;
            alternativesContainer.appendChild(p);
        });
        questionBlock.appendChild(alternativesContainer);

        // Estrutura da Barra de Timer
        const timerWrapper = document.createElement('div');
        timerWrapper.id = `timer-bar-wrapper-${index}`;
        timerWrapper.className = 'timer-bar-wrapper hidden'; // Começa oculta
        
        const timerFill = document.createElement('div');
        timerFill.id = `timer-bar-fill-${index}`;
        timerFill.className = 'timer-bar-fill';
        
        // --- CORREÇÃO (BUG 1) ---
        // Garante que a barra esteja 100% cheia
        // ANTES do timer começar, resetando o estado do replay.
        timerFill.style.width = '100%';
        // --- FIM DA CORREÇÃO ---
        
        timerWrapper.appendChild(timerFill);
        questionBlock.appendChild(timerWrapper);
        
        C.quizContainer.appendChild(questionBlock);
    });
}