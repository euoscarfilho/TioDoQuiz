import * as C from './constants.js';
import { settings, isRecording, setRecordingState } from './state.js';

// --- LÓGICA DE GRAVAÇÃO DE TELA (COM RECORTE) ---
let mediaRecorder;
let recordedChunks = [];
let originalStream;
let animationFrameId;
let hiddenVideo;

export async function startRecording() {
    console.log("Tentando iniciar gravação...");
    setRecordingState(true); 
    try {
        originalStream = await navigator.mediaDevices.getDisplayMedia({
            video: { 
                mediaSource: "screen",
                cursor: "never" 
            },
            audio: true 
        });
         console.log("Stream da tela obtido:", originalStream);

        const videoTrack = originalStream.getVideoTracks()[0];
        let audioTracks = originalStream.getAudioTracks();
        console.log("Faixas de vídeo:", videoTrack);
        console.log("Faixas de áudio da tela:", audioTracks);

        let micStream = null;
        let micAudioTracks = [];
        if (audioTracks.length === 0) {
             console.warn("Nenhum áudio do sistema capturado, tentando microfone...");
             try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                micAudioTracks = micStream.getAudioTracks();
                console.log("Faixas de áudio do microfone:", micAudioTracks);
             } catch(micError) {
                  console.warn("Não foi possível capturar áudio do microfone:", micError);
             }
        }
        
        const finalAudioTracks = audioTracks.length > 0 ? audioTracks : micAudioTracks;


        hiddenVideo = document.createElement('video');
        hiddenVideo.autoplay = true;
        hiddenVideo.muted = true;
        hiddenVideo.srcObject = new MediaStream([videoTrack]);
        
        await new Promise((resolve, reject) => {
            hiddenVideo.onloadedmetadata = resolve;
            hiddenVideo.onerror = reject; 
        });
        await hiddenVideo.play(); 
        console.log("Vídeo oculto iniciado.");
        
        const ctx = C.croppingCanvas.getContext('2d');
        
        function drawCrop() {
             if (!hiddenVideo || hiddenVideo.paused || hiddenVideo.ended || !isRecording) {
                console.warn("Loop de desenho parado.");
                cancelAnimationFrame(animationFrameId);
                return;
            }
            try {
                const rect = C.gameArea.getBoundingClientRect(); 
                const scale = window.devicePixelRatio || 1; 
                C.croppingCanvas.width = Math.round(rect.width * scale);
                C.croppingCanvas.height = Math.round(rect.height * scale);
                ctx.scale(scale, scale); 

                const sourceX = rect.left * (hiddenVideo.videoWidth / window.innerWidth);
                const sourceY = rect.top * (hiddenVideo.videoHeight / window.innerHeight);
                const sourceWidth = rect.width * (hiddenVideo.videoWidth / window.innerWidth);
                const sourceHeight = rect.height * (hiddenVideo.videoHeight / window.innerHeight);

                ctx.drawImage(hiddenVideo, 
                    sourceX, sourceY, sourceWidth, sourceHeight,
                    0, 0, rect.width, rect.height
                );
                 
                ctx.setTransform(1, 0, 0, 1, 0, 0); 

                animationFrameId = requestAnimationFrame(drawCrop);
            } catch (err) {
                 console.error("Erro no loop de desenho:", err);
                 cancelAnimationFrame(animationFrameId);
                 forceStopRecording(); 
            }
        }
        
         hiddenVideo.onplay = () => {
             cancelAnimationFrame(animationFrameId); 
             animationFrameId = requestAnimationFrame(drawCrop);
             console.log("Loop de desenho iniciado via onplay.");
        };
         if (!hiddenVideo.paused) {
             cancelAnimationFrame(animationFrameId);
             animationFrameId = requestAnimationFrame(drawCrop);
             console.log("Loop de desenho iniciado (vídeo já tocando).");
         }


        const canvasStream = C.croppingCanvas.captureStream(30);
        const combinedStream = new MediaStream();

        canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
        console.log("Faixa de vídeo do Canvas adicionada.");

        if (finalAudioTracks.length > 0) {
             combinedStream.addTrack(finalAudioTracks[0].clone());
             console.log("Faixa de áudio final adicionada ao combinedStream.");
        } else {
             console.warn("Nenhuma faixa de áudio será incluída na gravação.");
        }
        
        console.log("Stream combinado FINAL - Faixas de Vídeo:", combinedStream.getVideoTracks());
        console.log("Stream combinado FINAL - Faixas de Áudio:", combinedStream.getAudioTracks());

        const mimeType = 'video/webm;codecs=vp9,opus'; 
        if (!MediaRecorder.isTypeSupported(mimeType)) {
             console.warn(`${mimeType} não suportado, usando default.`);
             mediaRecorder = new MediaRecorder(combinedStream); 
        } else {
            mediaRecorder = new MediaRecorder(combinedStream, { mimeType: mimeType });
        }

        recordedChunks = [];
        console.log("MediaRecorder criado com mimeType:", mediaRecorder.mimeType);

        mediaRecorder.ondataavailable = (event) => { 
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
                console.log("Chunk recebido, tamanho:", event.data.size);
            } else {
                 console.log("Chunk vazio recebido.");
            }
        };

        mediaRecorder.onstop = () => {
            console.log("MediaRecorder parado. Chunks:", recordedChunks.length);
            setTimeout(() => { 
                if (recordedChunks.length === 0) {
                    console.warn("Nenhum dado gravado.");
                    alert("A gravação não capturou nenhum dado. Verifique as permissões ou tente novamente.");
                    forceStopRecording();
                    return;
                }
                const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
                console.log("Blob criado, tipo:", blob.type, "tamanho:", blob.size);
                if (blob.size < 1000) { 
                    console.warn("Blob muito pequeno, possível problema na gravação.");
                    alert("A gravação gerou um arquivo muito pequeno. Pode ter ocorrido um erro.");
                }
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `quiz_${settings.theme.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.webm`;
                a.textContent = 'Baixar Vídeo (9:16)';
                a.className = 'external-button bg-green-600 hover:bg-green-700';
                
                C.downloadContainer.innerHTML = ''; 
                C.downloadContainer.appendChild(a);
                console.log("Link de download criado.");

                forceStopRecording(); 
            }, 500); 

        };

        mediaRecorder.start(1000); 
        console.log("Gravação iniciada.");
        setRecordingState(true); 
        
        originalStream.getVideoTracks()[0].onended = () => {
            console.log("Compartilhamento de tela encerrado pelo usuário.");
            stopRecordingAndDownload();
        }

        return true; 
    } catch (error) {
        console.error("Erro detalhado ao iniciar a gravação:", error);
        
        let errorMessage = error.message || "Erro desconhecido.";
        if (error.name === 'NotAllowedError') {
             errorMessage = "Permissão negada para gravação de tela e/ou áudio. Verifique as permissões do navegador.";
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError'){
             errorMessage = "Nenhum dispositivo de captura de tela/áudio encontrado ou compatível.";
        } else if (error instanceof DOMException && error.message.includes('permission')) {
             errorMessage = "Erro de permissão. Verifique se o acesso à tela e ao áudio está liberado nas configurações do seu navegador.";
        } else if (error instanceof ReferenceError && error.message.includes("Cannot access 'originalStream'")) {
            errorMessage = "Erro de inicialização da gravação. Tente novamente.";
        } else if (error instanceof TypeError && error.message.includes("null (reading 'getTracks')")) {
             errorMessage = "Erro ao obter faixas de mídia. O stream não foi iniciado. Verifique as permissões.";
        }
        
        alert(`Erro ao iniciar gravação: ${errorMessage}. Verifique o console para detalhes.`);
        
        forceStopRecording(); 
        setRecordingState(false); 
        return false; 
    }
}

