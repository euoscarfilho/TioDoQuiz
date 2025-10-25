import * as C from './constants.js';
import { settings, saveRecentTheme, saveSettings } from './state.js';

// --- CHAVES DE API (AGORA LIDAS DO ESTADO/LOCALSTORAGE) ---

/**
 * Busca um arquivo de áudio da API Eleven Labs TTS.
 * Retorna um Blob URL para o áudio.
 */
async function fetchAudio(text, speed = 1.20) {
    const ELEVENLABS_API_KEY = settings.elevenLabsApiKey;
    if (!ELEVENLABS_API_KEY) {
        throw new Error("Chave da API do Eleven Labs não configurada.");
    }
    
    const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/NOpBlnGInO9m6vDvFkFC`; // ID da Voz Fixo
    
    const payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": { "stability": 0.5, "similarity_boost": 0.75, "speed": speed }
    };

    try {
        await new Promise(resolve => setTimeout(resolve, 500)); 

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            if (response.status === 429) {
                console.warn("API ElevenLabs 429 (Rate Limit). Aguardando 5 segundos...");
                await new Promise(resolve => setTimeout(resolve, 5000));
                return fetchAudio(text, speed); 
            }
             if (response.status === 401) {
                throw new Error("Erro na API TTS: 401. Verifique sua chave de API do Eleven Labs.");
            }
             if (response.status === 404) {
                 throw new Error("Erro na API TTS: 404. O ID da voz está incorreto ou não foi encontrado.");
             }
            throw new Error(`Erro na API TTS: ${response.status} ${response.statusText}`);
        }

        const audioBlob = await response.blob();
        
        if (audioBlob.type === 'audio/mpeg') {
            return URL.createObjectURL(audioBlob);
        } else {
            throw new Error("Resposta de áudio inválida da API Eleven Labs.");
        }

    } catch (error) {
        console.error(`Falha ao gerar áudio para: "${text}"`, error);
        throw error; 
    }
}

/**
 * Busca os créditos restantes da conta Eleven Labs.
 * Retorna uma string formatada.
 */
async function fetchElevenLabsCredits() {
    const ELEVENLABS_API_KEY = settings.elevenLabsApiKey;
    if (!ELEVENLABS_API_KEY) return "Chave não informada.";

    const apiUrl = 'https://api.elevenlabs.io/v1/user';
    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'xi-api-key': ELEVENLABS_API_KEY }
        });
        if (!response.ok) {
            throw new Error(`Erro ao buscar créditos: ${response.status}`);
        }
        const data = await response.json();
        const used = data.subscription.character_count;
        const limit = data.subscription.character_limit;
        const remaining = limit - used;
        return `${remaining.toLocaleString('pt-BR')} caracteres restantes`;
    } catch (error) {
        console.warn("Não foi possível buscar os créditos:", error.message);
        return "Créditos não puderam ser verificados.";
    }
}


// --- LÓGICA DE GERAÇÃO DE CONTEÚDO E ROTEIRO ---

export async function generateQuizAndScriptFromTheme() {
    const config = {
        theme: C.themeInput.value.trim(),
        numQuestions: C.questionCountInput.value,
        numAnswers: C.answerCountInput.value,
        difficulty: C.difficultyInput.value
    };
    
    const GOOGLE_API_KEY = settings.googleApiKey;
    if (!GOOGLE_API_KEY) {
        throw new Error("Chave da API do Google (Gemini) não configurada.");
    }
    
    // --- PASSO 1: Gerar o Quiz (Texto com Gemini) ---
    const quizApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GOOGLE_API_KEY}`;
    const systemPromptQuiz = `Você é o "Tio do Quiz", um especialista em criar quizzes divertidos e desafiadores em português do Brasil. Responda estritamente no formato JSON especificado. Não inclua markdown ou qualquer texto fora do objeto JSON.`;
    const userQueryQuiz = `Crie um quiz de nível de dificuldade "${config.difficulty}" sobre o tema "${config.theme}" com exatamente ${config.numQuestions} perguntas. As perguntas devem ser curtas e objetivas. Cada pergunta deve ter exatamente ${config.numAnswers} alternativas.`;

    const quizPayload = {
        systemInstruction: { parts: [{ text: systemPromptQuiz }] },
        contents: [{ parts: [{ text: userQueryQuiz }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { "question": { "type": "STRING" }, "answers": { "type": "ARRAY", "items": { "type": "OBJECT", "properties": { "text": { "type": "STRING" } } } }, "correctIndex": { "type": "NUMBER" } }, "required": ["question", "answers", "correctIndex"] } }
        }
    };

    let quizData, script;
    
    try {
        const response = await fetch(quizApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(quizPayload) });
        if (!response.ok) {
             if (response.status === 400) {
                 throw new Error("Erro na API Gemini: 400. Verifique sua chave de API do Google.");
             }
            throw new Error(`Erro na API Gemini: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        const part = result.candidates[0]?.content?.parts?.[0];
        if (!part || !part.text) throw new Error("A IA retornou uma resposta em um formato inesperado.");
        quizData = JSON.parse(part.text);
    } catch (error) {
        console.error("Falha ao gerar o quiz:", error);
        throw new Error(`Falha ao gerar o quiz. Motivo: ${error.message}`);
    }

    // --- PASSO 2: Preparar Textos para Áudio e Roteiro ---
    const textsToGenerate = [];
    const scriptLines = [];
    scriptLines.push(`Roteiro do Quiz: ${config.theme}\n`);
    scriptLines.push("--- INÍCIO ---\n");
    
    // Variações de Boas-Vindas
    const welcomeOptions = [
        "Fala galera! Tio do Quiz na área, vamos ao quizz de hoje!",
        "E aí, tudo pronto? Tio do Quiz aqui! Vamos começar o desafio!",
        "Beleza, pessoal! Aqui é o Tio do Quiz. Prepare-se para o quiz!"
    ];
    const welcomeText = welcomeOptions[Math.floor(Math.random() * welcomeOptions.length)];
    textsToGenerate.push({ id: `welcome`, text: welcomeText });
    scriptLines.push("(Começa a tela de pré-jogo)\n");
    scriptLines.push(welcomeText + "\n");
    scriptLines.push("PRONTO PARA O DESAFIO?\n");
    scriptLines.push("DUVIDO VOCÊ ACERTAR\n");
    scriptLines.push("\n(Inicia o quiz)\n");
    
    // Texto do Tema
    const themeText = `O quiz de hoje é sobre ${config.theme}!`;
    textsToGenerate.push({ id: `quiz_theme`, text: themeText });
    scriptLines.push(themeText + "\n");

    const audioMap = {};

    for (let i = 0; i < quizData.length; i++) {
        const item = quizData[i];
        
        // Pergunta
        const questionText = `${item.question}`; 
        textsToGenerate.push({ id: `q${i}_q`, text: questionText });
        scriptLines.push(`Pergunta ${i + 1}: ${item.question}`);

        // Alternativas (apenas para o roteiro em .txt)
        for (let j = 0; j < item.answers.length; j++) {
            const letter = String.fromCharCode(65 + j);
            const answerText = `Alternativa ${letter}. ${item.answers[j].text}`;
            scriptLines.push(answerText);
        }

        // Timer e Resposta
        scriptLines.push("\n(Inicia o timer de 5 segundos...)\n");
        const correctText = item.answers[item.correctIndex].text;
        const revealText = `A resposta correta é... ${correctText}!`;
        textsToGenerate.push({ id: `q${i}_r`, text: revealText }); 
        scriptLines.push(revealText);
        scriptLines.push("\n---\n");
    }

    scriptLines.push("\n(Tela final de CTA)\n");
    
    // Variações de CTA Final
    const ctaOptions = [
        "E aí? Qual foi o seu resultado? Se curtiu, desafia seus amigos. Te vejo na próxima!",
        "Mandou bem! Qual foi a pontuação? Comenta aí, desafie um amigo e me siga para mais!",
        "Quiz finalizado! Comenta o seu resultado e não esquece de seguir o Tio do Quiz!"
    ];
    const ctaText = ctaOptions[Math.floor(Math.random() * ctaOptions.length)];
    textsToGenerate.push({ id: `cta_final`, text: ctaText }); // Áudio do CTA
    scriptLines.push(ctaText);
    scriptLines.push("\n--- FIM ---");
    
    script = scriptLines.join('\n');
    
    // --- PASSO 3: Gerar Áudios em Série (com Eleven Labs) ---
    let creditsRemaining = "N/A";
    try {
        console.log("Iniciando geração de áudios em série com Eleven Labs...");
        for (const item of textsToGenerate) {
            console.log(`Gerando áudio para: ${item.text.substring(0, 30)}...`);
            const blobUrl = await fetchAudio(item.text);
            audioMap[item.id] = blobUrl;
            console.log(`Áudio gerado para: ${item.id}`);
        }
        console.log("Geração de áudios concluída.");

        // --- PASSO 4: Verificar Créditos DEPOIS de gerar
        creditsRemaining = await fetchElevenLabsCredits();
        console.log("Créditos restantes:", creditsRemaining);

    } catch (error) {
         console.error("Falha ao gerar áudios:", error);
         throw new Error(`Falha ao gerar os áudios TTS. Motivo: ${error.message}`);
    }

    // Retorna tudo
    return { quiz: quizData, script: script, audioMap: audioMap, credits: creditsRemaining };
}


export async function handleGenerateContentClick() {
    // Verifica se as chaves estão salvas no 'settings'
    if (!settings.googleApiKey || !settings.elevenLabsApiKey) {
         alert("Por favor, configure suas chaves de API do Google e Eleven Labs na tela de Personalização.");
         return;
    }

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
        settings.generatedAudioMap = result.audioMap; 
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

