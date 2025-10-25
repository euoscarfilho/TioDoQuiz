import * as C from './constants.js';
import { settings, setRecordingState } from './state.js';
import { showScreen } from './ui.js';
// import { startRecording, stopRecordingAndDownload } from './recording.js'; // Removido

// --- LÓGICA DO JOGO ---

// Função auxiliar para tocar um áudio e esperar ele terminar
function playAudioAndWait(audioUrl) {
    return new Promise((resolve, reject) => {
        if (!audioUrl) {
            console.warn("URL de áudio vazia, pulando.");
            resolve();
            return;
        }
        const audio = new Audio(audioUrl);
        
        // Tenta tocar o áudio
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.error("Erro ao tocar áudio:", e);
                // Se falhar (ex: autoplay bloqueado), resolve mesmo assim
                resolve(); 
            });
        }
        audio.onended = resolve; // Resolve quando o áudio termina
        audio.onerror = (e) => {
             console.error("Erro no elemento de áudio:", e);
             resolve(); // Resolve em caso de erro
        };
    });
}

// Função para rodar um timer visual de 5 segundos
function runVisualTimer(questionBlock) {
    return new Promise(resolve => {
        const timerContainer = questionBlock.querySelector('.visual-timer-container');
        const timerBar = timerContainer.querySelector('.visual-timer-bar');
        
        if (!timerContainer || !timerBar) return resolve();

        timerContainer.classList.remove('hidden');
        timerBar.style.width = '100%'; 

        C.soundTick.currentTime = 0;
        C.soundTick.play().catch(e => console.warn("Não foi possível tocar o som de tick:", e));

        // Força o navegador a aplicar o 100% antes de transicionar para 0%
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                 timerBar.style.transition = 'width 5s linear';
                 timerBar.style.width = '0%';
            });
        });

        setTimeout(() => {
            C.soundTick.pause();
            C.soundTick.currentTime = 0;
            resolve();
        }, 5000); // 5 segundos
    });
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
        return false; 
    }
}


export async function startGame() {
    // Verifica se o quiz foi gerado
    if (!settings.generatedQuiz || !settings.generatedAudioMap) {
        alert('Por favor, gere um quiz na tela de personalização primeiro!');
        showScreen('personalization');
        return;
    }

    // Verifica se as chaves de API estão presentes
     if (!settings.googleApiKey || !settings.elevenLabsApiKey) {
         alert("Suas chaves de API não estão salvas. Por favor, configure-as na tela de Personalização.");
         showScreen('personalization');
         return;
    }

    await requestFullscreen();

    // Define a fonte dos vídeos
    C.backgroundVideo.src = C.DEFAULT_VIDEO_URL;
    C.headerBackgroundVideo.src = C.DEFAULT_VIDEO_URL;

    // Inicia a tela de pré-jogo
    proceedToPreGame();
}

// Função interna para iniciar o pré-jogo
const proceedToPreGame = async () => {
    showScreen('pre-game');
    document.getElementById('pre-game-logo').src = C.DEFAULT_LOGO_URL;

    // Adiciona delay de 300ms antes da narração de boas-vindas
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Toca o áudio de boas-vindas
    await playAudioAndWait(settings.generatedAudioMap['welcome']);
    
    // Inicia o quiz IMEDIATAMENTE após o áudio
    startQuizSequence();
};

// Função interna para iniciar a sequência do quiz
const startQuizSequence = async () => {
    showScreen('quiz');
    C.quizTitle.textContent = `Quiz: ${settings.theme}`;
    document.getElementById('final-logo').src = C.DEFAULT_LOGO_URL;
    buildQuiz(settings.generatedQuiz);
    
    // Toca o áudio do tema e então inicia a sequência do quiz
    await playAudioAndWait(settings.generatedAudioMap['quiz_theme']);
    playAudioSequence(settings.generatedQuiz, settings.generatedAudioMap);
};


// Constrói o quiz sem botões de timer, mas com a barra de timer
function buildQuiz(data) {
    C.quizContainer.innerHTML = '';
    
    // Garante que a rolagem comece do topo
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

        // Adiciona um container para o timer visual
        const timerVisual = document.createElement('div');
        timerVisual.id = `timer-visual-${index}`;
        timerVisual.className = 'visual-timer-container hidden'; // Começa oculto
        timerVisual.innerHTML = `<div class="visual-timer-bar"></div>`;
        questionBlock.appendChild(timerVisual);

        // Botão flutuante foi REMOVIDO
        C.quizContainer.appendChild(questionBlock);
    });
}

// A "Mágica": a sequência automática do quiz
async function playAudioSequence(quizData, audioMap) {
    for (let i = 0; i < quizData.length; i++) {
        const item = quizData[i];
        const questionBlock = document.getElementById(`question-block-${i}`);
        
        if (questionBlock) {
            questionBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
            await new Promise(res => setTimeout(res, 500)); // Espera a rolagem
        }

        await playAudioAndWait(audioMap[`q${i}_q`]);
        
        await runVisualTimer(questionBlock);

        const correctAlternativeEl = document.getElementById(`q${i}-ans${item.correctIndex}`);
        if (correctAlternativeEl) {
            correctAlternativeEl.classList.add('correct-answer');
            C.soundCorrect.play().then(() => C.soundCorrect.currentTime = 0).catch(e => console.warn("Erro no som de acerto:", e));
        }
        
        await playAudioAndWait(audioMap[`q${i}_r`]);

        const isLastQuestion = i === quizData.length - 1;
        const delay = isLastQuestion ? 3000 : 1000;
        await new Promise(res => setTimeout(res, delay));

        if (isLastQuestion) {
            showScreen('finalization'); 
        }
    }
}

