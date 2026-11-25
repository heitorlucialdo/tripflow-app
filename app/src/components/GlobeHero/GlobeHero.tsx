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
    const cuiabaMesh = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0xffd700 }));
    cuiabaMesh.position.copy(cuiabaPos);
    globeGroup.add(cuiabaMesh);

    const rioPos  = latLonToVec3(to.lat, to.lng, GLOBE_R + 0.01);
    const rioMesh = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0xff4444 }));
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
    const curve        = new THREE.QuadraticBezierCurve3(cuiabaPos.clone(), controlPoint, rioPos.clone());
    const arcPoints    = curve.getPoints(100);

    const arcGeo  = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMat  = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.8, transparent: true });
    const arcLine = new THREE.Line(arcGeo, arcMat);
    globeGroup.add(arcLine);

    // ── Plane dot (in group) ──
    const planeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd700 }),
    );
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
      const pulse = 1 + 0.25 * Math.sin(Date.now() * 0.003);
      cuiabaMesh.scale.setScalar(pulse);
      rioMesh.scale.setScalar(pulse);

      // Animate plane along arc (arcPoints are in local group space)
      const t   = (Date.now() * 0.00005) % 1;
      const idx = Math.floor(t * 100);
      planeMesh.position.copy(arcPoints[idx]);

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
      arcGeo.dispose();   arcMat.dispose();
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
