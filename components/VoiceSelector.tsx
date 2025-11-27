import React from 'react';
import { VoiceName } from '../types';
import { Check, Mic } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoice: VoiceName;
  onSelect: (voice: VoiceName) => void;
  disabled: boolean;
}

const VOICES = [
  { id: VoiceName.Kore, label: 'Kore', desc: 'Balanced & Natural' },
  { id: VoiceName.Puck, label: 'Puck', desc: 'Spirited & Clear' },
  { id: VoiceName.Charon, label: 'Charon', desc: 'Deep & Authoritative' },
  { id: VoiceName.Fenrir, label: 'Fenrir', desc: 'Resonant & Bold' },
  { id: VoiceName.Zephyr, label: 'Zephyr', desc: 'Calm & Friendly' },
];

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onSelect, disabled }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {VOICES.map((voice) => {
        const isSelected = selectedVoice === voice.id;
        return (
          <button
            key={voice.id}
            onClick={() => onSelect(voice.id)}
            disabled={disabled}
            className={`
              relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200
              ${isSelected 
                ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500' 
                : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className={`p-2 rounded-full mb-2 ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
              <Mic size={20} />
            </div>
            <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>
              {voice.label}
            </span>
            <span className="text-xs text-slate-500 mt-1">{voice.desc}</span>
            
            {isSelected && (
              <div className="absolute top-2 right-2 text-indigo-400">
                <Check size={14} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};