import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import styles from "./GlobeHero.module.css";

interface LabelPos {
  x: number;
  y: number;
  visible: boolean;  // true = facing camera
}

function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta),
  );
}

const GLOBE_R = 1;
const FLIGHT_MS = 6000;

// Ponto redondo com borda suave para a rota pontilhada
function dotTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.55, "rgba(255,255,255,0.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
  }
  return new THREE.CanvasTexture(c);
}

// Silhueta de avião apontando para cima; o sprite gira conforme a direção do voo
function planeTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  if (g) {
    g.translate(64, 64);
    g.shadowColor = "rgba(61,217,255,0.9)";
    g.shadowBlur = 14;
    g.fillStyle = "#ffffff";
    const p = new Path2D("M0 -46 C5 -46 7 -40 7 -32 L7 -10 L44 12 L44 20 L7 10 L7 30 L18 38 L18 44 L0 39 L-18 44 L-18 38 L-7 30 L-7 10 L-44 20 L-44 12 L-7 -10 L-7 -32 C-7 -40 -5 -46 0 -46 Z");
    g.fill(p);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface GlobePoint {
  lat: number;
  lng: number;
  name: string;
}

interface Props {
  from: GlobePoint;
  to: GlobePoint;
}

export default function GlobeHero({ from, to }: Props) {
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRotate  = useRef(true);

  const [cuiabaLabel, setCuiabaLabel] = useState<LabelPos>({ x: 0, y: 0, visible: false });
  const [rioLabel,    setRioLabel]    = useState<LabelPos>({ x: 0, y: 0, visible: false });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const isLight = () => document.documentElement.dataset.theme === "light";

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
    renderer.setClearColor(isLight() ? 0xf3f6fd : 0x060b1c);
    wrapper.appendChild(renderer.domElement);

    // ── Scene & Camera ──
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, wrapper.clientWidth / wrapper.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 3);

    // ── Stars ──
    const starPositions: number[] = [];
    for (let i = 0; i < 150; i++) {
      const r = 400;
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi   = Math.acos(2 * v - 1);
      starPositions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      );
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    const starMat  = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2 });
    const stars    = new THREE.Points(starGeo, starMat);
    stars.visible  = !isLight();
    scene.add(stars);

    // ── Globe Group — all rotating objects go here ──
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // ── Globe ──
    const loader  = new THREE.TextureLoader();
    const globeGeo = new THREE.SphereGeometry(GLOBE_R, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({ map: null as unknown as THREE.Texture });
    const globe    = new THREE.Mesh(globeGeo, globeMat);
    globeGroup.add(globe);

    let darkTex: THREE.Texture | null = null;
    let dayTex:  THREE.Texture | null = null;

    loader.load("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg", (tex) => {
      darkTex = tex;
      if (!isLight()) { globeMat.map = tex; globeMat.needsUpdate = true; }
    });
    loader.load("https://unpkg.com/three-globe/example/img/earth-day.jpg", (tex) => {
      dayTex = tex;
      if (isLight()) { globeMat.map = tex; globeMat.needsUpdate = true; }
    });

    // ── Atmosphere ──
    const atmoGeo = new THREE.SphereGeometry(GLOBE_R * 1.04, 64, 64);
    const atmoMat = new THREE.MeshPhongMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: isLight() ? 0.35 : 0.15,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmoGeo, atmoMat));

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    // ── City markers ──
    const markerGeo = new THREE.SphereGeometry(0.022, 16, 16);

    const cuiabaPos  = latLonToVec3(from.lat, from.lng, GLOBE_R + 0.01);
    const cuiabaMesh = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0x3dd9ff }));
    cuiabaMesh.position.copy(cuiabaPos);
    globeGroup.add(cuiabaMesh);

    const rioPos  = latLonToVec3(to.lat, to.lng, GLOBE_R + 0.01);
    const rioMesh = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    rioMesh.position.copy(rioPos);
    globeGroup.add(rioMesh);

    // ── Flight arc (in group — rotates with globe) ──
    const midPoint     = new THREE.Vector3().addVectors(cuiabaPos, rioPos).multiplyScalar(0.5);
    // Arco mais alto para rotas longas, mais rente ao globo para rotas curtas
    const arcHeight    = GLOBE_R * (1.05 + 0.5 * cuiabaPos.angleTo(rioPos));
    const controlPoint = midPoint.clone().normalize().multiplyScalar(arcHeight);

    // Começa com a rota de frente para a câmera: gira o globo pela longitude e inclina a câmera pela latitude
    const midLat = (from.lat + to.lat) / 2;
    const midLng = (from.lng + to.lng) / 2;
    globeGroup.rotation.y = (-(midLng + 90) * Math.PI) / 180;
    const tilt = (midLat * Math.PI) / 180;
    camera.position.set(0, 3 * Math.sin(tilt), 3 * Math.cos(tilt));
    camera.lookAt(0, 0, 0);
    const curve = new THREE.QuadraticBezierCurve3(cuiabaPos.clone(), controlPoint, rioPos.clone());

    // ── Rota pontilhada azul: pontos fixos cujo brilho acompanha o avião ──
    const DOTS = 90;
    const dotPositions = new Float32Array(DOTS * 3);
    const dotColors    = new Float32Array(DOTS * 3);
    for (let i = 0; i < DOTS; i++) {
      const p = curve.getPoint(i / (DOTS - 1));
      dotPositions.set([p.x, p.y, p.z], i * 3);
    }
    const arcGeo = new THREE.BufferGeometry();
    arcGeo.setAttribute("position", new THREE.BufferAttribute(dotPositions, 3));
    arcGeo.setAttribute("color", new THREE.BufferAttribute(dotColors, 3));
    const arcMat = new THREE.PointsMaterial({
      size: 0.022,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      map: dotTexture(),
      alphaTest: 0.05,
    });
    const arcLine = new THREE.Points(arcGeo, arcMat);
    globeGroup.add(arcLine);

    const SKY   = new THREE.Color(0x3dd9ff);
    const DIM   = new THREE.Color(0x1f7bff).multiplyScalar(0.55);
    const tmpColor = new THREE.Color();

    // ── Mini avião: sprite sempre de frente, girado na direção do voo ──
    const planeTex  = planeTexture();
    const planeMat  = new THREE.SpriteMaterial({ map: planeTex, transparent: true, depthWrite: false });
    const planeMesh = new THREE.Sprite(planeMat);
    planeMesh.scale.setScalar(0.12);
    globeGroup.add(planeMesh);

    // ── OrbitControls ──
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    // O globo ocupa a tela inteira: com zoom ligado, a rolagem do mouse em cima
    // dele aumentava/diminuía o globo em vez de descer a página.
    controls.enableZoom    = false;
    controls.enablePan     = false;
    controls.autoRotate    = false;
    // OrbitControls põe touch-action: none e prende o dedo. Com pan-y o arrasto
    // vertical rola a página e o horizontal continua girando o globo.
    renderer.domElement.style.touchAction = "pan-y";

    const onInteractStart = () => {
      autoRotate.current = false;
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
    const onInteractEnd = () => {
      resumeTimer.current = setTimeout(() => { autoRotate.current = true; }, 2000);
    };
    controls.addEventListener("start", onInteractStart);
    controls.addEventListener("end",   onInteractEnd);

    // ── Resize ──
    const onResize = () => {
      const w = wrapper.clientWidth, h = wrapper.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── Label projection helper (includes backface check) ──
    const isFacingCamera = (worldPos: THREE.Vector3): boolean => {
      const camDir   = worldPos.clone().sub(camera.position).normalize();
      const normal   = worldPos.clone().normalize();
      return normal.dot(camDir) <= 0; // <= 0 means facing camera
    };

    const projectToScreen = (pos: THREE.Vector3): LabelPos => {
      const v = pos.clone().project(camera);
      const w = wrapper.clientWidth, h = wrapper.clientHeight;
      return {
        x: (v.x *  0.5 + 0.5) * w,
        y: (v.y * -0.5 + 0.5) * h,
        visible: v.z < 1 && isFacingCamera(pos),
      };
    };

    // ── Theme observer — reacts to dark/light toggle without remounting ──
    const applyTheme = () => {
      const light = isLight();
      renderer.setClearColor(light ? 0xf3f6fd : 0x060b1c);
      stars.visible  = !light;
      atmoMat.opacity = light ? 0.35 : 0.15;
      atmoMat.needsUpdate = true;
      if (light && dayTex)  { globeMat.map = dayTex;  globeMat.needsUpdate = true; }
      if (!light && darkTex) { globeMat.map = darkTex; globeMat.needsUpdate = true; }
    };

    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // ── Animation loop ──
    let rafId = 0;
    const vec3 = new THREE.Vector3(); // reusable scratch vector

    function animate() {
      rafId = requestAnimationFrame(animate);

      // Rotate the whole group — globe + markers + arc + plane all move together
      if (autoRotate.current) globeGroup.rotation.y += 0.001;

      // Pulse markers
      const pulse = 1 + 0.35 * Math.sin(performance.now() * 0.004);
      cuiabaMesh.scale.setScalar(pulse);
      rioMesh.scale.setScalar(pulse);

      // Avião sempre da origem ao destino; pausa curta no destino antes de recomeçar
      const cycle = (performance.now() % FLIGHT_MS) / FLIGHT_MS;
      const t = Math.min(1, cycle / 0.85);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      planeMesh.position.copy(curve.getPoint(eased));

      // Rastro: pontos já percorridos acesos, os à frente apagados
      for (let i = 0; i < DOTS; i++) {
        const d = i / (DOTS - 1);
        const behind = eased - d;
        const k = behind >= 0 ? Math.max(0.35, 1 - behind * 1.2) : 0.25;
        tmpColor.copy(DIM).lerp(SKY, k);
        dotColors[i * 3] = tmpColor.r; dotColors[i * 3 + 1] = tmpColor.g; dotColors[i * 3 + 2] = tmpColor.b;
      }
      (arcGeo.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;

      // Direção na tela: projeta um ponto um pouco à frente e gira o sprite para ele
      const ahead = curve.getPoint(Math.min(1, eased + 0.01));
      const here  = planeMesh.position.clone();
      globeGroup.localToWorld(here).project(camera);
      globeGroup.localToWorld(ahead).project(camera);
      planeMat.rotation = Math.atan2(ahead.y - here.y, ahead.x - here.x) - Math.PI / 2;
      planeMat.opacity = t >= 1 ? Math.max(0, 1 - (cycle - 0.85) / 0.15) : Math.min(1, t * 8);

      // Backface culling — getWorldPosition converts local → world space
      cuiabaMesh.getWorldPosition(vec3);
      cuiabaMesh.visible = isFacingCamera(vec3);
      const cuiabaWorld = vec3.clone();

      rioMesh.getWorldPosition(vec3);
      rioMesh.visible = isFacingCamera(vec3);
      const rioWorld = vec3.clone();

      planeMesh.getWorldPosition(vec3);
      planeMesh.visible = isFacingCamera(vec3);

      controls.update();
      renderer.render(scene, camera);

      // Update labels using world positions for correct screen projection
      setCuiabaLabel(projectToScreen(cuiabaWorld));
      setRioLabel(projectToScreen(rioWorld));
    }

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      themeObserver.disconnect();
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      window.removeEventListener("resize", onResize);
      controls.removeEventListener("start", onInteractStart);
      controls.removeEventListener("end",   onInteractEnd);
      controls.dispose();
      renderer.dispose();
      globeGeo.dispose(); globeMat.dispose();
      atmoGeo.dispose();  atmoMat.dispose();
      starGeo.dispose();  starMat.dispose();
      arcGeo.dispose();   arcMat.dispose(); arcMat.map?.dispose();
      planeMat.dispose(); planeTex.dispose();
      if (wrapper.contains(renderer.domElement)) wrapper.removeChild(renderer.domElement);
    };
  }, [from.lat, from.lng, to.lat, to.lng]);

  return (
    <div
      ref={wrapperRef}
      className={styles.wrapper}
      aria-label={`Globo 3D mostrando a rota de ${from.name} até ${to.name}`}
      role="img"
    >
      {cuiabaLabel.visible && (
        <span
          className={styles.label}
          style={{ left: cuiabaLabel.x, top: cuiabaLabel.y - 20 }}
        >
          {from.name.toUpperCase()}
        </span>
      )}
      {rioLabel.visible && (
        <span
          className={styles.label}
          style={{ left: rioLabel.x, top: rioLabel.y - 20 }}
        >
          {to.name.toUpperCase()}
        </span>
      )}

    </div>
  );
}