export function stopRecordingAndDownload() {
    console.log("Chamando stopRecordingAndDownload...");
    
    if (mediaRecorder && mediaRecorder.state === "recording") {
        console.log("Parando MediaRecorder...");
        mediaRecorder.stop(); 
    } else {
         console.log("MediaRecorder não está gravando ou já foi parado.");
         forceStopRecording(); 
         setRecordingState(false); 
    }
    setRecordingState(false);
}

export function forceStopRecording() {
    console.log("Forçando parada e limpeza dos recursos de gravação...");
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;

    if (originalStream) {
        originalStream.getTracks().forEach(track => track.stop());
        originalStream = null;
        console.log("Stream original parado.");
    }
    
    if (hiddenVideo) {
        hiddenVideo.pause();
        hiddenVideo.srcObject = null;
        hiddenVideo = null;
        console.log("Vídeo oculto parado e liberado.");
    }

    if (mediaRecorder) {
        mediaRecorder.ondataavailable = null; 
        mediaRecorder.onstop = null;
        if(mediaRecorder.state === "recording") {
            try {
                mediaRecorder.stop(); 
                console.log("MediaRecorder parado.");
            } catch (e) {
                 console.error("Erro ao parar MediaRecorder:", e);
            }
        }
        mediaRecorder = null;
    }
    
    recordedChunks = [];
    setRecordingState(false); 
    console.log("Recursos de gravação limpos.");
}

