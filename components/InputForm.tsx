import React, { useState } from 'react';

interface InputFormProps {
  onStart: (topic: string, voice: string) => void;
  isProcessing: boolean;
}

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];

const InputForm: React.FC<InputFormProps> = ({ onStart, isProcessing }) => {
  const [topic, setTopic] = useState('');
  const [voice, setVoice] = useState('Puck');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onStart(topic, voice);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent mb-2">
          EduVid AI
        </h1>
        <p className="text-slate-400">
          Turn any topic into an educational slideshow in seconds.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-slate-300 mb-2">
            What do you want to learn about?
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Photosynthesis, The French Revolution, Black Holes..."
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            required
            disabled={isProcessing}
          />
        </div>

        <div>
          <label htmlFor="voice" className="block text-sm font-medium text-slate-300 mb-2">
            Narrator Voice
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {VOICES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVoice(v)}
                className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                  voice === v
                    ? 'bg-teal-600 text-white shadow-lg scale-105'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                disabled={isProcessing}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!topic.trim() || isProcessing}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform ${
            !topic.trim() || isProcessing
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:shadow-teal-500/25 hover:-translate-y-1'
          }`}
        >
          {isProcessing ? 'Generating Magic...' : 'Generate Slideshow'}
        </button>
      </form>
    </div>
  );
};

export default InputForm;