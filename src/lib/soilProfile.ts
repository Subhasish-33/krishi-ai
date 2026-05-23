export type Nutrients = {
  N: number;
  P: number;
  K: number;
};

export type Recommendation = {
  title: string;
  action: string;
  urgency: "critical" | "high" | "medium" | "watch";
};

export type SoilLayer = {
  name: string;
  depth_start: number;
  depth_end: number;
  color: string;
  moisture: number;
  nutrients: Partial<Nutrients>;
  deficiency?: Deficiency;
  texture: string;
};

export type Deficiency = {
  N: number;
  P: number;
  K: number;
  ph_stress: number;
};

export type PestZone = {
  name: string;
  depth_start: number;
  depth_end: number;
  severity: number;
  color: string;
};

export type SoilProfile = {
  district: string;
  crop: string;
  leaf_diagnosis: string;
  leaf_alert: string;
  layers: SoilLayer[];
  root_depth: number;
  root_health: number;
  deficiency: Deficiency;
  pest_activity: PestZone[];
  recommendations: Recommendation[];
  voice: {
    english: string;
    hindi: string;
    odia: string;
  };
  field_metrics: {
    ph: number;
    moisture: number;
    organic_carbon: number;
    rainfall_7d_mm: number;
    irrigation_interval_days: number;
  };
  data_sources: string[];
  subsidy_links: Array<{ label: string; url: string }>;
};

export type FarmerInput = {
  district: string;
  crop: string;
  npk: Nutrients;
  moisture: number;
  ph: number;
  disease: string;
  irrigation_interval_days: number;
  symptoms: string[];
};

type DistrictBaseline = {
  texture: string;
  ph: number;
  organic_carbon: number;
  moisture: number;
  npk: Nutrients;
  rainfall_7d_mm: number;
  survey: string;
};

type DiseaseImpact = {
  label: string;
  alert: string;
  topsoil_color?: string;
  subsoil_color?: string;
  npk_multiplier?: Partial<Nutrients>;
  moisture_floor?: number;
  moisture_cap?: number;
  ph_floor?: number;
  root_health: number;
};

export const CROP_OPTIONS = [
  { value: "rice", label: "Rice" },
  { value: "wheat", label: "Wheat" },
  { value: "cotton", label: "Cotton" },
  { value: "sugarcane", label: "Sugarcane" },
  { value: "maize", label: "Maize" },
  { value: "soybean", label: "Soybean" }
];

export const CROP_ROOT_DEPTH: Record<string, number> = {
  rice: 30,
  wheat: 45,
  cotton: 90,
  sugarcane: 120,
  maize: 60,
  soybean: 50
};

export const CROP_NPK_NEEDS: Record<string, Nutrients> = {
  rice: { N: 120, P: 60, K: 60 },
  wheat: { N: 120, P: 60, K: 40 },
  cotton: { N: 180, P: 90, K: 90 },
  sugarcane: { N: 220, P: 80, K: 120 },
  maize: { N: 150, P: 75, K: 75 },
  soybean: { N: 40, P: 60, K: 40 }
};

export const DISTRICT_BASELINES: Record<string, DistrictBaseline> = {
  Cuttack: {
    texture: "alluvial clay loam",
    ph: 6.4,
    organic_carbon: 0.54,
    moisture: 0.58,
    npk: { N: 82, P: 38, K: 44 },
    rainfall_7d_mm: 64,
    survey: "NBSS&LUP Odisha alluvial profile"
  },
  Balasore: {
    texture: "coastal sandy loam",
    ph: 6.9,
    organic_carbon: 0.47,
    moisture: 0.66,
    npk: { N: 74, P: 34, K: 58 },
    rainfall_7d_mm: 82,
    survey: "NBSS&LUP coastal delta profile"
  },
  Ganjam: {
    texture: "red sandy loam",
    ph: 6.1,
    organic_carbon: 0.39,
    moisture: 0.36,
    npk: { N: 64, P: 28, K: 36 },
    rainfall_7d_mm: 24,
    survey: "NBSS&LUP red soil upland profile"
  },
  Kalahandi: {
    texture: "medium black clay",
    ph: 7.5,
    organic_carbon: 0.62,
    moisture: 0.31,
    npk: { N: 70, P: 32, K: 72 },
    rainfall_7d_mm: 18,
    survey: "NBSS&LUP vertisol profile"
  },
  Sambalpur: {
    texture: "mixed red and lateritic",
    ph: 5.8,
    organic_carbon: 0.51,
    moisture: 0.42,
    npk: { N: 76, P: 30, K: 40 },
    rainfall_7d_mm: 36,
    survey: "NBSS&LUP lateritic plateau profile"
  }
};

