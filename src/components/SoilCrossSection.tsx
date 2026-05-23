import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { PestZone, SoilLayer, SoilProfile } from "../lib/soilProfile";

type SoilCrossSectionProps = {
  profile: SoilProfile;
};

const WIDTH = 35;
const DEPTH = 17;
const SCALE = 0.22;
const TOP_Y = 4;

type Updater = (delta: number, elapsed: number) => void;

function seededNoise(seed: number): number {
  const raw = Math.sin(seed * 12.9898) * 43758.5453;
  return raw - Math.floor(raw);
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh | THREE.Points | THREE.LineSegments;
    const maybeGeometry = mesh.geometry as THREE.BufferGeometry | undefined;
    const maybeMaterial = mesh.material as THREE.Material | THREE.Material[] | undefined;
    maybeGeometry?.dispose();
    if (Array.isArray(maybeMaterial)) {
      maybeMaterial.forEach((material) => material.dispose());
    } else {
      maybeMaterial?.dispose();
    }
  });
}

function labelSprite(text: string, color = "#f5f1df", background = "rgba(17, 22, 20, 0.78)") {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  canvas.width = 768;
  canvas.height = 192;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = background;
  context.strokeStyle = "rgba(255,255,255,0.18)";
  context.lineWidth = 4;
  context.beginPath();
  context.roundRect(16, 24, canvas.width - 32, canvas.height - 48, 18);
  context.fill();
  context.stroke();
  context.fillStyle = color;
  context.font = "700 46px Inter, Arial, sans-serif";
  context.textBaseline = "middle";
  context.fillText(text, 44, canvas.height / 2, canvas.width - 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    })
  );
  sprite.scale.set(8.4, 2.1, 1);
  return sprite;
}

function roughLayerGeometry(layer: SoilLayer, seedOffset: number) {
  const thickness = (layer.depth_end - layer.depth_start) * SCALE;
  const geometry = new THREE.BoxGeometry(WIDTH, thickness, DEPTH, 28, 5, 14);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const sideRoughness = (seededNoise(index + seedOffset) - 0.5) * 0.34;
    const topRoughness = (seededNoise(index * 1.7 + seedOffset) - 0.5) * 0.18;
    position.setX(index, x + sideRoughness);
    position.setZ(index, z + (seededNoise(index * 2.2 + seedOffset) - 0.5) * 0.28);
    if (Math.abs(y - thickness / 2) < 0.04) {
      position.setY(index, y + topRoughness);
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function layerY(layer: Pick<SoilLayer, "depth_start" | "depth_end">) {
  return TOP_Y - ((layer.depth_start + layer.depth_end) / 2) * SCALE;
}

function addLayer(group: THREE.Group, layer: SoilLayer, index: number) {
  const thickness = (layer.depth_end - layer.depth_start) * SCALE;
  const y = layerY(layer);
  const geometry = roughLayerGeometry(layer, index * 31 + layer.depth_end);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(layer.color),
    roughness: 0.92,
    metalness: 0.02,
    transparent: true,
    opacity: 0.94
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, y, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 18),
    new THREE.LineBasicMaterial({ color: 0xf4e2ba, transparent: true, opacity: 0.14 })
  );
  edge.position.copy(mesh.position);
  group.add(edge);

  const slice = new THREE.Mesh(
    new THREE.PlaneGeometry(WIDTH, thickness, 26, 4),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(layer.color).offsetHSL(0, 0.05, 0.08),
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide
    })
  );
  slice.position.set(0, y, DEPTH / 2 + 0.05);
  group.add(slice);

  const label = labelSprite(`${layer.name} ${layer.depth_start}-${layer.depth_end} cm`, "#f4e7bd");
  label.position.set(-WIDTH / 2 + 5.2, y, DEPTH / 2 + 0.7);
  label.scale.set(5.8, 1.45, 1);
  group.add(label);
}

