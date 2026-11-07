# SpecBalloon Computational Metrology Backend

Production FastAPI service for 2D CAD engineering drawing auto-ballooning, OCR extraction, ISO 286 / ISO 2768 metrology limit calculation, multi-sample Statistical Process Control (SPC), and AS9102 Rev C / PPAP Excel exports.

## Quick Start

1. Create a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\Activate.ps1
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Launch server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

4. Interactive Swagger API Docs:
   - `http://localhost:8000/docs`
   - `http://localhost:8000/health`

