"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";

export interface MaskCanvasHandle {
  getMaskBase64: () => string | null;
  clear: () => void;
}

interface MaskCanvasProps {
  imageWidth: number;
  imageHeight: number;
  brushSize: number;
  mode: "paint" | "erase";
  visible: boolean;
  onMaskChange: (hasPixels: boolean) => void;
}

// Color used to visualize the mask overlay (semi-transparent red)
const OVERLAY_COLOR = "rgba(239, 68, 68, 0.45)";

export const MaskCanvas = forwardRef<MaskCanvasHandle, MaskCanvasProps>(
  function MaskCanvas(
    { imageWidth, imageHeight, brushSize, mode, visible, onMaskChange },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
      null
    );

    // Check if canvas has any painted pixels
    const checkHasPixels = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      // Check alpha channel — any non-zero alpha means painted
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
          onMaskChange(true);
          return;
        }
      }
      onMaskChange(false);
    }, [onMaskChange]);

    // Expose methods to parent
    useImperativeHandle(
      ref,
      () => ({
        getMaskBase64: () => {
          const canvas = canvasRef.current;
          if (!canvas) return null;
          const ctx = canvas.getContext("2d");
          if (!ctx) return null;

          // Read the overlay canvas
          const sourceData = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );

          // Create a white-on-black mask: white where painted, black elsewhere
          const maskCanvas = document.createElement("canvas");
          maskCanvas.width = canvas.width;
          maskCanvas.height = canvas.height;
          const maskCtx = maskCanvas.getContext("2d")!;

          // Fill black background
          maskCtx.fillStyle = "#000000";
          maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

          // Paint white where overlay has any alpha
          const maskData = maskCtx.getImageData(
            0,
            0,
            maskCanvas.width,
            maskCanvas.height
          );
          for (let i = 0; i < sourceData.data.length; i += 4) {
            if (sourceData.data[i + 3] > 0) {
              maskData.data[i] = 255; // R
              maskData.data[i + 1] = 255; // G
              maskData.data[i + 2] = 255; // B
              maskData.data[i + 3] = 255; // A
            }
          }
          maskCtx.putImageData(maskData, 0, 0);

          // Return base64 without the data URL prefix
          const dataUrl = maskCanvas.toDataURL("image/png");
          return dataUrl.replace(/^data:image\/png;base64,/, "");
        },

        clear: () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          onMaskChange(false);
        },
      }),
      [onMaskChange]
    );

    // Get position relative to canvas from mouse/touch event
    const getPos = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();

        let clientX: number, clientY: number;
        if ("touches" in e) {
          const touch = e.touches[0] || e.changedTouches[0];
          clientX = touch.clientX;
          clientY = touch.clientY;
        } else {
          clientX = e.clientX;
          clientY = e.clientY;
        }

        // Scale from CSS size to canvas pixel size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY,
        };
      },
      []
    );

    // Draw a stroke between two points
    const drawStroke = useCallback(
      (
        from: { x: number; y: number },
        to: { x: number; y: number }
      ) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (mode === "erase") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.strokeStyle = "rgba(0,0,0,1)";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = OVERLAY_COLOR;
        }

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      },
      [brushSize, mode]
    );

    // Draw a dot (for single click without move)
    const drawDot = useCallback(
      (pos: { x: number; y: number }) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (mode === "erase") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.fillStyle = "rgba(0,0,0,1)";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = OVERLAY_COLOR;
        }

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      },
      [brushSize, mode]
    );

    // Mouse / touch handlers
    const handlePointerDown = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const pos = getPos(e);
        if (!pos) return;
        isDrawing.current = true;
        lastPos.current = pos;
        drawDot(pos);
      },
      [getPos, drawDot]
    );

    const handlePointerMove = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        const pos = getPos(e);
        if (!pos) return;

        // Update cursor for CSS display
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          let clientX: number, clientY: number;
          if ("touches" in e) {
            const touch = e.touches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
          } else {
            clientX = e.clientX;
            clientY = e.clientY;
          }
          setCursorPos({
            x: clientX - rect.left,
            y: clientY - rect.top,
          });
        }

        if (!isDrawing.current || !lastPos.current) return;
        e.preventDefault();
        drawStroke(lastPos.current, pos);
        lastPos.current = pos;
      },
      [getPos, drawStroke]
    );

    const handlePointerUp = useCallback(() => {
      if (isDrawing.current) {
        isDrawing.current = false;
        lastPos.current = null;
        checkHasPixels();
      }
    }, [checkHasPixels]);

    // Global mouseup to catch releases outside canvas
    useEffect(() => {
      const handler = () => {
        if (isDrawing.current) {
          isDrawing.current = false;
          lastPos.current = null;
          checkHasPixels();
        }
      };
      window.addEventListener("mouseup", handler);
      window.addEventListener("touchend", handler);
      return () => {
        window.removeEventListener("mouseup", handler);
        window.removeEventListener("touchend", handler);
      };
    }, [checkHasPixels]);

    if (!visible) return null;

    return (
      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          width={imageWidth}
          height={imageHeight}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: "none", touchAction: "none" }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={() => setCursorPos(null)}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
        {/* Custom brush cursor */}
        {cursorPos && (
          <div
            className="pointer-events-none absolute rounded-full border-2"
            style={{
              width: brushSize,
              height: brushSize,
              left: cursorPos.x - brushSize / 2,
              top: cursorPos.y - brushSize / 2,
              borderColor: mode === "erase" ? "rgba(255,255,255,0.8)" : "rgba(239,68,68,0.8)",
              backgroundColor: mode === "erase" ? "rgba(255,255,255,0.1)" : "rgba(239,68,68,0.1)",
            }}
          />
        )}
      </div>
    );
  }
);
