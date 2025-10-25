import * as C from './constants.js';
import { settings, saveRecentTheme, saveSettings, supabase } from './state.js';

// --- LÓGICA DE CHAVES (Salvar no Supabase) ---
export async function handleSaveKeyClick() {
    const keyName = C.keyNameInput.value.trim();
    const keyValue = C.elevenLabsApiKeyInput.value.trim();

    if (!keyName || !keyValue) {
        alert("Por favor, preencha o nome e a chave da API.");
        return;
    }

    try {
        // Verifica se o usuário está autenticado para obter o ID
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Usuário não autenticado para salvar chave.");
        
        const { error: insertError } = await supabase
            .from('elevenlabs_keys')
            .insert([
                { nome_da_chave: keyName, api_key: keyValue, user_id: user.id } 
            ]);
        
        if (insertError) {
            throw insertError;
        }

        console.log("Chave salva com sucesso para o usuário:", user.id);
        C.keyNameInput.value = '';
        C.elevenLabsApiKeyInput.value = '';
        alert("Chave do Eleven Labs salva com sucesso!");
        
        // Recarrega a lista de chaves (importando a função)
        import('./ui.js').then(ui => ui.loadKeysIntoList());

    } catch (error) {
        console.error("Erro ao salvar chave:", error);
        alert(`Erro ao salvar chave: ${error.message}`);
    }
}

// CORREÇÃO: Adicionando 'export' para que script.js possa acessar
export function handleSaveSupabaseUrlClick() {
    const url = C.supabaseUrlInput.value.trim();
    if (!url || !url.startsWith('https://')) {
        alert("Por favor, insira uma URL HTTPS válida.");
        return;
    }
    
    // Simplesmente atualiza o campo no objeto settings e salva no localStorage
    settings.supabaseFunctionUrl = url;
    saveSettings(); 
    alert("URL da Função Supabase salva com sucesso!");
}


// --- GERAÇÃO DE ÁUDIO (CHAMA A EDGE FUNCTION) ---
async function fetchAudio(text, speed = 1.20) {
    // Esta função agora está dentro do backend (index.ts)
    // O frontend só precisa do áudioMap que vem do backend.
    throw new Error("Função fetchAudio não deve ser chamada pelo frontend.");
}

/**
 * Busca os créditos restantes da conta Eleven Labs.
 * Retorna uma string formatada.
 */
async function fetchElevenLabsCredits() {
    throw new Error("Função fetchElevenLabsCredits não deve ser chamada pelo frontend.");
}


// --- LÓGICA DE GERAÇÃO DE CONTEÚDO E ROTEIRO ---

export async function generateQuizAndScriptFromTheme() {
    const config = {
        theme: C.themeInput.value.trim(),
        numQuestions: C.questionCountInput.value,
        numAnswers: C.answerCountInput.value,
        difficulty: C.difficultyInput.value
    };
    
    // Pega a URL da função salva nas configurações
    const SUPABASE_FUNCTION_URL = settings.supabaseFunctionUrl;
    if (!SUPABASE_FUNCTION_URL) {
        throw new Error("URL da Função Supabase não configurada na tela de Personalização.");
    }
    
    // --- CHAMA O NOSSO BACKEND SEGURO (A EDGE FUNCTION) ---
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
        throw new Error("Usuário não autenticado. Faça o login novamente.");
    }
    const token = sessionData.session.access_token;
    
    // A chamada envia o token de autenticação
    const response = await fetch(SUPABASE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // ENVIA O TOKEN JWT
        },
        body: JSON.stringify(config)
    });

    if (!response.ok) {
        // Tenta ler o erro do corpo da resposta, se disponível
        const errorBody = await response.json().catch(() => ({ error: `Erro HTTP ${response.status}` }));
        
        // Trata erros 401 e 400 explicitamente
        if (response.status === 401) {
            throw new Error(`Erro de Segurança: 401 (Não Autorizado). Verifique as políticas RLS no Supabase.`);
        }
         if (response.status === 400) {
            throw new Error(`Erro de Requisição: 400. Verifique as variáveis de ambiente no Supabase Secrets.`);
        }
        
        throw new Error(errorBody.error || `Erro no servidor: ${response.status}`);
    }

    const result = await response.json();
    
    // Converte os áudios de Base64 (do backend) para Blob URLs
    const audioMap = {};
    if (result.audioMap) {
        for (const key in result.audioMap) {
            const base64Data = result.audioMap[key].split(',')[1];
            if (!base64Data) {
                console.warn(`Áudio inválido recebido para: ${key}`);
                continue;
            }
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes.buffer], { type: 'audio/mpeg' });
            audioMap[key] = URL.createObjectURL(blob);
        }
    } else {
         throw new Error("O backend não retornou um mapa de áudios.");
    }

    return {
        quiz: result.quiz,
        script: result.script,
        audioMap: audioMap,
        credits: result.credits
    };
}


export async function handleGenerateContentClick() {
    if (!settings.supabaseFunctionUrl) {
         alert("Por favor, configure a URL da sua Função Supabase na tela de Personalização.");
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
        saveSettings(); // Salva o quiz, script e áudios na memória local

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
