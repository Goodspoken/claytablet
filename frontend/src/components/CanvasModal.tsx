import { useRef, useEffect, useState } from 'react';
import { X, Eraser, Trash2, Palette, Save } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (file: File) => void;
}

const COLORS = ['#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

export function CanvasModal({ isOpen, onClose, onSave }: CanvasModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsDrawing(false); onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.beginPath();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = isEraser ? '#ffffff' : color;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    setIsEraser(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" onClick={handleClose}>
      <div className="bg-slate-50 dark:bg-slate-900 flex flex-col rounded-3xl shadow-2xl w-full max-w-4xl border border-slate-200 dark:border-slate-800 overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header Toolbar */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm z-10">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setIsEraser(false); }}
                  className={`w-8 h-8 rounded-lg shadow-sm transition-transform ${color === c && !isEraser ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                  title={t('selectColor')}
                />
              ))}
            </div>

            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setIsEraser(false)}
                className={`p-2 rounded-lg transition-colors ${!isEraser ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                title={t('brush')}
              >
                <Palette size={20} />
              </button>
              <button
                onClick={() => setIsEraser(true)}
                className={`p-2 rounded-lg transition-colors ${isEraser ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                title={t('eraser')}
              >
                <Eraser size={20} />
              </button>
            </div>

            <div className="flex items-center gap-2 pl-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('lineWidth')}
              </span>
              <input
                type="range"
                min="1" max="20"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-24 accent-indigo-500"
              />
            </div>
            
            <button
              onClick={clearCanvas}
              className="p-2 ml-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
              title={t('clearCanvas')}
            >
              <Trash2 size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors shadow-sm">
              <Save size={18} />
              <span className="hidden sm:inline">
                {t('saveDrawing')}
              </span>
            </button>
            <button onClick={handleClose} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="relative bg-slate-100 dark:bg-slate-800 w-full flex-1 flex items-center justify-center overflow-hidden custom-scrollbar min-h-[60vh] p-4">
            <canvas
              ref={canvasRef}
              width={1600}
              height={900}
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onMouseMove={draw}
              onTouchStart={startDrawing}
              onTouchEnd={stopDrawing}
              onTouchMove={draw}
              className="bg-white shadow-md cursor-crosshair max-w-full max-h-[85vh] object-contain touch-none rounded"
            />
        </div>
      </div>
    </div>
  );
}
