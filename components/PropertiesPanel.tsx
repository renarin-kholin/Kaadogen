import React, { useState, useEffect, useRef } from 'react';
import { SmartObject, SvgNodeInfo } from '../types';
import { LinkIcon, QrCodeIcon, BarcodeIcon, TextIcon, ImageIcon, ChevronDownIcon } from './Icons';

interface PropertiesPanelProps {
  selectedNode: SvgNodeInfo | null;
  smartObject: SmartObject | undefined;
  onUpdateSmartObject: (id: string, updates: Partial<SmartObject> | null) => void;
  availableKeys: string[];
  width: number;
  setWidth: (w: number) => void;
}

// Reusable Section Component
const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="border-b border-[#383838] py-3 px-4">
        <div className="text-[11px] font-bold text-gray-500 mb-2 select-none">{title}</div>
        {children}
    </div>
);

// Reusable Input Component
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input 
        {...props} 
        className={`w-full bg-[#1E1E1E] text-gray-200 text-[11px] px-2 py-1.5 rounded-sm border border-transparent hover:border-[#444] focus:border-[#DFFF50] focus:outline-none transition-colors ${props.className || ''}`} 
    />
);

// Reusable Select Component
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <div className="relative">
         <select 
             {...props} 
             className={`w-full bg-[#1E1E1E] text-gray-200 text-[11px] pl-2 pr-6 py-1.5 rounded-sm border border-transparent hover:border-[#444] focus:border-[#DFFF50] focus:outline-none appearance-none transition-colors ${props.className || ''}`}
         />
         <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
             <ChevronDownIcon className="w-3 h-3" />
         </div>
    </div>
);

const ShapeIcon = ({ type, selected }: { type: string, selected: boolean }) => {
    const baseClass = `w-6 h-6 flex items-center justify-center rounded-sm transition-colors ${selected ? 'bg-[#1E1E1E] text-[#DFFF50] ring-1 ring-[#DFFF50] shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-[#383838]'}`;
    
    if (type === 'square') return (
        <div className={baseClass}><div className="w-2.5 h-2.5 bg-current"></div></div>
    );
    if (type === 'circle' || type === 'dot') return (
        <div className={baseClass}><div className="w-2.5 h-2.5 bg-current rounded-full"></div></div>
    );
    if (type === 'diamond') return (
        <div className={baseClass}><div className="w-2 h-2 bg-current rotate-45"></div></div>
    );
    if (type === 'rounded') return (
        <div className={baseClass}><div className="w-2.5 h-2.5 bg-current rounded-[2px]"></div></div>
    );
    return null;
};

