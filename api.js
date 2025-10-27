import * as C from './constants.js';
import { settings, saveRecentTheme, saveSettings } from './state.js';

// --- LÓGICA DE GERAÇÃO DE CONTEÚDO E ROTEIRO ---

export async function generateQuizAndScriptFromTheme() {
    const config = {
        theme: C.themeInput.value.trim(),
        numQuestions: C.questionCountInput.value,
        numAnswers: C.answerCountInput.value,
        difficulty: C.difficultyInput.value
    };
    const apiKey = "AIzaSyDARpDwQ918DzKAtd374ab_yxa2N8akaZ0";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    const systemPrompt = `Você é o "Tio do Quiz", um especialista em criar conteúdo viral para o TikTok. Sua tarefa é gerar um quiz em formato JSON e um roteiro de narração para um vídeo. Responda estritamente no formato JSON especificado, sem markdown ou qualquer texto fora do objeto JSON.`;
    const userQuery = `Gere um quiz e um roteiro para o TikTok.
    Tema: "${config.theme}"
    Dificuldade: "${config.difficulty}"
    Número de Perguntas: ${config.numQuestions}
    Número de Alternativas por Pergunta: ${config.numAnswers}

    O roteiro deve ser uma narração objetiva para o "Tio do Quiz", com as perguntas, alternativas e respostas, e uma chamada para ação (CTA) no final pedindo para comentar a pontuação e seguir o perfil. As perguntas no roteiro devem ser curtas e diretas.`;

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

export async function handleGenerateContentClick() {
    const theme = C.themeInput.value.trim();
    if (!theme) {
        alert("Por favor, insira um tema para gerar o quiz.");
        return;
    }
    
    C.generateContentBtn.disabled = true;
    C.generateContentBtn.textContent = "Gerando...";
    C.generationOutput.classList.add('hidden');

    try {
        const result = await generateQuizAndScriptFromTheme();
        settings.generatedQuiz = result.quiz;
        settings.generatedScript = result.script;
        saveRecentTheme(theme);
        saveSettings();

        C.generationSuccessMsg.textContent = `Quiz e roteiro sobre "${theme}" gerados com sucesso!`;
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
