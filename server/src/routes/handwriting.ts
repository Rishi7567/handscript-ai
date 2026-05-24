/**
 * Handwriting API Routes
 * Connects Express to Python ML service
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { mlService } from '../services/mlService';

const router = Router();

// Configure multer for image uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * GET /api/handwriting/health
 * Check ML service health
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await mlService.checkHealth();
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'ML service unavailable',
    });
  }
});

/**
 * POST /api/handwriting/warmup
 * Trigger background warmup of handwriting model
 */
router.post('/warmup', async (_req: Request, res: Response) => {
  try {
    const warmup = await mlService.warmupModel();
    res.json(warmup);
  } catch (error) {
    res.status(503).json({
      status: 'failed',
      error: error instanceof Error ? error.message : 'ML service unavailable',
    });
  }
});

/**
 * POST /api/handwriting/generate
 * Generate handwriting SVG from text
 * Body: { text: string, style_id?: number, bias?: number, custom_style?: object }
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { text, style_id, bias, slant, size, spacing, ink_weight, custom_style } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }

    const result = await mlService.generateHandwriting({
      text,
      style_id: style_id ?? 0,
      bias: bias ?? 0.75,
      slant: slant ?? 0,
      size: size ?? 100,
      spacing: spacing ?? 50,
      ink_weight: ink_weight ?? 50,
      custom_style,
    });

    res.json(result);
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Generation failed',
    });
  }
});

/**
 * POST /api/handwriting/styles/build
 * Build a custom style from user-drawn stroke samples (Onboarding flow)
 * Body: { name: string, samples: CharSample[] }
 */
router.post('/styles/build', async (req: Request, res: Response) => {
  try {
    const { name, samples } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Style name is required' });
    }

    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ error: 'At least one character sample is required' });
    }

    const result = await mlService.buildStyle(name.trim(), samples);
    res.json(result);
  } catch (error) {
    console.error('Build style error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to build style',
    });
  }
});

/**
 * POST /api/handwriting/extract-style
 * Extract handwriting style from uploaded image
 * Multipart form: file (image)
 */
router.post('/extract-style', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const result = await mlService.extractStyle(
      req.file.buffer,
      req.file.originalname
    );

    res.json(result);
  } catch (error) {
    console.error('Extract style error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Style extraction failed',
    });
  }
});

/**
 * GET /api/handwriting/styles
 * Get list of saved styles
 */
router.get('/styles', async (_req: Request, res: Response) => {
  try {
    const styles = await mlService.getStyles();
    res.json({ styles });
  } catch (error) {
    console.error('Get styles error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get styles',
    });
  }
});

/**
 * GET /api/handwriting/styles/:id
 * Get a specific style
 */
router.get('/styles/:id', async (req: Request, res: Response) => {
  try {
    const styleId = req.params.id as string;
    const style = await mlService.getStyle(styleId);
    res.json(style);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Style not found' });
    }
    console.error('Get style error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get style',
    });
  }
});

/**
 * DELETE /api/handwriting/styles/:id
 * Delete a style
 */
router.delete('/styles/:id', async (req: Request, res: Response) => {
  try {
    const styleId = req.params.id as string;
    await mlService.deleteStyle(styleId);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Style not found' });
    }
    console.error('Delete style error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete style',
    });
  }
});

export default router;
