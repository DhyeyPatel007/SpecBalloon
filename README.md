# SpecBalloon // DATUM STUDIO

> **Autonomous 2D CAD Metrology & AS9102 Rev C / AIAG PPAP Auto-Ballooning Platform**
> Built for CNC, automotive (IATF 16949), and aerospace (AS9102) QA inspection teams.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## ⚡ Overview

SpecBalloon eliminates 4 to 8 hours of manual PDF drawing ballooning and spreadsheet data entry. By replacing legacy OCR with deterministic vector geometry, ISO 286 limit mathematics, force-directed spring physics, and high-contrast cropped visual verification, SpecBalloon produces submission-ready AS9102 Form 3 and AIAG PPAP inspection packages in seconds.

### 📐 Aesthetic Direction: "DATUM STUDIO"
* **Strict Anti-Slop Policy**: Zero neon gradients, generic purple blobs, or emojis.
* **Mitutoyo + Teenage Engineering + Anduril/Palantir**: Tactile anodized stone vellum paper, deep oxidized graphite, exposed `1px solid` architectural grid hairlines, corner registration crosshairs (`+`), and Micrometer Safety Orange (`#EA580C` / `#FF5500`) accents.
* **Dual Native Themes**:
  - **Light Theme ("Anodized Stone")**: Optimized for high-glare shop floor offices (`#E6E5E0`).
  - **Dark Theme ("Oxide Graphite")**: Optimized for dark-room optical metrology labs (`#0B0B0A`).

---

## 🚀 Key Modules & Architecture

### 1. Interactive Split-Reticle Hero & X-Ray Vernier Scanner
* Draggable vertical Micrometer Vernier divider bar with auto-sweep mode.
* Left side shows raw unparsed legacy CAD with manual entry risks.
* Right side reveals live `#FF5500` balloons, cyan bounding boxes, leader lines, and dynamic telemetry HUDs.

### 2. Three-Stage Deterministic Metrology Pipeline
1. **Native Vector & Affine Matrix Decomposition (`0.15s`)**: PostScript Bézier curve traversal with rotation normalization $\theta = \text{atan2}(b, a) \times \frac{180}{\pi}$ and DBSCAN superscript clustering.
2. **Deterministic Metrology Math & Spring Repulsion (`0.25s`)**: ISO 286 Fundamental Tolerance Unit resolution $i = 0.45\sqrt[3]{D} + 0.001D$ and force-directed balloon spring repulsion $\vec{F}_{\text{rep}} = k_r \frac{\vec{b}_i - \vec{b}_j}{\|\vec{b}_i - \vec{b}_j\|^2}$.
3. **Visual-Crop Characteristic Tape & Caliper Wedge (`0.05s`)**: Live coordinate slice generation directly from CAD canvas ink with real-time USB-HID Mitutoyo caliper data pulses.

### 3. Four Living Telemetry Bays
* **Bay 01 // Live ISO 286 & GD&T Math Resolver**: Real-time evaluation of engineering fits (`H7`, `g6`, `js7`, etc.) with gauge recommendation.
* **Bay 02 // Force-Directed Balloon Physics Sandbox**: 60fps canvas simulation with rubberband leader lines, draggable balloons, and cursor avoidance.
* **Bay 03 // Zero-Ping-Pong Crop-Tape Simulator**: High-contrast blueprint snippets embedded directly beside numbers with 1-click verification.
* **Bay 04 // Live USB-HID Caliper & SPC Telemetry**: Real-time batch $C_p$ and $C_{pk}$ calculation on live `[LSL ---|--- USL]` control charts.

### 4. Locked Full-Screen DATUM STUDIO Metrology Workspace
* **Interactive CAD Canvas Viewport (Left 65%)**:
  - Smooth pan and zoom (50% to 300%).
  - Blueprint invert toggle (`Key: K`) between drafting stone and deep carbon `#111317`.
  - Shift-Drag Box Ballooning (`Key: B`): Select any area on the blueprint to extract coordinate crops, auto-generate sequential balloon, compute sheet grid zone (`B4`), and animate into the tape.
  - Minimap radar and live coordinate telemetry HUD.
* **The Characteristic Tape (Right 35%)**:
  - Eliminates vertical eye ping-pong between drawings and bottom spreadsheets.
  - Keyboard navigation (`Tab`, `↑`, `↓`) with auto camera pan and concentric radar pulses.
  - Editable nominal, +tol, -tol with instant USL/LSL recalculation and tolerance needle bar.
* **Full 14-Column AS9102 Rev C / PPAP Sheet View (`Cmd + \`)**:
  - Official 14-column metrology grid with bulk ISO fit calculations, clockwise sorting, and lot generation.
* **Live Shop-Floor USB-HID Digital Caliper DRO**:
  - Giant 32pt digital readout with spacebar hardware pulse simulation and 350ms auto-advance camera tracking.

---

## 🛠️ Getting Started

### Prerequisites
* Node.js v18+ 
* npm v9+

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/DhyeyPatel007/SpecBalloon.git
cd SpecBalloon

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to interact with both the landing page and the full DATUM STUDIO workspace.

### Production Build

```bash
npm run build
```

The production assets will be compiled into the `dist/` directory.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
