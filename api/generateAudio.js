/**
 * ESTE ARQUIVO RODA NO SERVIDOR (VERCEL/NETLIFY).
 * Ele atua como um proxy seguro para a API do ElevenLabs.
 */

export default async function handler(request, response) {
    // 1. Apenas permite requisições POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // 2. Pega as Chaves Secretas das Variáveis de Ambiente (do "Passo 4")
        const XI_API_KEY = process.env.ELEVENLABS_API_KEY;
        const XI_VOICE_ID = process.env.ELEVENLABS_VOICE_ID; // Você DEVE configurar isso na Vercel

        if (!XI_API_KEY || !XI_VOICE_ID) {
            throw new Error("Chaves da API ElevenLabs ou ID da Voz não configurados no servidor.");
        }

        // 3. Pega o texto que o seu App enviou
        const { text } = request.body;
        if (!text) {
            return response.status(400).json({ error: 'Nenhum texto fornecido.' });
        }

        // 4. Monta o Payload (lógica copiada do seu api.js original)
        const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${XI_VOICE_ID}/stream`;
        
        const payload = {
            "text": text, // O texto já vem limpo do cliente
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.3,
                "use_speaker_boost": true
            }
        };

        // 5. Faz a chamada segura para a API do ElevenLabs
        const elevenResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': XI_API_KEY
            },
            body: JSON.stringify(payload)
        });

        // 6. Verifica se a API do ElevenLabs retornou um erro
        if (!elevenResponse.ok) {
            const errorBody = await elevenResponse.text();
            throw new Error(`Erro da API ElevenLabs: ${elevenResponse.status} - ${errorBody}`);
        }

        // 7. Pega o áudio (como um ArrayBuffer)
        const audioBuffer = await elevenResponse.arrayBuffer();

        // 8. Envia o áudio de volta para o seu App
        // Define o cabeçalho para o navegador entender que é um áudio
        response.setHeader('Content-Type', 'audio/mpeg');
        // Envia os dados do áudio
        response.status(200).send(Buffer.from(audioBuffer));

    } catch (error) {
        console.error("Erro na função /api/generateAudio:", error.message);
        response.status(500).json({ error: error.message });
    }
}