export const DISEASE_OPTIONS = [
  {
    value: "nitrogen_deficiency",
    label: "Yellow leaf",
    scan: "Nitrogen deficiency"
  },
  {
    value: "iron_chlorosis",
    label: "Pale veins",
    scan: "Iron chlorosis"
  },
  {
    value: "root_rot",
    label: "Wilting base",
    scan: "Root rot risk"
  },
  {
    value: "drought_stress",
    label: "Dry curl",
    scan: "Drought stress"
  },
  {
    value: "none",
    label: "Healthy",
    scan: "No active stress"
  }
];

const DISEASE_IMPACT: Record<string, DiseaseImpact> = {
  none: {
    label: "No active leaf stress",
    root_health: 1,
    alert: "Crop canopy and soil profile are within normal watch range."
  },
  nitrogen_deficiency: {
    label: "Nitrogen deficiency",
    topsoil_color: "#c7a64a",
    npk_multiplier: { N: 0.55 },
    root_health: 0.56,
    alert: "Topsoil nitrogen is critically low near the active root zone."
  },
  iron_chlorosis: {
    label: "Iron chlorosis",
    topsoil_color: "#9f8564",
    ph_floor: 7.8,
    root_health: 0.72,
    alert: "Alkaline pH is locking micronutrients around shallow roots."
  },
  root_rot: {
    label: "Root rot risk",
    subsoil_color: "#3f7658",
    moisture_floor: 0.86,
    root_health: 0.38,
    alert: "Waterlogged subsoil is creating a root pathogen zone."
  },
  drought_stress: {
    label: "Drought stress",
    topsoil_color: "#b98559",
    moisture_cap: 0.14,
    root_health: 0.48,
    alert: "Severe water stress is shrinking the live root zone."
  }
};

export function createDefaultInput(): FarmerInput {
  const baseline = DISTRICT_BASELINES.Cuttack;
  return {
    district: "Cuttack",
    crop: "rice",
    npk: { ...baseline.npk },
    moisture: baseline.moisture,
    ph: baseline.ph,
    disease: "nitrogen_deficiency",
    irrigation_interval_days: 4,
    symptoms: ["yellowing leaves", "slow tillering"]
  };
}

