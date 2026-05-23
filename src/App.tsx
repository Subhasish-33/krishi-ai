import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Camera,
  Database,
  Droplets,
  FlaskConical,
  Gauge,
  Leaf,
  MapPin,
  Mic2,
  RotateCcw,
  Satellite,
  ScanLine,
  Sprout,
  Volume2
} from "lucide-react";
import SoilCrossSection from "./components/SoilCrossSection";
import {
  CROP_OPTIONS,
  DISEASE_OPTIONS,
  DISTRICT_BASELINES,
  buildLocalSoilProfile,
  createDefaultInput,
  inputForDistrict,
  type FarmerInput,
  type SoilProfile
} from "./lib/soilProfile";

const diseaseCycle = ["nitrogen_deficiency", "root_rot", "drought_stress", "iron_chlorosis"];

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-field">
      <span>
        {label}
        <strong>
          {value}
          {unit}
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function speak(text: string, lang: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}

export default function App() {
  const [input, setInput] = useState<FarmerInput>(() => createDefaultInput());
  const [profile, setProfile] = useState<SoilProfile>(() => buildLocalSoilProfile(createDefaultInput()));
  const [source, setSource] = useState<"FastAPI backend" | "local simulation">("local simulation");
  const [scanIndex, setScanIndex] = useState(0);

  const requestPayload = useMemo(() => input, [input]);

  useEffect(() => {
    const controller = new AbortController();
    setProfile(buildLocalSoilProfile(requestPayload));
    setSource("local simulation");

    fetch("http://127.0.0.1:8000/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        return response.json() as Promise<SoilProfile>;
      })
      .then((apiProfile) => {
        setProfile(apiProfile);
        setSource("FastAPI backend");
      })
      .catch(() => {
        setSource("local simulation");
      });

    return () => controller.abort();
  }, [requestPayload]);

  const activeDisease = DISEASE_OPTIONS.find((disease) => disease.value === input.disease);
  const primaryRecommendation = profile.recommendations[0];

  const updateInput = (patch: Partial<FarmerInput>) => {
    setInput((current) => ({ ...current, ...patch }));
  };

  const runDemoScan = () => {
    const next = diseaseCycle[scanIndex % diseaseCycle.length];
    setScanIndex((current) => current + 1);
    setInput((current) => ({
      ...current,
      disease: next,
      symptoms: DISEASE_OPTIONS.find((disease) => disease.value === next)?.scan.split(" ") ?? []
    }));
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Odisha pilot MVP</p>
          <h1>Krishi AI Soil Intelligence</h1>
        </div>
        <div className="topbar-actions">
          <span className={`connection-pill ${source === "FastAPI backend" ? "online" : ""}`}>
            <Database size={16} />
            {source}
          </span>
          <button className="primary-button" onClick={runDemoScan}>
            <Camera size={18} />
            Scan leaf
          </button>
        </div>
      </header>

      <section className="dashboard-grid">
        <aside className="control-panel" aria-label="Field inputs">
          <div className="panel-heading">
            <MapPin size={20} />
            <div>
              <h2>Field Inputs</h2>
              <p>{DISTRICT_BASELINES[input.district].texture}</p>
            </div>
          </div>

          <label className="select-field">
            District
            <select
              value={input.district}
              onChange={(event) => setInput((current) => inputForDistrict(current, event.target.value))}
            >
              {Object.keys(DISTRICT_BASELINES).map((district) => (
                <option value={district} key={district}>
                  {district}
                </option>
              ))}
            </select>
          </label>

          <div className="control-group">
            <span className="control-label">Crop</span>
            <div className="segmented-grid">
              {CROP_OPTIONS.map((crop) => (
                <button
                  key={crop.value}
                  className={input.crop === crop.value ? "selected" : ""}
                  onClick={() => updateInput({ crop: crop.value })}
                >
                  {crop.label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <span className="control-label">
              <ScanLine size={16} />
              Leaf AI result
            </span>
            <div className="disease-list">
              {DISEASE_OPTIONS.map((disease) => (
                <button
                  key={disease.value}
                  className={input.disease === disease.value ? "selected" : ""}
                  onClick={() => updateInput({ disease: disease.value })}
                >
                  <Leaf size={15} />
                  <span>{disease.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <span className="control-label">
              <FlaskConical size={16} />
              Soil Health Card
            </span>
            <RangeField
              label="Nitrogen"
              value={input.npk.N}
              min={10}
              max={220}
              step={1}
              unit=" kg/ha"
              onChange={(N) => updateInput({ npk: { ...input.npk, N } })}
            />
            <RangeField
              label="Phosphorus"
              value={input.npk.P}
              min={5}
              max={120}
              step={1}
              unit=" kg/ha"
              onChange={(P) => updateInput({ npk: { ...input.npk, P } })}
            />
            <RangeField
              label="Potassium"
              value={input.npk.K}
              min={5}
              max={160}
              step={1}
              unit=" kg/ha"
              onChange={(K) => updateInput({ npk: { ...input.npk, K } })}
            />
            <RangeField
              label="Moisture"
              value={Math.round(input.moisture * 100)}
              min={5}
              max={95}
              step={1}
              unit="%"
              onChange={(moisture) => updateInput({ moisture: moisture / 100 })}
            />
            <RangeField
              label="pH"
              value={input.ph}
              min={4}
              max={9}
              step={0.1}
              unit=""
              onChange={(ph) => updateInput({ ph })}
            />
          </div>

          <button className="ghost-button" onClick={() => setInput(createDefaultInput())}>
            <RotateCcw size={17} />
            Reset Cuttack demo
          </button>
        </aside>

        <section className="visual-panel" aria-label="Soil cross-section">
          <div className="visual-header">
            <div>
              <p className="eyebrow">Live 3D cross-section</p>
              <h2>{profile.leaf_diagnosis}</h2>
            </div>
            <div className="metric-cluster">
              <span>
                <Sprout size={17} />
                {profile.root_depth} cm roots
              </span>
              <span>
                <Droplets size={17} />
                {percent(profile.field_metrics.moisture)}
              </span>
            </div>
          </div>

          <SoilCrossSection profile={profile} />

          <div className="source-strip" aria-label="Data fusion pipeline">
            <span>
              <Database size={16} />
              NBSS&LUP
            </span>
            <span>
              <Satellite size={16} />
              SMAP moisture
            </span>
            <span>
              <FlaskConical size={16} />
              Soil card
            </span>
            <span>
              <Activity size={16} />
              Leaf AI
            </span>
          </div>
        </section>

        <aside className="insight-panel" aria-label="Diagnosis output">
          <div className="panel-heading">
            <Gauge size={20} />
            <div>
              <h2>Diagnosis</h2>
              <p>{activeDisease?.scan}</p>
            </div>
          </div>

          <div className="alert-band">{profile.leaf_alert}</div>

          <div className="score-board">
            {Object.entries(profile.deficiency).map(([key, value]) => (
              <div className="score-row" key={key}>
                <span>{key === "ph_stress" ? "pH" : key}</span>
                <div className="score-track">
                  <i style={{ width: `${Math.round(value * 100)}%` }} />
                </div>
                <strong>{percent(value)}</strong>
              </div>
            ))}
          </div>

          <div className="root-health">
            <span>Root health</span>
            <strong>{percent(profile.root_health)}</strong>
            <div className="score-track">
              <i style={{ width: `${Math.round(profile.root_health * 100)}%` }} />
            </div>
          </div>

          <div className="recommendations">
            <h3>Action Plan</h3>
            {profile.recommendations.map((recommendation) => (
              <article className={`recommendation ${recommendation.urgency}`} key={recommendation.title}>
                <span>{recommendation.urgency}</span>
                <h4>{recommendation.title}</h4>
                <p>{recommendation.action}</p>
              </article>
            ))}
          </div>

          <div className="voice-panel">
            <div>
              <Mic2 size={19} />
              <strong>Voice advice</strong>
            </div>
            <p>{profile.voice.odia}</p>
            <div className="voice-actions">
              <button onClick={() => speak(profile.voice.odia, "or-IN")}>
                <Volume2 size={16} />
                Odia
              </button>
              <button onClick={() => speak(profile.voice.hindi, "hi-IN")}>
                <Volume2 size={16} />
                Hindi
              </button>
            </div>
          </div>

          <div className="subsidy-row">
            {profile.subsidy_links.map((link) => (
              <a href={link.url} key={link.label} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        </aside>
      </section>

      <section className="architecture-band" aria-label="System architecture">
        <div>
          <strong>Profile builder</strong>
          <span>NPK, pH, moisture and district soil horizons</span>
        </div>
        <div>
          <strong>3D renderer</strong>
          <span>Layer boxes, animated roots, moisture particles and pest depth</span>
        </div>
        <div>
          <strong>Farmer output</strong>
          <span>{primaryRecommendation.action}</span>
        </div>
      </section>
    </main>
  );
}
