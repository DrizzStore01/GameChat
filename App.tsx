import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AudioWaveform, Download, Loader2, Play, Pause, Volume2, Sparkles, RefreshCw } from 'lucide-react';
import { VoiceName, SAMPLE_RATE } from './types';
import { generateSpeech } from './services/geminiService';
import { decodeBase64, decodeAudioData, audioBufferToWav } from './utils/audio';
import { VoiceSelector } from './components/VoiceSelector';

const App: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Kore);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Initialize AudioContext
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
      });
    }
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const handleGenerate = async () => {
    if (!text.trim()) return;

    // Reset current audio state
    stopAudio();
    setAudioBuffer(null);
    setError(null);
    setIsGenerating(true);

    try {
      const base64Audio = await generateSpeech(text, selectedVoice);
      const rawBytes = decodeBase64(base64Audio);
      
      if (audioContextRef.current) {
        const buffer = await decodeAudioData(rawBytes, audioContextRef.current);
        setAudioBuffer(buffer);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal menghasilkan audio. Silakan coba lagi.');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateProgress = () => {
    if (audioContextRef.current && startTimeRef.current) {
      const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
      const duration = audioBuffer?.duration || 1;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setPlaybackProgress(progress);
      
      if (progress < 100) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        setIsPlaying(false);
        setPlaybackProgress(0);
        pauseTimeRef.current = 0;
      }
    }
  };

  const playAudio = () => {
    if (!audioBuffer || !audioContextRef.current) return;

    // Resume context if suspended (browser policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    sourceNodeRef.current = source;
    
    // Calculate start time based on pause time
    const offset = pauseTimeRef.current;
    startTimeRef.current = audioContextRef.current.currentTime - offset;
    
    source.start(0, offset);
    setIsPlaying(true);
    
    // Start progress loop
    cancelAnimationFrame(animationFrameRef.current);
    updateProgress();

    source.onended = () => {
       // This is handled in updateProgress for smoother UI sync
    };
  };

  const pauseAudio = () => {
    if (sourceNodeRef.current && audioContextRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
      setIsPlaying(false);
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackProgress(0);
    pauseTimeRef.current = 0;
    cancelAnimationFrame(animationFrameRef.current);
  }, []);

  const handleDownload = () => {
    if (!audioBuffer) return;
    const wavBlob = audioBufferToWav(audioBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sonicgen-${selectedVoice}-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 text-white selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <header className="mb-8 md:mb-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4 ring-1 ring-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <AudioWaveform className="w-8 h-8 text-indigo-400 mr-3" />
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 to-cyan-300">
              SonicGen AI
            </h1>
          </div>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto hidden md:block">
            Ubah teks menjadi suara berkualitas studio dengan teknologi Gemini Flash. 
          </p>
        </header>

        <main className="space-y-6 md:space-y-8">
          {/* Main Card */}
          <div 
            className={`
              bg-slate-900/50 backdrop-blur-xl border rounded-3xl p-5 md:p-8 relative overflow-hidden transition-all duration-500
              ${isGenerating 
                ? 'border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20' 
                : 'border-slate-800 shadow-2xl'
              }
            `}
          >
             {/* Decorative Elements */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Shimmer Overlay when Generating */}
            {isGenerating && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent -translate-x-full animate-shimmer pointer-events-none z-0" />
            )}

            <div className="relative z-10 space-y-6">
              
              {/* Voice Selector */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Volume2 size={16} /> Pilih Suara
                </label>
                <VoiceSelector 
                  selectedVoice={selectedVoice} 
                  onSelect={(v) => { stopAudio(); setSelectedVoice(v); }} 
                  disabled={isGenerating} 
                />
              </div>

              {/* Text Input */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  Teks Input
                </label>
                <div className="relative group">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Ketik sesuatu..."
                    className="w-full h-32 md:h-40 bg-slate-950/50 border border-slate-700 rounded-2xl p-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none font-light leading-relaxed text-base md:text-lg"
                    disabled={isGenerating}
                  />
                  {text.length > 0 && (
                    <div className="absolute bottom-4 right-4 text-xs text-slate-500 bg-slate-900/80 px-2 py-1 rounded-md border border-slate-700">
                      {text.length}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Area */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/50">
                <div className="text-slate-500 text-xs md:text-sm italic text-center md:text-left">
                  * Bahasa Indonesia & Inggris
                </div>
                
                <button
                  onClick={handleGenerate}
                  disabled={!text.trim() || isGenerating}
                  className={`
                    w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all duration-300
                    ${isGenerating 
                      ? 'bg-indigo-600/90 cursor-wait shadow-[0_0_20px_rgba(99,102,241,0.4)] animate-pulse' 
                      : !text.trim()
                        ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                        : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-105 hover:shadow-indigo-500/25 ring-1 ring-white/10'
                    }
                  `}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span className="md:inline">Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Generate Audio
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 animate-fade-in text-sm">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20">!</span>
              {error}
            </div>
          )}

          {/* Audio Player Result */}
          {audioBuffer && (
            <div className="bg-slate-800/40 backdrop-blur border border-slate-700 rounded-2xl p-4 md:p-6 shadow-xl animate-slide-up">
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                  {/* Play/Pause Button */}
                  <button
                    onClick={isPlaying ? pauseAudio : playAudio}
                    className="flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full bg-white text-indigo-600 flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-indigo-500/10"
                  >
                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                  </button>

                  {/* Mobile Title */}
                  <div className="md:hidden flex-1">
                    <div className="text-sm font-medium text-slate-300">Result</div>
                    <div className="text-xs text-slate-500">{audioBuffer.duration.toFixed(1)}s</div>
                  </div>
                </div>

                {/* Waveform Visualization (Simulated with progress bar) */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex justify-between text-xs text-slate-400 font-medium uppercase tracking-wider hidden md:flex">
                    <span>{isPlaying ? 'Playing' : 'Ready'}</span>
                    <span>{audioBuffer.duration.toFixed(1)}s</span>
                  </div>
                  
                  <div className="relative h-10 md:h-12 bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700/50 group cursor-pointer" onClick={() => {}}>
                    {/* Background Bars simulation */}
                    <div className="absolute inset-0 flex items-center justify-center gap-[2px] opacity-20 px-2">
                      {Array.from({ length: 50 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-indigo-400 rounded-full"
                          style={{ 
                            height: `${30 + Math.random() * 70}%`,
                          }}
                        />
                      ))}
                    </div>

                    {/* Active Progress Mask */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-indigo-500/20 border-r border-indigo-500 transition-all duration-100 ease-linear"
                      style={{ width: `${playbackProgress}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t border-slate-700/50 pt-4 md:pt-0 md:border-t-0">
                   <button
                    onClick={handleGenerate}
                    title="Regenerate"
                    className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors"
                   >
                     <RefreshCw size={20} />
                   </button>
                   <div className="w-px h-8 bg-slate-700 hidden md:block"></div>
                   <button
                    onClick={handleDownload}
                    className="flex-1 md:flex-none justify-center items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                   >
                     <Download size={18} />
                     <span>Download</span>
                   </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;