export function inputForDistrict(input: FarmerInput, district: string): FarmerInput {
  const baseline = DISTRICT_BASELINES[district] ?? DISTRICT_BASELINES.Cuttack;
  return {
    ...input,
    district,
    npk: { ...baseline.npk },
    moisture: baseline.moisture,
    ph: baseline.ph
  };
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function applyDiseaseImpact(input: FarmerInput): {
  npk: Nutrients;
  moisture: number;
  ph: number;
  impact: DiseaseImpact;
} {
  const impact = DISEASE_IMPACT[input.disease] ?? DISEASE_IMPACT.none;
  const npk: Nutrients = { ...input.npk };
  Object.entries(impact.npk_multiplier ?? {}).forEach(([key, multiplier]) => {
    const nutrient = key as keyof Nutrients;
    npk[nutrient] *= multiplier ?? 1;
  });
  let moisture = input.moisture;
  let ph = input.ph;
  if (impact.moisture_floor !== undefined) moisture = Math.max(moisture, impact.moisture_floor);
  if (impact.moisture_cap !== undefined) moisture = Math.min(moisture, impact.moisture_cap);
  if (impact.ph_floor !== undefined) ph = Math.max(ph, impact.ph_floor);
  return {
    npk,
    moisture: clamp(moisture, 0, 1),
    ph: clamp(ph, 3.5, 10),
    impact
  };
}

function deficiencyScores(crop: string, npk: Nutrients, ph: number): Deficiency {
  const needs = CROP_NPK_NEEDS[crop] ?? CROP_NPK_NEEDS.rice;
  return {
    N: round(clamp(1 - npk.N / needs.N, 0, 1)),
    P: round(clamp(1 - npk.P / needs.P, 0, 1)),
    K: round(clamp(1 - npk.K / needs.K, 0, 1)),
    ph_stress: round(clamp(Math.abs(ph - 6.5) / 3.5, 0, 1))
  };
}

function healthColor(deficiency: Deficiency, moisture: number): string {
  const average = (deficiency.N + deficiency.P + deficiency.K) / 3;
  if (average < 0.2 && moisture > 0.3 && moisture < 0.7) return "#5c4033";
  if (average > 0.6) return "#c4a35a";
  if (moisture < 0.2) return "#a98569";
  if (moisture > 0.8) return "#4a7c59";
  return "#765437";
}

function subsoilColor(moisture: number): string {
  if (moisture > 0.75) return "#4f765d";
  if (moisture < 0.25) return "#8a6849";
  return "#684d34";
}

function rootDepthFor(crop: string, moisture: number, rootHealth: number): number {
  let rootDepth = CROP_ROOT_DEPTH[crop] ?? 50;
  if (moisture < 0.2) rootDepth *= 0.6;
  if (moisture > 0.8) rootDepth *= 0.7;
  return round(rootDepth * clamp(0.65 + rootHealth * 0.35, 0.55, 1), 1);
}

function pestActivity(moisture: number, disease: string, rootDepth: number): PestZone[] {
  const zones: PestZone[] = [
    {
      name: "termite pressure",
      depth_start: 12,
      depth_end: Math.min(48, rootDepth + 12),
      severity: moisture < 0.24 ? 0.72 : 0.22,
      color: "#e0a13a"
    }
  ];
  if (disease === "root_rot" || moisture > 0.76) {
    zones.push({
      name: "root rot pathogen band",
      depth_start: 30,
      depth_end: 75,
      severity: 0.84,
      color: "#d65a5a"
    });
  }
  return zones;
}

function recommendations(
  crop: string,
  deficiency: Deficiency,
  moisture: number,
  ph: number,
  disease: string
): Recommendation[] {
  const recs: Recommendation[] = [];
  if (deficiency.N > 0.3) {
    recs.push({
      title: "Nitrogen correction",
      action: "Apply urea at 50 kg/acre in two split doses near the root zone.",
      urgency: deficiency.N > 0.55 ? "critical" : "high"
    });
  }
  if (deficiency.P > 0.3) {
    recs.push({
      title: "Phosphorus correction",
      action: "Apply DAP at 25 kg/acre before the next irrigation window.",
      urgency: "high"
    });
  }
  if (deficiency.K > 0.3) {
    recs.push({
      title: "Potassium correction",
      action: "Apply MOP at 20 kg/acre and recheck leaf edges in 7 days.",
      urgency: "medium"
    });
  }
  if (ph < 5.5) {
    recs.push({
      title: "Acidic pH",
      action: "Apply agricultural lime as per soil health card guidance.",
      urgency: "medium"
    });
  }
  if (ph > 7.5) {
    recs.push({
      title: "Alkaline pH",
      action: "Apply gypsum or ferrous sulfate after local extension review.",
      urgency: "medium"
    });
  }
  if (moisture < 0.25) {
    recs.push({
      title: "Water stress",
      action: "Irrigate within 24 hours; prioritize the active root depth band.",
      urgency: "critical"
    });
  }
  if (moisture > 0.75) {
    recs.push({
      title: "Drainage risk",
      action: "Open field channels and pause irrigation until subsoil moisture drops.",
      urgency: disease === "root_rot" ? "critical" : "high"
    });
  }
  if (recs.length === 0) {
    recs.push({
      title: "Maintain schedule",
      action: `${crop[0].toUpperCase()}${crop.slice(1)} profile is stable; keep the current irrigation and scouting plan.`,
      urgency: "watch"
    });
  }
  return recs;
}

function voiceAdvice(recs: Recommendation[], diseaseLabel: string): SoilProfile["voice"] {
  return {
    english: `${diseaseLabel}. ${recs[0].action}`,
    hindi: `${diseaseLabel}. ${recs[0].action}`,
    odia: "ଆପଣଙ୍କ ମାଟିରେ ପୋଷକ ଅଭାବ ଦେଖାଯାଉଛି। ମୂଳ ଅଞ୍ଚଳରେ ସର ଏବଂ ପାଣି ପରିଚାଳନା କରନ୍ତୁ।"
  };
}

export function buildLocalSoilProfile(input: FarmerInput): SoilProfile {
  const baseline = DISTRICT_BASELINES[input.district] ?? DISTRICT_BASELINES.Cuttack;
  const { npk, moisture, ph, impact } = applyDiseaseImpact(input);
  const deficiency = deficiencyScores(input.crop, npk, ph);
  const rootHealth = clamp(impact.root_health - deficiency.ph_stress * 0.08, 0.2, 1);
  const rootDepth = rootDepthFor(input.crop, moisture, rootHealth);
  const lowerMoisture = clamp(moisture * 0.62 + 0.08, 0, 1);
  const recs = recommendations(input.crop, deficiency, moisture, ph, input.disease);

  return {
    district: input.district,
    crop: input.crop,
    leaf_diagnosis: impact.label,
    leaf_alert: impact.alert,
    layers: [
      {
        name: "Topsoil",
        depth_start: 0,
        depth_end: 20,
        color: impact.topsoil_color ?? healthColor(deficiency, moisture),
        moisture: round(moisture),
        nutrients: { N: round(npk.N, 1), P: round(npk.P, 1), K: round(npk.K, 1) },
        deficiency,
        texture: baseline.texture
      },
      {
        name: "Subsoil",
        depth_start: 20,
        depth_end: 60,
        color: impact.subsoil_color ?? subsoilColor(lowerMoisture),
        moisture: round(lowerMoisture),
        nutrients: {
          N: round(npk.N * 0.42, 1),
          P: round(npk.P * 0.42, 1),
          K: round(npk.K * 0.42, 1)
        },
        texture: baseline.texture
      },
      {
        name: "Parent material",
        depth_start: 60,
        depth_end: 120,
        color: "#8b7355",
        moisture: round(clamp(moisture * 0.24, 0, 1)),
        nutrients: {},
        texture: "weathered parent material"
      }
    ],
    root_depth: rootDepth,
    root_health: round(rootHealth),
    deficiency,
    pest_activity: pestActivity(moisture, input.disease, rootDepth),
    recommendations: recs,
    voice: voiceAdvice(recs, impact.label),
    field_metrics: {
      ph: round(ph, 1),
      moisture: round(moisture),
      organic_carbon: baseline.organic_carbon,
      rainfall_7d_mm: baseline.rainfall_7d_mm,
      irrigation_interval_days: input.irrigation_interval_days
    },
    data_sources: [
      baseline.survey,
      "Soil Health Card NPK input",
      "NASA SMAP style moisture simulation",
      "Leaf scan AI stress mapping"
    ],
    subsidy_links: [
      { label: "Soil Health Card", url: "https://soilhealth.dac.gov.in/" },
      { label: "PM-KISAN", url: "https://pmkisan.gov.in/" },
      { label: "PMFBY", url: "https://pmfby.gov.in/" }
    ]
  };
}
