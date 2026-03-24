import React, { useState, useEffect, useRef, useCallback } from 'react';
import Button from '../components/ui/Button';
import Slider from '../components/ui/Slider';
import { useHandwritingStore } from '../stores/handwritingStore';
import { useToastStore } from '../stores/toastStore';

type PaperBg = 'plain' | 'lined' | 'cream' | 'dark';

const PAPER_STYLES: Record<PaperBg, { bg: string; text: string; label: string }> = {
  plain: { bg: 'bg-white', text: 'text-ink', label: 'Plain' },
  lined: { bg: 'bg-white ruled-paper', text: 'text-ink', label: 'Lined' },
  cream: { bg: 'bg-[#f5f0e8]', text: 'text-ink', label: 'Cream' },
  dark: { bg: 'bg-[#2a2520]', text: 'text-[#e8e2d9]', label: 'Dark' },
};

const Generator: React.FC = () => {
  const [text, setText] = useState('The quick brown fox jumps over the lazy dog.');
  const [paperBg, setPaperBg] = useState<PaperBg>('lined');
  const [zoom, setZoom] = useState(100);

  const {
    styles,
    activeStyleId,
    setActiveStyleId,
    generatedSVG,
    isGenerating,
    generateHandwriting,
    sliderSettings,
    setSliderSettings,
    fetchStyles,
    isLoadingStyles,
  } = useHandwritingStore();
  const addToast = useToastStore((s) => s.addToast);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]);

  const debouncedGenerate = useCallback(
    (newText: string) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (newText.trim() && activeStyleId) {
          generateHandwriting(newText).catch((err: any) =>
            addToast(err.message || 'Generation failed', 'error')
          );
        }
      }, 400);
    },
    [activeStyleId, generateHandwriting, addToast]
  );

  const handleTextChange = (val: string) => {
    setText(val);
    debouncedGenerate(val);
  };

  const handleSliderChange = (key: string, value: number) => {
    setSliderSettings({ [key]: value });
    debouncedGenerate(text);
  };

  const handleExport = (format: 'png' | 'pdf' | 'svg') => {
    if (!generatedSVG) {
      addToast('Generate some text first', 'info');
      return;
    }
    addToast(`Exporting as ${format.toUpperCase()}…`, 'info');
    // In production this would call a backend endpoint or use jspdf/html2canvas
  };

  const handleGenerate = () => {
    if (!text.trim()) {
      addToast('Please enter some text', 'error');
      return;
    }
    if (!activeStyleId) {
      addToast('Please select a style first', 'error');
      return;
    }
    generateHandwriting(text).catch((err: any) =>
      addToast(err.message || 'Generation failed', 'error')
    );
  };

  const paper = PAPER_STYLES[paperBg];

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-2xl sm:text-3xl text-ink mb-1">Generator</h1>
        <p className="text-sm text-ink-secondary mb-8">
          Type your text, adjust settings, and preview your handwriting in real time.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Left: Controls ─────────────────── */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Text input */}
            <div className="bg-paper-card border border-border rounded-2xl p-5">
              <label className="block text-sm font-medium text-ink mb-2">Your text</label>
              <textarea
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm text-ink resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                placeholder="Type something…"
              />
            </div>

            {/* Style selector */}
            <div className="bg-paper-card border border-border rounded-2xl p-5">
              <label className="block text-sm font-medium text-ink mb-2">Handwriting style</label>
              {isLoadingStyles ? (
                <div className="h-10 skeleton rounded-xl" />
              ) : styles.length === 0 ? (
                <p className="text-sm text-ink-muted py-2">
                  No styles yet.{' '}
                  <a href="/onboarding" className="text-accent hover:underline">
                    Create one
                  </a>
                </p>
              ) : (
                <select
                  value={activeStyleId || ''}
                  onChange={(e) => setActiveStyleId(e.target.value || null)}
                  aria-label="Handwriting style"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                >
                  <option value="">Select a style</option>
                  {styles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Sliders */}
            <div className="bg-paper-card border border-border rounded-2xl p-5 space-y-5">
              <Slider
                label="Slant"
                value={sliderSettings.slant}
                min={-30}
                max={30}
                unit="°"
                onChange={(v) => handleSliderChange('slant', v)}
              />
              <Slider
                label="Size"
                value={sliderSettings.size}
                min={50}
                max={200}
                unit="%"
                onChange={(v) => handleSliderChange('size', v)}
              />
              <Slider
                label="Spacing"
                value={sliderSettings.spacing}
                min={0}
                max={100}
                onChange={(v) => handleSliderChange('spacing', v)}
              />
              <Slider
                label="Ink weight"
                value={sliderSettings.inkWeight}
                min={0}
                max={100}
                onChange={(v) => handleSliderChange('inkWeight', v)}
              />
              <Slider
                label="Naturalness"
                value={sliderSettings.naturalness}
                min={0}
                max={100}
                onChange={(v) => handleSliderChange('naturalness', v)}
              />
            </div>

            {/* Generate + Export */}
            <div className="flex flex-col gap-3">
              <Button className="w-full" size="lg" onClick={handleGenerate} isLoading={isGenerating}>
                Generate
              </Button>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport('png')}>
                  PNG
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('svg')}>
                  SVG
                </Button>
              </div>
            </div>
          </div>

          {/* ── Right: Preview ─────────────────── */}
          <div className="lg:col-span-3">
            <div className="sticky top-20">
              {/* Paper controls */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1">
                  {(Object.keys(PAPER_STYLES) as PaperBg[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setPaperBg(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        paperBg === key
                          ? 'bg-accent text-white'
                          : 'bg-paper-section text-ink-muted hover:text-ink'
                      }`}
                    >
                      {PAPER_STYLES[key].label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                    className="p-1.5 rounded-lg hover:bg-paper-section text-ink-muted hover:text-ink transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
                    </svg>
                  </button>
                  <span className="text-xs text-ink-muted tabular-nums w-10 text-center">{zoom}%</span>
                  <button
                    type="button"
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                    className="p-1.5 rounded-lg hover:bg-paper-section text-ink-muted hover:text-ink transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Paper preview */}
              <div
                className={`${paper.bg} border border-border rounded-2xl shadow-sm overflow-hidden min-h-[500px] transition-colors duration-300`}
              >
                <div
                  className="p-8 origin-top-left transition-transform duration-300"
                  style={{ transform: `scale(${zoom / 100})` }}
                >
                  {isGenerating ? (
                    <div className="space-y-4 animate-pulse">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="skeleton h-6 rounded"
                          style={{ width: `${60 + Math.random() * 35}%` }}
                        ></div>
                      ))}
                    </div>
                  ) : generatedSVG ? (
                    <div
                      className={`${paper.text} animate-fade-in`}
                      dangerouslySetInnerHTML={{ __html: generatedSVG }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-80 text-center">
                      <svg className="w-12 h-12 text-ink-muted/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                      <p className={`text-sm ${paperBg === 'dark' ? 'text-[#e8e2d9]/40' : 'text-ink-muted'}`}>
                        Your handwritten text will appear here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Generator;
