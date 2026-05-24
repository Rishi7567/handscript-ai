# HOW TO RUN HANDSCRIPT AI

## Prerequisites
- Open 3 separate PowerShell terminals
- All terminals start from: `C:\Users\Rishi Gupta\OneDrive\Desktop\claude\handscript-ai`

---

## TERMINAL 1 - Python ML Service (Port 8001)

```powershell
cd server\ml-models\ml_service
python main.py
```

**Performance tuning (optional):**

```powershell
$env:CALLIGRAPHER_PRELOAD_MODE="async"        # off | async | sync
$env:CALLIGRAPHER_STEP_MULTIPLIER="20"        # lower = faster, default 20
$env:CALLIGRAPHER_MIN_TSTEPS="220"
$env:CALLIGRAPHER_MAX_TSTEPS="1200"
python main.py
```

**Expected output:**
```
Starting ML Service on 127.0.0.1:8001
INFO:     Uvicorn running on http://127.0.0.1:8001
```

---

## TERMINAL 2 - Express Backend (Port 5000)

**First kill any process on port 5000:**
```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force
```

**Then run:**
```powershell
cd server
npm run dev
```

**Expected output:**
```
Server running on http://localhost:5000
(MongoDB warning is OK - works without it)
```

---

## TERMINAL 3 - React Frontend (Port 5173)

```powershell
cd client
npm run dev
```

**Expected output:**
```
VITE ready
Local: http://localhost:5173/
```

---

## OPEN IN BROWSER

**http://localhost:5173/generator**

---

## TESTING THE GENERATOR

1. Type text in textarea (e.g., "Hello World")
2. Click "Generate" button
3. See ML-generated handwriting SVG appear (2-5 seconds)
4. Adjust "Naturalness" slider for more/less variation
5. Try different paper backgrounds (Plain, Lined, Cream, Dark)

---

## TO STOP THE SERVERS

Press `Ctrl+C` in each terminal

---

## SESSION STATUS - April 7, 2026

### COMPLETED:
- ✅ Step 4: Express API integration
- ✅ Step 5: Frontend integration with ML service

### NEXT SESSION TODO:
- ⬜ Step 6: MongoDB setup for user accounts
- ⬜ Step 7: Image upload for style extraction (HWT model)
- ⬜ Step 8: Export functionality (PNG, PDF, SVG)
