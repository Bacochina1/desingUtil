import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { AspectRatio, EditTool } from '../types';

interface ImageCanvasProps {
  src: string;
  brushSize: number;
  brushColor: string;
  brushOpacity: number;
  brushHardness: number;
  activeTool: EditTool | null;
}

export interface ImageCanvasRef {
  getCompositeImageWithMask: () => Promise<{ compositeImage: string; mimeType: string; }>;
  getFinalExpandedImage: () => Promise<{ expandedImage: string; mimeType:string; }>;
  setAspectRatio: (ratio: AspectRatio) => void;
  setExplicitCanvasSize: (width: number, height: number) => void;
  clearMask: () => void;
  reset: () => void;
}

interface Point {
    x: number;
    y: number;
}

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

const HANDLE_SIZE = 12;

export const ImageCanvas = forwardRef<ImageCanvasRef, ImageCanvasProps>(({ src, brushSize, brushColor, brushOpacity, brushHardness, activeTool }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [canvasRect, setCanvasRect] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [imageDrawRect, setImageDrawRect] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  
  const isExpandable = activeTool === 'expand' || activeTool === 'resize';
  const isPaintable = activeTool === 'inpainting';

  const fitImageToContainer = useCallback((img: HTMLImageElement): Rect => {
    if (!containerRef.current) return { x: 0, y: 0, width: 0, height: 0 };
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const imageRatio = img.naturalWidth / img.naturalHeight;
    
    let fitWidth = containerWidth;
    let fitHeight = containerWidth / imageRatio;

    if (fitHeight > containerHeight) {
      fitHeight = containerHeight;
      fitWidth = containerHeight * imageRatio;
    }
    
    const fitX = (containerWidth - fitWidth) / 2;
    const fitY = (containerHeight - fitHeight) / 2;

    return { x: fitX, y: fitY, width: fitWidth, height: fitHeight };
  }, []);

  const redrawCanvas = useCallback(() => {
    if (!containerRef.current || !imageCanvasRef.current || !maskCanvasRef.current) return;

    const { clientWidth: containerWidth, clientHeight: containerHeight } = containerRef.current;
    
    [imageCanvasRef.current, maskCanvasRef.current].forEach(canvas => {
      canvas.width = containerWidth;
      canvas.height = containerHeight;
    });
    
    if (imageEl) {
      const imgCtx = imageCanvasRef.current.getContext('2d');
      if (!imgCtx) return;
      imgCtx.clearRect(0, 0, containerWidth, containerHeight);
      
      // This is the core fix: The image is always drawn with its correct, non-distorted dimensions.
      imgCtx.drawImage(imageEl, imageDrawRect.x, imageDrawRect.y, imageDrawRect.width, imageDrawRect.height);
    }
  }, [imageEl, imageDrawRect]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      setImageEl(img);
      const initialRect = fitImageToContainer(img);
      setImageDrawRect(initialRect);
      setCanvasRect(initialRect);
    };
  }, [src, fitImageToContainer]);
  
  useEffect(() => {
    redrawCanvas();
    const handleResize = () => {
      if (imageEl) {
        const newRect = fitImageToContainer(imageEl);
        setImageDrawRect(newRect);
        setCanvasRect(newRect);
        redrawCanvas();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas, imageEl, fitImageToContainer]);


  const getCoords = (e: React.MouseEvent): Point => {
    const canvas = containerRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const drawSoftCircle = (context: CanvasRenderingContext2D, x: number, y: number) => {
    const radius = brushSize / 2;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);

    const solidColor = `rgba(255, 0, 255, ${brushOpacity})`;
    const transparentColor = `rgba(255, 0, 255, 0)`;

    gradient.addColorStop(0, solidColor);
    gradient.addColorStop(Math.max(0, brushHardness), solidColor);
    gradient.addColorStop(1, transparentColor);

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  };

  const startDrawing = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPaintable) return;
    setIsDrawing(true);
    const pos = getCoords(e);
    setLastPoint(pos);
    const context = maskCanvasRef.current?.getContext('2d');
    if (context) {
        drawSoftCircle(context, pos.x, pos.y);
    }
  };

  const stopDrawing = () => {
    if (!isPaintable) return;
    setIsDrawing(false);
    setLastPoint(null);
  };

  const draw = (e: React.MouseEvent<HTMLDivElement>) => {
    const currentPos = getCoords(e);
    setMousePos(currentPos);
    if (!isDrawing || !isPaintable || !lastPoint) return;
    
    const context = maskCanvasRef.current?.getContext('2d');
    if (context) {
        const dist = Math.hypot(currentPos.x - lastPoint.x, currentPos.y - lastPoint.y);
        const angle = Math.atan2(currentPos.y - lastPoint.y, currentPos.x - lastPoint.x);
        
        for (let i = 0; i < dist; i += Math.max(1, brushSize / 10)) {
            const x = lastPoint.x + (Math.cos(angle) * i);
            const y = lastPoint.y + (Math.sin(angle) * i);
            drawSoftCircle(context, x, y);
        }
        drawSoftCircle(context, currentPos.x, currentPos.y);
    }
    setLastPoint(currentPos);
  };
  
  const handleMouseDownOnHandle = (e: React.MouseEvent<HTMLDivElement>, handle: string) => {
    if (!isExpandable) return;
    e.stopPropagation();
    setIsDragging(handle);
  };

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCanvasRect(prev => {
        let { x: newX, y: newY, width: newW, height: newH } = prev;

        if (isDragging.includes('r')) newW = x - newX;
        if (isDragging.includes('l')) { newW += newX - x; newX = x; }
        if (isDragging.includes('b')) newH = y - newY;
        if (isDragging.includes('t')) { newH += newY - y; newY = y; }
        
        return { x: newX, y: newY, width: Math.max(newW, HANDLE_SIZE * 2), height: Math.max(newH, HANDLE_SIZE * 2) };
    });

  }, [isDragging]);
  
   useEffect(() => {
    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  useImperativeHandle(ref, () => ({
    getCompositeImageWithMask: async () => {
        if (!imageEl) throw new Error("Image not loaded");
        
        const compositeCanvas = document.createElement('canvas');
        const { naturalWidth: w, naturalHeight: h } = imageEl;
        compositeCanvas.width = w;
        compositeCanvas.height = h;

        const ctx = compositeCanvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");
        
        ctx.drawImage(imageEl, 0, 0);

        if (maskCanvasRef.current && imageCanvasRef.current) {
            const scaleX = w / imageDrawRect.width;
            const scaleY = h / imageDrawRect.height;

            ctx.save();
            ctx.scale(scaleX, scaleY);
            ctx.drawImage(maskCanvasRef.current, -imageDrawRect.x, -imageDrawRect.y);
            ctx.restore();
        }
        
        const mimeType = src.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
        return { compositeImage: compositeCanvas.toDataURL(mimeType), mimeType };
    },
    getFinalExpandedImage: async () => {
      if (!imageEl) throw new Error("Image not loaded");
      
      const expandedCanvas = document.createElement('canvas');
      
      // Use the dimensions of the resizable canvasRect for the output
      expandedCanvas.width = canvasRect.width;
      expandedCanvas.height = canvasRect.height;
      
      const ctx = expandedCanvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");
      
      // Calculate where to draw the original image inside the new expanded canvas
      const drawX = imageDrawRect.x - canvasRect.x;
      const drawY = imageDrawRect.y - canvasRect.y;

      ctx.drawImage(imageEl, drawX, drawY, imageDrawRect.width, imageDrawRect.height);
      
      const mimeType = 'image/png';
      return { expandedImage: expandedCanvas.toDataURL(mimeType), mimeType };
    },
     setAspectRatio: (ratioStr: AspectRatio) => {
        if (!imageEl) return;

        const [w, h] = ratioStr.split(':').map(Number);
        const targetRatio = w / h;
        const imgRatio = imageDrawRect.width / imageDrawRect.height;
        
        let newW, newH;

        if (targetRatio > imgRatio) {
            newH = imageDrawRect.height;
            newW = newH * targetRatio;
        } else {
            newW = imageDrawRect.width;
            newH = newW / targetRatio;
        }
        
        const newX = imageDrawRect.x - (newW - imageDrawRect.width) / 2;
        const newY = imageDrawRect.y - (newH - imageDrawRect.height) / 2;
        
        setCanvasRect({ x: newX, y: newY, width: newW, height: newH });
    },
    setExplicitCanvasSize(width, height) {
        if (!containerRef.current) return;
        const { clientWidth: containerWidth, clientHeight: containerHeight } = containerRef.current;
        const newX = (containerWidth - width) / 2;
        const newY = (containerHeight - height) / 2;
        setCanvasRect({ x: newX, y: newY, width, height });
    },
    clearMask: () => {
        const canvas = maskCanvasRef.current;
        if(canvas){
            const context = canvas.getContext('2d');
            context?.clearRect(0, 0, canvas.width, canvas.height);
        }
    },
    reset: () => {
       if (imageEl) {
          const initialRect = fitImageToContainer(imageEl);
          setImageDrawRect(initialRect);
          setCanvasRect(initialRect);
        }
    }
  }));
  
  const handles = ['t', 'b', 'l', 'r', 'tl', 'tr', 'bl', 'br'];

  return (
    <div 
        ref={containerRef} 
        className="w-full h-full relative flex items-center justify-center select-none overflow-hidden"
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onMouseMove={draw}
        style={{ cursor: isPaintable ? 'none' : 'default' }}
    >
      <canvas ref={imageCanvasRef} className="absolute inset-0 m-auto pointer-events-none" style={{ zIndex: 1 }} />
      <canvas ref={maskCanvasRef} className="absolute inset-0 m-auto pointer-events-none" style={{ zIndex: 3 }} />

        {isPaintable && (
            <div
                className="custom-cursor pointer-events-none"
                style={{
                    position: 'absolute',
                    left: `${mousePos.x}px`,
                    top: `${mousePos.y}px`,
                    width: `${brushSize}px`,
                    height: `${brushSize}px`,
                    borderRadius: '50%',
                    boxShadow: `0 0 0 1px white, inset 0 0 0 ${brushSize/2 * (1 - brushHardness)}px rgba(255,255,255,${brushOpacity * 0.5})`,
                    transform: 'translate(-50%, -50%)',
                    transition: 'width 0.1s, height 0.1s, box-shadow 0.1s',
                    zIndex: 100
                }}
            />
        )}
      
       {isExpandable && (
        <>
            <div className="absolute border-2 border-dashed border-indigo-400 pointer-events-none" style={{
                left: canvasRect.x,
                top: canvasRect.y,
                width: canvasRect.width,
                height: canvasRect.height,
                zIndex: 2,
            }}/>
            {handles.map(handle => {
                let cursor, positionStyle;
                const baseStyle = {
                    position: 'absolute',
                    width: `${HANDLE_SIZE}px`,
                    height: `${HANDLE_SIZE}px`,
                    backgroundColor: 'white',
                    border: '1px solid black',
                    borderRadius: '2px',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 20
                };
                
                const top = canvasRect.y;
                const left = canvasRect.x;
                const right = canvasRect.x + canvasRect.width;
                const bottom = canvasRect.y + canvasRect.height;
                const midX = left + canvasRect.width / 2;
                const midY = top + canvasRect.height / 2;

                switch (handle) {
                    case 't': cursor = 'ns-resize'; positionStyle = { top, left: midX }; break;
                    case 'b': cursor = 'ns-resize'; positionStyle = { top: bottom, left: midX }; break;
                    case 'l': cursor = 'ew-resize'; positionStyle = { top: midY, left }; break;
                    case 'r': cursor = 'ew-resize'; positionStyle = { top: midY, left: right }; break;
                    case 'tl': cursor = 'nwse-resize'; positionStyle = { top, left }; break;
                    case 'tr': cursor = 'nesw-resize'; positionStyle = { top, left: right }; break;
                    case 'bl': cursor = 'nesw-resize'; positionStyle = { top: bottom, left }; break;
                    case 'br': cursor = 'nwse-resize'; positionStyle = { top: bottom, left: right }; break;
                    default: cursor = 'default'; positionStyle={};
                }

                return (
                    <div 
                        key={handle}
                        style={{ ...baseStyle, ...positionStyle, cursor }}
                        onMouseDown={(e) => handleMouseDownOnHandle(e, handle)}
                    />
                );
            })}
        </>
       )}
    </div>
  );
});