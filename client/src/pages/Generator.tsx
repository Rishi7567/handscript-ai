import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../components/ui/Button';
import Slider from '../components/ui/Slider';
import { useHandwritingStore } from '../stores/handwritingStore';
import { useToastStore } from '../stores/toastStore';

// Predefined styles from calligrapher model (0-12 only — style files exist for these)
const PREDEFINED_STYLES = [
  { id: 0,  name: 'Classic'        },
  { id: 1,  name: 'Neat Print'     },
  { id: 2,  name: 'Casual'         },
  { id: 3,  name: 'Elegant Cursive'},
  { id: 4,  name: 'Quick Notes'    },
  { id: 5,  name: 'Formal'         },
  { id: 6,  name: 'Relaxed'        },
  { id: 7,  name: 'Artistic'       },
  { id: 8,  name: 'Modern'         },
  { id: 9,  name: 'Traditional'    },
  { id: 10, name: 'Compact'        },
  { id: 11, name: 'Flowing'        },
  { id: 12, name: 'Bold'           },
];

type PaperBg = 'plain' | 'lined' | 'cream' | 'dark';

const PAPER_STYLES: Record<PaperBg, { bg: string; lines: string; label: string }> = {
  plain:  { bg: '#ffffff', lines: 'none',    label: 'Plain'  },
  lined:  { bg: '#ffffff', lines: '#dce8f5', label: 'Lined'  },
  cream:  { bg: '#f5f0e8', lines: '#d9cfc1', label: 'Cream'  },
  dark:   { bg: '#2a2520', lines: '#3d3630', label: 'Dark'   },
};

const PAPER_TEXT: Record<PaperBg, string> = {
  plain: '#1a1a2e',
  lined: '#1a1a2e',
  cream: '#2c2416',
  dark:  '#e8e2d9',
};

/** A4 paper is 210×297 mm → aspect ratio 1:1.414 */
const A4_RATIO = 297 / 210;

