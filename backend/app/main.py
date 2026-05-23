from __future__ import annotations

from copy import deepcopy
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(title="Krishi AI Soil Intelligence", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


CROP_ROOT_DEPTH = {
    "rice": 30,
    "wheat": 45,
    "cotton": 90,
    "sugarcane": 120,
    "maize": 60,
    "soybean": 50,
}

CROP_NPK_NEEDS = {
    "rice": {"N": 120, "P": 60, "K": 60},
    "wheat": {"N": 120, "P": 60, "K": 40},
    "cotton": {"N": 180, "P": 90, "K": 90},
    "sugarcane": {"N": 220, "P": 80, "K": 120},
    "maize": {"N": 150, "P": 75, "K": 75},
    "soybean": {"N": 40, "P": 60, "K": 40},
}

DISTRICT_BASELINES: dict[str, dict[str, Any]] = {
    "Cuttack": {
        "texture": "alluvial clay loam",
        "ph": 6.4,
        "organic_carbon": 0.54,
        "moisture": 0.58,
        "npk": {"N": 82, "P": 38, "K": 44},
        "rainfall_7d_mm": 64,
        "survey": "NBSS&LUP Odisha alluvial profile",
    },
    "Balasore": {
        "texture": "coastal sandy loam",
        "ph": 6.9,
        "organic_carbon": 0.47,
        "moisture": 0.66,
        "npk": {"N": 74, "P": 34, "K": 58},
        "rainfall_7d_mm": 82,
        "survey": "NBSS&LUP coastal delta profile",
    },
    "Ganjam": {
        "texture": "red sandy loam",
        "ph": 6.1,
        "organic_carbon": 0.39,
        "moisture": 0.36,
        "npk": {"N": 64, "P": 28, "K": 36},
        "rainfall_7d_mm": 24,
        "survey": "NBSS&LUP red soil upland profile",
    },
    "Kalahandi": {
        "texture": "medium black clay",
        "ph": 7.5,
        "organic_carbon": 0.62,
        "moisture": 0.31,
        "npk": {"N": 70, "P": 32, "K": 72},
        "rainfall_7d_mm": 18,
        "survey": "NBSS&LUP vertisol profile",
    },
    "Sambalpur": {
        "texture": "mixed red and lateritic",
        "ph": 5.8,
        "organic_carbon": 0.51,
        "moisture": 0.42,
        "npk": {"N": 76, "P": 30, "K": 40},
        "rainfall_7d_mm": 36,
        "survey": "NBSS&LUP lateritic plateau profile",
    },
}

DISEASE_SOIL_IMPACT = {
    "none": {
        "label": "No active leaf stress",
        "root_health": 1.0,
        "alert": "Crop canopy and soil profile are within normal watch range.",
    },
    "nitrogen_deficiency": {
        "label": "Nitrogen deficiency",
        "topsoil_color": "#c7a64a",
        "npk_multiplier": {"N": 0.55, "P": 1.0, "K": 1.0},
        "root_health": 0.56,
        "alert": "Topsoil nitrogen is critically low near the active root zone.",
    },
    "iron_chlorosis": {
        "label": "Iron chlorosis",
        "topsoil_color": "#9f8564",
        "ph_floor": 7.8,
        "root_health": 0.72,
        "alert": "Alkaline pH is locking micronutrients around shallow roots.",
    },
    "root_rot": {
        "label": "Root rot risk",
        "subsoil_color": "#3f7658",
        "moisture_floor": 0.86,
        "root_health": 0.38,
        "alert": "Waterlogged subsoil is creating a root pathogen zone.",
    },
    "drought_stress": {
        "label": "Drought stress",
        "topsoil_color": "#b98559",
        "moisture_cap": 0.14,
        "root_health": 0.48,
        "alert": "Severe water stress is shrinking the live root zone.",
    },
}


class FarmerInput(BaseModel):
    district: str = "Cuttack"
    crop: str = "rice"
    npk: dict[str, float] | None = None
    moisture: float | None = Field(default=None, ge=0, le=1)
    ph: float | None = Field(default=None, ge=3.5, le=10)
    disease: str = "nitrogen_deficiency"
    irrigation_interval_days: int = Field(default=4, ge=0, le=30)
    symptoms: list[str] = Field(default_factory=list)


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def apply_disease_impact(
    npk: dict[str, float], moisture: float, ph: float, disease: str
) -> tuple[dict[str, float], float, float, dict[str, Any]]:
    impact = DISEASE_SOIL_IMPACT.get(disease, DISEASE_SOIL_IMPACT["none"])
    adjusted_npk = deepcopy(npk)
    for nutrient, multiplier in impact.get("npk_multiplier", {}).items():
        adjusted_npk[nutrient] = adjusted_npk.get(nutrient, 0) * multiplier
    if "moisture_floor" in impact:
        moisture = max(moisture, impact["moisture_floor"])
    if "moisture_cap" in impact:
        moisture = min(moisture, impact["moisture_cap"])
    if "ph_floor" in impact:
        ph = max(ph, impact["ph_floor"])
    return adjusted_npk, clamp(moisture, 0, 1), clamp(ph, 3.5, 10), impact


def health_color(deficiency: dict[str, float], moisture: float) -> str:
    avg_deficiency = (deficiency["N"] + deficiency["P"] + deficiency["K"]) / 3
    if avg_deficiency < 0.2 and 0.3 < moisture < 0.7:
        return "#5c4033"
    if avg_deficiency > 0.6:
        return "#c4a35a"
    if moisture < 0.2:
        return "#a98569"
    if moisture > 0.8:
        return "#4a7c59"
    return "#765437"


def subsoil_color(moisture: float) -> str:
    if moisture > 0.75:
        return "#4f765d"
    if moisture < 0.25:
        return "#8a6849"
    return "#684d34"


def deficiency_scores(crop: str, npk: dict[str, float], ph: float) -> dict[str, float]:
    needs = CROP_NPK_NEEDS.get(crop, CROP_NPK_NEEDS["rice"])
    return {
        "N": round(clamp(1 - npk.get("N", 0) / needs["N"], 0, 1), 2),
        "P": round(clamp(1 - npk.get("P", 0) / needs["P"], 0, 1), 2),
        "K": round(clamp(1 - npk.get("K", 0) / needs["K"], 0, 1), 2),
        "ph_stress": round(clamp(abs(ph - 6.5) / 3.5, 0, 1), 2),
    }


def root_depth_for(crop: str, moisture: float, root_health: float) -> float:
    root_depth = CROP_ROOT_DEPTH.get(crop, 50)
    if moisture < 0.2:
        root_depth *= 0.6
    if moisture > 0.8:
        root_depth *= 0.7
    return round(root_depth * clamp(0.65 + root_health * 0.35, 0.55, 1.0), 1)


def pest_activity(moisture: float, disease: str, root_depth: float) -> list[dict[str, Any]]:
    termite_severity = 0.72 if moisture < 0.24 else 0.22
    zones = [
        {
            "name": "termite pressure",
            "depth_start": 12,
            "depth_end": min(48, root_depth + 12),
            "severity": round(termite_severity, 2),
            "color": "#e0a13a",
        }
    ]
    if disease == "root_rot" or moisture > 0.76:
        zones.append(
            {
                "name": "root rot pathogen band",
                "depth_start": 30,
                "depth_end": 75,
                "severity": 0.84,
                "color": "#d65a5a",
            }
        )
    return zones


def generate_recommendations(
    crop: str, deficiency: dict[str, float], moisture: float, ph: float, disease: str
) -> list[dict[str, str]]:
    recs: list[dict[str, str]] = []
    if deficiency["N"] > 0.3:
        recs.append(
            {
                "title": "Nitrogen correction",
                "action": "Apply urea at 50 kg/acre in two split doses near the root zone.",
                "urgency": "critical" if deficiency["N"] > 0.55 else "high",
            }
        )
    if deficiency["P"] > 0.3:
        recs.append(
            {
                "title": "Phosphorus correction",
                "action": "Apply DAP at 25 kg/acre before the next irrigation window.",
                "urgency": "high",
            }
        )
    if deficiency["K"] > 0.3:
        recs.append(
            {
                "title": "Potassium correction",
                "action": "Apply MOP at 20 kg/acre and recheck leaf edges in 7 days.",
                "urgency": "medium",
            }
        )
    if ph < 5.5:
        recs.append(
            {
                "title": "Acidic pH",
                "action": "Apply agricultural lime as per soil health card guidance.",
                "urgency": "medium",
            }
        )
    if ph > 7.5:
        recs.append(
            {
                "title": "Alkaline pH",
                "action": "Apply gypsum or ferrous sulfate after local extension review.",
                "urgency": "medium",
            }
        )
    if moisture < 0.25:
        recs.append(
            {
                "title": "Water stress",
                "action": "Irrigate within 24 hours; prioritize the active root depth band.",
                "urgency": "critical",
            }
        )
    if moisture > 0.75:
        recs.append(
            {
                "title": "Drainage risk",
                "action": "Open field channels and pause irrigation until subsoil moisture drops.",
                "urgency": "critical" if disease == "root_rot" else "high",
            }
        )
    if not recs:
        recs.append(
            {
                "title": "Maintain schedule",
                "action": f"{crop.title()} profile is stable; keep the current irrigation and scouting plan.",
                "urgency": "watch",
            }
        )
    return recs


def voice_advice(recommendations: list[dict[str, str]], disease_label: str) -> dict[str, str]:
    primary = recommendations[0]["action"]
    return {
        "english": f"{disease_label}. {primary}",
        "hindi": f"{disease_label}. {primary}",
        "odia": "ଆପଣଙ୍କ ମାଟିରେ ପୋଷକ ଅଭାବ ଦେଖାଯାଉଛି। ମୂଳ ଅଞ୍ଚଳରେ ସର ଏବଂ ପାଣି ପରିଚାଳନା କରନ୍ତୁ।",
    }


def build_soil_profile(farmer_input: FarmerInput) -> dict[str, Any]:
    baseline = DISTRICT_BASELINES.get(farmer_input.district, DISTRICT_BASELINES["Cuttack"])
    crop = farmer_input.crop
    npk = deepcopy(farmer_input.npk or baseline["npk"])
    moisture = farmer_input.moisture if farmer_input.moisture is not None else baseline["moisture"]
    ph = farmer_input.ph if farmer_input.ph is not None else baseline["ph"]
    disease = farmer_input.disease or "none"

    npk, moisture, ph, impact = apply_disease_impact(npk, moisture, ph, disease)
    deficiency = deficiency_scores(crop, npk, ph)
    root_health = clamp(impact.get("root_health", 1.0) - deficiency["ph_stress"] * 0.08, 0.2, 1.0)
    root_depth = root_depth_for(crop, moisture, root_health)

    topsoil_color = impact.get("topsoil_color") or health_color(deficiency, moisture)
    lower_moisture = clamp(moisture * 0.62 + 0.08, 0, 1)
    layers = [
        {
            "name": "Topsoil",
            "depth_start": 0,
            "depth_end": 20,
            "color": topsoil_color,
            "moisture": round(moisture, 2),
            "nutrients": {k: round(v, 1) for k, v in npk.items()},
            "deficiency": deficiency,
            "texture": baseline["texture"],
        },
        {
            "name": "Subsoil",
            "depth_start": 20,
            "depth_end": 60,
            "color": impact.get("subsoil_color") or subsoil_color(lower_moisture),
            "moisture": round(lower_moisture, 2),
            "nutrients": {k: round(v * 0.42, 1) for k, v in npk.items()},
            "texture": baseline["texture"],
        },
        {
            "name": "Parent material",
            "depth_start": 60,
            "depth_end": 120,
            "color": "#8b7355",
            "moisture": round(clamp(moisture * 0.24, 0, 1), 2),
            "nutrients": {},
            "texture": "weathered parent material",
        },
    ]
    recommendations = generate_recommendations(crop, deficiency, moisture, ph, disease)
    return {
        "district": farmer_input.district,
        "crop": crop,
        "leaf_diagnosis": impact["label"],
        "leaf_alert": impact["alert"],
        "layers": layers,
        "root_depth": root_depth,
        "root_health": round(root_health, 2),
        "deficiency": deficiency,
        "pest_activity": pest_activity(moisture, disease, root_depth),
        "recommendations": recommendations,
        "voice": voice_advice(recommendations, impact["label"]),
        "field_metrics": {
            "ph": round(ph, 1),
            "moisture": round(moisture, 2),
            "organic_carbon": baseline["organic_carbon"],
            "rainfall_7d_mm": baseline["rainfall_7d_mm"],
            "irrigation_interval_days": farmer_input.irrigation_interval_days,
        },
        "data_sources": [
            baseline["survey"],
            "Soil Health Card NPK input",
            "NASA SMAP style moisture simulation",
            "Leaf scan AI stress mapping",
        ],
        "subsidy_links": [
            {"label": "Soil Health Card", "url": "https://soilhealth.dac.gov.in/"},
            {"label": "PM-KISAN", "url": "https://pmkisan.gov.in/"},
            {"label": "PMFBY", "url": "https://pmfby.gov.in/"},
        ],
    }


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/districts")
def districts() -> dict[str, Any]:
    return {"districts": DISTRICT_BASELINES}


@app.get("/api/disease-presets")
def disease_presets() -> dict[str, Any]:
    return {"diseases": DISEASE_SOIL_IMPACT}


@app.post("/api/profile")
def profile(farmer_input: FarmerInput) -> dict[str, Any]:
    return build_soil_profile(farmer_input)
