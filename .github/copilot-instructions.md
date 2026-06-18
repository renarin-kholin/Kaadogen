# Kaadogen AI Agent Instructions

## Project Overview

Kaadogen is a Figma-inspired ID card batch generation tool built with React, TypeScript, and Vite. Users import SVG templates, bind elements to JSON data fields, and export batches as PDF/PNG/SVG. It features a canvas viewport with pan/zoom, smart object binding (text, images, QR codes, barcodes), and AI-powered field mapping via Gemini.

## Architecture & Data Flow

### State Management Pattern

Uses React hooks for state, no external store. Key custom hooks:

- **`useProjectSystem`**: Async project persistence backed by **IndexedDB** (`utils/db.ts`, stores `meta` + `data`). Manages save/load/delete/rename/duplicate, exposes `saveStatus`, and generates thumbnails via `html-to-image`. Legacy `localStorage` projects are migrated once on first boot.
- **`useViewport`**: Controls canvas pan/zoom/tool state. Implements Figma-like spacebar hand tool, middle-click pan, and Ctrl+scroll zoom with focal point adjustment.

### Smart Object System

Central to the app's data binding. Each `SmartObject` (defined in `types.ts`) links an SVG element to a JSON key:

```typescript
{
  id: string;           // SVG element ID
  type: 'text' | 'image' | 'qrcode' | 'barcode';
  key: string;          // JSON field name (e.g., "employee_name")
  originalValue: string;
  qrConfig?: {...};     // Custom QR styling (shapes, colors, error correction)
  barcodeConfig?: {...}; // Barcode format, line color, display value
}
```

**Rendering Pipeline** (`App.tsx` lines 270-330):

1. Preview mode triggers `useEffect` that clones SVG DOM
2. Iterates `smartObjects`, replaces content with `jsonData[currentJsonIndex][key]`
3. QR codes: generates custom SVG using `generateCustomQrSvg()` with configurable body/eye shapes
4. Barcodes: uses `JsBarcode` library, replaces element with generated SVG
5. Stores rendered SVG in `finalRenderedSvg` state

### Export Process

Three formats supported (`ExportModal.tsx`, `App.tsx` lines 345-400):

- **PDF**: Uses `jsPDF`, loops through JSON rows, renders each via `html-to-image.toPng()`, adds to PDF pages with bleed
- **ZIP-PNG**: Same render loop, packages PNGs in `JSZip`
- **ZIP-SVG**: Exports raw `finalRenderedSvg` strings (no rasterization)

DPI scaling: `pixelRatio = dpi / 96` for `html-to-image`. Includes fallback with `skipFonts: true` for font render errors.

## Critical Workflows

### Font Loading Mechanism

On SVG import, `parseSvgString()` extracts `font-family` declarations via regex, checks if loaded with `document.fonts.check()`. If missing:

1. Shows `FontManagerModal` with detected fonts
2. Google Fonts: dynamically injects `<link>` stylesheet, loads with `document.fonts.load()`
3. Custom fonts: reads `.ttf/.otf` files, creates `FontFace`, adds to `document.fonts`
4. User can mark fonts as "ignored" or system-available to skip loading

**Key Pattern**: Always wait for fonts before finalizing SVG load to avoid rendering issues.

### Gemini AI Integration (planned — not yet implemented)

> **Status:** There is currently **no `services/` directory and no `geminiService.ts`**. The
> `@google/genai` dependency and the `process.env.API_KEY` define in `vite.config.ts` are wired up,
> but no AI field-mapping code exists yet. Treat the notes below as the intended design, not current
> behaviour.

Intended `autoMapFields()`:

- Sends SVG text content + JSON keys to `gemini-2.5-flash`
- Uses structured JSON output schema for mapping suggestions
- API key from env: `process.env.API_KEY` (set via Vite `define` in `vite.config.ts`)
- **Important**: Gemini would be used for field mapping suggestions only, not for runtime data generation

