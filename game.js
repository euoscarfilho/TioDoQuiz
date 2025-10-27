import * as C from './constants.js';
import { settings, setRecordingState } from './state.js';
import { showScreen } from './ui.js';
import { startRecording, stopRecordingAndDownload } from './recording.js';

// --- LÓGICA DO JOGO ---

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
    if (!settings.generatedQuiz) {
        alert('Por favor, gere um quiz na tela de personalização primeiro!');
        showScreen('personalization');
        return;
    }

    const fullscreenSuccess = await requestFullscreen();
    setRecordingState(withRecording); // Define o estado de gravação

    // Define a fonte dos vídeos
    C.backgroundVideo.src = C.DEFAULT_VIDEO_URL;
    C.headerBackgroundVideo.src = C.DEFAULT_VIDEO_URL;

    // Função interna para iniciar o pré-jogo e gravação (se aplicável)
    const proceedToPreGame = async () => {
        showScreen('pre-game');
        document.getElementById('pre-game-logo').src = C.DEFAULT_LOGO_URL;

        if (withRecording) {
            await new Promise(resolve => setTimeout(resolve, 500)); 
            const recordingStarted = await startRecording();
            if (!recordingStarted) {
                setRecordingState(false); // Reseta se a gravação falhar
                setTimeout(startQuizSequence, 5000); 
                return; 
            }
        }
        setTimeout(startQuizSequence, 5000);
    };

    // Função interna para iniciar a sequência do quiz
    const startQuizSequence = () => {
        showScreen('quiz');
        C.quizTitle.textContent = `Quiz: ${settings.theme}`;
        document.getElementById('final-logo').src = C.DEFAULT_LOGO_URL;
        buildQuiz(settings.generatedQuiz);
    };

    proceedToPreGame(); 
}

function buildQuiz(data) {
    C.quizContainer.innerHTML = '';
    
    // AJUSTE: Garante que a rolagem comece do topo
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

        const button = document.createElement('button');
        button.id = `timer-btn-${index}`;
        button.className = 'floating-timer-button bg-blue-600 text-white shadow-lg hover:bg-blue-700';
        button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;
        button.addEventListener('click', () => startTimer(index, button, data), { once: true });
        questionBlock.appendChild(button);

        C.quizContainer.appendChild(questionBlock);
    });
}

function startTimer(questionIndex, button, currentQuizData) {
    button.disabled = true;
    C.soundTick.play().then(() => {
         C.soundTick.currentTime = 0; // Garante reinício
    }).catch(e => console.warn("Não foi possível tocar o som de tick:", e));
    let seconds = 5;
    button.innerHTML = seconds;
    const countdown = setInterval(() => {
        seconds--;
        button.innerHTML = seconds;
        if (seconds <= 0) {
            clearInterval(countdown);
            C.soundTick.pause();
            C.soundTick.currentTime = 0;
            button.innerHTML = 'Fim!';
            const correctAlternative = document.getElementById(`q${questionIndex}-ans${currentQuizData[questionIndex].correctIndex}`);
            if (correctAlternative) {
                correctAlternative.classList.add('correct-answer');
                 C.soundCorrect.play().then(() => {
                    C.soundCorrect.currentTime = 0;
                 }).catch(e => console.warn("Não foi possível tocar o som de acerto:", e));
            }

            const isLastQuestion = questionIndex === currentQuizData.length - 1;
            const delay = isLastQuestion ? 3000 : 1000;

            setTimeout(() => {
                if (isLastQuestion) {
                    showScreen('finalization'); 
                } else {
                    const nextQuestionBlock = document.getElementById(`question-block-${questionIndex + 1}`);
                    if (nextQuestionBlock) {
                        nextQuestionBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }, delay);
        }
    }, 1000);
}

