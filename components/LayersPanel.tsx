import React, { useState, useRef } from 'react';
import { SvgNodeInfo, SmartObject } from '../types';
import { TextIcon, ImageIcon, BoxIcon, ChevronDownIcon, ChevronRightIcon, LayersIcon } from './Icons';

interface LayersPanelProps {
  nodes: SvgNodeInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  smartObjects: Record<string, SmartObject>;
  width: number;
  setWidth: (w: number) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({ nodes, selectedId, onSelect, smartObjects, width, setWidth }) => {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const isResizing = useRef(false);

  const toggleCollapse = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(collapsedNodes);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCollapsedNodes(newSet);
  };

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = Math.max(180, Math.min(500, e.clientX));
      setWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  };

  const renderNode = (node: SvgNodeInfo, depth: number = 0) => {
    const isSelected = node.id === selectedId;
    const isSmart = !!smartObjects[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = collapsedNodes.has(node.id);
    
    let Icon = BoxIcon;
    if (node.type === 'text') Icon = TextIcon;
    if (node.type === 'image') Icon = ImageIcon;
    if (node.type === 'group') Icon = LayersIcon;
    
    // Indentation calc
    const paddingLeft = 16 + (depth * 12);

    return (
      <React.Fragment key={node.id}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id);
          }}
          style={{ paddingLeft: `${paddingLeft}px` }}
          className={`group flex items-center pr-3 h-8 cursor-pointer select-none relative text-[11px] font-medium ${
            isSelected ? 'bg-[#DFFF50] text-black' : 'text-gray-300 hover:bg-[#383838]'
          }`}
        >
          {/* Chevron Toggle */}
          <div 
            className={`mr-1 flex items-center justify-center w-4 h-4 hover:bg-white/10 rounded cursor-pointer ${hasChildren ? 'visible' : 'invisible'}`}
            onClick={(e) => {
                if (hasChildren) toggleCollapse(e, node.id);
            }}
          >
             {isCollapsed ? <ChevronRightIcon className="w-3 h-3 opacity-70" /> : <ChevronDownIcon className="w-3 h-3 opacity-70" />}
          </div>
          
          <Icon className={`w-3.5 h-3.5 mr-2 ${isSelected ? 'text-black' : 'text-gray-500'}`} />

          <span className="truncate flex-1">
            {node.textContent ? `"${node.textContent}"` : node.id}
          </span>
          
          {isSmart && (
            <div className="ml-2">
               <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-[#DFFF50]'}`} title="Smart Object"></div>
            </div>
          )}
        </div>
        
        {hasChildren && !isCollapsed && node.children!.map(child => renderNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div 
        className="flex flex-col h-full bg-[#2C2C2C] border-r border-[#1E1E1E] select-none z-10 relative flex-shrink-0"
        style={{ width: `${width}px` }}
    >
      <div className="h-10 flex items-center px-4 border-b border-[#1E1E1E] bg-[#2C2C2C]">
        <span className="text-[11px] font-semibold text-gray-400 tracking-wide">Layers</span>
      </div>
      <div className="flex-1 overflow-y-auto py-1 custom-scrollbar">
        {nodes.length > 0 ? (
          nodes.map(node => renderNode(node))
        ) : (
          <div className="px-4 py-8 text-center text-[11px] text-gray-500 italic">
            No layers found
          </div>
        )}
      </div>
      
      {/* Drag Handle */}
      <div 
        onMouseDown={startResizing}
        className="absolute top-0 right-0 w-[4px] h-full cursor-col-resize hover:bg-[#DFFF50] z-20 opacity-0 hover:opacity-100 transition-opacity" 
      />
    </div>
  );
};