function addMoistureParticles(group: THREE.Group, layer: SoilLayer, updaters: Updater[]) {
  if (layer.moisture < 0.12) return;
  const thickness = (layer.depth_end - layer.depth_start) * SCALE;
  const y = layerY(layer);
  const count = Math.max(28, Math.floor(layer.moisture * 210));
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (seededNoise(i + layer.depth_start) - 0.5) * (WIDTH - 2);
    positions[i * 3 + 1] = y + (seededNoise(i * 3.1 + layer.depth_end) - 0.5) * thickness;
    positions[i * 3 + 2] = (seededNoise(i * 7.3 + 9) - 0.5) * (DEPTH - 1);
    speeds[i] = 0.012 + seededNoise(i * 5.7) * 0.03;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: new THREE.Color().setHSL(0.58, 0.92, 0.36 + layer.moisture * 0.28),
    size: 0.18,
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  group.add(points);

  updaters.push((delta) => {
    const attr = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < count; i += 1) {
      const nextY = attr.getY(i) - speeds[i] * layer.moisture * delta * 35;
      attr.setY(i, nextY < y - thickness / 2 ? y + thickness / 2 : nextY);
    }
    attr.needsUpdate = true;
  });
}

function rootMaterial(profile: SoilProfile) {
  const color =
    profile.deficiency.N > 0.55
      ? 0xd89b32
      : profile.field_metrics.moisture < 0.25
        ? 0x8b6914
        : profile.root_health < 0.48
          ? 0xb9653a
          : 0xd2b277;
  return new THREE.MeshStandardMaterial({ color, roughness: 0.84 });
}

function tubeFrom(points: THREE.Vector3[], radius: number, material: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 7, false), material);
}

function addRootSystem(group: THREE.Group, profile: SoilProfile) {
  const maxDepth = profile.root_depth * SCALE;
  const material = rootMaterial(profile);
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x6da84f, roughness: 0.72 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.3, 9), stemMaterial);
  stem.position.set(0, TOP_Y + 1.05, 0);
  group.add(stem);

  for (let i = 0; i < 5; i += 1) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.58, 14, 8), stemMaterial);
    leaf.scale.set(1.5, 0.25, 0.55);
    leaf.rotation.z = (i - 2) * 0.36;
    leaf.rotation.y = i % 2 === 0 ? 0.65 : -0.65;
    leaf.position.set((i - 2) * 0.34, TOP_Y + 2.1 + i * 0.05, i % 2 === 0 ? 0.48 : -0.42);
    group.add(leaf);
  }

  const taproot = tubeFrom(
    [
      new THREE.Vector3(0, TOP_Y, 0),
      new THREE.Vector3(0.4, TOP_Y - maxDepth * 0.28, 0.32),
      new THREE.Vector3(-0.15, TOP_Y - maxDepth * 0.64, -0.22),
      new THREE.Vector3(0.1, TOP_Y - maxDepth, 0.08)
    ],
    0.13 * (0.55 + profile.root_health * 0.65),
    material
  );
  group.add(taproot);

  const lateralCount = 12;
  for (let i = 0; i < lateralCount; i += 1) {
    const ratio = (i + 1) / lateralCount;
    const depth = ratio * maxDepth * 0.78;
    const angle = ratio * Math.PI * 2.5;
    const spread = (3.2 + seededNoise(i * 4.2) * 4.6) * (0.5 + profile.root_health * 0.5);
    const root = tubeFrom(
      [
        new THREE.Vector3(0, TOP_Y - depth, 0),
        new THREE.Vector3(Math.cos(angle) * spread * 0.45, TOP_Y - depth - 0.8, Math.sin(angle) * 1.2),
        new THREE.Vector3(
          Math.cos(angle) * spread,
          TOP_Y - depth - 1.4 - seededNoise(i) * 1.4,
          Math.sin(angle) * 2.6
        )
      ],
      0.035 + (1 - ratio) * 0.045,
      material
    );
    group.add(root);
  }
}

