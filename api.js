import * as C from './constants.js';
import { settings, saveRecentTheme, saveSettings } from './state.js';

// --- URL DA SUA FUNÇÃO SUPABASE ---
// (Você encontrará isso no Passo 3 do novo guia)
const SUPABASE_FUNCTION_URL = 'https://zqqyuvzlhjceqztghxex.supabase.co/functions/v1/gerarQuiz';


// --- LÓGICA DE GERAÇÃO DE CONTEÚDO (AGORA CHAMA O BACKEND) ---

export async function generateQuizAndScriptFromTheme() {
    if (SUPABASE_FUNCTION_URL.includes('COLE_A_URL')) {
        throw new Error("A URL da Função Supabase não foi definida no arquivo api.js");
    }

    const config = {
        theme: C.themeInput.value.trim(),
        numQuestions: C.questionCountInput.value,
        numAnswers: C.answerCountInput.value,
        difficulty: C.difficultyInput.value
    };

    try {
        const response = await fetch(SUPABASE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // (Mais tarde, adicionaremos o token de login aqui)
            },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.error || `Erro no servidor: ${response.status}`);
        }

        const result = await response.json();
        
        // Converte os áudios de Base64 (do backend) para Blob URLs (que o navegador pode tocar)
        const audioMap = {};
        for (const key in result.audioMap) {
            const base64Data = result.audioMap[key].split(',')[1];
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes.buffer], { type: 'audio/mpeg' });
            audioMap[key] = URL.createObjectURL(blob);
        }

        return {
            quiz: result.quiz,
            script: result.script,
            audioMap: audioMap,
            credits: result.credits
        };

    } catch (error) {
        console.error("Falha ao chamar o backend:", error);
        throw new Error(`Falha ao chamar o backend. Motivo: ${error.message}`);
    }
}


export async function handleGenerateContentClick() {
    const theme = C.themeInput.value.trim();
    if (!theme) {
        alert("Por favor, insira um tema para gerar o quiz.");
        return;
    }
    
    C.generateContentBtn.disabled = true;
    C.generateContentBtn.textContent = "Gerando... (Pode levar um minuto)";
    C.generationOutput.classList.add('hidden');

    try {
        const result = await generateQuizAndScriptFromTheme();
        settings.generatedQuiz = result.quiz;
        settings.generatedScript = result.script;
        settings.generatedAudioMap = result.audioMap; // Salva o mapa de áudio
        saveRecentTheme(theme);
        saveSettings();

        C.generationSuccessMsg.textContent = `Quiz gerado! (${result.credits})`;
        C.generationOutput.classList.remove('hidden');

    } catch (error) {
        console.error("Falha ao gerar conteúdo:", error);
        alert(`Não foi possível gerar o conteúdo. Motivo: ${error.message}`);
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
    const blob = new Blob([settings.generatedScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roteiro_quiz_${settings.theme.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

