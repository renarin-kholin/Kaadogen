import React, { useState, useRef, useEffect, useMemo } from "react";
import { LayersPanel } from "./components/LayersPanel";
import { PropertiesPanel } from "./components/PropertiesPanel";
import {
	FrameIcon,
	PlayIcon,
	JsonIcon,
	HandIcon,
	MoveIcon,
	ShareIcon,
	StopIcon,
	SaveIcon,
	HomeIcon,
	EditIcon,
} from "./components/Icons";
import { SvgNodeInfo, SmartObject, JsonDataRow, FontData } from "./types";
import { FontManagerModal } from "./components/FontManagerModal";
import { ExportModal, ExportOptions } from "./components/ExportModal";
import { ProjectManagerModal } from "./components/ProjectManagerModal";
import { Toaster } from "./components/Toaster";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import * as htmlToImage from "html-to-image";

// Hooks & Utils
import { useProjectSystem } from "./hooks/useProjectSystem";
import { useViewport } from "./hooks/useViewport";
import {
	parseSvgString,
	validateJsonData,
	renderRecordSvg,
	getSvgDimensions,
} from "./utils/helpers";
import { toast } from "./utils/toast";

// --- Selection Overlay Component ---
const SelectionOverlay = ({
	selectedId,
	contentRef,
	scale,
	nodeMap,
}: {
	selectedId: string | null;
	contentRef: React.RefObject<HTMLDivElement>;
	scale: number;
	nodeMap: Record<string, SvgNodeInfo>;
}) => {
	const [box, setBox] = useState<{
		x: number;
		y: number;
		w: number;
		h: number;
	} | null>(null);

	useEffect(() => {
		if (!selectedId || !contentRef.current) {
			setBox(null);
			return;
		}

		const updateBox = () => {
			const container = contentRef.current;
			const element = container?.querySelector(`[id='${selectedId}']`);

			if (container && element) {
				const containerRect = container.getBoundingClientRect();
				const elRect = element.getBoundingClientRect();

				// Calculate relative position inside the scaled container
				setBox({
					x: (elRect.left - containerRect.left) / scale,
					y: (elRect.top - containerRect.top) / scale,
					w: elRect.width / scale,
					h: elRect.height / scale,
				});
			}
		};

		updateBox();
		// Re-calc on window resize or if svg content might have shifted (layout effect usually better but effect ok here)
		window.addEventListener("resize", updateBox);
		return () => window.removeEventListener("resize", updateBox);
	}, [selectedId, scale, contentRef]);

	if (!box || !selectedId) return null;

	const label = nodeMap[selectedId]?.id || selectedId;

	return (
		<div
			className="absolute pointer-events-none z-50"
			style={{
				left: box.x,
				top: box.y,
				width: box.w,
				height: box.h,
				border: "2px solid #DFFF50",
				boxShadow: "0 0 0 1px rgba(0,0,0,0.5)", // outer shadow for contrast
			}}
		>
			{/* Label Tag */}
			<div className="absolute -top-6 left-[-2px] h-6 bg-[#DFFF50] px-2 flex items-center rounded-t-sm shadow-sm">
				<span className="text-[10px] font-bold text-black whitespace-nowrap max-w-[150px] truncate">
					{label}
				</span>
			</div>
			{/* Corner Handles (Visual only) */}
			<div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-[#DFFF50]" />
			<div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-[#DFFF50]" />
			<div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-[#DFFF50]" />
			<div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-[#DFFF50]" />
		</div>
	);
};

export default function App() {
	// --- Custom Hooks ---
	const project = useProjectSystem();
	const viewport = useViewport();

	// --- App State ---
	const [svgContent, setSvgContent] = useState<string | null>(null);
	const [nodes, setNodes] = useState<SvgNodeInfo[]>([]);
	const [nodeMap, setNodeMap] = useState<Record<string, SvgNodeInfo>>({});
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [smartObjects, setSmartObjects] = useState<Record<string, SmartObject>>(
		{}
	);
	const [jsonData, setJsonData] = useState<JsonDataRow[]>([]);
	const [currentJsonIndex, setCurrentJsonIndex] = useState<number>(0);

	// UI State
	const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
	const [isDirty, setIsDirty] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [showProjectManager, setShowProjectManager] = useState(true);
	const [isEditingName, setIsEditingName] = useState(false);
	const [leftSidebarWidth, setLeftSidebarWidth] = useState(240);
	const [rightSidebarWidth, setRightSidebarWidth] = useState(260);

	// Export & Fonts State
	const [showExportModal, setShowExportModal] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [exportProgress, setExportProgress] = useState(0);
	const [detectedFonts, setDetectedFonts] = useState<FontData[]>([]);
	const [showFontModal, setShowFontModal] = useState(false);
	const [pendingSvgData, setPendingSvgData] = useState<{
		content: string;
		nodes: SvgNodeInfo[];
		map: Record<string, SvgNodeInfo>;
	} | null>(null);

	// Refs
	const canvasRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const nameInputRef = useRef<HTMLInputElement>(null);
	const latestSave = useRef<() => void>(() => {});
	const dirtyRef = useRef(false);
	dirtyRef.current = isDirty && !!svgContent;

	// Derived
	const availableKeys = useMemo(
		() => (jsonData.length > 0 ? Object.keys(jsonData[0]) : []),
		[jsonData]
	);

	// --- Font Loading Logic ---
	useEffect(() => {
		if (!showFontModal) return;
		detectedFonts.forEach(async (font) => {
			if (font.status !== "pending") return;
			if (font.source === "google") {
				try {
					const fontId = font.family.trim().replace(/ /g, "+");
					const href = `https://fonts.googleapis.com/css2?family=${fontId}:wght@300;400;500;600;700&display=swap`;
					let link = document.querySelector(
						`link[href="${href}"]`
					) as HTMLLinkElement;
					if (!link) {
						link = document.createElement("link");
						link.href = href;
						link.rel = "stylesheet";
						document.head.appendChild(link);
					}
					await document.fonts.load(`1em "${font.family}"`);
					updateFontStatus(font.family, "loaded");
				} catch (e) {
					updateFontStatus(font.family, "error");
				}
			} else if (font.source === "custom" && font.file) {
				try {
					const buffer = await font.file.arrayBuffer();
					const fontFace = new FontFace(font.family, buffer);
					await fontFace.load();
					document.fonts.add(fontFace);
					updateFontStatus(font.family, "loaded");
				} catch (e) {
					updateFontStatus(font.family, "error");
				}
			}
		});
	}, [detectedFonts, showFontModal]);

	const updateFontStatus = (family: string, status: FontData["status"]) => {
		setDetectedFonts((prev) =>
			prev.map((f) => (f.family === family ? { ...f, status } : f))
		);
	};

	// --- Action Handlers ---

	const handleSave = async () => {
		if (!svgContent) {
			toast("Nothing to save yet — import an SVG template first.", "info");
			return;
		}
		const id = await project.saveProject(
			svgContent,
			smartObjects,
			jsonData,
			nodes,
			nodeMap,
			viewport.pan,
			viewport.scale,
			contentRef.current,
			selectedId
		);
		if (id) {
			setIsDirty(false);
			toast("Project saved.", "success");
		}
	};
	latestSave.current = handleSave;

	const handleLoadProject = async (id: string) => {
		const data = await project.loadProject(id);
		if (data) {
			setSvgContent(data.svgContent);
			setSmartObjects(data.smartObjects);
			setJsonData(data.jsonData);
			setCurrentJsonIndex(0);
			setNodes(data.nodes);
			setNodeMap(data.nodeMap);
			viewport.setPan(data.pan);
			viewport.setScale(data.scale);
			setSelectedId(null);
			setIsDirty(false);
			setShowProjectManager(false);
		}
	};

	const handleCreateNew = () => {
		project.createNewProject();
		setSvgContent(null);
		setNodes([]);
		setNodeMap({});
		setSmartObjects({});
		setJsonData([]);
		setCurrentJsonIndex(0);
		setSelectedId(null);
		setIsDirty(false);
		viewport.setPan({ x: 100, y: 100 });
		viewport.setScale(1);
		setShowProjectManager(false);
	};

	const processSvgText = (text: string) => {
		let parsed;
		try {
			parsed = parseSvgString(text);
		} catch (err) {
			console.error("SVG parse failed", err);
			toast("Could not read that SVG file.", "error");
			return;
		}
		if (parsed.rootNodes.length === 0) {
			toast("No usable elements found in that SVG.", "error");
			return;
		}
		if (parsed.hasMissingFonts) {
			setDetectedFonts(parsed.detectedFonts);
			setPendingSvgData({
				content: text,
				nodes: parsed.rootNodes,
				map: parsed.map,
			});
			setShowFontModal(true);
		} else {
			finalizeSvgLoad(text, parsed.rootNodes, parsed.map);
		}
	};

	const loadSvgFile = (file: File) => {
		if (!/\.svg$/i.test(file.name) && file.type !== "image/svg+xml") {
			toast("Please provide an .svg file.", "error");
			return;
		}
		const reader = new FileReader();
		reader.onload = (event) => processSvgText(event.target?.result as string);
		reader.onerror = () => toast("Failed to read the file.", "error");
		reader.readAsText(file);
	};

	const handleSvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) loadSvgFile(file);
		e.target.value = "";
	};

	const finalizeSvgLoad = (
		content: string,
		rootNodes: SvgNodeInfo[],
		map: Record<string, SvgNodeInfo>
	) => {
		setSvgContent(content);
		setNodes(rootNodes);
		setNodeMap(map);
		setSmartObjects({});
		setSelectedId(null);
		setIsDirty(true);
		viewport.setPan({ x: 100, y: 100 });
		viewport.setScale(1);
		setShowFontModal(false);
		setPendingSvgData(null);
	};

	const handleFontManagerComplete = () => {
		if (pendingSvgData) {
			finalizeSvgLoad(
				pendingSvgData.content,
				pendingSvgData.nodes,
				pendingSvgData.map
			);
		} else {
			setShowFontModal(false);
		}
	};

	const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (event) => {
			let parsed: unknown;
			try {
				parsed = JSON.parse(event.target?.result as string);
			} catch (err) {
				toast("Invalid JSON — the file could not be parsed.", "error");
				return;
			}
			const result = validateJsonData(parsed);
			if (!result.data) {
				toast(result.error || "Invalid JSON data.", "error");
				return;
			}
			setJsonData(result.data);
			setCurrentJsonIndex(0);
			setIsDirty(true);
			result.warnings.forEach((w) => toast(w, "warning"));
			toast(`Loaded ${result.data.length} record(s).`, "success");
		};
		reader.onerror = () => toast("Failed to read the file.", "error");
		reader.readAsText(file);
		e.target.value = "";
	};

	const handleCanvasClick = (e: React.MouseEvent) => {
		if (
			viewport.isDragOccurred.current ||
			viewport.activeTool === "hand" ||
			viewport.isSpacePressed
		)
			return;
		let target = e.target as HTMLElement;

		// Prevent selecting the root container or root svg
		if (
			target === contentRef.current ||
			(target.tagName && target.tagName.toLowerCase() === "div")
		) {
			setSelectedId(null);
			return;
		}

		while (target && target !== contentRef.current) {
			// If we hit the root svg during bubble up, stop and deselect
			if (
				target.tagName &&
				target.tagName.toLowerCase() === "svg" &&
				target.parentElement === contentRef.current
			) {
				setSelectedId(null);
				return;
			}
			if (target.id && nodeMap[target.id]) {
				setSelectedId(target.id);
				return;
			}
			target = target.parentElement as HTMLElement;
		}
		setSelectedId(null);
	};

	// --- Render Logic (Smart Objects) ---
	const [finalRenderedSvg, setFinalRenderedSvg] = useState<string | null>(null);
	useEffect(() => {
		if (!svgContent) {
			setFinalRenderedSvg(null);
			return;
		}
		if ((!isPreviewMode && !isExporting) || jsonData.length === 0) {
			setFinalRenderedSvg(svgContent);
			return;
		}
		const currentRow = jsonData[currentJsonIndex];
		if (!currentRow) return;
		try {
			setFinalRenderedSvg(renderRecordSvg(svgContent, smartObjects, currentRow));
		} catch (e) {
			console.error("Render failed", e);
			setFinalRenderedSvg(svgContent);
		}
	}, [
		svgContent,
		isPreviewMode,
		jsonData,
		currentJsonIndex,
		smartObjects,
		isExporting,
	]);

	// --- Keyboard shortcuts & unsaved-changes guard ---
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
				e.preventDefault();
				latestSave.current();
			} else if (e.key === "Escape") {
				setSelectedId(null);
			}
		};
		const onBeforeUnload = (e: BeforeUnloadEvent) => {
			if (dirtyRef.current) {
				e.preventDefault();
				e.returnValue = "";
			}
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("beforeunload", onBeforeUnload);
		};
	}, []);

	// --- Drag & drop SVG onto the canvas ---
	const handleDragOver = (e: React.DragEvent) => {
		if (e.dataTransfer.types.includes("Files")) {
			e.preventDefault();
			setIsDragging(true);
		}
	};
	const handleDragLeave = (e: React.DragEvent) => {
		if (e.currentTarget === e.target) setIsDragging(false);
	};
	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files?.[0];
		if (file) loadSvgFile(file);
	};

	// --- Export Logic ---
	// Renders each record to a string and rasterises it from a dedicated
	// off-screen node, so export no longer depends on React re-render timing
	// (the old approach drove the visible canvas and slept a fixed 200ms/record,
	// which raced and could capture blank or stale cards).
	const handleExport = async (options: ExportOptions) => {
		if (jsonData.length === 0 || !svgContent) return;
		setIsExporting(true);
		setExportProgress(0);

		const { width, height } = getSvgDimensions(svgContent);
		const pdfWidth = width * 0.75;
		const pdfHeight = height * 0.75;
		const bleed = 0.5;
		const zip = new JSZip();
		const pdf =
			options.format === "pdf"
				? new jsPDF({ unit: "pt", format: [pdfWidth, pdfHeight] })
				: null;

		// Off-screen stage used only for rasterisation.
		const stage = document.createElement("div");
		stage.style.cssText =
			"position:fixed;left:-100000px;top:0;pointer-events:none;opacity:0;";
		document.body.appendChild(stage);

		try {
			for (let i = 0; i < jsonData.length; i++) {
				const rendered = renderRecordSvg(svgContent, smartObjects, jsonData[i]);
				const fileName = `${options.filename}-${i + 1}`;

				if (options.format === "zip-svg") {
					zip.file(`${fileName}.svg`, rendered);
				} else {
					stage.innerHTML = rendered;
					const node = stage.querySelector("svg") as unknown as HTMLElement;
					if (!node) continue;

					const pixelRatio = options.dpi / 96;
					const opts = {
						pixelRatio,
						width,
						height,
						cacheBust: true,
						style: { transform: "none", margin: "0" },
					};
					let dataUrl: string;
					try {
						dataUrl = await htmlToImage.toPng(node, opts);
					} catch {
						dataUrl = await htmlToImage.toPng(node, { ...opts, skipFonts: true });
					}

					if (options.format === "pdf" && pdf) {
						if (i > 0) pdf.addPage([pdfWidth, pdfHeight]);
						pdf.addImage(
							dataUrl,
							"PNG",
							-bleed,
							-bleed,
							pdfWidth + bleed * 2,
							pdfHeight + bleed * 2
						);
					} else {
						zip.file(`${fileName}.png`, dataUrl.split(",")[1], { base64: true });
					}
				}
				setExportProgress(i + 1);
			}

			if (options.format === "pdf" && pdf) pdf.save(`${options.filename}.pdf`);
			else {
				const content = await zip.generateAsync({ type: "blob" });
				const link = document.createElement("a");
				link.href = URL.createObjectURL(content);
				link.download = `${options.filename}.zip`;
				link.click();
				URL.revokeObjectURL(link.href);
			}
			toast(`Exported ${jsonData.length} card(s).`, "success");
		} catch (error) {
			console.error("Export failed", error);
			toast("Export failed. See console for details.", "error");
		} finally {
			stage.remove();
			setIsExporting(false);
			setShowExportModal(false);
		}
	};

	return (
		<div className="flex flex-col h-screen bg-[#1E1E1E] text-gray-200 overflow-hidden font-[Inter]">
			<style>{`
        /* Custom Hover Effect for SVG elements */
        svg g:hover, svg path:hover, svg rect:hover, svg text:hover, svg image:hover, svg circle:hover {
            outline: 2px dashed rgba(223, 255, 80, 0.4);
            cursor: pointer;
        }
        /* Exclude root SVG from hover (usually handled by App click logic but CSS backup) */
        svg:hover {
            outline: none !important;
            cursor: default;
        }
        /* Disable pointer events on root to let hover bubble, 
           BUT we need pointer events for children. 
           So we leave pointer events auto, but handle click filtering in JS. 
        */
      `}</style>

			{showFontModal && (
				<FontManagerModal
					fonts={detectedFonts}
					onUpdateFont={(f, u) =>
						setDetectedFonts((p) =>
							p.map((x) => (x.family === f ? { ...x, ...u } : x))
						)
					}
					onComplete={handleFontManagerComplete}
				/>
			)}

			<ProjectManagerModal
				isOpen={showProjectManager}
				projects={project.recentProjects}
				isLoading={project.isLoadingProjects}
				onOpenProject={handleLoadProject}
				onNewProject={handleCreateNew}
				onDeleteProject={project.deleteProject}
				onRenameProject={project.renameProject}
				onDuplicateProject={project.duplicateProject}
			/>

			<Toaster />

			<ExportModal
				isOpen={showExportModal}
				onClose={() => setShowExportModal(false)}
				totalRecords={jsonData.length}
				onExport={handleExport}
				isProcessing={isExporting}
				progress={exportProgress}
			/>

			<header className="h-12 bg-[#2C2C2C] border-b border-[#1E1E1E] flex items-center justify-between px-4 select-none z-30">
				<div className="flex items-center gap-4 w-[300px]">
					<button
						onClick={() => setShowProjectManager(true)}
						className="p-1.5 hover:bg-[#383838] rounded transition-colors"
						title="Home"
					>
						<HomeIcon className="w-4 h-4 text-gray-400 hover:text-white" />
					</button>
					<div className="w-[1px] h-6 bg-[#383838]"></div>
					<div className="flex flex-col group relative">
						{isEditingName ? (
							<input
								ref={nameInputRef}
								value={project.projectName}
								onChange={(e) => {
									project.setProjectName(e.target.value);
									setIsDirty(true);
								}}
								onBlur={() => setIsEditingName(false)}
								onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
								autoFocus
								className="bg-[#1E1E1E] text-white text-[13px] font-semibold px-1 rounded outline-none border border-[#DFFF50] w-40"
							/>
						) : (
							<div
								className="flex items-center gap-2 cursor-pointer"
								onClick={() => setIsEditingName(true)}
							>
								<span className="font-semibold text-[13px] text-white tracking-tight leading-none hover:text-[#DFFF50] transition-colors">
									{project.projectName}
								</span>
								<EditIcon className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
							</div>
						)}
						<span
							className="text-[10px] leading-none mt-0.5"
							style={{
								color:
									project.saveStatus === "error"
										? "#F87171"
										: isDirty
										? "#FBBF24"
										: "#6B7280",
							}}
						>
							{project.saveStatus === "saving"
								? "Saving…"
								: project.saveStatus === "error"
								? "Save failed"
								: isDirty
								? "Unsaved changes"
								: project.currentProjectId
								? "Saved locally"
								: "Unsaved"}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
					<div className="flex items-center bg-[#1E1E1E] rounded p-1 gap-1 border border-[#383838]">
						<button
							onClick={() => viewport.setActiveTool("move")}
							className={`p-1.5 rounded hover:bg-[#333] transition-colors ${
								viewport.activeTool === "move"
									? "bg-[#DFFF50] text-black"
									: "text-gray-400"
							}`}
						>
							<MoveIcon />
						</button>
						<button
							onClick={() => viewport.setActiveTool("hand")}
							className={`p-1.5 rounded hover:bg-[#333] transition-colors ${
								viewport.activeTool === "hand"
									? "bg-[#DFFF50] text-black"
									: "text-gray-400"
							}`}
						>
							<HandIcon />
						</button>
					</div>
					<div className="w-[1px] h-6 bg-[#383838] mx-2"></div>
					<div className="flex items-center bg-[#1E1E1E] rounded p-1 gap-1 border border-[#383838]">
						<label
							className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#333] cursor-pointer text-gray-400 hover:text-white transition-colors"
							title="Import SVG Template"
						>
							<input
								type="file"
								accept=".svg"
								onChange={handleSvgUpload}
								className="hidden"
							/>
							<FrameIcon />
							<span className="text-[11px] font-medium">Import SVG</span>
						</label>
						<div className="w-[1px] h-4 bg-[#383838]"></div>
						<label
							className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#333] cursor-pointer text-gray-400 hover:text-white transition-colors"
							title="Load JSON Data"
						>
							<input
								type="file"
								accept=".json"
								onChange={handleJsonUpload}
								className="hidden"
							/>
							<JsonIcon />
							<span className="text-[11px] font-medium">Load JSON</span>
						</label>
					</div>
					<div className="w-[1px] h-6 bg-[#383838] mx-2"></div>
					<button
						onClick={() => setIsPreviewMode(!isPreviewMode)}
						disabled={isExporting}
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium border transition-all ${
							isPreviewMode
								? "bg-[#DFFF50] text-black border-[#DFFF50]"
								: "bg-[#1E1E1E] text-gray-300 border-[#383838]"
						}`}
					>
						{isPreviewMode ? <StopIcon /> : <PlayIcon />}
						{isPreviewMode ? "Stop" : "Preview"}
					</button>
				</div>

				<div className="flex items-center gap-3 w-[300px] justify-end">
					<button
						onClick={handleSave}
						className="text-gray-400 hover:text-white p-2"
					>
						<SaveIcon />
					</button>
					<div className="flex items-center gap-1 text-[11px] text-gray-400 bg-[#1E1E1E] px-2 py-1 rounded border border-[#383838]">
						<button
							onClick={() =>
								viewport.setScale(Math.max(0.1, viewport.scale - 0.1))
							}
							className="hover:text-white px-1"
						>
							-
						</button>
						<span className="w-8 text-center">
							{Math.round(viewport.scale * 100)}%
						</span>
						<button
							onClick={() =>
								viewport.setScale(Math.min(20, viewport.scale + 0.1))
							}
							className="hover:text-white px-1"
						>
							+
						</button>
					</div>
					<button
						onClick={() =>
							jsonData.length > 0
								? setShowExportModal(true)
								: toast("Load JSON data before exporting.", "info")
						}
						disabled={isExporting}
						className="bg-[#DFFF50] text-black text-[11px] font-medium px-3 py-1.5 rounded hover:bg-[#CBE649] flex items-center gap-1.5 disabled:opacity-50"
					>
						Export <ShareIcon />
					</button>
				</div>
			</header>

			<div className="flex-1 flex overflow-hidden">
				<LayersPanel
					nodes={nodes}
					selectedId={selectedId}
					onSelect={setSelectedId}
					smartObjects={smartObjects}
					width={leftSidebarWidth}
					setWidth={setLeftSidebarWidth}
				/>

				<main className="flex-1 bg-[#1E1E1E] relative overflow-hidden flex flex-col">
					<div
						ref={canvasRef}
						className="flex-1 relative overflow-hidden"
						style={{
							cursor:
								viewport.activeTool === "hand" || viewport.isSpacePressed
									? "grab"
									: "default",
						}}
						onWheel={viewport.handleWheel}
						onMouseDown={viewport.handleMouseDown}
						onMouseMove={viewport.handleMouseMove}
						onMouseUp={viewport.handleMouseUp}
						onMouseLeave={viewport.handleMouseUp}
						onClick={handleCanvasClick}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
					>
						<div
							className="absolute inset-0 pointer-events-none opacity-[0.03]"
							style={{
								backgroundImage:
									"linear-gradient(#888 1px, transparent 1px), linear-gradient(90deg, #888 1px, transparent 1px)",
								backgroundSize: `${20 * viewport.scale}px ${
									20 * viewport.scale
								}px`,
								backgroundPosition: `${viewport.pan.x}px ${viewport.pan.y}px`,
							}}
						></div>

						{isDragging && (
							<div className="absolute inset-4 z-40 pointer-events-none border-2 border-dashed border-[#DFFF50] rounded-xl bg-[#DFFF50]/5 flex items-center justify-center">
								<p className="text-sm font-medium text-[#DFFF50]">
									Drop SVG template to import
								</p>
							</div>
						)}

						{svgContent ? (
							<div
								ref={contentRef}
								className="origin-top-left absolute top-0 left-0 shadow-2xl"
								style={{
									transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.scale})`,
								}}
							>
								<div
									dangerouslySetInnerHTML={{ __html: finalRenderedSvg || "" }}
								/>
								<SelectionOverlay
									selectedId={selectedId}
									contentRef={contentRef}
									scale={viewport.scale}
									nodeMap={nodeMap}
								/>
							</div>
						) : (
							<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center opacity-30">
								<div className="w-16 h-16 border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center mb-4">
									<FrameIcon className="w-8 h-8 text-gray-500" />
								</div>
								<p className="text-sm font-medium text-gray-500">
									Drag & Drop SVG or use Import
								</p>
							</div>
						)}
					</div>

					{isPreviewMode && jsonData.length > 0 && (
						<div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#2C2C2C] border border-[#111] rounded-full px-3 py-2 flex items-center gap-4 shadow-2xl z-20">
							<button
								onClick={() =>
									setCurrentJsonIndex(Math.max(0, currentJsonIndex - 1))
								}
								disabled={currentJsonIndex === 0 || isExporting}
								className="text-gray-400 hover:text-white disabled:opacity-30 text-[10px]"
							>
								PREV
							</button>
							<span className="text-[11px] font-mono text-gray-200">
								{currentJsonIndex + 1} / {jsonData.length}
							</span>
							<button
								onClick={() =>
									setCurrentJsonIndex(
										Math.min(jsonData.length - 1, currentJsonIndex + 1)
									)
								}
								disabled={
									currentJsonIndex === jsonData.length - 1 || isExporting
								}
								className="text-gray-400 hover:text-white disabled:opacity-30 text-[10px]"
							>
								NEXT
							</button>
						</div>
					)}
				</main>

				<PropertiesPanel
					selectedNode={selectedId ? nodeMap[selectedId] : null}
					smartObject={
						selectedId && smartObjects[selectedId]
							? smartObjects[selectedId]
							: undefined
					}
					onUpdateSmartObject={(id, updates) => {
						setIsDirty(true);
						setSmartObjects((prev) =>
							updates
								? {
										...prev,
										[id]: { ...(prev[id] || {}), ...updates } as SmartObject,
								  }
								: (delete prev[id], { ...prev })
						);
					}}
					availableKeys={availableKeys}
					width={rightSidebarWidth}
					setWidth={setRightSidebarWidth}
				/>
			</div>
		</div>
	);
}