const Generator: React.FC = () => {
  const [text, setText] = useState('The quick brown fox jumps over the lazy dog.');
  const [paperBg, setPaperBg] = useState<PaperBg>('lined');
  const [zoom, setZoom] = useState(100);
  const [selectedStyleId, setSelectedStyleId] = useState<string | number>(0);

  const {
    generatedSVG,
    isGenerating,
    generateHandwriting,
    checkMLService,
    mlServiceStatus,
    sliderSettings,
    setSliderSettings,
    styles: customStyles,
    fetchStyles,
  } = useHandwritingStore();
  const addToast = useToastStore((s) => s.addToast);

  // Trigger model warmup once on mount — don't block generate
  useEffect(() => {
    checkMLService().catch(() => {});
    fetchStyles().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSliderChange = (key: string, value: number) => {
    setSliderSettings({ [key]: value });
  };

  const previewRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async (format: 'png' | 'pdf' | 'svg') => {
    if (!generatedSVG) {
      addToast('Generate some text first', 'info');
      return;
    }

    try {
      if (format === 'svg') {
        const blob = new Blob([generatedSVG], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `handscript-${Date.now()}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('SVG exported!', 'success');
        return;
      }

      if (!previewRef.current) { addToast('Preview not ready', 'error'); return; }

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: PAPER_STYLES[paperBg].bg,
        scale: 2,
        useCORS: true,
      });

      if (format === 'png') {
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url; a.download = `handscript-${Date.now()}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        addToast('PNG exported!', 'success');
      } else if (format === 'pdf') {
        const { jsPDF } = await import('jspdf');
        const imgData = canvas.toDataURL('image/png');
        const pdfW = canvas.width / 2, pdfH = canvas.height / 2;
        const pdf = new jsPDF({ orientation: pdfW > pdfH ? 'landscape' : 'portrait', unit: 'px', format: [pdfW, pdfH] });
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
        pdf.save(`handscript-${Date.now()}.pdf`);
        addToast('PDF exported!', 'success');
      }
    } catch (err) {
      console.error('Export failed:', err);
      addToast('Export failed. Please try again.', 'error');
    }
  }, [generatedSVG, paperBg, addToast]);

  const handleGenerate = useCallback(() => {
    if (!text.trim()) { addToast('Please enter some text', 'error'); return; }
    generateHandwriting(text, selectedStyleId).catch((err: unknown) =>
      addToast(err instanceof Error ? err.message : 'Generation failed', 'error')
    );
  }, [text, selectedStyleId, generateHandwriting, addToast]);

  const paper = PAPER_STYLES[paperBg];
  const inkColor = PAPER_TEXT[paperBg];

  // Ruled lines CSS for lined paper
  const ruledStyle = paperBg === 'lined' || paperBg === 'cream'
    ? {
        backgroundImage: `repeating-linear-gradient(
          to bottom,
          transparent,
          transparent 31px,
          ${paper.lines} 31px,
          ${paper.lines} 32px
        )`,
        backgroundSize: '100% 32px',
        backgroundPositionY: '48px',
      }
    : {};

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-paper">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-serif text-2xl sm:text-3xl text-ink mb-1">Generator</h1>
        <p className="text-sm text-ink-secondary mb-6">
          Type your text, pick a style, adjust the sliders, then hit Generate.
        </p>

        {/* ── Two-column layout: controls left, A4 page right ── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── LEFT: Controls panel ───────────────────────────── */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col gap-4">

            {/* Text input */}
            <div className="bg-paper-card border border-border rounded-2xl p-4">
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2">
                Your Text
              </label>
              <textarea
                id="handwriting-text-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm text-ink resize-none focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent transition-shadow"
                placeholder="Type something…"
              />
            </div>

            {/* Style selector */}
            <div className="bg-paper-card border border-border rounded-2xl p-4">
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2">
                Handwriting Style
              </label>
              <select
                id="style-selector"
                value={selectedStyleId}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedStyleId(v.startsWith('custom_') || v.startsWith('style_') ? v : Number(v));
                }}
                className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent"
              >
                <optgroup label="AI Styles">
                  {PREDEFINED_STYLES.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
                {customStyles.length > 0 && (
                  <optgroup label="✏️  My Custom Styles">
                    {customStyles.map((s) => (
                      <option key={s.id} value={s.id}>✏️ {s.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Sliders */}
            <div className="bg-paper-card border border-border rounded-2xl p-4 space-y-4">
              <label className="block text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-1">
                Adjustments
              </label>
              <Slider label="Slant"       value={sliderSettings.slant}      min={-30} max={30}  unit="°" onChange={(v) => handleSliderChange('slant', v)} />
              <Slider label="Size"        value={sliderSettings.size}       min={50}  max={200} unit="%" onChange={(v) => handleSliderChange('size', v)} />
              <Slider label="Spacing"     value={sliderSettings.spacing}    min={0}   max={100}          onChange={(v) => handleSliderChange('spacing', v)} />
              <Slider label="Ink Weight"  value={sliderSettings.inkWeight}  min={0}   max={100}          onChange={(v) => handleSliderChange('inkWeight', v)} />
              <Slider label="Naturalness" value={sliderSettings.naturalness} min={0}  max={100}          onChange={(v) => handleSliderChange('naturalness', v)} />
            </div>

            {/* Generate */}
            <div className="flex flex-col gap-2">
              {mlServiceStatus === 'warming' && (
                <p className="text-xs text-ink-muted text-center">
                  ⚡ Model warming up — first generation may take ~15 s
                </p>
              )}
              <Button id="generate-btn" className="w-full" size="lg" onClick={handleGenerate} isLoading={isGenerating}>
                {isGenerating ? 'Generating…' : '✦ Generate'}
              </Button>

              {/* Export */}
              <div className="grid grid-cols-3 gap-2 mt-1">
                <Button id="export-png" variant="outline" size="sm" onClick={() => handleExport('png')}>PNG</Button>
                <Button id="export-pdf" variant="outline" size="sm" onClick={() => handleExport('pdf')}>PDF</Button>
                <Button id="export-svg" variant="outline" size="sm" onClick={() => handleExport('svg')}>SVG</Button>
              </div>
            </div>
          </div>

          {/* ── RIGHT: A4 paper preview ────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              {/* Paper type */}
              <div className="flex gap-1">
                {(Object.keys(PAPER_STYLES) as PaperBg[]).map((key) => (
                  <button
                    key={key}
                    id={`paper-${key}`}
                    onClick={() => setPaperBg(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      paperBg === key
                        ? 'bg-accent text-white shadow-sm'
                        : 'bg-paper-card border border-border text-ink-muted hover:text-ink'
                    }`}
                  >
                    {PAPER_STYLES[key].label}
                  </button>
                ))}
              </div>

              {/* Zoom */}
              <div className="flex items-center gap-1 bg-paper-card border border-border rounded-xl px-2 py-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(40, z - 10))}
                  className="p-1 rounded hover:bg-paper-section text-ink-muted hover:text-ink transition-colors"
                  aria-label="Zoom out"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-xs text-ink-muted tabular-nums w-10 text-center select-none">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(200, z + 10))}
                  className="p-1 rounded hover:bg-paper-section text-ink-muted hover:text-ink transition-colors"
                  aria-label="Zoom in"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(100)}
                  className="ml-1 text-xs text-ink-muted hover:text-ink transition-colors"
                  aria-label="Reset zoom"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Paper — A4 min-height, grows with content, scrollable if zoomed */}
            <div className="overflow-auto rounded-2xl shadow-xl border border-border/60">
              <div
                ref={previewRef}
                style={{
                  backgroundColor: paper.bg,
                  /* A4-proportioned minimum, but grows if content is longer */
                  width: '100%',
                  minWidth: '480px',
                  minHeight: `calc(480px * ${A4_RATIO})`,
                  position: 'relative',
                  ...ruledStyle,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top left',
                  marginBottom: zoom !== 100 ? `calc(${A4_RATIO * 100}% * ${zoom / 100 - 1})` : undefined,
                }}
              >
                {/* Left margin red line (notebook look) */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0, bottom: 0, left: '56px',
                    width: '1px',
                    backgroundColor: paperBg === 'dark' ? '#7c3040' : '#f0a0a8',
                    opacity: paperBg === 'plain' ? 0 : 0.6,
                  }}
                />

                {/* Page content — never clips SVG */}
                <div style={{ padding: '48px 48px 48px 72px', overflow: 'visible' }}>
                  {isGenerating ? (
                    /* Skeleton loading lines */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '8px' }}>
                      {[90, 85, 78, 88, 60].map((w, i) => (
                        <div
                          key={i}
                          style={{
                            height: '18px',
                            width: `${w}%`,
                            borderRadius: '4px',
                            background: paperBg === 'dark'
                              ? 'rgba(255,255,255,0.08)'
                              : 'rgba(0,0,0,0.07)',
                            animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: `${i * 0.12}s`,
                          }}
                        />
                      ))}
                    </div>
                  ) : generatedSVG ? (
                    /* SVG: preserveAspectRatio keeps it proportional, width fills page */
                    <div
                      style={{ color: inkColor, lineHeight: 0, overflow: 'visible' }}
                      dangerouslySetInnerHTML={{
                        __html: generatedSVG
                          .replace(/<svg /, '<svg style="width:100%;height:auto;display:block;overflow:visible;" preserveAspectRatio="xMinYMin meet" ')
                          .replace(/\s(width|height)="[\d.]+"/g, ''),
                      }}
                    />
                  ) : (
                    /* Empty state */
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: `calc(480px * ${A4_RATIO} - 96px)`,
                        color: paperBg === 'dark' ? 'rgba(232,226,217,0.3)' : 'rgba(0,0,0,0.2)',
                        textAlign: 'center',
                        gap: '12px',
                      }}
                    >
                      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                      </svg>
                      <p style={{ fontSize: '14px', margin: 0 }}>
                        Your handwritten text will appear here
                      </p>
                      <p style={{ fontSize: '12px', margin: 0, opacity: 0.6 }}>
                        Enter text on the left, then click Generate
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
