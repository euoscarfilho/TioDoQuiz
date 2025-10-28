import * as C from './constants.js';
import { settings, saveRecentTheme, saveSettings } from './state.js';
// ATUALIZAÇÃO: Importa a função de limpeza
import { releaseAudioBlobs } from './ui.js';

// --- LÓGICA DE GERAÇÃO DE CONTEÚDO E ROTEIRO ---

// 

/**
 * (Função interna) Gera áudio a partir de um texto chamando nosso proxy seguro.
 * @param {string} scriptText O texto para converter em áudio.
 * @returns {Promise<string>} A URL local (Blob URL) do áudio gerado.
 */
async function generateAudioFromScript(scriptText) {
    console.log("Chamando proxy de áudio para:", scriptText);

   
    
    const cleanedText = scriptText.replace(/(\r\n|\n|\r)/gm, " ").trim();
    
    // --- ATUALIZAÇÃO: Chama nosso próprio servidor ---
    const apiUrl = '/api/generateAudio'; //

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                // Removemos 'Accept' e 'xi-api-key'
                'Content-Type': 'application/json',
            },
            // Enviamos apenas o texto, o servidor cuida do resto
            body: JSON.stringify({
                "text": cleanedText 
            })
        });

        if (!response.ok) {
            // Se o proxy falhar, ele envia um JSON de erro
            const errorBody = await response.json();
            throw new Error(`Erro do proxy de áudio: ${response.status} - ${errorBody.error}`);
        }

        // O proxy envia o áudio (audio/mpeg)
        const audioBlob = await response.blob(); //
        const audioUrl = URL.createObjectURL(audioBlob); //
        
        console.log("Áudio recebido do proxy (Blob URL):", audioUrl);
        return audioUrl;

    } catch (error) {
        console.error("Falha ao gerar áudio (via proxy):", error);
        throw error;
    }
}


/**
 * Busca o quiz e o roteiro do nosso proxy seguro.
 */
export async function generateQuizAndScriptFromTheme() {
    const config = {
        theme: C.themeInput.value.trim(),
        numQuestions: C.questionCountInput.value,
        numAnswers: C.answerCountInput.value,
        difficulty: C.difficultyInput.value
    };
    
    // --- ATUALIZAÇÃO: Chama nosso próprio servidor ---
    const apiUrl = '/api/generateQuiz'; //
    
    // 🚨🚨🚨 LÓGICA DE PROMPT E PAYLOAD REMOVIDA 🚨🚨🚨
    // Todo o systemPrompt, userQuery e payload
    // agora vivem no servidor.

    const response = await fetch(apiUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        // 2. Envia apenas a configuração
        body: JSON.stringify(config) 
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Erro do proxy do quiz: ${response.status} - ${errorBody.error}`);
    }
    
    // 3. A resposta já vem no formato JSON final
    const result = await response.json();
    return result; 
}


// --- ATUALIZAÇÃO (Refatoração de Áudio) ---
// Esta função NÃO PRECISA DE MUDANÇAS, pois ela
// apenas chama as duas funções acima, que já foram modificadas.
export async function handleGenerateContentClick() {
    const theme = C.themeInput.value.trim();
    if (!theme) {
        alert("Por favor, insira um tema para gerar o quiz.");
        return;
    }
    
    C.generateContentBtn.disabled = true;
    C.generateContentBtn.textContent = "Limpando áudios...";
    C.generationOutput.classList.add('hidden');
    
    // Limpa os áudios antigos PRIMEIRO
    releaseAudioBlobs();
    settings.generatedAudio = null;

    C.generateContentBtn.textContent = "Gerando Quiz...";

    try {
        // 1. Gera o Quiz (JSON) e o Roteiro (via proxy)
        const result = await generateQuizAndScriptFromTheme();
        settings.generatedQuiz = result.quiz;
        settings.generatedScript = result.script;
        saveRecentTheme(theme);
        
        // 2. Prepara a lista de textos para gerar áudio
        const audioTexts = [];
        audioTexts.push({ key: 'intro', text: "Fala galera! Tio do quiz na área. Vamos para mais um desafio!" });
        
        result.quiz.forEach((item, index) => {
            audioTexts.push({ key: `q${index}`, text: item.question });
            const correctAns = item.answers[item.correctIndex];
            audioTexts.push({ key: `a${index}`, text: `Resposta correta: ${correctAns.text}` });
        });
        
        audioTexts.push({ key: 'outro', text: "E ai? Comenta quantas acertou e não esquece de dar like e desafiar os amigos. Até a próxima!" });

        // 3. Gera os áudios em sequência (via proxy)
        const generatedAudioBlobs = {};
        let count = 1;
        const total = audioTexts.length;

        for (const item of audioTexts) {
            C.generateContentBtn.textContent = `Gerando áudio (${count}/${total})...`;
            try {
                // Esta chamada agora usa o proxy
                const audioUrl = await generateAudioFromScript(item.text); 
                generatedAudioBlobs[item.key] = audioUrl;
            } catch (audioError) {
                throw new Error(`Falha ao gerar áudio para "${item.text.substring(0, 20)}...": ${audioError.message}`);
            }
            count++;
        }

        // 4. Salva tudo no estado
        settings.generatedAudio = generatedAudioBlobs;
        saveSettings(); // Salva o quiz, script E os blobs (no runtime)

        C.generationSuccessMsg.textContent = `Quiz e ${total} áudios sobre "${theme}" gerados!`;
        C.generationOutput.classList.remove('hidden');

    } catch (error) {
        console.error("Falha ao gerar conteúdo:", error);
        alert(`Não foi possível gerar o conteúdo. Motivo: ${error.message}`);
        // Limpa dados parciais se falhar
        settings.generatedQuiz = null;
        settings.generatedAudio = null;
        settings.generatedScript = null;
    } finally {
        C.generateContentBtn.disabled = false;
        C.generateContentBtn.innerHTML = "✨ Gerar Quiz e Roteiro";
    }
}


export function handleDownloadScriptClick() {
    if (!settings.generatedScript) {
        alert("Nenhum roteiro foi gerado ainda.");
        return;
    }
    
    const introText = "INTRO: Fala galera! Tio do quiz na área. Vamos para mais um desafio!\n\n";
    const outroText = "\n\NFINAL: E ai? Comenta quantas acertou e não esquece de dar like e desafiar os amigos. Até a próxima!";
    
    const fullScript = introText + settings.generatedScript + outroText;
    
    const blob = new Blob([fullScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roteiro_quiz_${settings.theme.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}