
export interface SmartObject {
  id: string; // The SVG element ID
  type: 'text' | 'image' | 'qrcode' | 'barcode';
  key: string; // The JSON key to bind to (e.g., "full_name")
  originalValue: string; // The original text or href in the SVG
  
  // QR Code specific config
  qrConfig?: {
    colorDark: string;
    colorLight: string;
    isTransparent: boolean;
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
    bodyShape: 'square' | 'circle' | 'diamond' | 'dot';
    eyeFrameShape: 'square' | 'circle' | 'rounded';
    eyeBallShape: 'square' | 'circle';
  };

  // Barcode specific config
  barcodeConfig?: {
    format: 'CODE128' | 'EAN13' | 'UPC' | 'CODE39';
    displayValue: boolean;
    lineColor: string;
  };
}

export interface SvgNodeInfo {
  id: string;
  tagName: string;
  textContent?: string;
  type: 'text' | 'image' | 'group' | 'path' | 'rect' | 'other';
  children?: SvgNodeInfo[];
}

export type JsonDataRow = Record<string, string>;

export interface GenerationConfig {
  apiKey: string;
}

export interface FontData {
  family: string;
  status: 'pending' | 'loaded' | 'error' | 'ignored' | 'custom';
  source: 'google' | 'custom' | 'system';
  file?: File;
}

export interface ProjectMeta {
  id: string;
  name: string;
  lastModified: number;
  thumbnail?: string; // Base64 PNG
}

export interface SavedProject extends ProjectMeta {
  svgContent: string | null;
  smartObjects: Record<string, SmartObject>;
  jsonData: JsonDataRow[];
  nodes: SvgNodeInfo[];
  nodeMap: Record<string, SvgNodeInfo>;
  pan: { x: number, y: number };
  scale: number;
}