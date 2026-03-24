import React, { useState, useEffect, useRef, useCallback } from 'react';
import Button from '../components/ui/Button';
import AuthModal from '../components/ui/AuthModal';

const HANDWRITING_FONTS = [
  { name: 'Caveat', family: "'Caveat', cursive" },
  { name: 'Dancing Script', family: "'Dancing Script', cursive" },
  { name: 'Satisfy', family: "'Satisfy', cursive" },
  { name: 'Kalam', family: "'Kalam', cursive" },
  { name: 'Pacifico', family: "'Pacifico', cursive" },
  { name: 'Instrument Serif', family: "'Instrument Serif', serif" },
];

const TYPEWRITER_PHRASES = [
  'The quick brown fox jumps over the lazy dog',
  'Handwriting is the shaking of the mind',
  'Every letter tells a story of its writer',
  'Your handwriting, powered by AI',
  'Beautiful penmanship, digitized forever',
  'Write once, replicate infinitely',
];

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
    title: 'Style controls',
    desc: 'Adjust slant, size, spacing, ink weight, and natural variation to perfect your style.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
    title: 'Natural variation',
    desc: 'AI adds organic imperfections so every letter looks authentically hand-drawn.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
      </svg>
    ),
    title: 'Multiple styles',
    desc: 'Train and save multiple handwriting styles. Switch between them in one click.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    title: 'Export anywhere',
    desc: 'Download as PNG, PDF, or SVG. Use in documents, cards, invitations, and more.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'Paper backgrounds',
    desc: 'Choose from plain, lined, cream, or dark paper styles to match any use case.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: 'Guest mode',
    desc: 'Try the generator without signing up. Create an account to save your styles.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Collect samples',
    desc: 'Write each letter of the alphabet on our digital canvas. We guide you through uppercase, lowercase, and digits.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Build your style',
    desc: 'Our AI analyzes your strokes, curves, and spacing to create a unique handwriting model.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Generate & export',
    desc: 'Type any text and watch it transform into your handwriting. Export as PNG, PDF, or SVG.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m0 0a48.394 48.394 0 0110.5 0m-10.5 0V5.625c0-.621.504-1.125 1.125-1.125h9.75c.621 0 1.125.504 1.125 1.125v3.259" />
      </svg>
    ),
  },
];

/* ─── Typewriter Hook ─────────────────────────────── */
function useTypewriter(phrases: string[], fonts: typeof HANDWRITING_FONTS) {
  const [displayText, setDisplayText] = useState('');
  const [fontIndex, setFontIndex] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const tick = useCallback(() => {
    const currentPhrase = phrases[phraseIndex];

    if (!isDeleting) {
      const next = currentPhrase.slice(0, displayText.length + 1);
      setDisplayText(next);
      if (next === currentPhrase) {
        timeoutRef.current = setTimeout(() => setIsDeleting(true), 1800);
        return;
      }
      timeoutRef.current = setTimeout(tick, 50 + Math.random() * 40);
    } else {
      const next = currentPhrase.slice(0, displayText.length - 1);
      setDisplayText(next);
      if (next === '') {
        setIsDeleting(false);
        const nextPhraseIdx = (phraseIndex + 1) % phrases.length;
        setPhraseIndex(nextPhraseIdx);
        setFontIndex((fontIndex + 1) % fonts.length);
        timeoutRef.current = setTimeout(tick, 300);
        return;
      }
      timeoutRef.current = setTimeout(tick, 30);
    }
  }, [displayText, isDeleting, phraseIndex, fontIndex, phrases, fonts]);

  useEffect(() => {
    timeoutRef.current = setTimeout(tick, 600);
    return () => clearTimeout(timeoutRef.current);
  }, [tick]);

  return { displayText, font: fonts[fontIndex] };
}

/* ─── Scroll Reveal Hook ──────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/* ─── Section Wrapper ─────────────────────────────── */
const RevealSection: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
};

