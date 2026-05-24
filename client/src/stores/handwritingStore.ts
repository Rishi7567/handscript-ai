import { create } from 'zustand';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const api = axios.create({ baseURL: API_BASE });

export interface CharSample {
  char: string;
  strokes: Array<{ x: number; y: number }[]>;
  timestamp: number;
}

export interface HandwritingStyle {
  id: string;
  name: string;
  createdAt: string;
  preview?: string;
}

interface SliderSettings {
  slant: number;
  size: number;
  spacing: number;
  inkWeight: number;
  naturalness: number;
}

interface HandwritingState {
  samples: CharSample[];
  styles: HandwritingStyle[];
  activeStyleId: string | null;
  generatedSVG: string | null;
  isGenerating: boolean;
  isBuildingStyle: boolean;
  isLoadingStyles: boolean;
  mlServiceStatus: 'unknown' | 'warming' | 'healthy' | 'unhealthy';
  sliderSettings: SliderSettings;
  addSample: (sample: CharSample) => void;
  removeSample: (char: string) => void;
  clearSamples: () => void;
  setSliderSettings: (settings: Partial<SliderSettings>) => void;
  setActiveStyleId: (id: string | null) => void;
  buildStyle: (name: string) => Promise<void>;
  fetchStyles: () => Promise<void>;
  deleteStyle: (id: string) => Promise<void>;
  generateHandwriting: (text: string, styleId?: number) => Promise<void>;
  clearGenerated: () => void;
  checkMLService: () => Promise<void>;
}

function isGuestMode(): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem('handscript-auth') || '{}');
    return stored?.state?.token === 'guest-token';
  } catch {
    return false;
  }
}

function getToken(): string | null {
  try {
    return JSON.parse(localStorage.getItem('handscript-auth') || '{}')?.state?.token;
  } catch {
    return null;
  }
}

