import { SvgNodeInfo, FontData, SmartObject, JsonDataRow } from '../types';
import qrcode from 'qrcode-generator';
import JsBarcode from 'jsbarcode';

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

// --- JSON Data Validation ---

export interface JsonValidationResult {
  data: JsonDataRow[] | null;
  error?: string;
  warnings: string[];
}

/**
 * Validates and normalises an uploaded JSON payload into the flat
 * `Record<string, string>[]` shape the binding system expects.
 *
 * Previously the app blindly accepted any array, so nested objects/arrays
 * silently stringified to "[object Object]" at render time. Here we coerce
 * primitives to strings, flag rows with non-primitive values, and warn about
 * inconsistent keys across records so the user finds out at import time.
 */
export const validateJsonData = (raw: unknown): JsonValidationResult => {
  const warnings: string[] = [];

  if (!Array.isArray(raw)) {
    return { data: null, warnings, error: 'JSON must be an array of objects (e.g. [{ "name": "Ada" }]).' };
  }
  if (raw.length === 0) {
    return { data: null, warnings, error: 'JSON array is empty — add at least one record.' };
  }

  const firstKeys = new Set<string>();
  const data: JsonDataRow[] = [];

  raw.forEach((entry, i) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      warnings.push(`Record ${i + 1} is not an object and was skipped.`);
      return;
    }

    const row: JsonDataRow = {};
    for (const [key, value] of Object.entries(entry as Record<string, unknown>)) {
      if (i === 0) firstKeys.add(key);
      if (value === null || value === undefined) {
        row[key] = '';
      } else if (typeof value === 'object') {
        warnings.push(`Record ${i + 1}, field "${key}" is nested and was flattened to JSON text.`);
        row[key] = JSON.stringify(value);
      } else {
        row[key] = String(value);
      }
    }

    // Surface schema drift: records missing keys present in the first row.
    if (i > 0) {
      const missing = [...firstKeys].filter((k) => !(k in row));
      if (missing.length) warnings.push(`Record ${i + 1} is missing field(s): ${missing.join(', ')}.`);
    }

    data.push(row);
  });

  if (data.length === 0) {
    return { data: null, warnings, error: 'No valid object records found in the JSON file.' };
  }

  // De-duplicate warnings and cap how many we report to avoid a wall of text.
  const unique = Array.from(new Set(warnings));
  const capped = unique.slice(0, 5);
  if (unique.length > capped.length) capped.push(`…and ${unique.length - capped.length} more issue(s).`);

  return { data, warnings: capped };
};

// --- Smart Object Rendering ---

/**
 * Produces the final SVG string for a single data record by cloning the template
 * and substituting every bound SmartObject. Pure and synchronous so it can drive
 * both the live preview and the export loop deterministically — the export no
 * longer has to guess at React re-render timing with fixed setTimeout delays.
 */
export const renderRecordSvg = (
  svgContent: string,
  smartObjects: Record<string, SmartObject>,
  row: JsonDataRow,
): string => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const doc = new DOMParser().parseFromString(svgContent, 'image/svg+xml');

  for (const obj of Object.values(smartObjects)) {
    const el = doc.getElementById(obj.id);
    const val = row[obj.key];
    if (!el || val === undefined || val === null || val === '') continue;

    if (obj.type === 'text') {
      if (obj.originalValue) {
        el.innerHTML = el.innerHTML.split(obj.originalValue).join(val);
      }
    } else if (obj.type === 'image') {
      el.setAttribute('href', val);
      el.setAttributeNS('http://www.w3.org/1999/xlink', 'href', val);
    } else if (obj.type === 'qrcode' && obj.qrConfig) {
      const qrSvgStr = generateCustomQrSvg(val, obj.qrConfig);
      const qrDoc = new DOMParser().parseFromString(qrSvgStr, 'image/svg+xml');
      const container = doc.createElementNS(SVG_NS, 'svg');
      ['x', 'y', 'width', 'height'].forEach((attr) =>
        container.setAttribute(attr, el.getAttribute(attr) || '0'),
      );
      container.setAttribute('viewBox', qrDoc.documentElement.getAttribute('viewBox') || '0 0 100 100');
      container.innerHTML = qrDoc.documentElement.innerHTML;
      container.id = obj.id;
      el.replaceWith(container);
    } else if (obj.type === 'barcode' && obj.barcodeConfig) {
      try {
        const tempSvg = document.createElementNS(SVG_NS, 'svg');
        JsBarcode(tempSvg, val, {
          format: obj.barcodeConfig.format,
          lineColor: obj.barcodeConfig.lineColor,
          displayValue: obj.barcodeConfig.displayValue,
          margin: 0,
          background: 'transparent',
        });
        const container = doc.createElementNS(SVG_NS, 'svg');
        ['x', 'y', 'width', 'height'].forEach((attr) =>
          container.setAttribute(attr, el.getAttribute(attr) || '0'),
        );
        container.setAttribute('viewBox', tempSvg.getAttribute('viewBox') || '0 0 100 100');
        container.setAttribute('preserveAspectRatio', 'none');
        container.innerHTML = tempSvg.innerHTML;
        container.id = obj.id;
        el.replaceWith(container);
      } catch (e) {
        console.warn(`Barcode render failed for "${obj.id}"`, e);
      }
    }
  }

  return doc.documentElement.outerHTML;
};

/** Extract the pixel width/height of an SVG template from width/height attrs or viewBox. */
export const getSvgDimensions = (svgContent: string): { width: number; height: number } => {
  const doc = new DOMParser().parseFromString(svgContent, 'image/svg+xml');
  const svgEl = doc.documentElement;
  let width = parseFloat(svgEl.getAttribute('width') || '0');
  let height = parseFloat(svgEl.getAttribute('height') || '0');
  if (!width || !height) {
    const viewBox = svgEl.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
    if (viewBox && viewBox.length === 4) {
      width = viewBox[2];
      height = viewBox[3];
    }
  }
  return { width: width || 800, height: height || 600 };
};