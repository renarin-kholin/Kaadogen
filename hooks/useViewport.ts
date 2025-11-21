import { useEffect, useRef, useState } from "react";

export type ToolType = "move" | "hand";

export const useViewport = () => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [isPanning, setIsPanning] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType>("move");
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const lastMousePos = useRef({ x: 0, y: 0 });
  const isDragOccurred = useRef(false);

  // Spacebar listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" && !e.repeat &&
        (e.target as HTMLElement).tagName !== "INPUT"
      ) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        if (!isPanning) {
          setActiveTool((prev) => prev === "hand" ? "move" : prev);
        }
        // Note: logic above slightly differs from typical Figma behavior where space temporarily activates hand
        // but for simplicity we just track the key state.
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPanning]);

  // Prevent browser zoom on Ctrl+wheel
  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", preventBrowserZoom, { passive: false });
    return () => window.removeEventListener("wheel", preventBrowserZoom);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY;
      const scaleMultiplier = delta > 0 ? 1.1 : 0.9;
      const newScale = Math.min(Math.max(0.1, scale * scaleMultiplier), 20);

      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const svgX = (mouseX - pan.x) / scale;
      const svgY = (mouseY - pan.y) / scale;
      const newPanX = mouseX - (svgX * newScale);
      const newPanY = mouseY - (svgY * newScale);

      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || activeTool === "hand" || isSpacePressed) {
      e.preventDefault();
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      isDragOccurred.current = false;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        isDragOccurred.current = true;
      }
      setPan((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  return {
    scale,
    setScale,
    pan,
    setPan,
    activeTool,
    setActiveTool,
    isSpacePressed,
    isPanning,
    isDragOccurred,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
};
