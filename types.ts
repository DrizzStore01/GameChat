export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr'
}

export interface TTSState {
  text: string;
  isGenerating: boolean;
  isPlaying: boolean;
  error: string | null;
  audioBuffer: AudioBuffer | null;
  selectedVoice: VoiceName;
}

export const SAMPLE_RATE = 24000;