'use client';

import { useEffect, useRef } from 'react';

/**
 * Decorative three.js scene: a night road scrolling toward the viewer. A cyan scan beam sweeps the
 * road; potholes it passes over light up and get an orange map pin, like the app's detector.
 * - three.js is loaded lazily so it never blocks first paint.
 * - Renders a single still frame under prefers-reduced-motion.
 * - Pauses when off screen or when the tab is hidden.
 */
export function HeroRoad3D({ className = '' }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      let THREE: typeof import('three');
      try { THREE = await import('three'); } catch { return; }
      if (disposed) return;

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const INK = 0x0b1b33;

      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      } catch { return; } // no WebGL: the CSS background behind still shows
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setClearColor(INK, 1);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(INK, 18, 70);
      const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
      camera.position.set(0, 3.2, 8);
      camera.lookAt(0, 0.4, -12);

      /* --- road surface with a canvas texture (asphalt grain, edge lines, centre dashes) --- */
      const tex = (() => {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 512;
        const g = c.getContext('2d')!;
        g.fillStyle = '#1d2433'; g.fillRect(0, 0, 256, 512);
        for (let i = 0; i < 2600; i++) {
          const v = 30 + Math.random() * 40;
          g.fillStyle = `rgba(${v},${v + 4},${v + 14},0.55)`;
          g.fillRect(Math.random() * 256, Math.random() * 512, 1.5, 1.5);
        }
        g.fillStyle = '#e2e8f0'; g.fillRect(14, 0, 6, 512); g.fillRect(236, 0, 6, 512);
        g.fillStyle = '#f59e0b'; for (let y = 0; y < 512; y += 128) g.fillRect(125, y, 6, 64);
        const t = new THREE.CanvasTexture(c);
        t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1, 10);
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      })();
      const ROAD_W = 9;
      const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 160), new THREE.MeshBasicMaterial({ map: tex }));
      road.rotation.x = -Math.PI / 2; road.position.z = -60;
      scene.add(road);

      /* --- glowing ground grid either side --- */
      const grid = new THREE.GridHelper(200, 100, 0x22d3ee, 0x16324a);
      (grid.material as import('three').Material).transparent = true;
      (grid.material as import('three').Material).opacity = 0.35;
      grid.position.set(0, -0.02, -60);
      scene.add(grid);

      /* --- street lights, recycled along the road --- */
      const poleGeo = new THREE.BoxGeometry(0.12, 3.2, 0.12);
      const poleMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
      const lampGeo = new THREE.SphereGeometry(0.18, 12, 12);
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xfde68a });
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });
      const glowGeo = new THREE.SphereGeometry(0.7, 16, 16);
      const poles: import('three').Group[] = [];
      for (let i = 0; i < 14; i++) {
        const p = new THREE.Group();
        const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.y = 1.6; p.add(pole);
        const lamp = new THREE.Mesh(lampGeo, lampMat); lamp.position.set(i % 2 ? -0.5 : 0.5, 3.2, 0); p.add(lamp);
        const glow = new THREE.Mesh(glowGeo, glowMat); glow.position.copy(lamp.position); p.add(glow);
        p.position.set(i % 2 ? ROAD_W / 2 + 0.9 : -ROAD_W / 2 - 0.9, 0, -i * 9);
        scene.add(p); poles.push(p);
      }

      /* --- potholes: dark crater + ring + map pin --- */
      type Hole = { g: import('three').Group; ring: import('three').Mesh; pin: import('three').Group; detected: boolean; pop: number };
      const craterGeo = new THREE.CircleGeometry(1, 28);
      const craterMat = new THREE.MeshBasicMaterial({ color: 0x05070c });
      const ringGeo = new THREE.RingGeometry(1.12, 1.3, 40);
      const pinHeadGeo = new THREE.SphereGeometry(0.32, 20, 20);
      const pinTipGeo = new THREE.ConeGeometry(0.22, 0.55, 20);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
      const pinDotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const pinDotGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const holes: Hole[] = [];
      const placeHole = (h: Hole, z: number) => {
        h.g.position.set((Math.random() - 0.5) * (ROAD_W - 3), 0.01, z);
        const s = 0.45 + Math.random() * 0.45;
        h.g.scale.set(s * 1.5, 1, s);
        h.detected = false; h.pop = 0;
        (h.ring.material as import('three').MeshBasicMaterial).color.setHex(0x22d3ee);
        (h.ring.material as import('three').MeshBasicMaterial).opacity = 0.0;
        h.pin.scale.setScalar(0.001);
      };
      for (let i = 0; i < 7; i++) {
        const g = new THREE.Group();
        const crater = new THREE.Mesh(craterGeo, craterMat); crater.rotation.x = -Math.PI / 2; g.add(crater);
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
        const pin = new THREE.Group();
        const head = new THREE.Mesh(pinHeadGeo, pinMat); head.position.y = 1.35; pin.add(head);
        const tip = new THREE.Mesh(pinTipGeo, pinMat); tip.rotation.x = Math.PI; tip.position.y = 0.95; pin.add(tip);
        const dot = new THREE.Mesh(pinDotGeo, pinDotMat); dot.position.set(0, 1.38, 0.22); pin.add(dot);
        g.add(pin);
        scene.add(g);
        const h: Hole = { g, ring, pin, detected: false, pop: 0 };
        placeHole(h, -10 - i * 11);
        holes.push(h);
      }
      // Pins should not be squashed by the crater's elliptical scale.
      const fixPinScale = (h: Hole, k: number) => h.pin.scale.set(k / h.g.scale.x, k, k / h.g.scale.z);

      /* --- scan beam: additive cyan bar that sweeps away from the viewer --- */
      const beam = new THREE.Mesh(
        new THREE.PlaneGeometry(ROAD_W + 0.6, 0.6),
        new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      beam.rotation.x = -Math.PI / 2; beam.position.y = 0.03;
      scene.add(beam);
      const beamHalo = new THREE.Mesh(
        new THREE.PlaneGeometry(ROAD_W + 0.6, 3.5),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      beamHalo.rotation.x = -Math.PI / 2; beamHalo.position.y = 0.025;
      scene.add(beamHalo);

      /* --- sizing --- */
      const resize = () => {
        const w = host.clientWidth || 1; const h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
        camera.aspect = w / h;
        // On narrow screens pull back a little so the road still fills the frame.
        camera.position.z = w < 640 ? 10 : 8;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize); ro.observe(host);

      /* --- pointer parallax --- */
      let px = 0, py = 0;
      const onPointer = (e: PointerEvent) => {
        px = (e.clientX / window.innerWidth - 0.5) * 2;
        py = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      if (!reduce) window.addEventListener('pointermove', onPointer, { passive: true });

      /* --- loop --- */
      const SPEED = 9; // world units per second
      const BEAM_NEAR = 2, BEAM_FAR = -34, BEAM_PERIOD = 2.6;
      const clock = new THREE.Clock();
      let t = 0, raf = 0, running = false;

      const step = (dt: number) => {
        t += dt;
        tex.offset.y += (dt * SPEED) / 16; // 160 length / 10 repeats
        grid.position.z = -60 + ((t * SPEED) % 2);

        for (const p of poles) { p.position.z += dt * SPEED; if (p.position.z > 10) p.position.z -= 14 * 9; }

        const phase = (t % BEAM_PERIOD) / BEAM_PERIOD;
        const bz = BEAM_NEAR + (BEAM_FAR - BEAM_NEAR) * phase;
        beam.position.z = bz; beamHalo.position.z = bz + 1.2;
        const fade = Math.sin(phase * Math.PI);
        (beam.material as import('three').MeshBasicMaterial).opacity = 0.6 * fade;
        (beamHalo.material as import('three').MeshBasicMaterial).opacity = 0.14 * fade;

        let farthest = 0;
        for (const h of holes) farthest = Math.min(farthest, h.g.position.z);
        for (const h of holes) {
          h.g.position.z += dt * SPEED;
          const ringMat = h.ring.material as import('three').MeshBasicMaterial;
          if (!h.detected && Math.abs(h.g.position.z - bz) < 0.8 && h.g.position.z < -3) {
            h.detected = true; h.pop = 0; ringMat.color.setHex(0xef4444);
          }
          if (h.detected) {
            h.pop = Math.min(1, h.pop + dt * 3);
            const e = 1 - Math.pow(1 - h.pop, 3);
            const bob = 1 + Math.sin(t * 4 + h.g.position.x) * 0.04;
            fixPinScale(h, Math.max(0.001, e * 1.1 * bob));
            ringMat.opacity = 0.9;
            h.ring.scale.setScalar(1 + Math.sin(t * 6) * 0.06);
          } else {
            ringMat.opacity = 0.18;
          }
          if (h.g.position.z > 9) placeHole(h, farthest - 9 - Math.random() * 8);
        }

        camera.position.x += ((reduce ? 0 : px * 0.9) - camera.position.x) * 0.05;
        camera.position.y += ((3.2 - (reduce ? 0 : py * 0.4)) - camera.position.y) * 0.05;
        camera.lookAt(0, 0.4, -12);
      };

      const frame = () => {
        const dt = Math.min(clock.getDelta(), 0.05);
        step(dt);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };
      const start = () => { if (running || reduce) return; running = true; clock.getDelta(); raf = requestAnimationFrame(frame); };
      const stop = () => { running = false; cancelAnimationFrame(raf); };

      if (reduce) {
        // One meaningful still frame: beam mid-road, two potholes already flagged.
        step(1.3); holes.slice(0, 2).forEach((h) => { h.detected = true; h.pop = 1; fixPinScale(h, 1.1); });
        renderer.render(scene, camera);
      }

      let onScreen = true;
      const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen && !document.hidden) start(); else stop(); });
      io.observe(host);
      const onVis = () => { if (document.hidden) stop(); else if (onScreen) start(); };
      document.addEventListener('visibilitychange', onVis);
      start();

      cleanup = () => {
        stop(); io.disconnect(); ro.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('pointermove', onPointer);
        scene.traverse((o) => {
          const m = o as import('three').Mesh;
          if (m.geometry) m.geometry.dispose();
          const mat = m.material as import('three').Material | import('three').Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose();
        });
        tex.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => { disposed = true; cleanup(); };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden />;
}