function addPestBands(group: THREE.Group, zones: PestZone[]) {
  zones.forEach((zone, zoneIndex) => {
    const startY = TOP_Y - zone.depth_start * SCALE;
    const endY = TOP_Y - zone.depth_end * SCALE;
    const thickness = Math.max(0.4, Math.abs(startY - endY));
    const centerY = (startY + endY) / 2;
    const color = new THREE.Color(zone.color);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(WIDTH + 0.9, thickness, 0.18),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.1 + zone.severity * 0.18,
        depthWrite: false
      })
    );
    band.position.set(0, centerY, DEPTH / 2 + 0.24 + zoneIndex * 0.08);
    group.add(band);

    const zoneLabel = zone.name.includes("root rot") ? "pathogen" : "termite";
    const label = labelSprite(`${zoneLabel} ${zone.depth_start}-${zone.depth_end}cm`, "#ffe0bd", "rgba(55, 20, 16, 0.74)");
    label.position.set(WIDTH / 2 - 8.2, centerY, DEPTH / 2 + 0.7);
    label.scale.set(4.6, 1.25, 1);
    group.add(label);

    const dotMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 });
    const dotCount = Math.floor(8 + zone.severity * 18);
    for (let i = 0; i < dotCount; i += 1) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.12 + zone.severity * 0.05, 8, 6), dotMaterial);
      dot.position.set(
        (seededNoise(i + zone.depth_start) - 0.5) * WIDTH,
        centerY + (seededNoise(i * 2.4 + zone.depth_end) - 0.5) * thickness,
        DEPTH / 2 + 0.4 + seededNoise(i * 5.5) * 0.6
      );
      group.add(dot);
    }
  });
}

function addDeficiencyMarkers(group: THREE.Group, profile: SoilProfile) {
  const entries = [
    ["N", profile.deficiency.N],
    ["P", profile.deficiency.P],
    ["K", profile.deficiency.K],
    ["pH", profile.deficiency.ph_stress]
  ] as const;
  entries
    .filter(([, value]) => value > 0.3)
    .forEach(([key, value], index) => {
      const color = value > 0.55 ? "#ffc66b" : "#efe19a";
      const label = labelSprite(`${key} ${(value * 100).toFixed(0)}%`, color, "rgba(56, 36, 10, 0.78)");
      label.position.set(-3.6 + index * 2.9, TOP_Y + 3.6, DEPTH / 2 + 0.6);
      label.scale.set(3.4, 1.15, 1);
      group.add(label);
    });
}

function addScanPlane(group: THREE.Group, updaters: Updater[]) {
  const scan = new THREE.Mesh(
    new THREE.BoxGeometry(WIDTH + 0.6, 0.08, DEPTH + 0.5),
    new THREE.MeshBasicMaterial({
      color: 0x5fd3ff,
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    })
  );
  group.add(scan);
  updaters.push((_delta, elapsed) => {
    const depth = (elapsed * 18) % 120;
    scan.position.y = TOP_Y - depth * SCALE;
  });
}

export default function SoilCrossSection({ profile }: SoilCrossSectionProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111715);
    scene.fog = new THREE.Fog(0x111715, 54, 92);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160);
    camera.position.set(32, 17, 35);
    camera.lookAt(0, -8, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 25;
    controls.maxDistance = 72;
    controls.target.set(0, -8, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.72);
    const key = new THREE.DirectionalLight(0xfff4dc, 2.1);
    key.position.set(18, 28, 18);
    key.castShadow = true;
    const fill = new THREE.HemisphereLight(0x9dd5ff, 0x45321f, 0.65);
    scene.add(ambient, key, fill);

    const group = new THREE.Group();
    const updaters: Updater[] = [];
    profile.layers.forEach((layer, index) => {
      addLayer(group, layer, index);
      addMoistureParticles(group, layer, updaters);
    });
    addRootSystem(group, profile);
    addPestBands(group, profile.pest_activity);
    addDeficiencyMarkers(group, profile);
    addScanPlane(group, updaters);
    scene.add(group);

    const resize = () => {
      const width = Math.max(320, mount.clientWidth);
      const height = Math.max(360, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const clock = new THREE.Clock();
    let frame = 0;
    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      controls.update();
      updaters.forEach((update) => update(delta, elapsed));
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      disposeObject(group);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [profile]);

  return <div className="soil-canvas" ref={mountRef} aria-label="3D soil cross-section visualization" />;
}
