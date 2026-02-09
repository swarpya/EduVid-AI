export interface Scene {
  scene_number: number;
  narration: string;
  visual_description: string;
}

export interface Script {
  title: string;
  scenes: Scene[];
}

export interface Slide extends Scene {
  image_data: string | null; // Base64
  audio_data: string | null; // Base64
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING_SCRIPT = 'GENERATING_SCRIPT',
  GENERATING_MEDIA = 'GENERATING_MEDIA',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export interface GenerationProgress {
  currentStep: string;
  completedScenes: number;
  totalScenes: number;
}