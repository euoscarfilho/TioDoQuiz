import * as C from './constants.js';
import { settings, saveRecentTheme, saveSettings } from './state.js';
// ATUALIZAÇÃO: Importa a função de limpeza
import { releaseAudioBlobs } from './ui.js';

// --- LÓGICA DE GERAÇÃO DE CONTEÚDO E ROTEIRO ---

// Chave da API Gemini (ATENÇÃO: Exposta no front-end)
const GEMINI_API_KEY = "AIzaSyDARpDwQ918DzKAtd374ab_yxa2N8akaZ0"; //

/**
 * (Função interna) Gera áudio a partir de um texto usando a API do ElevenLabs.
 * @param {string} scriptText O texto para converter em áudio.
 * @returns {Promise<string>} A URL local (Blob URL) do áudio gerado.
 */
async function generateAudioFromScript(scriptText) {
    console.log("Gerando áudio para o texto:", scriptText);

    // --- ⬇️⬇️ SUBSTITUA PELOS SEUS DADOS ⬇️⬇️ ---
    const XI_API_KEY = "sk_36bb3fcd3d5c2a5f35fc05d3f2ffd0d486008b902c3e629e";
    const XI_VOICE_ID = "NOpBlnGInO9m6vDvFkFC"; 
    // --- ⬆️⬆️ SUBSTITUA PELOS SEUS DADOS ⬆️⬆️ ---
    
    const cleanedText = scriptText.replace(/(\r\n|\n|\r)/gm, " ").trim();
    const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${XI_VOICE_ID}/stream`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': XI_API_KEY
            },
            body: JSON.stringify({
                "text": cleanedText,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": { "stability": 0.5, "similarity_boost": 0.75, "style": 0.3, "use_speaker_boost": true }
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Erro da API ElevenLabs: ${response.status} - ${errorBody}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        console.log("Áudio gerado (Blob URL):", audioUrl);
        return audioUrl;

    } catch (error) {
        console.error("Falha ao gerar áudio do ElevenLabs:", error);
        throw error;
    }
}


export async function generateQuizAndScriptFromTheme() {
    const config = {
        theme: C.themeInput.value.trim(),
        numQuestions: C.questionCountInput.value,
        numAnswers: C.answerCountInput.value,
        difficulty: C.difficultyInput.value
    };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
    
    const systemPrompt = `Você é o "Tio do Quiz", um especialista em criar conteúdo viral para o TikTok. Sua tarefa é gerar um quiz em formato JSON e um roteiro de narração. O roteiro deve ser EXTREMAMENTE objetivo, lendo apenas a pergunta, as alternativas e a resposta correta, sem explicações. Responda estritamente no formato JSON especificado, sem markdown.`;
    
    const userQuery = `Gere um quiz e um roteiro para o TikTok (vídeo de 1 minuto).
    Tema: "${config.theme}"
    Dificuldade: "${config.difficulty}"
    Número de Perguntas: ${config.numQuestions}
    Número de Alternativas por Pergunta: ${config.numAnswers}

    O roteiro (script) deve ser a narração EXATA do quiz, pronto para text-to-speech.
    O roteiro deve seguir o formato:
    "Pergunta 1: [Texto da Pergunta]. Alternativa A: [Texto]. Alternativa B: [Texto]. Alternativa C: [Texto]. Resposta correta: [Letra], [Texto da Resposta].
    Pergunta 2: [Texto da Pergunta]. ..."
    
    Seja direto e rápido, sem explicações extras nas respostas.`;

    const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userQuery }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "quiz": {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                "question": { "type": "STRING" },
                                "answers": { "type": "ARRAY", "items": { "type": "OBJECT", "properties": { "text": { "type": "STRING" } } } },
                                "correctIndex": { "type": "NUMBER" }
                            },
                            required: ["question", "answers", "correctIndex"]
                        }
                    },
                    "script": { "type": "STRING" } 
                },
                required: ["quiz", "script"]
            }
        }
    };

    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`Erro de rede da API: ${response.status} ${response.statusText}`);
    const result = await response.json();
    if (!result.candidates || result.candidates.length === 0) throw new Error("A IA não retornou um resultado. O tema pode ter sido bloqueado.");
    const part = result.candidates[0]?.content?.parts?.[0];
    if (!part || !part.text) throw new Error("A IA retornou uma resposta em um formato inesperado.");
    return JSON.parse(part.text);
}


// --- ATUALIZAÇÃO (Refatoração de Áudio) ---
export async function handleGenerateContentClick() {
    const theme = C.themeInput.value.trim();
    if (!theme) {
        alert("Por favor, insira um tema para gerar o quiz.");
        return;
    }
    
    C.generateContentBtn.disabled = true;
    C.generateContentBtn.textContent = "Limpando áudios...";
    C.generationOutput.classList.add('hidden');
    
    // --- CORREÇÃO DO BUG: Limpa os áudios antigos PRIMEIRO ---
    releaseAudioBlobs();
    settings.generatedAudio = null;
    // ----------------------------------------------------

    C.generateContentBtn.textContent = "Gerando Quiz...";

    try {
        // 1. Gera o Quiz (JSON) e o Roteiro (para .txt)
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

        // 3. Gera os áudios em sequência
        const generatedAudioBlobs = {};
        let count = 1;
        const total = audioTexts.length;

        for (const item of audioTexts) {
            C.generateContentBtn.textContent = `Gerando áudio (${count}/${total})...`;
            try {
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