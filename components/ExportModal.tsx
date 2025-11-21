import React, { useState } from 'react';
import { ChevronDownIcon, CheckCircleIcon } from './Icons';

export interface ExportOptions {
  format: 'pdf' | 'zip-png' | 'zip-svg';
  dpi: number; // 72 (Screen), 150, 300 (Print)
  filename: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalRecords: number;
  onExport: (options: ExportOptions) => void;
  isProcessing: boolean;
  progress: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, onClose, totalRecords, onExport, isProcessing, progress 
}) => {
  const [format, setFormat] = useState<ExportOptions['format']>('pdf');
  const [dpi, setDpi] = useState<number>(300);
  const [filename, setFilename] = useState('id-cards');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-[#1E1E1E] w-[450px] border border-[#333] rounded-lg shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2C2C2C] flex items-center justify-between bg-[#1E1E1E] rounded-t-lg">
          <h2 className="text-sm font-semibold text-white">Export Cards</h2>
          {!isProcessing && (
            <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
           {isProcessing ? (
             <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 border-4 border-[#333] border-t-[#DFFF50] rounded-full animate-spin mx-auto"></div>
                <div>
                  <p className="text-white font-medium text-sm">Generating Assets...</p>
                  <p className="text-gray-500 text-xs mt-1">{progress} / {totalRecords} processed</p>
                </div>
                <div className="w-full bg-[#333] h-1 rounded-full overflow-hidden mt-2">
                   <div 
                     className="bg-[#DFFF50] h-full transition-all duration-200" 
                     style={{ width: `${(progress / totalRecords) * 100}%` }}
                   />
                </div>
             </div>
           ) : (
             <>
                <div className="space-y-1">
                   <label className="text-[11px] font-medium text-gray-400 block">File Name</label>
                   <input 
                     type="text" 
                     value={filename} 
                     onChange={(e) => setFilename(e.target.value)}
                     className="w-full bg-[#2C2C2C] border border-[#444] rounded-sm px-3 py-2 text-sm text-white focus:border-[#DFFF50] focus:outline-none"
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-gray-400 block">Format</label>
                        <div className="relative">
                            <select 
                                value={format} 
                                onChange={(e) => setFormat(e.target.value as any)}
                                className="w-full bg-[#2C2C2C] border border-[#444] rounded-sm pl-3 pr-8 py-2 text-sm text-white appearance-none focus:border-[#DFFF50] focus:outline-none"
                            >
                                <option value="pdf">PDF Document</option>
                                <option value="zip-png">ZIP (PNG Images)</option>
                                <option value="zip-svg">ZIP (SVG Files)</option>
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-gray-400 block">Quality / DPI</label>
                         <div className="relative">
                            <select 
                                value={dpi} 
                                onChange={(e) => setDpi(Number(e.target.value))}
                                disabled={format === 'zip-svg'}
                                className={`w-full bg-[#2C2C2C] border border-[#444] rounded-sm pl-3 pr-8 py-2 text-sm text-white appearance-none focus:border-[#DFFF50] focus:outline-none ${format === 'zip-svg' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <option value="72">Screen Draft (72 DPI)</option>
                                <option value="96">Screen Standard (96 DPI)</option>
                                <option value="150">Office Print (150 DPI)</option>
                                <option value="300">Professional Print (300 DPI)</option>
                                <option value="600">High Quality Print (600 DPI)</option>
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {format === 'zip-svg' && (
                   <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-[11px] text-yellow-500">
                      <strong>Note:</strong> SVG exports preserve editable text but may not render correctly on other computers if the specific fonts are not installed.
                   </div>
                )}
                
                {format !== 'zip-svg' && (
                    <div className="text-[11px] text-gray-500">
                        <p>Estimated export size depends on the number of records ({totalRecords}) and DPI selection.</p>
                    </div>
                )}
             </>
           )}
        </div>

        {/* Footer */}
        {!isProcessing && (
            <div className="p-4 border-t border-[#2C2C2C] bg-[#252525] rounded-b-lg flex justify-end gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 rounded text-xs font-medium text-gray-400 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => onExport({ format, dpi, filename })}
                    className="bg-[#DFFF50] hover:bg-[#CBE649] text-black px-6 py-2 rounded text-xs font-medium transition-colors flex items-center gap-2"
                >
                    Start Export
                </button>
            </div>
        )}

      </div>
    </div>
  );
};