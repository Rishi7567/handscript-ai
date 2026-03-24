import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { useHandwritingStore, type CharSample } from '../stores/handwritingStore';
import { useToastStore } from '../stores/toastStore';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'.split('');
const DIGITS = '0123456789'.split('');

interface Point {
  x: number;
  y: number;
}

/* ─── Canvas Modal ────────────────────────────────── */
const CanvasModal: React.FC<{
  char: string;
  onDone: (strokes: Point[][]) => void;
  onSkip: () => void;
  onClose: () => void;
}> = ({ char, onDone, onSkip, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Point[]>([]);

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, points: Point[]) => {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const mid = {
        x: (points[i - 1].x + points[i].x) / 2,
        y: (points[i - 1].y + points[i].y) / 2,
      };
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, mid.x, mid.y);
    }
    ctx.strokeStyle = '#1a1714';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, []);

  const redrawAll = useCallback(
    (allStrokes: Point[][]) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, 380, 260);

      // Ghost character
      ctx.save();
      ctx.font = '160px "Instrument Serif", serif';
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, 190, 125);
      ctx.restore();

      // Baseline guide
      ctx.save();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(20, 190);
      ctx.lineTo(360, 190);
      ctx.stroke();
      ctx.restore();

      allStrokes.forEach((s) => drawStroke(ctx, s));
    },
    [char, drawStroke]
  );

  useEffect(() => {
    redrawAll(strokes);
  }, [strokes, redrawAll]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawingRef.current = true;
    currentStrokeRef.current = [getPos(e)];
  };

  const moveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const point = getPos(e);
    currentStrokeRef.current.push(point);
    // Draw incrementally — no React re-render needed
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && currentStrokeRef.current.length >= 2) {
      const pts = currentStrokeRef.current;
      const prev = pts[pts.length - 2];
      const mid = { x: (prev.x + point.x) / 2, y: (prev.y + point.y) / 2 };
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
      ctx.strokeStyle = '#1a1714';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  const endDraw = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const finished = currentStrokeRef.current;
    currentStrokeRef.current = [];
    if (finished.length > 1) {
      setStrokes((prev) => [...prev, finished]);
    }
  };

  const undo = () => setStrokes((prev) => prev.slice(0, -1));
  const clear = () => setStrokes([]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-paper-card rounded-2xl shadow-2xl animate-scale-in w-full max-w-md p-6">
        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-xl text-ink">
              Draw "<span className="text-accent">{char}</span>"
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              {strokes.length} stroke{strokes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={380}
          height={260}
          className="w-full border border-border rounded-xl bg-white cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
        />

        {/* Toolbar */}
        <div className="flex items-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={undo} disabled={strokes.length === 0}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            Undo
          </Button>
          <Button variant="outline" size="sm" onClick={clear} disabled={strokes.length === 0}>
            Clear
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip
          </Button>
          <Button
            size="sm"
            onClick={() => onDone(strokes)}
            disabled={strokes.length === 0}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ─── Character Card ──────────────────────────────── */
const CharCard: React.FC<{
  char: string;
  isCollected: boolean;
  onClick: () => void;
}> = ({ char, isCollected, onClick }) => (
  <button
    onClick={onClick}
    className={`
      relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border text-lg font-serif
      flex items-center justify-center transition-all duration-200
      hover:shadow-md hover:border-accent/30 active:scale-95
      ${
        isCollected
          ? 'bg-accent-light border-accent/30 text-accent'
          : 'bg-paper-card border-border text-ink hover:bg-paper-section'
      }
    `}
  >
    {char}
    {isCollected && (
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )}
  </button>
);

/* ─── Progress Bar ────────────────────────────────── */
const ProgressBar: React.FC<{ label: string; current: number; total: number }> = ({
  label,
  current,
  total,
}) => {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-ink-muted tabular-nums">
          {current}/{total}
        </span>
      </div>
      <div className="h-2 bg-paper-section rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        ></div>
      </div>
    </div>
  );
};

/* ─── Onboarding Page ─────────────────────────────── */
const Onboarding: React.FC = () => {
  const [step, setStep] = useState(1);
  const [canvasTarget, setCanvasTarget] = useState<string | null>(null);
  const [styleName, setStyleName] = useState('My Handwriting');

  const { samples, addSample, buildStyle } = useHandwritingStore();
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const collectedChars = new Set(samples.map((s) => s.char));
  const upperCount = UPPERCASE.filter((c) => collectedChars.has(c)).length;
  const lowerCount = LOWERCASE.filter((c) => collectedChars.has(c)).length;
  const digitCount = DIGITS.filter((c) => collectedChars.has(c)).length;

  const handleDone = (char: string, strokes: Point[][]) => {
    const sample: CharSample = {
      char,
      strokes,
      timestamp: Date.now(),
    };
    addSample(sample);
    setCanvasTarget(null);
    addToast(`"${char}" collected!`, 'success');
  };

  const handleBuild = async () => {
    if (samples.length < 10) {
      addToast('Please collect at least 10 characters', 'error');
      return;
    }
    try {
      setStep(3);
      await buildStyle(styleName);
      addToast('Style built successfully!', 'success');
      navigate('/generator');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to build style';
      addToast(message, 'error');
      setStep(2);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s
                    ? 'bg-accent text-white'
                    : 'bg-paper-section text-ink-muted border border-border'
                }`}
              >
                {step > s ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-0.5 rounded-full transition-colors ${
                    step > s ? 'bg-accent' : 'bg-border'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Step 1: Welcome ──────────────────── */}
        {step === 1 && (
          <div className="animate-fade-up text-center max-w-lg mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 bg-accent-light rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-ink mb-4">
              Let's capture your handwriting
            </h1>
            <p className="text-ink-secondary leading-relaxed mb-3">
              We'll ask you to draw each letter of the alphabet and digits 0–9 on a digital canvas.
              Take your time — the more natural you write, the better the results.
            </p>
            <ul className="text-sm text-ink-secondary space-y-2 mb-8 text-left max-w-xs mx-auto">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                26 uppercase letters (A-Z)
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                26 lowercase letters (a-z)
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                10 digits (0-9)
              </li>
            </ul>
            <Button size="lg" onClick={() => setStep(2)}>
              Start writing
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Button>
          </div>
        )}

        {/* ── Step 2: Character grid ───────────── */}
        {step === 2 && (
          <div className="animate-fade-up">
            <h2 className="font-serif text-2xl text-ink mb-2">Draw your characters</h2>
            <p className="text-sm text-ink-secondary mb-6">
              Click any character to open the drawing canvas. You can skip and come back later.
            </p>

            {/* Progress */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <ProgressBar label="Uppercase" current={upperCount} total={26} />
              <ProgressBar label="Lowercase" current={lowerCount} total={26} />
              <ProgressBar label="Digits" current={digitCount} total={10} />
            </div>

            {/* Uppercase */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-3">
                Uppercase
              </h3>
              <div className="flex flex-wrap gap-2">
                {UPPERCASE.map((c) => (
                  <CharCard
                    key={`upper-${c}`}
                    char={c}
                    isCollected={collectedChars.has(c)}
                    onClick={() => setCanvasTarget(c)}
                  />
                ))}
              </div>
            </div>

            {/* Lowercase */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-3">
                Lowercase
              </h3>
              <div className="flex flex-wrap gap-2">
                {LOWERCASE.map((c) => (
                  <CharCard
                    key={`lower-${c}`}
                    char={c}
                    isCollected={collectedChars.has(c)}
                    onClick={() => setCanvasTarget(c)}
                  />
                ))}
              </div>
            </div>

            {/* Digits */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-3">
                Digits
              </h3>
              <div className="flex flex-wrap gap-2">
                {DIGITS.map((c) => (
                  <CharCard
                    key={`digit-${c}`}
                    char={c}
                    isCollected={collectedChars.has(c)}
                    onClick={() => setCanvasTarget(c)}
                  />
                ))}
              </div>
            </div>

            {/* Style name + build */}
            <div className="bg-paper-card border border-border rounded-2xl p-6">
              <label className="block text-sm font-medium text-ink mb-2">Style name</label>
              <input
                type="text"
                value={styleName}
                onChange={(e) => setStyleName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent mb-4"
                placeholder="e.g. My Handwriting"
              />
              <Button
                size="lg"
                className="w-full"
                onClick={handleBuild}
                disabled={samples.length < 10}
              >
                Build my style ({samples.length} characters collected)
              </Button>
              {samples.length < 10 && (
                <p className="text-xs text-ink-muted text-center mt-2">
                  Collect at least 10 characters to continue
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Building ─────────────────── */}
        {step === 3 && (
          <div className="animate-fade-up text-center max-w-md mx-auto py-20">
            <Spinner size="lg" className="mx-auto mb-6" />
            <h2 className="font-serif text-2xl text-ink mb-2">Building your style…</h2>
            <p className="text-sm text-ink-secondary">
              Our AI is analyzing your strokes and creating your personalized handwriting model.
              This may take a moment.
            </p>
          </div>
        )}

        {/* Canvas modal */}
        {canvasTarget && (
          <CanvasModal
            char={canvasTarget}
            onDone={(strokes) => handleDone(canvasTarget, strokes)}
            onSkip={() => setCanvasTarget(null)}
            onClose={() => setCanvasTarget(null)}
          />
        )}
      </div>
    </div>
  );
};

export default Onboarding;
