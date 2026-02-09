import React, { useState, useRef, useEffect } from 'react';
import { Slide } from '../types';
import { pcmToWavBlob } from '../utils/audioUtils';
import { askQuestion } from '../services/geminiService';

interface SlideshowProps {
  slides: Slide[];
  scriptTitle: string;
  onReset: () => void;
  onVisualize: (context: string, question: string) => Promise<Slide[]>;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  canVisualize?: boolean;
}

const Slideshow: React.FC<SlideshowProps> = ({ slides, scriptTitle, onReset, onVisualize }) => {
  // Main Slideshow State
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Branch (Visualization) Slideshow State
  const [branchSlides, setBranchSlides] = useState<Slide[] | null>(null);
  const [branchIndex, setBranchIndex] = useState(0);
  
  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Computed Properties (Determine what is currently showing)
  const isBranchActive = branchSlides !== null;
  const activeSlides = isBranchActive ? branchSlides! : slides;
  const activeIndex = isBranchActive ? branchIndex : currentIndex;
  const currentSlide = activeSlides[activeIndex];
  const totalActiveSlides = activeSlides.length;

  useEffect(() => {
    // Scroll chat to bottom
    if (isChatOpen) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping, isChatOpen]);

  // Effect to manage Audio Blob URL creation
  useEffect(() => {
    let url: string | null = null;
    
    if (currentSlide.audio_data) {
        try {
            // Gemini TTS returns raw 24kHz PCM mono 16-bit
            const blob = pcmToWavBlob(currentSlide.audio_data, 24000);
            url = URL.createObjectURL(blob);
            setAudioUrl(url);
        } catch (e) {
            console.error("Failed to process audio data", e);
            setAudioUrl(null);
        }
    } else {
        setAudioUrl(null);
    }

    return () => {
        if (url) {
            URL.revokeObjectURL(url);
        }
    };
  }, [currentSlide]);

  // Effect to manage playback
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // If we just switched to branch mode, or just navigated, respect autoPlay
      if (autoPlay) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(error => {
              console.warn("Auto-play prevented:", error);
              setIsPlaying(false);
            });
        }
      } else {
        setIsPlaying(false);
      }
    } else {
        setIsPlaying(false);
    }
  }, [activeIndex, audioUrl, autoPlay, isBranchActive]);

  const handleNext = () => {
    if (activeIndex < totalActiveSlides - 1) {
      if (isBranchActive) {
        setBranchIndex(prev => prev + 1);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      if (isBranchActive) {
        setBranchIndex(prev => prev - 1);
      } else {
        setCurrentIndex(prev => prev - 1);
      }
    }
  };

  const togglePlay = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        setAutoPlay(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
        setAutoPlay(true);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    // Auto-advance
    if (autoPlay && activeIndex < totalActiveSlides - 1) {
      setTimeout(() => {
        handleNext();
      }, 500);
    }
  };

  const closeBranch = () => {
      setBranchSlides(null);
      setBranchIndex(0);
      setAutoPlay(false); // Don't auto-start main when returning, let user choose
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping || isVisualizing) return;

    const userQuestion = chatInput;
    setChatHistory(prev => [...prev, { role: 'user', text: userQuestion }]);
    setChatInput('');
    setIsTyping(true);

    // Pause playback when interacting with chat
    if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        setAutoPlay(false);
    }

    const answer = await askQuestion(currentSlide.narration, userQuestion);
    
    setIsTyping(false);
    setChatHistory(prev => [...prev, { 
        role: 'ai', 
        text: answer, 
        canVisualize: true 
    }]);
  };

  const handleVisualizeClick = async (question: string) => {
      setIsVisualizing(true);
      try {
          // Keep chat open while generating, show status
          const newSlides = await onVisualize(currentSlide.narration, question);
          
          setBranchSlides(newSlides);
          setBranchIndex(0);
          setIsChatOpen(false); // Close chat to show the branch slides
          setAutoPlay(true); // Auto-play the new explanation
          
          setChatHistory(prev => [...prev, { 
            role: 'ai', 
            text: "Opening visual explanation..." 
          }]);
      } catch (e) {
          setChatHistory(prev => [...prev, { 
              role: 'ai', 
              text: "Sorry, I couldn't generate the visual explanation right now." 
          }]);
      } finally {
          setIsVisualizing(false);
      }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto min-h-[600px] gap-6 relative">
      <div className="w-full flex justify-between items-center px-4">
        <h2 className="text-2xl font-bold text-white truncate max-w-md">
            {isBranchActive ? "Visual Explanation" : scriptTitle}
        </h2>
        
        {isBranchActive ? (
            <button 
                onClick={closeBranch}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-bold border border-slate-600"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Lesson
            </button>
        ) : (
            <button 
                onClick={onReset}
                className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
                Create New
            </button>
        )}
      </div>

      {/* Main Slide Card */}
      <div className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border transition-all duration-500 group ${
          isBranchActive ? 'border-indigo-500 shadow-indigo-500/20' : 'border-slate-700'
      }`}>
        
        {/* Image */}
        {currentSlide.image_data ? (
          <img 
            key={`${isBranchActive ? 'b' : 'm'}-${activeIndex}`} // Force re-render on switch
            src={`data:image/jpeg;base64,${currentSlide.image_data}`} 
            alt={`Scene ${currentSlide.scene_number}`}
            className="w-full h-full object-cover animate-fadeIn"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
            Image generation failed
          </div>
        )}

        {/* Captions Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-20 pb-8 px-8">
           <div className="max-w-4xl mx-auto">
             <div className="flex items-center gap-3 mb-2">
                <span className={`text-black text-xs font-bold px-2 py-1 rounded uppercase ${
                    isBranchActive ? 'bg-indigo-500' : 'bg-teal-500'
                }`}>
                    {isBranchActive ? 'Explanation' : `Scene ${currentSlide.scene_number}/${slides.length}`}
                </span>
             </div>
             <p className="text-xl md:text-2xl text-white font-medium leading-relaxed drop-shadow-md">
               {currentSlide.narration}
             </p>
           </div>
        </div>

        {/* Improved Chat Button (Distinct, subtle color bubble) */}
        {!isBranchActive && (
            <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`absolute top-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full shadow-xl transition-all z-20 transform hover:scale-105 ${
                    isChatOpen 
                        ? 'bg-slate-700 text-slate-300' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-500 ring-4 ring-indigo-900/30'
                }`}
                title="Ask about this slide"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="font-semibold text-sm">Ask AI</span>
            </button>
        )}

        {/* Chat Side Window / Overlay */}
        <div className={`absolute inset-y-0 right-0 w-full sm:w-[450px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 flex flex-col z-30 transition-transform duration-300 ease-in-out shadow-2xl ${
            isChatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/80">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
                    <h3 className="font-bold text-teal-400">Ask & Visualize</h3>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 rounded transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                {chatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-70">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-teal-500 mb-2">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        </div>
                        <p className="text-slate-400 text-sm">
                            Have a question about this scene? <br/> 
                            Ask me anything! I can even create <br/>
                            <span className="text-indigo-400 font-semibold">new visual explanations</span>.
                        </p>
                    </div>
                )}
                
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-slideUp`}>
                        <span className="text-xs text-slate-500 mb-1 px-1">{msg.role === 'user' ? 'You' : 'AI Assistant'}</span>
                        <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-md ${
                            msg.role === 'user' 
                                ? 'bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-tr-sm' 
                                : 'bg-slate-700 text-slate-100 rounded-tl-sm border border-slate-600'
                        }`}>
                            {msg.text}
                        </div>
                        {msg.canVisualize && msg.role === 'ai' && (
                            <button
                                onClick={() => handleVisualizeClick(chatHistory[i-1].text)}
                                disabled={isVisualizing}
                                className="mt-2 text-xs flex items-center gap-2 text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-full transition-all border border-indigo-500/30 disabled:opacity-50"
                            >
                                {isVisualizing ? (
                                    <>
                                        <svg className="animate-spin h-3 w-3 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Generating Visuals...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Visualize this answer
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                ))}
                {isTyping && (
                        <div className="flex items-start animate-pulse">
                            <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-tl-sm text-slate-400 text-xs flex gap-1">
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                            </div>
                        </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700 bg-slate-800/80">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type your question..."
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all placeholder-slate-500"
                        disabled={isTyping || isVisualizing}
                    />
                    <button 
                        type="submit" 
                        disabled={!chatInput.trim() || isTyping || isVisualizing}
                        className="bg-teal-600 p-3 rounded-xl text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-teal-900/20"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </div>
            </form>
        </div>

        {/* Audio Element (Hidden) */}
        {audioUrl && (
          <audio 
            ref={audioRef}
            src={audioUrl}
            onEnded={handleAudioEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        )}
      </div>

      {/* Controls */}
      <div className={`flex items-center gap-6 backdrop-blur-md px-8 py-4 rounded-full border shadow-lg transition-colors ${
          isBranchActive 
          ? 'bg-indigo-900/30 border-indigo-500/50' 
          : 'bg-slate-800/50 border-slate-700'
      }`}>
        <button 
          onClick={handlePrev} 
          disabled={activeIndex === 0}
          className="p-3 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
          aria-label="Previous Slide"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>

        <button 
          onClick={togglePlay}
          disabled={!audioUrl}
          className={`w-16 h-16 flex items-center justify-center rounded-full transition-all shadow-lg ${
              !audioUrl 
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : isBranchActive 
                ? 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-indigo-500/30'
                : 'bg-teal-500 text-slate-900 hover:bg-teal-400 hover:scale-105 shadow-teal-500/30'
          }`}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
             <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
             <svg className="w-8 h-8 fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        <button 
          onClick={handleNext} 
          disabled={activeIndex === totalActiveSlides - 1}
          className="p-3 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
          aria-label="Next Slide"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="flex gap-2">
        {activeSlides.map((_, idx) => (
            <button 
                key={idx}
                onClick={() => {
                    if (isBranchActive) setBranchIndex(idx);
                    else setCurrentIndex(idx);
                    setAutoPlay(true);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                    idx === activeIndex 
                        ? (isBranchActive ? 'w-8 bg-indigo-500' : 'w-8 bg-teal-500')
                        : 'w-2 bg-slate-600 hover:bg-slate-500'
                }`}
            />
        ))}
      </div>
    </div>
  );
};

export default Slideshow;