const SearchableKeySelect = ({ value, onChange, options }: { value: string, onChange: (val: string) => void, options: string[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = options.filter(k => k.toLowerCase().includes(value.toLowerCase()));

    return (
        <div className="relative" ref={containerRef}>
            <div className="relative group">
                <Input 
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Select a key..."
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <ChevronDownIcon className="w-3 h-3" />
                </div>
            </div>
            
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#2C2C2C] border border-[#444] rounded-sm shadow-xl max-h-40 overflow-y-auto z-50 custom-scrollbar">
                    {options.length === 0 ? (
                        <div className="px-3 py-2 text-[10px] text-gray-500 italic">
                            No JSON loaded
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="px-3 py-2 text-[10px] text-gray-500 italic">
                            No matching keys
                        </div>
                    ) : (
                        filtered.map(key => (
                            <button
                                key={key}
                                onClick={() => {
                                    onChange(key);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-[11px] text-gray-300 hover:bg-[#DFFF50] hover:text-black block"
                            >
                                {key}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};


export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedNode,
  smartObject,
  onUpdateSmartObject,
  availableKeys,
  width,
  setWidth
}) => {
  const isResizing = useRef(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = Math.max(240, Math.min(500, window.innerWidth - e.clientX));
      setWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  };

  if (!selectedNode) {
    return (
      <div 
        className="flex flex-col h-full bg-[#2C2C2C] border-l border-[#1E1E1E] relative flex-shrink-0"
        style={{ width: `${width}px` }}
      >
         <div 
            onMouseDown={startResizing}
            className="absolute top-0 left-0 w-[4px] h-full cursor-col-resize hover:bg-[#DFFF50] z-20 opacity-0 hover:opacity-100 transition-opacity" 
         />

        <div className="h-10 flex items-center px-4 border-b border-[#1E1E1E]">
          <span className="text-[11px] font-semibold text-gray-400 tracking-wide">Properties</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-[11px] text-gray-500 px-6 text-center">
          Select a layer to view properties
        </div>
      </div>
    );
  }

  const isEligible = selectedNode.type === 'text' || selectedNode.type === 'image' || selectedNode.tagName === 'rect';

  return (
    <div 
        className="flex flex-col h-full bg-[#2C2C2C] border-l border-[#1E1E1E] overflow-y-auto custom-scrollbar relative flex-shrink-0"
        style={{ width: `${width}px` }}
    >
      <div 
        onMouseDown={startResizing}
        className="absolute top-0 left-0 w-[4px] h-full cursor-col-resize hover:bg-[#DFFF50] z-20 opacity-0 hover:opacity-100 transition-opacity" 
      />

      <div className="h-10 flex items-center px-4 border-b border-[#1E1E1E] justify-between">
        <span className="text-[11px] font-semibold text-gray-400 tracking-wide">Design</span>
      </div>
      
      <div>
        {/* Info Section */}
        <Section title="Layout">
          <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                  <label className="text-[10px] text-gray-500 block mb-1">X</label>
                  <Input disabled value="--" className="opacity-50 cursor-not-allowed" />
              </div>
              <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Y</label>
                  <Input disabled value="--" className="opacity-50 cursor-not-allowed" />
              </div>
          </div>
          <div className="text-[10px] text-gray-500 break-all">
             ID: <span className="text-gray-300">{selectedNode.id}</span>
          </div>
        </Section>

        {/* Content Section */}
        {selectedNode.type === 'text' && (
          <Section title="Content">
             <div className="p-2 bg-[#1E1E1E] rounded-sm text-[11px] text-gray-300 min-h-[32px] border border-transparent">
                {selectedNode.textContent || '(Empty)'}
             </div>
          </Section>
        )}

        {/* Smart Object Section */}
        {isEligible && (
          <Section title="Data Binding">
             <div className="flex items-center gap-2 mb-3">
               <input 
                 type="checkbox" 
                 id="smart-toggle"
                 checked={!!smartObject}
                 onChange={(e) => {
                   if (e.target.checked) {
                     let initialType: SmartObject['type'] = 'text';
                     if (selectedNode.type === 'image') initialType = 'image';
                     if (selectedNode.tagName === 'rect') initialType = 'qrcode';

                     onUpdateSmartObject(selectedNode.id, {
                       id: selectedNode.id,
                       type: initialType,
                       key: '',
                       originalValue: selectedNode.textContent || '',
                       qrConfig: { 
                           colorDark: '#000000', 
                           colorLight: '#ffffff', 
                           isTransparent: false,
                           errorCorrectionLevel: 'M',
                           bodyShape: 'square',
                           eyeFrameShape: 'square',
                           eyeBallShape: 'square'
                       },
                       barcodeConfig: { format: 'CODE128', displayValue: true, lineColor: '#000000' }
                     });
                   } else {
                     onUpdateSmartObject(selectedNode.id, null);
                   }
                 }}
                 className="w-3.5 h-3.5 rounded-sm bg-[#1E1E1E] border-gray-600 checked:bg-[#DFFF50] focus:ring-0 text-black"
               />
               <label htmlFor="smart-toggle" className="text-[11px] text-gray-300 select-none cursor-pointer">Enable Data Binding</label>
             </div>

             {smartObject && (
               <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                 
                 {/* Type Selector */}
                 <div className="grid grid-cols-4 gap-1 bg-[#1E1E1E] p-1 rounded-sm">
                    {[
                        { type: 'text', icon: TextIcon, allowed: selectedNode.type === 'text' },
                        { type: 'image', icon: ImageIcon, allowed: selectedNode.type === 'image' || selectedNode.tagName === 'rect' },
                        { type: 'qrcode', icon: QrCodeIcon, allowed: selectedNode.tagName === 'rect' || selectedNode.type === 'image' },
                        { type: 'barcode', icon: BarcodeIcon, allowed: selectedNode.tagName === 'rect' || selectedNode.type === 'image' }
                    ].map((opt) => (
                        <button
                            key={opt.type}
                            disabled={!opt.allowed}
                            onClick={() => onUpdateSmartObject(selectedNode.id, { ...smartObject, type: opt.type as any })}
                            className={`flex items-center justify-center h-7 rounded-sm transition-all ${
                                !opt.allowed ? 'opacity-20 cursor-not-allowed' : 
                                smartObject.type === opt.type ? 'bg-[#383838] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-[#222]'
                            }`}
                            title={opt.type}
                        >
                            <opt.icon className="w-3.5 h-3.5" />
                        </button>
                    ))}
                 </div>

                 <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Key</label>
                    <SearchableKeySelect 
                        value={smartObject.key}
                        onChange={(val) => onUpdateSmartObject(selectedNode.id, { ...smartObject, key: val })}
                        options={availableKeys}
                    />
                 </div>

                 {smartObject.type === 'text' && (
                   <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Target Text (Placeholder)</label>
                      <Input 
                        value={smartObject.originalValue}
                        onChange={(e) => onUpdateSmartObject(selectedNode.id, { ...smartObject, originalValue: e.target.value })}
                      />
                   </div>
                 )}

                 {/* QR Code Config */}
                 {smartObject.type === 'qrcode' && smartObject.qrConfig && (
                    <div className="bg-[#1E1E1E] p-2 rounded-sm space-y-3">
                      
                      <div className="grid grid-cols-2 gap-2">
                         <div>
                           <label className="text-[10px] text-gray-500 block mb-1">Foreground</label>
                           <div className="flex items-center gap-2 bg-[#2C2C2C] rounded-sm border border-transparent hover:border-[#444] p-1">
                              <input 
                                type="color" 
                                value={smartObject.qrConfig.colorDark}
                                onChange={(e) => onUpdateSmartObject(selectedNode.id, { ...smartObject, qrConfig: { ...smartObject.qrConfig!, colorDark: e.target.value } })}
                                className="w-4 h-4 border-0 p-0 cursor-pointer bg-transparent"
                              />
                              <span className="text-[10px] text-gray-300 font-mono uppercase">{smartObject.qrConfig.colorDark}</span>
                           </div>
                         </div>
                         <div>
                             <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] text-gray-500">Background</label>
                             </div>
                             {!smartObject.qrConfig.isTransparent ? (
                                <div className="flex items-center gap-2 bg-[#2C2C2C] rounded-sm border border-transparent hover:border-[#444] p-1">
                                    <input 
                                        type="color" 
                                        value={smartObject.qrConfig.colorLight}
                                        onChange={(e) => onUpdateSmartObject(selectedNode.id, { ...smartObject, qrConfig: { ...smartObject.qrConfig!, colorLight: e.target.value } })}
                                        className="w-4 h-4 border-0 p-0 cursor-pointer bg-transparent"
                                    />
                                    <span className="text-[10px] text-gray-300 font-mono uppercase">{smartObject.qrConfig.colorLight}</span>
                                </div>
                             ) : (
                                <div className="h-[26px] flex items-center text-[10px] text-gray-500 italic">Transparent</div>
                             )}
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                           <input 
                             type="checkbox" 
                             id="qr-transp"
                             checked={smartObject.qrConfig.isTransparent}
                             onChange={(e) => onUpdateSmartObject(selectedNode.id, { ...smartObject, qrConfig: { ...smartObject.qrConfig!, isTransparent: e.target.checked } })}
                             className="w-3 h-3 rounded-sm bg-[#2C2C2C] border-gray-600 checked:bg-[#DFFF50] text-black"
                           />
                           <label htmlFor="qr-transp" className="text-[10px] text-gray-400 select-none cursor-pointer">Transparent Background</label>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-[#333]">
                          {/* Shapes */}
                          <div className="flex items-center justify-between">
                             <label className="text-[10px] text-gray-500">Body</label>
                             <div className="flex gap-1 bg-[#2C2C2C] rounded-sm p-0.5">
                                {['square', 'dot', 'diamond', 'circle'].map(shape => (
                                    <button key={shape} onClick={() => onUpdateSmartObject(selectedNode.id, { ...smartObject, qrConfig: { ...smartObject.qrConfig!, bodyShape: shape as any } })}>
                                        <ShapeIcon type={shape} selected={smartObject.qrConfig!.bodyShape === shape} />
                                    </button>
                                ))}
                             </div>
                          </div>
                          <div className="flex items-center justify-between">
                             <label className="text-[10px] text-gray-500">Frame</label>
                             <div className="flex gap-1 bg-[#2C2C2C] rounded-sm p-0.5">
                                {['square', 'rounded', 'circle'].map(shape => (
                                    <button key={shape} onClick={() => onUpdateSmartObject(selectedNode.id, { ...smartObject, qrConfig: { ...smartObject.qrConfig!, eyeFrameShape: shape as any } })}>
                                        <ShapeIcon type={shape} selected={smartObject.qrConfig!.eyeFrameShape === shape} />
                                    </button>
                                ))}
                             </div>
                          </div>
                          <div className="flex items-center justify-between">
                             <label className="text-[10px] text-gray-500">Eyes</label>
                             <div className="flex gap-1 bg-[#2C2C2C] rounded-sm p-0.5">
                                {['square', 'circle'].map(shape => (
                                    <button key={shape} onClick={() => onUpdateSmartObject(selectedNode.id, { ...smartObject, qrConfig: { ...smartObject.qrConfig!, eyeBallShape: shape as any } })}>
                                        <ShapeIcon type={shape} selected={smartObject.qrConfig!.eyeBallShape === shape} />
                                    </button>
                                ))}
                             </div>
                          </div>
                      </div>

                      <div className="pt-1">
                         <label className="text-[10px] text-gray-500 block mb-1">Error Correction</label>
                         <Select 
                            value={smartObject.qrConfig.errorCorrectionLevel}
                            onChange={(e) => onUpdateSmartObject(selectedNode.id, { ...smartObject, qrConfig: { ...smartObject.qrConfig!, errorCorrectionLevel: e.target.value as any } })}
                         >
                           <option value="L">Low (7%)</option>
                           <option value="M">Medium (15%)</option>
                           <option value="Q">Quartile (25%)</option>
                           <option value="H">High (30%)</option>
                         </Select>
                      </div>
                    </div>
                 )}

                 {/* Barcode Customization */}
                 {smartObject.type === 'barcode' && smartObject.barcodeConfig && (
                    <div className="bg-[#1E1E1E] p-2 rounded-sm space-y-3">
                       <div>
                         <label className="text-[10px] text-gray-500 block mb-1">Format</label>
                         <Select 
                            value={smartObject.barcodeConfig.format}
                            onChange={(e) => onUpdateSmartObject(selectedNode.id, { ...smartObject, barcodeConfig: { ...smartObject.barcodeConfig!, format: e.target.value as any } })}
                         >
                           <option value="CODE128">Code 128</option>
                           <option value="EAN13">EAN 13</option>
                           <option value="UPC">UPC</option>
                           <option value="CODE39">Code 39</option>
                         </Select>
                       </div>
                       
                       <div>
                           <label className="text-[10px] text-gray-500 block mb-1">Line Color</label>
                           <div className="flex items-center gap-2 bg-[#2C2C2C] rounded-sm border border-transparent hover:border-[#444] p-1">
                              <input 
                                type="color" 
                                value={smartObject.barcodeConfig.lineColor}
                                onChange={(e) => onUpdateSmartObject(selectedNode.id, { ...smartObject, barcodeConfig: { ...smartObject.barcodeConfig!, lineColor: e.target.value } })}
                                className="w-4 h-4 border-0 p-0 cursor-pointer bg-transparent"
                              />
                              <span className="text-[10px] text-gray-300 font-mono uppercase">{smartObject.barcodeConfig.lineColor}</span>
                           </div>
                       </div>

                       <div className="flex items-center gap-2 pt-1">
                         <input 
                           type="checkbox"
                           id="show-text"
                           checked={smartObject.barcodeConfig.displayValue}
                           onChange={(e) => onUpdateSmartObject(selectedNode.id, { ...smartObject, barcodeConfig: { ...smartObject.barcodeConfig!, displayValue: e.target.checked } })}
                           className="w-3.5 h-3.5 rounded-sm bg-[#2C2C2C] border-gray-600 checked:bg-[#DFFF50] text-black"
                         />
                         <label htmlFor="show-text" className="text-[11px] text-gray-300 cursor-pointer select-none">Show Text Value</label>
                       </div>
                    </div>
                 )}
                 
               </div>
             )}
          </Section>
        )}
      </div>
    </div>
  );
};