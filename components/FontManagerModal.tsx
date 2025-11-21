import React, { useState } from 'react';
import { FontData } from '../types';
import { GoogleIcon, UploadIcon, CheckCircleIcon, AlertCircleIcon, TypeIcon } from './Icons';

interface FontManagerModalProps {
  fonts: FontData[];
  onUpdateFont: (fontFamily: string, updates: Partial<FontData>) => void;
  onComplete: () => void;
}

export const FontManagerModal: React.FC<FontManagerModalProps> = ({ fonts, onUpdateFont, onComplete }) => {
  const handleFileUpload = (fontFamily: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpdateFont(fontFamily, { 
      source: 'custom', 
      file, 
      status: 'pending' // triggers re-evaluation in parent or just visual state
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-[#1E1E1E] w-[600px] border border-[#333] rounded-lg shadow-2xl flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#2C2C2C] flex items-center justify-between bg-[#1E1E1E] rounded-t-lg">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertCircleIcon className="text-yellow-500" />
              Missing Fonts Detected
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              The SVG uses fonts not currently available. Resolve them below to ensure correct rendering.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-3">
          {fonts.map((font) => (
            <div key={font.family} className="bg-[#252525] rounded border border-[#333] p-4 flex items-center justify-between transition-colors hover:border-[#444]">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded bg-[#333] flex items-center justify-center text-gray-400 font-serif text-lg">
                    Aa
                 </div>
                 <div>
                    <h3 className="text-sm font-medium text-white">{font.family}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        {font.status === 'loaded' ? (
                            <span className="text-[10px] text-green-400 flex items-center gap-1">
                                <CheckCircleIcon className="w-3 h-3" /> Resolved
                            </span>
                        ) : font.status === 'error' ? (
                            <span className="text-[10px] text-red-400 flex items-center gap-1">
                                <AlertCircleIcon className="w-3 h-3" /> Failed to load
                            </span>
                        ) : (
                            <span className="text-[10px] text-yellow-500 flex items-center gap-1">
                                Action Required
                            </span>
                        )}
                    </div>
                 </div>
              </div>

              <div className="flex items-center gap-2">
                 {/* Google Font Option */}
                 <div className="relative group">
                   {font.status === 'loaded' && font.source === 'google' ? (
                      <div className="px-3 py-1.5 bg-[#2C2C2C] rounded text-xs text-gray-300 border border-[#444] flex items-center gap-2 cursor-default">
                         <GoogleIcon className="w-3 h-3 text-gray-400" />
                         Loaded via Google
                      </div>
                   ) : (
                      <button 
                        onClick={() => onUpdateFont(font.family, { source: 'google', status: 'pending' })}
                        disabled={font.status === 'loaded'}
                        className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 border transition-colors ${
                           font.source === 'google' 
                             ? 'bg-[#DFFF50]/10 border-[#DFFF50] text-[#DFFF50]' 
                             : 'bg-[#333] border-[#444] text-gray-300 hover:bg-[#444]'
                        }`}
                      >
                         <GoogleIcon className="w-3 h-3" />
                         {font.source === 'google' ? 'Retry Google' : 'Use Google Fonts'}
                      </button>
                   )}
                 </div>
                 
                 <span className="text-gray-600 text-xs">or</span>

                 {/* Upload Option */}
                 <label className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 border transition-colors cursor-pointer ${
                    font.source === 'custom'
                      ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                      : 'bg-[#333] border-[#444] text-gray-300 hover:bg-[#444]'
                 }`}>
                    <input 
                        type="file" 
                        accept=".ttf,.otf,.woff,.woff2" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(font.family, e)}
                    />
                    <UploadIcon className="w-3 h-3" />
                    {font.source === 'custom' && font.file ? 'File Selected' : 'Upload File'}
                 </label>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2C2C2C] bg-[#252525] rounded-b-lg flex justify-end">
            <button 
                onClick={onComplete}
                className="bg-[#DFFF50] hover:bg-[#CBE649] text-black px-6 py-2 rounded text-sm font-medium transition-colors"
            >
                Continue to Editor
            </button>
        </div>

      </div>
    </div>
  );
};