/**
 * ESTE ARQUIVO RODA NO SERVIDOR (VERCEL/NETLIFY).
 * Ele atua como um proxy seguro para a API do Gemini.
 */

// A Vercel não precisa de "import fetch", ele já está disponível.

export default async function handler(request, response) {
    // 1. Apenas permite requisições POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // 2. Pega a Chave Secreta das Variáveis de Ambiente (do "Passo 4")
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            throw new Error("Chave da API do Gemini não configurada no servidor.");
        }

        // 3. Pega a configuração que o seu App enviou (o "config" do fetch)
        const { theme, numQuestions, numAnswers, difficulty } = request.body;

        // 4. Monta o Prompt (lógica copiada do seu api.js original)
        const systemPrompt = `Você é o "Tio do Quiz", um especialista em criar conteúdo viral para o TikTok. Sua tarefa é gerar um quiz em formato JSON e um roteiro de narração. O roteiro deve ser EXTREMAMENTE objetivo, lendo apenas a pergunta, as alternativas e a resposta correta, sem explicações. Responda estritamente no formato JSON especificado, sem markdown.`;
    
        const userQuery = `Gere um quiz e um roteiro para o TikTok (vídeo de 1 minuto).
        Tema: "${theme}"
        Dificuldade: "${difficulty}"
        Número de Perguntas: ${numQuestions}
        Número de Alternativas por Pergunta: ${numAnswers}

        O roteiro (script) deve ser a narração EXATA do quiz, pronto para text-to-speech.
        O roteiro deve seguir o formato:
        "Pergunta 1: [Texto da Pergunta]. Alternativa A: [Texto]. Alternativa B: [Texto]. Alternativa C: [Texto]. Resposta correta: [Letra], [Texto da Resposta].
        Pergunta 2: [Texto da Pergunta]. ..."
        
        Seja direto e rápido, sem explicações extras nas respostas.`;

        // 5. Monta o Payload (lógica copiada do seu api.js original)
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

        // 6. Faz a chamada segura para a API do Gemini
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
        
        const geminiResponse = await fetch(apiUrl, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            throw new Error(`Erro da API Gemini: ${geminiResponse.status} - ${errorBody}`);
        }

        const result = await geminiResponse.json();
        
        // 7. Processa a resposta e envia o JSON limpo de volta para o App
        const part = result.candidates[0]?.content?.parts?.[0];
        if (!part || !part.text) {
            throw new Error("A IA retornou uma resposta em um formato inesperado.");
        }
        
        // O app espera o JSON.parse(part.text)
        const finalJson = JSON.parse(part.text);
        
        response.status(200).json(finalJson);

    } catch (error) {
        console.error("Erro na função /api/generateQuiz:", error.message);
        response.status(500).json({ error: error.message });
    }
}