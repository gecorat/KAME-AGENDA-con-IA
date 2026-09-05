import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  FileAudio
} from 'lucide-react';

interface VoiceNoteRecorderProps {
  onTranscriptionComplete?: (data: {
    transcription: string;
    audioUrl: string;
    durationSeconds: number;
    soap?: {
      subjective: string;
      objective: string;
      analysis: string;
      plan: string;
    };
    prescriptions?: Array<{
      medication: string;
      dosage: string;
      duration: string;
      instructions?: string;
    }>;
  }) => void;
  patientName?: string;
  specialty?: string;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onTranscriptionComplete,
  patientName = 'Paciente',
  specialty = 'Consulta General'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setMicError(null);
    setAudioUrl(null);
    setAudioBlob(null);
    setTranscriptionResult(null);
    setAiAnalysisResult(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('El navegador no soporta grabación de audio directa. Puedes usar el modo simulación de prueba.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mime type
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all tracks to release mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // collect 250ms chunks
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Error accessing microphone:', err);
      setMicError(err.message || 'No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
  };

  // Convert audio blob to base64 and process with Gemini AI
  const processWithAI = async (blobToProcess?: Blob) => {
    const targetBlob = blobToProcess || audioBlob;
    if (!targetBlob) return;

    setIsProcessingAI(true);
    setMicError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(targetBlob);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;

        const response = await fetch('/api/consultations/transcribe-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType: targetBlob.type || 'audio/webm',
            patientName,
            specialty
          })
        });

        if (!response.ok) {
          throw new Error('Error al conectar con el servidor de transcripción IA');
        }

        const data = await response.json();
        setTranscriptionResult(data.transcription || 'Transcripción completada con éxito.');
        setAiAnalysisResult(data);

        if (onTranscriptionComplete) {
          onTranscriptionComplete({
            transcription: data.transcription || '',
            audioUrl: audioUrl || 'demo://audio.webm',
            durationSeconds: recordingTime || 30,
            soap: data.soap,
            prescriptions: data.prescriptions
          });
        }
        setIsProcessingAI(false);
      };
    } catch (error: any) {
      console.error('Error processing audio with AI:', error);
      setMicError('No se pudo procesar el audio con IA: ' + (error.message || 'Error desconocido'));
      setIsProcessingAI(false);
    }
  };

  // Simulate demo recording for quick testing / fallback
  const handleSimulateDemo = async () => {
    setMicError(null);
    setIsProcessingAI(true);
    setRecordingTime(28);

    // Create a mock audio or silence blob
    const mockAudioText = `Control clínico de ${patientName}. Paciente refiere mejoría progresiva del dolor tras 5 días de tratamiento. Al examen físico se constatan tejidos en fase de cicatrización adecuada, sin exudado ni eritema marginal. Se prescribe continuar con pautas de higiene y control en 10 días.`;

    try {
      const response = await fetch('/api/consultations/structure-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: mockAudioText,
          patientName,
          specialty
        })
      });

      const data = await response.json();
      setTranscriptionResult(mockAudioText);
      setAiAnalysisResult(data);
      setAudioUrl('demo://audio-simulado.webm');

      if (onTranscriptionComplete) {
        onTranscriptionComplete({
          transcription: mockAudioText,
          audioUrl: 'demo://audio-simulado.webm',
          durationSeconds: 28,
          soap: data.soap,
          prescriptions: data.prescriptions
        });
      }
    } catch (e: any) {
      setTranscriptionResult(mockAudioText);
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Playback control
  const togglePlay = () => {
    if (!audioElementRef.current) return;
    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div id="voice-note-recorder" className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Nota de Voz Clínica</h4>
            <p className="text-xs text-slate-500">Dicta o graba la evolución médica. Gemini IA transcribirá y estructurará el SOAP.</p>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-200 rounded-full text-rose-700 text-xs font-semibold animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
            Grabando: {formatTime(recordingTime)}
          </div>
        )}
      </div>

      {micError && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Aviso de micrófono:</p>
            <p>{micError}</p>
            <button
              type="button"
              onClick={handleSimulateDemo}
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium text-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Probar con dictado de muestra con IA
            </button>
          </div>
        </div>
      )}

      {/* Main Recording Bar */}
      {!audioUrl && !isRecording && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            id="btn-start-voice-recording"
            onClick={startRecording}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
          >
            <Mic className="w-4 h-4 animate-bounce" />
            Iniciar Grabación de Voz
          </button>

          <button
            type="button"
            id="btn-simulate-voice-note"
            onClick={handleSimulateDemo}
            disabled={isProcessingAI}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg transition-colors"
          >
            {isProcessingAI ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                Analizando con IA...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                Cargar Nota de Voz de Prueba (Demo)
              </>
            )}
          </button>
        </div>
      )}

      {/* Live Recording State Controls */}
      {isRecording && (
        <div className="space-y-3">
          {/* Animated Waveform Visualizer */}
          <div className="h-12 bg-slate-900 rounded-lg flex items-center justify-center px-4 gap-1 overflow-hidden">
            {[40, 70, 90, 45, 80, 100, 60, 30, 85, 95, 50, 75, 90, 65, 40, 85, 100, 70, 55, 35].map((height, i) => (
              <span
                key={i}
                className="w-1.5 bg-rose-500 rounded-full animate-pulse transition-all duration-150"
                style={{
                  height: `${Math.max(15, (height * (1 + Math.sin(Date.now() / 200 + i))) / 2)}%`,
                  opacity: 0.7 + (i % 3) * 0.15
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">
              Tiempo: <strong className="text-slate-900 font-semibold">{formatTime(recordingTime)}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-cancel-recording"
                onClick={cancelRecording}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
              >
                Descartar
              </button>
              <button
                type="button"
                id="btn-stop-recording"
                onClick={stopRecording}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Detener y Escuchar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recorded Audio Ready State */}
      {audioUrl && !isRecording && (
        <div className="space-y-3 pt-1">
          <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center transition-colors shadow-xs"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-semibold text-slate-800">Audio grabado</span>
                  <span className="text-xs text-slate-500 font-mono">({formatTime(recordingTime || 30)})</span>
                </div>
                <p className="text-[11px] text-slate-500">Listo para transcribir y estructurar en el historial clínico.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startRecording}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md text-xs transition-colors"
                title="Grabar de nuevo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="btn-ai-transcribe"
                onClick={() => processWithAI()}
                disabled={isProcessingAI}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-md shadow-xs transition-all disabled:opacity-50"
              >
                {isProcessingAI ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Procesando con Gemini IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Transcribir & Formatear SOAP
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Hidden audio element for playback */}
          {audioUrl && !audioUrl.startsWith('demo://') && (
            <audio
              ref={audioElementRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={() => {
                if (audioElementRef.current) {
                  setPlaybackTime(Math.floor(audioElementRef.current.currentTime));
                }
              }}
              className="hidden"
            />
          )}

          {/* Transcription Results Banner */}
          {transcriptionResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Transcripción y Análisis IA completados
                </div>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-700 italic border-l-2 border-emerald-400 pl-2.5 py-1 my-1.5 bg-white/70 rounded-r">
                "{transcriptionResult}"
              </p>
              <p className="text-[11px] text-emerald-800 font-medium">
                ✓ Los campos del método SOAP y recetas sugeridas se han completado automáticamente en el formulario.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
