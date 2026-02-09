import React from 'react';
import { GenerationProgress } from '../types';

interface LoadingScreenProps {
  progress: GenerationProgress;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress }) => {
  const percentage = progress.totalScenes > 0 
    ? Math.round((progress.completedScenes / progress.totalScenes) * 100) 
    : 0;

  return (
    <div className="w-full max-w-md mx-auto text-center p-8">
      <div className="relative w-24 h-24 mx-auto mb-8">
        <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
        <div 
          className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin"
        ></div>
        <div className="absolute inset-0 flex items-center justify-center text-teal-400 font-bold">
            {progress.totalScenes > 0 && progress.currentStep !== 'Generating script...' ? `${percentage}%` : '...'}
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-2 animate-pulse">
        {progress.currentStep}
      </h2>
      
      <p className="text-slate-400 mb-6">
        Creating your educational experience. This typically takes about a minute.
      </p>

      {progress.totalScenes > 0 && (
         <div className="w-full bg-slate-800 rounded-full h-2.5 mb-4 overflow-hidden">
            <div 
                className="bg-gradient-to-r from-teal-400 to-cyan-500 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${percentage}%` }}
            ></div>
         </div>
      )}

      {progress.totalScenes > 0 && (
          <p className="text-sm text-slate-500">
              Completed {progress.completedScenes} of {progress.totalScenes} scenes
          </p>
      )}
    </div>
  );
};

export default LoadingScreen;