import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';

export interface DrawingCanvasRef {
  getCanvasData: () => { dataUrl: string; mimeType: string; };
  clearCanvas: () => void;
}

interface Point {
  x: number;
  y: number;
}

export const DrawingCanvas = forwardRef<DrawingCanvasRef, {}>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== width || canvas.height !== height) {
        const context = canvas.getContext('2d');
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx?.drawImage(canvas, 0, 0);

        canvas.width = width;
        canvas.height = height;
        context?.drawImage(tempCanvas, 0, 0);
        
        if (context) {
          context.strokeStyle = 'black';
          context.lineWidth = 3;
          context.lineCap = 'round';
          context.lineJoin = 'round';
        }
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (context) {
      context.strokeStyle = 'black';
      context.lineWidth = 3;
      context.lineCap = 'round';
      context.lineJoin = 'round';
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    setLastPoint(getCoords(e));
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const currentPos = getCoords(e);
    const context = canvasRef.current?.getContext('2d');
    if (context && lastPoint) {
      context.beginPath();
      context.moveTo(lastPoint.x, lastPoint.y);
      context.lineTo(currentPos.x, currentPos.y);
      context.stroke();
    }
    setLastPoint(currentPos);
  };

  useImperativeHandle(ref, () => ({
    getCanvasData: () => {
      const canvas = canvasRef.current;
      if (!canvas) return { dataUrl: '', mimeType: 'image/png' };
      return { dataUrl: canvas.toDataURL('image/png'), mimeType: 'image/png' };
    },
    clearCanvas: () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext('2d');
        context?.clearRect(0, 0, canvas.width, canvas.height);
      }
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      onMouseDown={startDrawing}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onMouseMove={draw}
      onTouchStart={startDrawing}
      onTouchEnd={stopDrawing}
      onTouchMove={draw}
    />
  );
});