/* ─── Landing Page ────────────────────────────────── */
const Landing: React.FC = () => {
  const { displayText, font } = useTypewriter(TYPEWRITER_PHRASES, HANDWRITING_FONTS);
  const [authModal, setAuthModal] = useState<{ open: boolean; view: 'signin' | 'signup' }>({
    open: false,
    view: 'signup',
  });
  const [ctaEmail, setCtaEmail] = useState('');

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────── */}
      <section className="pt-28 pb-20 md:pt-36 md:pb-28 px-4">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-ink leading-[1.1] tracking-tight text-balance max-w-4xl">
            Your handwriting,
            <br />
            <span className="italic text-accent">digitized by AI</span>
          </h1>
          <p className="mt-6 text-ink-secondary text-base sm:text-lg max-w-xl leading-relaxed">
            Train a neural network on your handwriting samples and generate
            beautiful, authentic handwritten text — anytime, anywhere.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <Button
              size="lg"
              onClick={() => setAuthModal({ open: true, view: 'signup' })}
            >
              Start for free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              See how it works
            </Button>
          </div>

          {/* Preview card */}
          <div className="mt-14 w-full max-w-lg">
            <div className="bg-paper-card border border-border rounded-2xl shadow-lg overflow-hidden">
              {/* Card header dots */}
              <div className="flex items-center gap-1.5 px-5 py-3 border-b border-border bg-paper-section/50">
                <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
                <span className="ml-auto text-xs text-ink-muted font-medium">{font.name}</span>
              </div>
              {/* Ruled paper area */}
              <div className="ruled-paper px-6 py-8 min-h-[160px] flex items-center">
                <span
                  className="typewriter-cursor text-2xl sm:text-3xl text-ink leading-relaxed inline-block"
                  style={{ fontFamily: font.family }}
                >
                  {displayText}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────── */}
      <section id="how-it-works" className="py-20 md:py-28 px-4 bg-paper-section">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-14">
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">How it works</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-ink">Three simple steps</h2>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <RevealSection key={step.num} className={`delay-${i}`}>
                <div
                  className="bg-paper-card border border-border rounded-2xl p-8 h-full flex flex-col"
                >
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center shrink-0">
                      {step.icon}
                    </div>
                    <span className="text-3xl font-serif text-border">{step.num}</span>
                  </div>
                  <h3 className="font-serif text-xl text-ink mb-2">{step.title}</h3>
                  <p className="text-sm text-ink-secondary leading-relaxed">{step.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────── */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-14">
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">Features</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-ink">Everything you need</h2>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feat) => (
              <RevealSection key={feat.title}>
                <div
                  className="bg-paper-card border border-border rounded-2xl p-6 h-full hover:shadow-md hover:border-accent/20 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent-light text-accent flex items-center justify-center mb-4">
                    {feat.icon}
                  </div>
                  <h3 className="font-medium text-ink mb-1.5">{feat.title}</h3>
                  <p className="text-sm text-ink-secondary leading-relaxed">{feat.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────── */}
      <section className="py-20 md:py-28 px-4">
        <RevealSection>
          <div className="max-w-3xl mx-auto bg-ink rounded-3xl p-10 md:p-14 text-center">
            <h2 className="font-serif text-3xl sm:text-4xl text-white mb-4">
              Ready to digitize your handwriting?
            </h2>
            <p className="text-white/60 text-sm sm:text-base mb-8 max-w-md mx-auto">
              Join thousands of creatives who use HandScript AI to bring their personal
              touch to digital text.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                value={ctaEmail}
                onChange={(e) => setCtaEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <Button
                size="lg"
                onClick={() => setAuthModal({ open: true, view: 'signup' })}
              >
                Get started
              </Button>
            </div>
            <button
              onClick={() => setAuthModal({ open: true, view: 'signup' })}
              className="mt-5 inline-flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
          </div>
        </RevealSection>
      </section>

      {/* ── Footer ───────────────────────────────── */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-baseline gap-0.5">
            <span className="font-serif text-lg text-ink">HandScript</span>
            <span className="font-serif text-lg italic text-accent">AI</span>
          </div>
          <p className="text-xs text-ink-muted">
            &copy; {new Date().getFullYear()} HandScript AI. All rights reserved.
          </p>
        </div>
      </footer>

      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        initialView={authModal.view}
      />
    </div>
  );
};

export default Landing;
