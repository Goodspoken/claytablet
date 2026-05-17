import { useRef, useEffect, useState, useCallback } from 'react';
import { X, Eraser, Trash2, Palette, Save, Undo, Redo, Type, Minus, Square, Circle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type Tool = 'brush' | 'eraser' | 'text' | 'line' | 'rect' | 'circle';

interface CanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (file: File) => void;
}

const COLORS = ['#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
const MAX_HISTORY = 30;

export function CanvasModal({ isOpen, onClose, onSave }: CanvasModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const baseSnapshotRef = useRef<ImageData | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<Tool>('brush');
  const [fontSize, setFontSize] = useState(20);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [textOverlay, setTextOverlay] = useState<{ clientX: number; clientY: number; canvasX: number; canvasY: number } | null>(null);
  const [textValue, setTextValue] = useState('');

  const { t } = useLanguage();

  const updateHistoryState = () => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  };

  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (historyRef.current.length >= MAX_HISTORY) historyRef.current.shift();
    else historyIndexRef.current++;
    historyRef.current[historyIndexRef.current] = snap;
    updateHistoryState();
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    updateHistoryState();
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    updateHistoryState();
  }, []);

  // Init canvas on open
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    historyRef.current = [];
    historyIndexRef.current = -1;
    saveSnapshot();
  }, [isOpen, saveSnapshot]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, undo, redo]);

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, clientX: 0, clientY: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      const touch = e.touches[0] ?? e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
      clientX,
      clientY,
    };
  };

  const applyStyle = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const drawShape = (ctx: CanvasRenderingContext2D, start: { x: number; y: number }, end: { x: number; y: number }) => {
    applyStyle(ctx);
    ctx.beginPath();
    if (tool === 'line') {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else if (tool === 'rect') {
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (tool === 'circle') {
      const rx = (end.x - start.x) / 2;
      const ry = (end.y - start.y) / 2;
      ctx.ellipse(start.x + rx, start.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { x, y, clientX, clientY } = getCoords(e);
    if (tool === 'text') {
      setTextOverlay({ clientX, clientY, canvasX: x, canvasY: y });
      setTextValue('');
      return;
    }
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (tool === 'line' || tool === 'rect' || tool === 'circle') {
      baseSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      shapeStartRef.current = { x, y };
    } else {
      // brush / eraser — start a path segment
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (tool === 'line' || tool === 'rect' || tool === 'circle') {
      if (shapeStartRef.current && baseSnapshotRef.current) {
        ctx.putImageData(baseSnapshotRef.current, 0, 0);
        drawShape(ctx, shapeStartRef.current, { x, y });
      }
      return;
    }

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const { x, y } = getCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if ((tool === 'line' || tool === 'rect' || tool === 'circle') && shapeStartRef.current && baseSnapshotRef.current) {
      ctx.putImageData(baseSnapshotRef.current, 0, 0);
      drawShape(ctx, shapeStartRef.current, { x, y });
      shapeStartRef.current = null;
      baseSnapshotRef.current = null;
      saveSnapshot();
      return;
    }

    ctx.beginPath();
    saveSnapshot();
  };

  const handleMouseOut = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if ((tool === 'line' || tool === 'rect' || tool === 'circle') && baseSnapshotRef.current) {
      // Cancel shape — restore pre-shape state
      ctx.putImageData(baseSnapshotRef.current, 0, 0);
      shapeStartRef.current = null;
      baseSnapshotRef.current = null;
      return;
    }

    ctx.beginPath();
    saveSnapshot();
  };

  const commitText = () => {
    if (!textOverlay) return;
    if (textValue.trim()) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.fillStyle = color;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillText(textValue, textOverlay.canvasX, textOverlay.canvasY + fontSize);
        saveSnapshot();
      }
    }
    setTextOverlay(null);
    setTextValue('');
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveSnapshot();
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `drawing-${Date.now()}.png`, { type: 'image/png' });
        onSave(file);
        handleClose();
      }
    }, 'image/png');
  };

  const handleClose = () => {
    setIsDrawing(false);
    setTextOverlay(null);
    onClose();
  };

  if (!isOpen) return null;

  const isShape = tool === 'line' || tool === 'rect' || tool === 'circle';
  const cursor = tool === 'text' ? 'text' : 'crosshair';

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'brush', icon: <Palette size={17} />, label: t('brush') },
    { id: 'eraser', icon: <Eraser size={17} />, label: t('eraser') },
    { id: 'text', icon: <Type size={17} />, label: t('textTool') },
    { id: 'line', icon: <Minus size={17} />, label: t('lineTool') },
    { id: 'rect', icon: <Square size={17} />, label: t('rectTool') },
    { id: 'circle', icon: <Circle size={17} />, label: t('circleTool') },
  ];

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={handleClose}
    >
      <div
        className="bg-slate-50 dark:bg-slate-900 flex flex-col rounded-3xl shadow-2xl w-full max-w-4xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex justify-between items-center p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">

            {/* Color palette */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setColor(c); if (tool === 'eraser') setTool('brush'); }}
                  className={`w-7 h-7 rounded-lg shadow-sm transition-transform ${color === c && tool !== 'eraser' ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                  title={t('selectColor')}
                />
              ))}
            </div>

            <div className="w-px h-7 bg-slate-200 dark:bg-slate-700" />

            {/* Tool selector */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {tools.map(({ id, icon, label }) => (
                <button
                  key={id}
                  onClick={() => setTool(id)}
                  className={`p-1.5 rounded-lg transition-colors ${tool === id ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  title={label}
                >
                  {icon}
                </button>
              ))}
            </div>

            <div className="w-px h-7 bg-slate-200 dark:bg-slate-700" />

            {/* Size slider */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 select-none">
                {tool === 'text' ? t('fontSize') : t('lineWidth')}
              </span>
              <input
                type="range"
                min={tool === 'text' ? 10 : 1}
                max={tool === 'text' ? 72 : 20}
                value={tool === 'text' ? fontSize : lineWidth}
                onChange={e => tool === 'text' ? setFontSize(Number(e.target.value)) : setLineWidth(Number(e.target.value))}
                className="w-20 accent-indigo-500"
              />
            </div>

            <div className="w-px h-7 bg-slate-200 dark:bg-slate-700" />

            {/* Undo / Redo / Clear */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="p-1.5 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title={`${t('undo')} (Ctrl+Z)`}
              >
                <Undo size={17} />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="p-1.5 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                title={`${t('redo')} (Ctrl+Y)`}
              >
                <Redo size={17} />
              </button>
              <button
                onClick={clearCanvas}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                title={t('clearCanvas')}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors shadow-sm text-sm"
            >
              <Save size={16} />
              <span className="hidden sm:inline">{t('saveDrawing')}</span>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Canvas area */}
        <div className="relative bg-slate-100 dark:bg-slate-800 w-full flex-1 flex items-center justify-center overflow-hidden min-h-[60vh] p-4">
          {tool === 'text' && !textOverlay && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs px-3 py-1 rounded-full pointer-events-none select-none">
              {t('clickToAddText')}
            </div>
          )}
          {isShape && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-3 py-1 rounded-full pointer-events-none select-none">
              {t('dragToDrawShape')}
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={1600}
            height={900}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseOut={handleMouseOut}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            className="bg-white shadow-md max-w-full max-h-[85vh] object-contain touch-none rounded"
            style={{ cursor }}
          />

          {/* Floating text input */}
          {textOverlay && (
            <input
              autoFocus
              type="text"
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitText(); }
                if (e.key === 'Escape') { setTextOverlay(null); setTextValue(''); }
              }}
              onBlur={commitText}
              className="fixed outline-none bg-white/80 dark:bg-slate-900/80 border-b-2 border-indigo-500 px-1 min-w-[80px] backdrop-blur-sm rounded-t"
              style={{
                left: textOverlay.clientX,
                top: textOverlay.clientY,
                fontSize: `${fontSize}px`,
                color,
                fontFamily: 'sans-serif',
                lineHeight: 1,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
