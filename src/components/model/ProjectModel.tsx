"use client";

import { useEffect, useRef, useState } from "react";
import type * as THREE_NS from "three";
import type { SceneSpec } from "@/lib/model/sceneSpec";

/**
 * A live 3D model of the project, sized from the planner's own inputs.
 *
 * It replaces the flat footprint drawing: a slab, a bed, a deck or a fence,
 * drawn to the proportions the person typed, turning slowly so it reads as an
 * object rather than a diagram. When the inputs change the model rebuilds and
 * grows back into place, so typing "24" instead of "20" is something you see.
 *
 * Three.js is loaded on demand, after the page is interactive, so it costs the
 * first paint nothing. If WebGL is not available the `fallback` is shown
 * instead and nothing else changes. With reduced motion the model holds still.
 *
 * Thin layers are drawn thicker than true scale (a 4 in slab on a 20 ft
 * footprint would be a sheet of paper); the printed labels carry the real
 * figures.
 */
export function ProjectModel({
  spec,
  className = "",
  fallback = null,
  label,
}: {
  spec: SceneSpec;
  className?: string;
  fallback?: React.ReactNode;
  /** Accessible description; defaults to the labels. */
  label?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const specKey = JSON.stringify(spec);

  // Start the renderer once.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;

    // No WebGL at all (some locked-down or headless browsers): use the fallback
    // without loading three.js.
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2") && !probe.getContext("webgl")) {
      void Promise.resolve().then(() => setFailed("no-webgl"));
      return;
    }

    import("three")
      .then((THREE) => {
        if (cancelled || !host.isConnected) return;
        try {
          engineRef.current = createEngine(THREE, host);
          engineRef.current.show(JSON.parse(specKey) as SceneSpec);
        } catch (error) {
          setFailed(`render: ${String(error)}`);
        }
      })
      .catch((error) => setFailed(`load: ${String(error)}`));

    return () => {
      cancelled = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
    // The spec is applied by the effect below; this one only owns the engine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild the model when the dimensions change.
  useEffect(() => {
    engineRef.current?.show(JSON.parse(specKey) as SceneSpec);
  }, [specKey]);

  if (failed) {
    return (
      <div className="contents" data-model-fallback={failed}>
        {fallback}
        {/* For checking a deployment: add ?model-debug to see why 3D is off. */}
        {typeof window !== "undefined" && window.location.search.includes("model-debug") ? (
          <p className="text-xs text-ink-subtle">3D off: {failed}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`relative ${className}`}
      role="img"
      aria-label={label ?? `3D model of the project: ${spec.labels.join(", ")}`}
    >
      <div
        ref={hostRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{ touchAction: "pan-y" }}
      />
      <ul className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-1.5" aria-hidden>
        {spec.labels.map((text) => (
          <li
            key={text}
            className="rounded-full border border-brand/20 bg-surface/85 px-2 py-0.5 font-mono text-[0.625rem] tabular-nums text-brand-ink backdrop-blur-sm"
          >
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ engine */

interface Engine {
  show(spec: SceneSpec): void;
  dispose(): void;
}

type Three = typeof THREE_NS;

const BRAND = 0x0f5f52;
const BRAND_GLOW = 0x34b89a;

function createEngine(THREE: Three, host: HTMLElement): Engine {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfe3dc, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  sun.shadow.radius = 4;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x9fe8d5, 0.8);
  rim.position.set(-10, 6, -8);
  scene.add(rim);

  /* Stage: a drafting grid that fades out, and a soft glow under the model. */
  const stage = new THREE.Group();
  const grid = new THREE.GridHelper(22, 22, BRAND, BRAND);
  const gridMaterial = grid.material as THREE_NS.LineBasicMaterial;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.12;
  grid.position.y = -0.002;
  stage.add(grid);

  const shadowCatcher = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 26),
    new THREE.ShadowMaterial({ opacity: 0.18 }),
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.receiveShadow = true;
  stage.add(shadowCatcher);

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(5.6, 6.1, 96),
    new THREE.MeshBasicMaterial({ color: BRAND_GLOW, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.001;
  stage.add(glow);
  scene.add(stage);

  const pivot = new THREE.Group();
  scene.add(pivot);

  let model: THREE_NS.Group | null = null;
  let grownAt = 0;
  let yaw = -0.6;
  let dragging = false;
  let lastX = 0;
  let idleSince = performance.now();
  let visible = true;
  let frame = 0;

  /* Size */
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = host;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    frameCamera();
  };

  let reach = 7;
  const frameCamera = () => {
    const distance = reach * (camera.aspect < 1 ? 3.1 : 2.45);
    camera.position.set(distance * 0.72, distance * 0.62, distance * 0.72);
    camera.lookAt(0, 0.35, 0);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(host);

  const seen = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    if (visible && !frame) loop();
  });
  seen.observe(host);

  /* Drag to turn */
  const onDown = (event: PointerEvent) => {
    dragging = true;
    lastX = event.clientX;
    host.setPointerCapture?.(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    if (!dragging) return;
    yaw += (event.clientX - lastX) * 0.01;
    lastX = event.clientX;
    idleSince = performance.now();
    if (!frame) loop();
  };
  const onUp = () => {
    dragging = false;
    idleSince = performance.now();
  };
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointerleave", onUp);

  /* Loop */
  const loop = () => {
    frame = 0;
    if (!visible) return;
    const now = performance.now();

    if (!reduceMotion && !dragging && now - idleSince > 1200) yaw += 0.0025;
    pivot.rotation.y = yaw;

    let growing = false;
    if (model) {
      const t = reduceMotion ? 1 : Math.min((now - grownAt) / 650, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      model.scale.set(1, Math.max(eased, 0.001), 1);
      growing = t < 1;
    }

    renderer.render(scene, camera);

    // Keep animating while turning or growing; otherwise rest.
    if (!reduceMotion || growing || dragging) frame = requestAnimationFrame(loop);
  };

  resize();

  return {
    show(spec) {
      if (model) {
        pivot.remove(model);
        disposeTree(model);
      }
      const built = buildModel(THREE, spec);
      model = built.group;
      reach = built.reach;
      pivot.add(model);
      grownAt = performance.now();
      frameCamera();
      if (!frame) loop();
    },
    dispose() {
      cancelAnimationFrame(frame);
      frame = 0;
      observer.disconnect();
      seen.disconnect();
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointerleave", onUp);
      if (model) disposeTree(model);
      disposeTree(stage);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function disposeTree(root: THREE_NS.Object3D) {
  root.traverse((node) => {
    const mesh = node as THREE_NS.Mesh;
    mesh.geometry?.dispose?.();
    const material = mesh.material as THREE_NS.Material | THREE_NS.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else material?.dispose?.();
  });
}

/* ------------------------------------------------------------------ models */

const FOOTPRINT = 8; // the longer side, in scene units

function buildModel(THREE: Three, spec: SceneSpec): { group: THREE_NS.Group; reach: number } {
  const group = new THREE.Group();
  const scale = FOOTPRINT / Math.max(spec.length, spec.width, 1);
  const L = spec.length * scale;
  const W = spec.width * scale;

  const mat = (color: string | number | THREE_NS.Color, rough = 0.85, metal = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

  const box = (w: number, h: number, d: number, material: THREE_NS.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const outline = (mesh: THREE_NS.Mesh, opacity = 0.9) => {
    const lines = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color: BRAND_GLOW, transparent: true, opacity }),
    );
    lines.position.copy(mesh.position);
    lines.rotation.copy(mesh.rotation);
    group.add(lines);
  };

  // A thin layer, exaggerated enough to read.
  const layer = (inchesThick: number, min: number) => Math.max((inchesThick / 12) * scale, min);

  const color = new THREE.Color(spec.color);
  const darker = color.clone().multiplyScalar(0.72);

  switch (spec.kind) {
    case "slab": {
      const base = layer(4, 0.1);
      box(L + 0.25, base, W + 0.25, mat(0x8a8c84, 1));
      const slab = box(L, layer(spec.height, 0.26), W, mat(spec.color, 0.92), 0, base);
      outline(slab);
      // Control joints, every ~10 ft.
      const joints = Math.max(Math.round(spec.length / 10) - 1, 0);
      for (let i = 1; i <= joints; i++) {
        const x = -L / 2 + (L / (joints + 1)) * i;
        box(0.03, 0.005, W * 0.98, mat(0x6f716a), x, base + slab.scale.y * layer(spec.height, 0.26));
      }
      break;
    }

    case "gravel": {
      const depth = layer(spec.height, 0.22);
      const bed = box(L, depth, W, mat(spec.color, 1));
      outline(bed, 0.7);
      // Stones scattered over the top.
      const count = Math.min(Math.round(L * W * 9), 900);
      const stone = new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(0.07, 0),
        mat(0xb8bec4, 0.95),
        count,
      );
      const dummy = new THREE.Object3D();
      const tint = new THREE.Color();
      for (let i = 0; i < count; i++) {
        dummy.position.set((rand(i) - 0.5) * L * 0.97, depth + 0.02, (rand(i + 7) - 0.5) * W * 0.97);
        dummy.rotation.set(rand(i + 3) * 3, rand(i + 5) * 3, 0);
        const s = 0.6 + rand(i + 11) * 0.9;
        dummy.scale.set(s, s * 0.7, s);
        dummy.updateMatrix();
        stone.setMatrixAt(i, dummy.matrix);
        stone.setColorAt(i, tint.setHSL(0.58, 0.05, 0.45 + rand(i + 13) * 0.3));
      }
      stone.castShadow = true;
      group.add(stone);
      break;
    }

    case "bed": {
      const soil = 0.16;
      const depth = layer(spec.height, 0.2);
      if (spec.round) {
        const radius = L / 2;
        const edge = new THREE.Mesh(
          new THREE.CylinderGeometry(radius + 0.12, radius + 0.12, soil + depth + 0.06, 72),
          mat(0x7c7a72, 0.9),
        );
        edge.position.y = (soil + depth + 0.06) / 2;
        edge.castShadow = edge.receiveShadow = true;
        group.add(edge);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.08, 72), mat(spec.color, 1));
        top.position.y = soil + depth + 0.03;
        top.receiveShadow = true;
        group.add(top);
        outline(edge, 0.5);
      } else {
        const edging = mat(0x7c7a72, 0.9);
        const h = soil + depth + 0.08;
        box(L + 0.2, h, 0.1, edging, 0, 0, W / 2 + 0.05);
        box(L + 0.2, h, 0.1, edging, 0, 0, -W / 2 - 0.05);
        box(0.1, h, W, edging, L / 2 + 0.05);
        box(0.1, h, W, edging, -L / 2 - 0.05);
        box(L, soil, W, mat(0x4a3a2c, 1));
        const mulch = box(L, depth, W, mat(spec.color, 1), 0, soil);
        outline(mulch, 0.7);
      }
      // A few shrubs, so it reads as a garden bed.
      const shrubs = Math.min(Math.max(Math.round((spec.length * spec.width) / 120), 2), 9);
      const leaf = mat(0x3f7d3a, 0.8);
      for (let i = 0; i < shrubs; i++) {
        const r = 0.28 + rand(i + 21) * 0.25;
        const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaf);
        const spread = spec.round ? 0.55 : 0.8;
        s.position.set((rand(i + 31) - 0.5) * L * spread, soil + layer(spec.height, 0.2) + r * 0.8, (rand(i + 41) - 0.5) * W * spread);
        s.castShadow = true;
        group.add(s);
      }
      break;
    }

    case "lawn": {
      // Sod rolls, laid as strips with the seams just visible.
      const strip = Math.max((2 / Math.max(spec.length, spec.width)) * FOOTPRINT, W / 40);
      const strips = Math.max(Math.floor(W / strip), 1);
      const height = 0.12;
      box(L + 0.1, 0.06, W + 0.1, mat(0x4a3a2c, 1));
      for (let i = 0; i < strips; i++) {
        const z = -W / 2 + strip * (i + 0.5);
        const shade = color.clone().multiplyScalar(i % 2 ? 0.92 : 1.04);
        box(L, height, strip * 0.96, mat(shade, 0.95), 0, 0.06, z);
      }
      const frame = new THREE.Mesh(new THREE.BoxGeometry(L, height + 0.06, W));
      frame.position.y = (height + 0.06) / 2;
      outline(frame, 0.6);
      frame.geometry.dispose();
      break;
    }

    case "deck": {
      const H = Math.max(spec.height * scale, 0.35);
      const wood = mat(spec.color, 0.75);
      const frameWood = mat(darker, 0.85);
      // Posts
      const postsX = Math.max(Math.round(spec.length / 6), 1) + 1;
      const postsZ = Math.max(Math.round(spec.width / 6), 1) + 1;
      for (let i = 0; i < postsX; i++) {
        for (let j = 0; j < postsZ; j++) {
          if (i > 0 && i < postsX - 1 && j > 0 && j < postsZ - 1) continue;
          const x = -L / 2 + 0.12 + ((L - 0.24) / (postsX - 1)) * i;
          const z = -W / 2 + 0.12 + ((W - 0.24) / (postsZ - 1)) * j;
          box(0.16, H, 0.16, frameWood, x, 0, z);
        }
      }
      // Rim joist and boards
      const deckTop = box(L, 0.16, W, frameWood, 0, H - 0.16);
      outline(deckTop, 0.6);
      const boards = Math.min(Math.max(Math.round(spec.width / 0.5), 6), 48);
      const bw = W / boards;
      for (let i = 0; i < boards; i++) {
        box(L, 0.05, bw * 0.88, wood, 0, H, -W / 2 + bw * (i + 0.5));
      }
      // Railing on three sides
      const railH = Math.max(3 * scale, 0.4);
      const rail = mat(color.clone().multiplyScalar(0.9), 0.7);
      const top = H + 0.05;
      box(L, 0.06, 0.08, rail, 0, top + railH, -W / 2 + 0.04);
      box(0.08, 0.06, W, rail, -L / 2 + 0.04, top + railH);
      box(0.08, 0.06, W, rail, L / 2 - 0.04, top + railH);
      const balusters = Math.min(Math.round(L / 0.35), 60);
      for (let i = 0; i <= balusters; i++) {
        box(0.04, railH, 0.04, rail, -L / 2 + (L / balusters) * i, top, -W / 2 + 0.04);
      }
      const side = Math.min(Math.round(W / 0.35), 40);
      for (let i = 0; i <= side; i++) {
        const z = -W / 2 + (W / side) * i;
        box(0.04, railH, 0.04, rail, -L / 2 + 0.04, top, z);
        box(0.04, railH, 0.04, rail, L / 2 - 0.04, top, z);
      }
      // Stairs on the open side
      const steps = Math.max(Math.round(spec.height / 0.6), 1);
      const stepH = H / steps;
      for (let i = 0; i < steps; i++) {
        box(1.1, stepH, 0.32, wood, 0, i * stepH, W / 2 + 0.32 * (steps - i) - 0.16);
      }
      // Lawn patch beneath
      break;
    }

    case "fence": {
      const H = Math.max(spec.height * scale, 0.3);
      const post = mat(darker, 0.8);
      const panel = mat(spec.color, 0.85);
      const runs: [number, number, number, number][] = spec.enclosed
        ? [
            [-L / 2, -W / 2, L / 2, -W / 2],
            [L / 2, -W / 2, L / 2, W / 2],
            [L / 2, W / 2, -L / 2, W / 2],
            [-L / 2, W / 2, -L / 2, -W / 2],
          ]
        : [[-L / 2, 0, L / 2, 0]];
      const realPerUnit = 1 / scale;
      for (const [x1, z1, x2, z2] of runs) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        const len = Math.hypot(dx, dz);
        const sections = Math.min(Math.max(Math.round((len * realPerUnit) / 8), 1), 40);
        const angle = Math.atan2(dz, dx);
        for (let i = 0; i <= sections; i++) {
          const t = i / sections;
          box(0.09, H * 1.06, 0.09, post, x1 + dx * t, 0, z1 + dz * t);
        }
        const p = new THREE.Mesh(new THREE.BoxGeometry(len, H, 0.04), panel);
        p.position.set(x1 + dx / 2, H / 2, z1 + dz / 2);
        p.rotation.y = -angle;
        p.castShadow = p.receiveShadow = true;
        group.add(p);
        outline(p, 0.55);
      }
      // A yard to stand in
      if (spec.enclosed) {
        const yard = new THREE.Mesh(new THREE.PlaneGeometry(L, W), mat(0x87b46b, 1));
        yard.rotation.x = -Math.PI / 2;
        yard.position.y = 0.004;
        yard.receiveShadow = true;
        group.add(yard);
      }
      break;
    }

    case "room": {
      const H = Math.min(spec.height * scale, FOOTPRINT * 0.75);
      const wallsCovered = spec.surface === "walls";
      const wall = mat(wallsCovered ? spec.color : 0xefece4, 0.95);
      const floorColor = wallsCovered ? 0xc9b48f : spec.color;
      const t = 0.12;
      // Floor
      const floor = box(L, 0.08, W, mat(floorColor, 0.8));
      outline(floor, 0.5);
      if (!wallsCovered) {
        // Planks or tiles laid on the floor
        const tile = spec.color.toLowerCase() === "#5f9e98";
        const pieces = Math.min(Math.round(W / (tile ? 0.5 : 0.35)), 40);
        const pw = W / pieces;
        for (let i = 0; i < pieces; i++) {
          const shade = color.clone().multiplyScalar(i % 2 ? 0.9 : 1.05);
          box(L * 0.995, 0.02, pw * 0.94, mat(shade, 0.6), 0, 0.08, -W / 2 + pw * (i + 0.5));
        }
      }
      // Three walls, cut away towards the viewer
      box(L, H, t, wall, 0, 0, -W / 2 - t / 2);
      box(t, H, W, wall, -L / 2 - t / 2, 0);
      // Half wall on the right so the inside stays visible
      box(t, H * 0.5, W, wall, L / 2 + t / 2, 0);
      // A window and a door, as dark insets
      const glass = new THREE.MeshStandardMaterial({ color: 0x9fd3c7, roughness: 0.1, metalness: 0.2 });
      box(L * 0.28, H * 0.34, 0.02, glass, -L * 0.12, H * 0.4, -W / 2 + 0.01);
      box(0.02, H * 0.72, W * 0.18, mat(0x8a6a48, 0.7), -L / 2 + 0.01, 0, W * 0.2);
      break;
    }
  }

  return { group, reach: FOOTPRINT * 0.55 };
}

/** A stable pseudo-random number in [0, 1), so the model looks the same every time. */
function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
