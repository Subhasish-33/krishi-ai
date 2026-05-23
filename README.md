# Krishi.ai 🌱
### AI-Powered Agricultural Digital Twin Platform

> Visualizing underground farm intelligence through real-time 3D soil simulation, crop disease AI, and multilingual farmer recommendations.

---

<img width="622" height="455" alt="banner" src="https://github.com/user-attachments/assets/a56d2691-1106-427e-9925-cb55249fd7d0" />

## 🚀 Overview

Krishi.ai is an AI-powered agricultural digital twin platform built to help Indian farmers diagnose crop issues, understand underground soil conditions, and receive actionable recommendations in regional languages.

Unlike traditional crop disease apps that only provide a diagnosis, Krishi.ai creates a live **3D cross-sectional visualization of the soil beneath a farmer's field** showing:

- Root depth
- Moisture zones
- Nutrient deficiency layers
- Waterlogging risks
- Soil health conditions
- Underground pest and pathogen stress patterns

Think of it as a **CT scan for farmland**.

---

# 🎯 Problem Statement

Over 70% of Indian farmers still diagnose crop disease through guesswork or neighbour advice. Incorrect diagnosis often leads to:

- Crop yield loss
- Excess fertilizer usage
- Water wastage
- Soil degradation
- Financial losses

Existing solutions lack:

- Regional language accessibility
- Soil-aware recommendations
- Real-time underground visualization
- Predictive farm intelligence

Krishi.ai bridges this gap using AI + 3D visualization + public agricultural datasets.

---

# ✨ Core Features

## 🌿 AI Crop Disease Detection
- Leaf scan presets for nitrogen deficiency, iron chlorosis, root rot, drought stress, and healthy crop states
- Disease-to-soil impact mapping
- Dynamic severity and recommendation updates

## 🌍 3D Soil Intelligence Visualization
- Interactive Three.js underground soil cross-section
- Layered topsoil, subsoil, and parent material zones
- Animated root system using tube geometry
- Moisture particle flow animation
- Nutrient deficiency labels
- Pest/pathogen depth bands

## 💧 Moisture & Irrigation Simulation
- Soil moisture modeling
- Waterlogging detection
- Drought stress simulation
- Irrigation recommendations

## 🧠 AI Recommendation Engine
- Fertilizer suggestions
- Soil treatment plans
- pH correction recommendations
- Drainage and irrigation guidance

## 🛰️ Government & Satellite Data Integration
- NBSS&LUP-inspired Odisha district soil profiles
- Soil Health Card-style NPK input
- NASA SMAP-style soil moisture simulation
- ISRO Bhuvan and IMD-ready architecture

## 🗣️ Multilingual Voice Assistant
- Odia voice guidance text
- Hindi voice output through browser speech synthesis
- Farmer-facing recommendation panel

---

# 🧩 System Architecture

```text
Leaf Scan / Soil Data / Weather Data
                ↓
      AI Soil Intelligence Engine
                ↓
     Soil Profile Generator (FastAPI)
                ↓
    3D Digital Twin Visualization
                ↓
 Recommendations + Voice Assistance
```

---

# 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite
- **3D Engine:** Three.js + OrbitControls
- **Backend:** FastAPI, Pydantic, Uvicorn
- **Voice:** Browser SpeechSynthesis API
- **Data Model:** Odisha district baselines, NPK scoring, moisture and pH stress modeling

---

# 📦 Project Structure

```text
backend/app/main.py                 FastAPI soil profile API
src/App.tsx                         Farmer dashboard and interaction logic
src/components/SoilCrossSection.tsx Three.js soil CT visualization
src/lib/soilProfile.ts              Frontend fallback soil intelligence model
src/styles.css                      Responsive dashboard styling
```

---

# ▶️ Run Locally

Install frontend dependencies:

```bash
npm install
```

Start the React app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

Set up and run the backend:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm run api
```

The frontend works even when the backend is offline by using the same local soil-profile model in TypeScript. When FastAPI is running, the connection badge switches to **FastAPI backend**.

---

# ✅ Validation

This MVP has been verified with:

```bash
npm run build
python3 -m py_compile backend/app/main.py
```

The local FastAPI health endpoint returns:

```json
{"status":"ok"}
```