### Viewport Interaction Model

Canvas implements custom pan/zoom without external libraries:

- **Selection**: Click propagates up DOM until element with ID in `nodeMap` is found. Root SVG clicks deselect.
- **Pan**: Middle-click OR spacebar+drag OR hand tool. Updates `pan` state, applied as CSS `transform: translate()`.
- **Zoom**: Ctrl/Cmd+scroll. Calculates focal point in SVG coordinates, adjusts pan to keep focal point under cursor.
- **Drag detection**: `isDragOccurred` ref prevents accidental selection during pan.

## Project-Specific Conventions

### File Organization

- **`App.tsx`**: Main component. Houses app state, SVG load, preview, export orchestration, and canvas rendering.
- **`components/`**: Modals and panels (UI). Includes `Toaster.tsx` (global toast renderer).
- **`hooks/`**: Stateful logic extraction (`useProjectSystem`, `useViewport`).
- **`utils/helpers.ts`**: Pure functions — SVG parsing, QR generation, JSON validation (`validateJsonData`), record rendering (`renderRecordSvg`).
- **`utils/db.ts`**: IndexedDB persistence (projects) + one-time localStorage migration.
- **`utils/toast.ts`**: Dependency-free toast bus used app-wide instead of `alert()`.
- **`services/`**: Not present yet — reserved for future external API integration (see Gemini note above).

### TypeScript Patterns

- All types centralized in `types.ts`
- Extensive use of `Record<string, T>` for ID-keyed maps (`nodeMap`, `smartObjects`)
- DOM parsing: Uses native `DOMParser` + `createElementNS` for SVG manipulation

### Styling Approach

- Tailwind-like inline classes (custom dark theme: `#1E1E1E` bg, `#DFFF50` accent)
- No CSS modules, all styles in JSX `className` or inline `<style>` blocks
- Custom scrollbar styles for panels

## Common Pitfalls & Solutions

1. **SVG Hover Conflicts**: Root `<svg>` hover must be excluded. Use CSS `svg g:hover` for child elements, handle clicks in JS with DOM traversal.

2. **Selection Overlay Positioning**: `SelectionOverlay` calculates bounding boxes relative to scaled container. Must recalculate on viewport changes (`useEffect` deps: `[selectedId, scale, contentRef]`).

3. **Export Timing**: Export rasterises each record from an off-screen node using `renderRecordSvg()` (in `utils/helpers.ts`), so it no longer depends on React re-render timing or fixed `setTimeout` delays. The live canvas still renders via `finalRenderedSvg` state for the preview.

4. **Storage Limits**: Projects now persist in IndexedDB (`utils/db.ts`), which avoids the old ~5MB `localStorage` quota. Save failures surface a toast instead of failing silently.

5. **QR Code ViewBox**: Generated QR SVG must preserve original element's `x/y/width/height` but use dynamic `viewBox`. Parse generated SVG to extract correct viewBox.

## Key Commands & Scripts

```bash
pnpm dev          # Vite dev server on :3000
pnpm build        # Production build to dist/
pnpm preview      # Preview production build
```

**Environment Setup**: Create `.env.local` with `GEMINI_API_KEY=...` (accessed as `process.env.API_KEY` in code).

## Integration Points

- **Google Gemini API**: REST API via `@google/genai` SDK. Requires API key. Only used for AI field mapping, not core functionality.
- **Google Fonts API**: Dynamic CSS injection for font loading. No API key needed.
- **Browser APIs**: Heavy use of `FileReader`, `DOMParser`, `document.fonts`, `html-to-image` canvas rendering.

## Testing & Debugging

No test suite currently. Debugging tips:

- Check browser console for font loading errors (common issue)
- Export failures: Check `html-to-image` fallback path with `skipFonts`
- Viewport issues: Inspect `pan`/`scale` state in React DevTools
- Smart object rendering: Compare `svgContent` vs `finalRenderedSvg` in state
