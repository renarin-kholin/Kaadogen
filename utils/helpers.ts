import { SvgNodeInfo, FontData, SmartObject } from '../types';
import qrcode from 'qrcode-generator';

// --- SVG Parsing & Font Detection ---

export const parseSvgString = (text: string): { 
  rootNodes: SvgNodeInfo[], 
  map: Record<string, SvgNodeInfo>, 
  detectedFonts: FontData[], 
  hasMissingFonts: boolean,
  doc: Document
} => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'image/svg+xml');
  
  let idCounter = 0;
  const map: Record<string, SvgNodeInfo> = {};

  const parseNode = (el: Element): SvgNodeInfo | null => {
    const tagName = el.tagName.toLowerCase();
    const allowedTags = ['g', 'text', 'image', 'path', 'rect', 'circle', 'line', 'polygon', 'polyline'];
    if (!allowedTags.includes(tagName)) return null;
    
    if (!el.id) el.id = `layer_${tagName}_${idCounter++}`;

    const isText = tagName === 'text';
    const node: SvgNodeInfo = {
      id: el.id, 
      tagName, 
      type: isText ? 'text' : tagName === 'image' ? 'image' : tagName === 'rect' ? 'rect' : tagName === 'g' ? 'group' : 'other',
      textContent: isText ? el.textContent?.trim() : undefined,
      children: []
    };
    
    map[node.id] = node;
    
    if (!isText && el.children.length > 0) {
      Array.from(el.children).forEach(child => {
         const childNode = parseNode(child);
         if (childNode) node.children?.push(childNode);
      });
    }
    return node;
  };

  const rootNodes = Array.from(doc.documentElement.children)
    .map(parseNode)
    .filter((n): n is SvgNodeInfo => n !== null);
  
  // Font Detection Logic
  const fontsFound = new Set<string>();
  const fontRegex = /font-family\s*[:=]\s*["']?([^;"'<>}\n]+)["']?/gi;
  let match;
  while ((match = fontRegex.exec(text)) !== null) {
      if (match[1]) fontsFound.add(match[1].split(',')[0].trim().replace(/['"]/g, ''));
  }
  
  const ignoreList = ['sans-serif', 'serif', 'monospace', 'arial', 'inter', 'system-ui'];
  const uniqueFonts = Array.from(fontsFound).filter(f => !ignoreList.includes(f.toLowerCase()));
  
  const missingFonts: FontData[] = [];
  uniqueFonts.forEach(f => {
     if (!document.fonts.check(`12px "${f}"`)) {
         missingFonts.push({ family: f, status: 'pending', source: 'google' });
     }
  });

  return {
      rootNodes,
      map,
      detectedFonts: missingFonts,
      hasMissingFonts: missingFonts.length > 0,
      doc
  };
};

// --- QR Code Generation ---

export const generateCustomQrSvg = (text: string, config: SmartObject['qrConfig']): string => {
    if (!config) return '';
    
    const qr = qrcode(0, config.errorCorrectionLevel);
    qr.addData(text);
    qr.make();
    
    const count = qr.getModuleCount();
    let pathBody = '';
    let pathFrame = '';
    let pathBall = '';
    
    const addShape = (r: number, c: number, type: string) => {
        if (type === 'square') return `M${c},${r}h1v1h-1z `;
        if (type === 'circle' || type === 'dot') {
            const rad = type === 'dot' ? 0.4 : 0.5;
            return `M${c+0.5},${r+0.5} m-${rad},0 a${rad},${rad} 0 1,0 ${rad*2},0 a${rad},${rad} 0 1,0 -${rad*2},0 `;
        }
        if (type === 'diamond') return `M${c+0.5},${r} L${c+1},${r+0.5} L${c+0.5},${r+1} L${c},${r+0.5} Z `;
        return `M${c},${r}h1v1h-1z `;
    };
    
    const isFinder = (r: number, c: number) => (r<7 && c<7) || (r<7 && c>=count-7) || (r>=count-7 && c<7);
    
    for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
            if (qr.isDark(r, c) && !isFinder(r, c)) pathBody += addShape(r, c, config.bodyShape);
        }
    }
    
    const finders = [{ r: 0, c: 0 }, { r: 0, c: count - 7 }, { r: count - 7, c: 0 }];
    finders.forEach(f => {
        const {r, c} = f;
        if (config.eyeFrameShape === 'circle') {
           pathFrame += `M${c+3.5},${r+3.5} m-3.5,0 a3.5,3.5 0 1,0 7,0 a3.5,3.5 0 1,0 -7,0 M${c+3.5},${r+3.5} m-2.5,0 a2.5,2.5 0 1,1 5,0 a2.5,2.5 0 1,1 -5,0 `;
        } else {
           pathFrame += `M${c},${r} h7 v7 h-7 z M${c+1},${r+1} v5 h5 v-5 z `; 
        }
        
        if (config.eyeBallShape === 'circle') pathBall += `M${c+3.5},${r+3.5} m-1.5,0 a1.5,1.5 0 1,0 3,0 a1.5,1.5 0 1,0 -3,0 `;
        else pathBall += `M${c+2},${r+2} h3 v3 h-3 z `;
    });
    
    let svg = `<svg viewBox="0 0 ${count} ${count}" xmlns="http://www.w3.org/2000/svg">`;
    if (!config.isTransparent) svg += `<rect width="100%" height="100%" fill="${config.colorLight}"/>`;
    svg += `<path d="${pathBody}" fill="${config.colorDark}"/>`;
    svg += `<path d="${pathFrame}" fill="${config.colorDark}" fill-rule="evenodd"/>`;
    svg += `<path d="${pathBall}" fill="${config.colorDark}"/>`;
    svg += `</svg>`;
    
    return svg;
};