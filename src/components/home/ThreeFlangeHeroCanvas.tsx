import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface CalloutAnchor {
  id: string;
  tag: string;
  label: string;
  sublabel: string;
  status: 'pass' | 'active' | 'warn';
  localPos: THREE.Vector3;
  badgeOffset: { x: number; y: number };
}

interface ProjectedCallout extends CalloutAnchor {
  screenX: number;
  screenY: number;
  targetX: number;
  targetY: number;
  visible: boolean;
}

interface ThreeFlangeHeroCanvasProps {
  darkMode?: boolean;
  onSelectTag?: (tag: string) => void;
  scrollProgress?: number; // 0 to 1 for scroll-driven rotation & orthographic tilt
}

export const ThreeFlangeHeroCanvas: React.FC<ThreeFlangeHeroCanvasProps> = ({
  darkMode = false,
  onSelectTag,
  scrollProgress = 0
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [projectedCallouts, setProjectedCallouts] = useState<ProjectedCallout[]>([]);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // 5 Metrology Anchors defined in Flange local coordinate space
  const anchorsRef = useRef<CalloutAnchor[]>([
    {
      id: 'tag-01',
      tag: '#01',
      label: 'Ø30.00 H7 (+0.021 / -0.000)',
      sublabel: 'Air Plug Gauge · MMC 30.000',
      status: 'pass',
      localPos: new THREE.Vector3(0, 0.42, 0),
      badgeOffset: { x: 130, y: -70 }
    },
    {
      id: 'tag-02',
      tag: '#02',
      label: '|⌖|Ø0.05(M)|A|B(M)|',
      sublabel: 'Effective USL: 0.070 mm',
      status: 'active',
      localPos: new THREE.Vector3(0.85, 0.22, 0),
      badgeOffset: { x: 140, y: -20 }
    },
    {
      id: 'tag-03',
      tag: '#03',
      label: '4X Ø8.50 THRU',
      sublabel: 'Cavities #03.1–#03.4',
      status: 'pass',
      localPos: new THREE.Vector3(1.202, 0.18, 1.202), // 1.7 * cos(45°), sin(45°)
      badgeOffset: { x: 120, y: 60 }
    },
    {
      id: 'tag-04',
      tag: '#04',
      label: 'M10×1.5 - 6H',
      sublabel: 'Pitch Ø9.026 mm · Thread Plug',
      status: 'warn',
      localPos: new THREE.Vector3(-1.15, -0.05, 1.15),
      badgeOffset: { x: -180, y: 50 }
    },
    {
      id: 'tag-05',
      tag: '#05',
      label: 'Ra 1.6 µm',
      sublabel: 'LSL: 0.000 / USL: 1.600 · Stylus',
      status: 'pass',
      localPos: new THREE.Vector3(2.2, 0, 0),
      badgeOffset: { x: 130, y: 30 }
    }
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 2.8, 5.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 2. Lighting System
    const ambientLight = new THREE.AmbientLight(darkMode ? 0x27272a : 0xf4f4f5, 1.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(darkMode ? 0x38bdf8 : 0x0284c7, 0.8);
    fillLight.position.set(-5, -2, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    rimLight.position.set(0, -6, 2);
    scene.add(rimLight);

    // 3. Flange Procedural Assembly
    const flangeGroup = new THREE.Group();
    scene.add(flangeGroup);

    // Materials
    const metalMat = new THREE.MeshStandardMaterial({
      color: darkMode ? 0x1f1f23 : 0xdddddf,
      metalness: 0.82,
      roughness: 0.32,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });

    const wireMat = new THREE.LineBasicMaterial({
      color: darkMode ? 0x38bdf8 : 0x09090b,
      transparent: true,
      opacity: darkMode ? 0.65 : 0.45,
      linewidth: 1
    });

    const addMeshWithWireframe = (geom: THREE.BufferGeometry, mat: THREE.Material) => {
      const mesh = new THREE.Mesh(geom, mat);
      const edges = new THREE.EdgesGeometry(geom, 22);
      const wireframe = new THREE.LineSegments(edges, wireMat);
      mesh.add(wireframe);
      flangeGroup.add(mesh);
      return mesh;
    };

    // A. Main Outer Flange Disk (Radius: 2.2, Height: 0.35)
    const baseCylinder = new THREE.CylinderGeometry(2.2, 2.2, 0.35, 64);
    addMeshWithWireframe(baseCylinder, metalMat);

    // B. Raised Boss Hub (Radius: 1.25, Height: 0.5, sits on top of base)
    const bossCylinder = new THREE.CylinderGeometry(1.25, 1.25, 0.5, 64);
    bossCylinder.translate(0, 0.35 / 2 + 0.5 / 2, 0);
    addMeshWithWireframe(bossCylinder, metalMat);

    // C. Center Bore Hollow Inset Ring
    const innerBoreCylinder = new THREE.CylinderGeometry(0.85, 0.85, 0.88, 48, 1, true);
    const boreMat = new THREE.MeshStandardMaterial({
      color: darkMode ? 0x121215 : 0xbabbbe,
      metalness: 0.9,
      roughness: 0.2,
      side: THREE.BackSide
    });
    const boreMesh = new THREE.Mesh(innerBoreCylinder, boreMat);
    const boreEdges = new THREE.EdgesGeometry(innerBoreCylinder, 25);
    const boreWire = new THREE.LineSegments(boreEdges, wireMat);
    boreMesh.add(boreWire);
    flangeGroup.add(boreMesh);

    // D. 4X Bolt Hole Recesses (Countersunk at 45°, 135°, 225°, 315° on R=1.7)
    const holeRadius = 0.22;
    const boltCircleRadius = 1.7;
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + Math.PI / 4;
      const x = Math.cos(angle) * boltCircleRadius;
      const z = Math.sin(angle) * boltCircleRadius;

      const holeGeom = new THREE.CylinderGeometry(holeRadius, holeRadius, 0.38, 24);
      holeGeom.translate(x, 0, z);
      const holeMesh = new THREE.Mesh(
        holeGeom,
        new THREE.MeshBasicMaterial({
          color: darkMode ? 0x09090b : 0xffffff,
          wireframe: true
        })
      );
      flangeGroup.add(holeMesh);
    }

    // E. Precision Optical Coordinate Indicator (Gimbal ring around base)
    const gimbalRingGeom = new THREE.RingGeometry(2.35, 2.37, 64);
    const gimbalMat = new THREE.MeshBasicMaterial({
      color: darkMode ? 0x38bdf8 : 0x0284c7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    const gimbalMesh = new THREE.Mesh(gimbalRingGeom, gimbalMat);
    gimbalMesh.rotation.x = Math.PI / 2;
    flangeGroup.add(gimbalMesh);

    // Initial orientation: subtle isometric tilt
    flangeGroup.rotation.x = 0.45;
    flangeGroup.rotation.y = -0.55;

    // 4. Mouse tracking for subtle tilt
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseRef.current.targetX = x * 0.4;
      mouseRef.current.targetY = y * 0.3;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 5. Resize handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // 6. Animation Frame Loop & 2D Projection
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const delta = clock.getDelta();

      // Mouse Lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Base gentle idle rotation + cursor parallax
      flangeGroup.rotation.y += 0.12 * delta;
      flangeGroup.rotation.x = 0.45 + mouseRef.current.y;
      flangeGroup.position.x = mouseRef.current.x * 0.4;

      // Ensure matrices are up to date
      flangeGroup.updateMatrixWorld(true);

      // Project 5 3D points to 2D Screen Space
      const projected: ProjectedCallout[] = anchorsRef.current.map((anchor) => {
        // Clone local point and transform by flange's world matrix
        const worldPos = anchor.localPos.clone().applyMatrix4(flangeGroup.matrixWorld);

        // Project to NDC space (-1 to 1)
        const ndc = worldPos.clone().project(camera);

        // Map NDC to container pixel coordinates
        const screenX = (ndc.x * 0.5 + 0.5) * width;
        const screenY = (-ndc.y * 0.5 + 0.5) * height;

        // Target badge position with offset
        const targetX = screenX + anchor.badgeOffset.x;
        const targetY = screenY + anchor.badgeOffset.y;

        // Visible only if in front of camera
        const visible = ndc.z < 1.0 && screenX >= 0 && screenX <= width && screenY >= 0 && screenY <= height;

        return {
          ...anchor,
          screenX,
          screenY,
          targetX,
          targetY,
          visible
        };
      });

      setProjectedCallouts(projected);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      baseCylinder.dispose();
      bossCylinder.dispose();
      innerBoreCylinder.dispose();
      metalMat.dispose();
      wireMat.dispose();
    };
  }, [darkMode]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* Three.js Canvas Container (Pointer events none so buttons below are clickable) */}
      <div ref={mountRef} className="absolute inset-0 pointer-events-none" />

      {/* SVG Leader Lines & 2D Projected Badges Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
        <defs>
          <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0284C7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
          </radialGradient>
        </defs>

        {projectedCallouts.map((p) => {
          if (!p.visible) return null;
          const strokeColor =
            p.status === 'pass' ? '#059669' : p.status === 'active' ? '#0284C7' : '#D97706';

          return (
            <g key={p.id} className="transition-opacity duration-150">
              {/* Vertex Anchor Node Dot */}
              <circle
                cx={p.screenX}
                cy={p.screenY}
                r="3"
                fill={strokeColor}
                stroke="#FFFFFF"
                strokeWidth="1.2"
              />
              <circle
                cx={p.screenX}
                cy={p.screenY}
                r="6"
                stroke={strokeColor}
                strokeWidth="1"
                strokeOpacity="0.4"
                className="animate-ping"
                style={{ transformOrigin: `${p.screenX}px ${p.screenY}px` }}
              />

              {/* Dog-Leg Leader Line (Dog-leg elbow bend) */}
              <polyline
                points={`
                  ${p.screenX},${p.screenY} 
                  ${p.screenX + (p.targetX > p.screenX ? 24 : -24)},${p.targetY + 12} 
                  ${p.targetX},${p.targetY + 12}
                `}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.2"
                strokeDasharray="3 2"
                opacity="0.85"
              />
            </g>
          );
        })}
      </svg>

      {/* 2D HTML Floating Badges */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {projectedCallouts.map((p) => {
          if (!p.visible) return null;
          const isLeft = p.targetX < p.screenX;

          const badgeBorder =
            p.status === 'pass'
              ? 'border-emerald-500/40'
              : p.status === 'active'
              ? 'border-sky-500/50 ring-1 ring-sky-500/30'
              : 'border-amber-500/40';

          const tagBadgeBg =
            p.status === 'pass'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : p.status === 'active'
              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400';

          return (
            <div
              key={p.id}
              onClick={() => onSelectTag && onSelectTag(p.tag)}
              style={{
                left: `${p.targetX}px`,
                top: `${p.targetY}px`,
                transform: isLeft ? 'translate(-100%, 0)' : 'translate(0, 0)'
              }}
              className={`absolute pointer-events-auto cursor-pointer p-2 rounded-md border ${badgeBorder} bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md shadow-apple-sm transition-all hover:scale-105 group select-none`}
            >
              <div className="flex items-center gap-1.5 font-mono text-[11px] leading-tight mb-0.5">
                <span className={`px-1 py-0.2 rounded font-bold text-[10px] ${tagBadgeBg}`}>
                  {p.tag}
                </span>
                <span className="font-semibold text-text-primary tracking-tight">{p.label}</span>
              </div>
              <div className="text-[10px] font-mono text-text-muted pl-6">{p.sublabel}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
