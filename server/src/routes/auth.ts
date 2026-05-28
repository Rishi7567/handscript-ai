import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';

type TokenPayload = { id: string; email: string; name: string };

const router = Router();

// ── Rate limiter: 5 attempts per 15 min per IP on auth endpoints ──────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});

// ── Token helpers ─────────────────────────────────────────────────────────────

function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' });
}

function signRefreshToken(payload: Pick<TokenPayload, 'id'>): string {
  return jwt.sign(payload, process.env.REFRESH_JWT_SECRET as string, { expiresIn: '7d' });
}

function tokenPair(user: TokenPayload) {
  return {
    token: signAccessToken(user),
    refreshToken: signRefreshToken({ id: user.id }),
  };
}

// ── Google OAuth strategy (registered once) ────────────────────────────────────

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'));

          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            user = await User.findOne({ email });
            if (user) {
              user.googleId = profile.id;
              user.avatar = user.avatar || profile.photos?.[0]?.value;
              await user.save();
            } else {
              user = await User.create({
                name: profile.displayName || email.split('@')[0],
                email,
                googleId: profile.id,
                avatar: profile.photos?.[0]?.value,
              });
            }
          }
          // Pass a plain Express.User-compatible object to passport
          return done(null, { id: user.id as string, email: user.email, name: user.name } as Express.User);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}

// ── POST /api/auth/register ────────────────────────────────────────────────────
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), passwordHash });

    const { token, refreshToken } = tokenPair({ id: user.id, email: user.email, name: user.name });
    logger.info('User registered', { userId: user.id });
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email }, token, refreshToken });
  } catch (error) {
    logger.error('Register error', { error });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { token, refreshToken } = tokenPair({ id: user.id, email: user.email, name: user.name });
    logger.info('User logged in', { userId: user.id });
    res.json({ user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar }, token, refreshToken });
  } catch (error) {
    logger.error('Login error', { error });
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── POST /api/auth/refresh ─────────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    let payload: { id: string };
    try {
      payload = jwt.verify(refreshToken, process.env.REFRESH_JWT_SECRET as string) as { id: string };
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const token = signAccessToken({ id: user.id, email: user.email, name: user.name });
    res.json({ token });
  } catch (error) {
    logger.error('Refresh error', { error });
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (error) {
    logger.error('Get me error', { error });
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── GET /api/auth/google ───────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/?error=oauth_failed`, session: false }),
  (req: Request, res: Response) => {
    const u = req.user!;
    const { token, refreshToken } = tokenPair({ id: u.id, email: u.email, name: u.name });
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/auth-callback?token=${token}&refreshToken=${refreshToken}`);
  }
);

export default router;