function generateDemoSVG(text: string, settings: SliderSettings): string {
  const lines = text.split('\n');
  const fontSize = Math.round(24 * (settings.size / 100));
  const lineHeight = fontSize * 1.8;
  const letterSpacing = (settings.spacing - 50) / 25;
  const skewX = -settings.slant * 0.3;
  const strokeWidth = 1 + (settings.inkWeight / 50);
  const height = Math.max(200, lines.length * lineHeight + 60);

  let paths = '';
  lines.forEach((line, lineIdx) => {
    const y = 40 + lineIdx * lineHeight;
    const chars = line.split('');
    let x = 20;
    chars.forEach((ch) => {
      if (ch === ' ') {
        x += fontSize * 0.5;
        return;
      }
      const wobbleY = (settings.naturalness / 100) * (Math.random() * 4 - 2);
      const wobbleX = (settings.naturalness / 100) * (Math.random() * 2 - 1);
      paths += `<text x="${x + wobbleX}" y="${y + wobbleY}" 
        font-family="'Caveat', cursive" font-size="${fontSize}" 
        fill="currentColor" 
        transform="skewX(${skewX})"
        style="letter-spacing:${letterSpacing}px"
        stroke="currentColor" stroke-width="${strokeWidth * 0.1}">${ch.replace(/[<>&"]/g, '')}</text>`;
      x += fontSize * 0.6 + letterSpacing;
    });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 600 ${height}">${paths}</svg>`;
}

const DEMO_STYLES_KEY = 'handscript-demo-styles';

function loadDemoStyles(): HandwritingStyle[] {
  try {
    return JSON.parse(localStorage.getItem(DEMO_STYLES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveDemoStyles(styles: HandwritingStyle[]) {
  localStorage.setItem(DEMO_STYLES_KEY, JSON.stringify(styles));
}

export const useHandwritingStore = create<HandwritingState>((set, get) => ({
  samples: [],
  styles: [],
  activeStyleId: null,
  generatedSVG: null,
  isGenerating: false,
  isBuildingStyle: false,
  isLoadingStyles: false,
  mlServiceStatus: 'unknown',

  sliderSettings: {
    slant: 0,
    size: 100,
    spacing: 50,
    inkWeight: 50,
    naturalness: 50,
  },

  checkMLService: async () => {
    try {
      const { data } = await api.get('/api/handwriting/health');
      const state = data?.models_loaded?.calligrapher_state;
      if (state === 'ready') {
        set({ mlServiceStatus: 'healthy' });
      } else if (state === 'warming') {
        set({ mlServiceStatus: 'warming' });
      } else {
        set({ mlServiceStatus: data.status === 'healthy' ? 'healthy' : 'unhealthy' });
      }

      if (state !== 'ready') {
        await api.post('/api/handwriting/warmup');
      }
    } catch {
      set({ mlServiceStatus: 'unhealthy' });
    }
  },

  addSample: (sample) => {
    set((state) => ({
      samples: [
        ...state.samples.filter((s) => s.char !== sample.char),
        sample,
      ],
    }));
  },

  removeSample: (char) => {
    set((state) => ({
      samples: state.samples.filter((s) => s.char !== char),
    }));
  },

  clearSamples: () => set({ samples: [] }),

  setSliderSettings: (settings) => {
    set((state) => ({
      sliderSettings: { ...state.sliderSettings, ...settings },
    }));
  },

  setActiveStyleId: (id) => set({ activeStyleId: id }),

  buildStyle: async (name) => {
    set({ isBuildingStyle: true });

    if (isGuestMode()) {
      await new Promise((r) => setTimeout(r, 1500));
      const newStyle: HandwritingStyle = {
        id: crypto.randomUUID(),
        name,
        createdAt: new Date().toISOString(),
      };
      const updated = [...loadDemoStyles(), newStyle];
      saveDemoStyles(updated);
      set((state) => ({
        styles: [...state.styles, newStyle],
        activeStyleId: newStyle.id,
        isBuildingStyle: false,
        samples: [],
      }));
      return;
    }

    try {
      const { samples } = get();
      const token = getToken();
      const { data } = await api.post(
        '/api/handwriting/styles/build',
        { name, samples },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      set((state) => ({
        styles: [...state.styles, data.style],
        activeStyleId: data.style.id,
        isBuildingStyle: false,
        samples: [],
      }));
    } catch (error: unknown) {
      set({ isBuildingStyle: false });
      const msg = error instanceof Error ? error.message : 'Failed to build style';
      throw new Error(msg);
    }
  },

  fetchStyles: async () => {
    set({ isLoadingStyles: true });

    if (isGuestMode()) {
      const styles = loadDemoStyles();
      set({ styles, isLoadingStyles: false });
      return;
    }

    try {
      const token = getToken();
      const { data } = await api.get('/api/styles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ styles: data.styles || [], isLoadingStyles: false });
    } catch {
      set({ isLoadingStyles: false, styles: [] });
    }
  },

  deleteStyle: async (id) => {
    if (isGuestMode()) {
      const updated = loadDemoStyles().filter((s) => s.id !== id);
      saveDemoStyles(updated);
      set((state) => ({
        styles: state.styles.filter((s) => s.id !== id),
        activeStyleId: state.activeStyleId === id ? null : state.activeStyleId,
      }));
      return;
    }

    try {
      const token = getToken();
      await api.delete(`/api/styles/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set((state) => ({
        styles: state.styles.filter((s) => s.id !== id),
        activeStyleId: state.activeStyleId === id ? null : state.activeStyleId,
      }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to delete style';
      throw new Error(msg);
    }
  },

  generateHandwriting: async (text, styleId = 0) => {
    set({ isGenerating: true });

    const { sliderSettings } = get();
    // Convert naturalness (0-100) to bias (0.5-1.0 range)
    const bias = 0.5 + (sliderSettings.naturalness / 200);

    try {
      await get().checkMLService();

      // Send all slider settings to ML service
      const { data } = await api.post('/api/handwriting/generate', {
        text,
        style_id: styleId,
        bias,
        slant: sliderSettings.slant,
        size: sliderSettings.size,
        spacing: sliderSettings.spacing,
        ink_weight: sliderSettings.inkWeight,
      });
      
      if (data.status === 'success' && data.svg) {
        set({ generatedSVG: data.svg, isGenerating: false });
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error: unknown) {
      set({ isGenerating: false });
      
      // Fallback to demo SVG if ML service unavailable
      if (axios.isAxiosError(error) && !error.response) {
        console.warn('ML service unavailable, using fallback');
        const svg = generateDemoSVG(text, sliderSettings);
        set({ generatedSVG: svg, isGenerating: false });
        return;
      }
      
      const msg = error instanceof Error ? error.message : 'Failed to generate';
      throw new Error(msg);
    }
  },

  clearGenerated: () => set({ generatedSVG: null }),
}));
