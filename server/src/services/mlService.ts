/**
 * ML Service Client - Communicates with Python FastAPI ML service
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001';

interface GenerateRequest {
  text: string;
  style_id?: string | number;
  bias?: number;
  slant?: number;
  size?: number;
  spacing?: number;
  ink_weight?: number;
  custom_style?: {
    strokes: number[][];
    chars: string;
  };
}

interface GenerateResponse {
  svg: string;
  lines_count: number;
  status: string;
}

interface ExtractStyleResponse {
  style_id: string;
  strokes: number[][];
  chars: string;
  status: string;
}

interface HealthResponse {
  status: string;
  models_loaded: {
    calligrapher: boolean;
    calligrapher_state?: 'idle' | 'warming' | 'ready' | 'error';
    hwt: boolean;
  };
}

interface WarmupResponse {
  status: string;
  model_state: 'idle' | 'warming' | 'ready' | 'error';
  detail?: string;
}

interface StyleInfo {
  id: string;
  created_at: string;
  chars: string;
}

interface StylesResponse {
  styles: StyleInfo[];
}

interface ErrorResponse {
  detail?: string;
}

class MLServiceClient {
  private baseUrl: string;

  constructor(baseUrl: string = ML_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check health of ML service
   */
  async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`ML Service health check failed: ${response.statusText}`);
    }
    return response.json() as Promise<HealthResponse>;
  }

  /**
   * Trigger model warmup in Python service
   */
  async warmupModel(): Promise<WarmupResponse> {
    const response = await fetch(`${this.baseUrl}/warmup`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as ErrorResponse;
      throw new Error(`Model warmup failed: ${error.detail || response.statusText}`);
    }

    return response.json() as Promise<WarmupResponse>;
  }

  /**
   * Generate handwriting SVG from text
   */
  async generateHandwriting(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as ErrorResponse;
      throw new Error(`Generation failed: ${error.detail || response.statusText}`);
    }

    return response.json() as Promise<GenerateResponse>;
  }

  /**
   * Extract handwriting style from uploaded image
   */
  async extractStyle(imageBuffer: Buffer, filename: string): Promise<ExtractStyleResponse> {
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('file', blob, filename);

    const response = await fetch(`${this.baseUrl}/extract-style`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as ErrorResponse;
      throw new Error(`Style extraction failed: ${error.detail || response.statusText}`);
    }

    return response.json() as Promise<ExtractStyleResponse>;
  }

  /**
   * Build a custom style from user-drawn stroke samples
   */
  async buildStyle(name: string, samples: Array<{ char: string; strokes: Array<{ x: number; y: number }[]>; timestamp: number }>): Promise<{ style: { id: string; name: string; createdAt: string }; status: string }> {
    const response = await fetch(`${this.baseUrl}/styles/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, samples }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as ErrorResponse;
      throw new Error(`Style build failed: ${error.detail || response.statusText}`);
    }

    return response.json() as Promise<{ style: { id: string; name: string; createdAt: string }; status: string }>;
  }

  /**
   * Get list of saved styles
   */
  async getStyles(): Promise<StyleInfo[]> {
    const response = await fetch(`${this.baseUrl}/styles`);
    if (!response.ok) {
      throw new Error(`Failed to get styles: ${response.statusText}`);
    }
    const data = await response.json() as StylesResponse;
    return data.styles;
  }

  /**
   * Get a specific style by ID
   */
  async getStyle(styleId: string): Promise<{ strokes: number[][]; chars: string }> {
    const response = await fetch(`${this.baseUrl}/styles/${styleId}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Style not found: ${styleId}`);
      }
      throw new Error(`Failed to get style: ${response.statusText}`);
    }
    return response.json() as Promise<{ strokes: number[][]; chars: string }>;
  }

  /**
   * Delete a style by ID
   */
  async deleteStyle(styleId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/styles/${styleId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Style not found: ${styleId}`);
      }
      throw new Error(`Failed to delete style: ${response.statusText}`);
    }
  }
}

// Export singleton instance
export const mlService = new MLServiceClient();
export default mlService;
