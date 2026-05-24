<div align="center">

# ✍️ HandScript AI

### AI-Powered Handwriting Generation & Style Transfer

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-FF6F00?logo=tensorflow&logoColor=white)](https://tensorflow.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org)

**Type any text → Get realistic AI-generated handwriting → Export as PNG, PDF, or SVG**

[Features](#-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [API Reference](#-api-reference)

</div>

---

## 🎯 What is HandScript AI?

HandScript AI is a full-stack web application that generates realistic handwriting from typed text using deep learning models. It combines two neural networks — **Calligrapher.ai** (LSTM + Mixture Density Network) for text-to-stroke generation and **HWT** (Handwriting Transformers) for style extraction from images — to produce natural-looking handwritten output.

Users can choose from **15 pre-trained handwriting styles**, adjust parameters like slant, size, spacing, and ink weight, preview on different paper backgrounds, and export the result as **PNG**, **PDF**, or **SVG**.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🖊️ **AI Handwriting Generation** | Type any text and get realistic handwriting powered by LSTM neural networks |
| 🎨 **15 Handwriting Styles** | Choose from Classic, Elegant Cursive, Bold, Signature, and 11 more unique styles |
| ⚙️ **Real-Time Controls** | Fine-tune slant, size, spacing, ink weight, and naturalness with interactive sliders |
| 📄 **Paper Backgrounds** | Preview on Plain, Lined, Cream, or Dark paper with zoom controls |
| 📥 **Export** | Download your handwriting as PNG (2x resolution), PDF, or scalable SVG |
| ✏️ **Canvas Drawing** | Draw each letter on an interactive canvas with touch support for custom style creation |
| 📚 **Style Library** | Save, manage, and switch between multiple handwriting styles |
| 🔐 **Authentication** | Guest mode, email/password, and Google OAuth support |
| 📱 **Responsive Design** | Works on desktop, tablet, and mobile with glassmorphism UI |

---

## 🏗 Architecture

HandScript AI uses a **3-tier microservice architecture** with a polyglot backend:

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│    React + Vite          │     │    Express.js (Node)     │     │    FastAPI (Python)      │
│    TailwindCSS           │────▶│    TypeScript            │────▶│    PyTorch + TensorFlow  │
│    Zustand State         │     │    MongoDB / Mongoose    │     │    HWT + Calligrapher    │
│    Port 5173             │     │    Port 5000             │     │    Port 8001             │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
       FRONTEND                       BACKEND (BFF)                  ML MICROSERVICE
```

**Data Flow:**
```
User types text → React UI → Express API → Python ML Service → Calligrapher.ai model
                                                                      ↓
User sees handwriting ← React renders SVG ← Express forwards ← SVG generated from strokes
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| [React](https://react.dev) | 18.3 | UI framework with hooks & functional components |
| [TypeScript](https://typescriptlang.org) | 5.6 | Type-safe JavaScript |
| [Vite](https://vite.dev) | 6.0 | Build tool with HMR & dev server proxy |
| [Tailwind CSS](https://tailwindcss.com) | 3.4 | Utility-first CSS with custom design tokens |
| [Zustand](https://zustand-demo.pmnd.rs) | 5.0 | Lightweight state management with persistence |
| [React Router](https://reactrouter.com) | 7.1 | Client-side SPA routing |
| [Axios](https://axios-http.com) | 1.7 | HTTP client with interceptors |
| [jsPDF](https://github.com/parallax/jsPDF) | 2.5 | Client-side PDF generation |
| [html2canvas](https://html2canvas.hertzen.com) | 1.4 | DOM-to-canvas screenshot capture |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| [Express.js](https://expressjs.com) | 4.x | REST API server & BFF proxy layer |
| [TypeScript](https://typescriptlang.org) | 5.6 | Type-safe server code |
| [MongoDB](https://mongodb.com) | Atlas | Document database for users & styles |
| [Mongoose](https://mongoosejs.com) | 8.x | MongoDB ODM with schemas |
| [Passport.js](http://www.passportjs.org) | - | Authentication middleware (Google OAuth 2.0) |
| [JWT](https://jwt.io) | - | Stateless token-based authentication |
| [Multer](https://github.com/expressjs/multer) | - | Multipart file upload handling |

### ML Service
| Technology | Version | Purpose |
|-----------|---------|---------|
| [FastAPI](https://fastapi.tiangolo.com) | 0.115 | Async Python API with auto-generated docs |
| [TensorFlow](https://tensorflow.org) | 2.x | Calligrapher.ai model inference (migrated from TF1) |
| [PyTorch](https://pytorch.org) | 2.x | HWT model for style extraction |
| [Uvicorn](https://www.uvicorn.org) | 0.32 | ASGI server |
| [Pydantic](https://docs.pydantic.dev) | 2.9 | Request/response validation |
| [Pillow](https://pillow.readthedocs.io) | 12+ | Image preprocessing |
| [NumPy](https://numpy.org) | 2.0+ | Array operations & data transforms |
| [SciPy](https://scipy.org) | - | Stroke smoothing (Savitzky-Golay filter) |

### ML Models

| Model | Architecture | Framework | Role |
|-------|-------------|-----------|------|
| **[Calligrapher.ai](https://github.com/sjvasquez/handwriting-synthesis)** | 3-layer LSTM + MDN (20 Gaussian components) + Attention | TensorFlow | Text → SVG handwriting with 15 style priming options |
| **[HWT](https://github.com/ankanbhunia/Handwriting-Transformers)** | Transformer Encoder-Decoder + VAE + ResNet | PyTorch | Image → style embedding extraction |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.x & **npm** ≥ 9.x
- **Python** ≥ 3.10
- **MongoDB** (optional — app works without it in guest mode)
- **Git**

### 1. Clone & Install

```bash
git clone https://github.com/Rishi7567/handscript-ai.git
cd handscript-ai

# Install root dependencies (concurrently)
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..

# Install Python ML dependencies
cd server/ml-models/ml_service
pip install -r requirements.txt
cd ../../..
```

### 2. Configure Environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your values:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/handscript-ai
JWT_SECRET=your-random-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
CLIENT_URL=http://localhost:5173
```

> **Note:** MongoDB and Google OAuth are optional. The app works in guest mode without them.

### 3. Download ML Model Weights

The Calligrapher.ai and HWT model weights are not included in the repo (too large). You'll need:

- **Calligrapher.ai checkpoint** → place in `server/ml-models/calligrapher/`
- **HWT checkpoint** (`iam_model.pth`, ~155MB) → place in `server/ml-models/hwt/files/`

### 4. Run (3 Terminals)

**Terminal 1 — Python ML Service (port 8001):**
```bash
cd server/ml-models/ml_service
python main.py
```

**Terminal 2 — Express Backend (port 5000):**
```bash
cd server
npm run dev
```

**Terminal 3 — React Frontend (port 5173):**
```bash
cd client
npm run dev
```

### 5. Open

Navigate to **http://localhost:5173** and start generating handwriting!

> **Tip:** Go to `/generator` directly to start typing and generating.

---

## 📡 API Reference

### Express API (`localhost:5000`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check (includes DB status) |
| `GET` | `/api/handwriting/health` | ML service health & model readiness |
| `POST` | `/api/handwriting/warmup` | Trigger background model preload |
| `POST` | `/api/handwriting/generate` | Generate handwriting SVG from text |
| `POST` | `/api/handwriting/extract-style` | Extract style from uploaded image (multipart) |
| `POST` | `/api/handwriting/styles/build` | Build custom style from drawn stroke samples |
| `GET` | `/api/handwriting/styles` | List all saved styles |
| `GET` | `/api/handwriting/styles/:id` | Get a specific style |
| `DELETE` | `/api/handwriting/styles/:id` | Delete a style |

### Generate Request Example

```json
POST /api/handwriting/generate
{
  "text": "Hello, World!",
  "style_id": 3,
  "bias": 0.75,
  "slant": 5,
  "size": 100,
  "spacing": 50,
  "ink_weight": 50
}
```

### Python ML Service (`localhost:8001`)

FastAPI auto-generates interactive API docs at **http://localhost:8001/docs**

---

## 📁 Project Structure

```
handscript-ai/
├── client/                              # React Frontend
│   ├── src/
│   │   ├── App.tsx                      # Router & protected routes
│   │   ├── main.tsx                     # React entry point
│   │   ├── index.css                    # Global styles & animations
│   │   ├── pages/
│   │   │   ├── Landing.tsx              # Homepage with typewriter effect
│   │   │   ├── Generator.tsx            # Core text → handwriting page
│   │   │   ├── Onboarding.tsx           # Letter drawing canvas flow
│   │   │   ├── Library.tsx              # Saved styles management
│   │   │   └── AuthCallback.tsx         # Google OAuth callback handler
│   │   ├── components/
│   │   │   ├── ui/                      # Button, Slider, Toast, Input, AuthModal
│   │   │   └── layout/Header.tsx        # Navigation with glassmorphism
│   │   └── stores/
│   │       ├── handwritingStore.ts      # Generation, styles, slider state
│   │       ├── authStore.ts             # Auth state with JWT persistence
│   │       └── toastStore.ts            # Toast notification system
│   ├── tailwind.config.ts               # Custom theme & design tokens
│   ├── vite.config.ts                   # Dev server proxy configuration
│   └── package.json
│
├── server/                              # Express Backend
│   ├── src/
│   │   ├── index.ts                     # Server entry, MongoDB, middleware
│   │   ├── routes/
│   │   │   └── handwriting.ts           # API routes → ML service proxy
│   │   └── services/
│   │       └── mlService.ts             # Python ML service HTTP client
│   ├── ml-models/
│   │   ├── calligrapher/                # Calligrapher.ai (TF2 migrated)
│   │   ├── hwt/                         # HWT model (PyTorch)
│   │   └── ml_service/                  # FastAPI bridge service
│   │       ├── main.py                  # FastAPI app & endpoints
│   │       ├── calligrapher_wrapper.py  # Calligrapher model interface
│   │       ├── hwt_wrapper.py           # HWT model interface
│   │       └── requirements.txt         # Python dependencies
│   ├── .env.example                     # Environment template
│   └── package.json
│
├── vercel.json                          # Frontend deployment config
├── package.json                         # Root (concurrently for dev)
├── .gitignore
├── LICENSE                              # MIT
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Calligrapher.ai](https://github.com/sjvasquez/handwriting-synthesis) by Sean Vasquez — LSTM handwriting synthesis model
- [Handwriting Transformers (HWT)](https://github.com/ankanbhunia/Handwriting-Transformers) by Ankan Bhunia — Transformer-based style extraction
- [IAM Handwriting Database](https://fki.tic.heia-fr.ch/databases/iam-handwriting-database) — Training data

---

<div align="center">

**Built with ❤️ by [Rishi Gupta](https://github.com/Rishi7567)**

</div>
