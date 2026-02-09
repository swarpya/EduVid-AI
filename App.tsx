import React, { useState } from 'react';
import InputForm from './components/InputForm';
import LoadingScreen from './components/LoadingScreen';
import Slideshow from './components/Slideshow';
import { generateScript, generateImage, generateAudio, generateBranchScript } from './services/geminiService';
import { AppStatus, GenerationProgress, Slide, Script } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [progress, setProgress] = useState<GenerationProgress>({
    currentStep: '',
    completedScenes: 0,
    totalScenes: 0,
  });
  const [slides, setSlides] = useState<Slide[]>([]);
  const [script, setScript] = useState<Script | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>('Puck');

  const handleStart = async (topic: string, voice: string) => {
    setStatus(AppStatus.GENERATING_SCRIPT);
    setProgress({ currentStep: 'Drafting script...', completedScenes: 0, totalScenes: 0 });
    setErrorMsg(null);
    setSelectedVoice(voice);

    try {
      // 1. Generate Script
      const generatedScript = await generateScript(topic);
      setScript(generatedScript);
      
      const totalScenes = generatedScript.scenes.length;
      setProgress({ 
        currentStep: `Script ready! Generating assets for ${totalScenes} scenes...`, 
        completedScenes: 0, 
        totalScenes 
      });
      setStatus(AppStatus.GENERATING_MEDIA);

      const newSlides: Slide[] = [];

      // 2. Generate Media for each scene (Sequential to avoid rate limits on free tier)
      for (const scene of generatedScript.scenes) {
        // Update progress for current scene
        setProgress(prev => ({
            ...prev,
            currentStep: `Creating Scene ${scene.scene_number}: Visuals & Narration...`
        }));

        const [imageData, audioData] = await Promise.all([
            generateImage(scene.visual_description),
            generateAudio(scene.narration, voice)
        ]);
        
        const slide: Slide = {
            ...scene,
            image_data: imageData,
            audio_data: audioData
        };
        
        newSlides.push(slide);

        // Update progress
        setProgress(prev => ({
            ...prev,
            completedScenes: prev.completedScenes + 1
        }));
      }

      setSlides(newSlides);
      setStatus(AppStatus.COMPLETE);

    } catch (error: any) {
      console.error("Pipeline failed:", error);
      setStatus(AppStatus.ERROR);
      setErrorMsg(error.message || "Something went wrong while generating the slideshow. Please try again.");
    }
  };

  const handleVisualize = async (context: string, question: string): Promise<Slide[]> => {
      // Create a specific branch script
      try {
        const branchScript = await generateBranchScript(context, question);
        
        // Generate assets for branch scenes
        const branchSlides: Slide[] = [];
        
        for (const scene of branchScript.scenes) {
            const [imageData, audioData] = await Promise.all([
                generateImage(scene.visual_description),
                generateAudio(scene.narration, selectedVoice)
            ]);

            branchSlides.push({
                ...scene,
                image_data: imageData,
                audio_data: audioData,
            });
        }

        return branchSlides;

      } catch (e) {
        console.error("Visualization failed", e);
        throw e;
      }
  };

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setSlides([]);
    setScript(null);
    setProgress({ currentStep: '', completedScenes: 0, totalScenes: 0 });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="z-10 w-full">
        {status === AppStatus.IDLE && (
          <InputForm onStart={handleStart} isProcessing={false} />
        )}

        {(status === AppStatus.GENERATING_SCRIPT || status === AppStatus.GENERATING_MEDIA) && (
          <LoadingScreen progress={progress} />
        )}

        {status === AppStatus.COMPLETE && script && (
          <Slideshow 
            slides={slides} 
            scriptTitle={script.title} 
            onReset={handleReset} 
            onVisualize={handleVisualize}
          />
        )}

        {status === AppStatus.ERROR && (
          <div className="max-w-md mx-auto bg-red-500/10 border border-red-500/50 p-6 rounded-2xl text-center">
             <h3 className="text-xl font-bold text-red-400 mb-2">Oops!</h3>
             <p className="text-slate-300 mb-6">{errorMsg}</p>
             <button 
                onClick={handleReset}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
             >
                Try Again
             </button>
          </div>
        )}
      </div>

      <footer className="fixed bottom-4 text-center w-full z-10 opacity-40 text-xs">
         Powered by Gemini 3 Flash, Image & TTS
      </footer>
    </div>
  );
};

export default App;