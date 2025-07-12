/* GrassTiled.tsx ──────────────────────────────────────────────────────────
   • Instanced grass split into N×N tiles.  Off‑screen tiles are not drawn.
   • Leva panel (⎇ G) lets you tweak:
       – Field size     – Mask size
       – Offset X / Z   – Tiles per side (LOD density)
   • This version is single‑sided (FrontSide) and constrains each blade’s
     Y‑rotation to ±90°.That way the camera never sees a back‑face.
*/

import { useState, useEffect, useMemo, useRef, type JSX } from "react";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import * as THREE from "three";

interface Props {
  bladeCount?: number;
  fieldSize?: number;
  maskSize?: number;
  tilesPerSide?: number;
  maskUrl?: string;
  threshold?: number;
}

export default function GrassTiled({
  bladeCount = 120_000,
  fieldSize = 132.88,
  maskSize = 150,
  tilesPerSide = 4,
  maskUrl = "/masks/grass-mask3",
  threshold = 0.5,
}: Props) {
  /* ------------------------------------------------------------------ */
  /* 0 — Leva controls                                                  */
  /* ------------------------------------------------------------------ */
  const { uiFieldSize, uiMaskSize, uiOffsetX, uiOffsetZ, uiTiles } =
    useControls("Grass Layout", {
      uiFieldSize: {
        label: "Field",
        value: fieldSize,
        min: 10,
        max: 500,
        step: 1,
      },
      uiMaskSize: {
        label: "Mask",
        value: maskSize,
        min: 10,
        max: 500,
        step: 1,
      },
      uiOffsetX: { label: "Off X", value: 0.6, min: -250, max: 250, step: 0.1 },
      uiOffsetZ: { label: "Off Z", value: 4.2, min: -250, max: 250, step: 0.1 },
      uiTiles: {
        label: "Tiles / side",
        value: tilesPerSide,
        min: 1,
        max: 10,
        step: 1,
      },
    });

  /* ------------------------------------------------------------------ */
  /* 1 — load mask into ImageData                                       */
  /* ------------------------------------------------------------------ */
  const [mask, setMask] = useState<ImageData | null>(null);

  useEffect(() => {
    new THREE.TextureLoader().load(maskUrl, (tex) => {
      const img = tex.image as HTMLImageElement;
      const cv = document.createElement("canvas");
      cv.width = img.width;
      cv.height = img.height;
      const ctx = cv.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      setMask(ctx.getImageData(0, 0, img.width, img.height));
    });
  }, [maskUrl]);

  /* ------------------------------------------------------------------ */
  /* 2 — shared geometry, material, wind uniform                        */
  /* ------------------------------------------------------------------ */
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.12, 1, 1, 6);
    g.translate(0, 0.5, 0);
    return g;
  }, []);

  const uTime = useRef({ value: 0 });

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: uTime.current },
        side: THREE.FrontSide, // single‑sided
        vertexShader: /* glsl */ `
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec3 p = position;
            p.z += 0.2 * vUv.y * vUv.y;           // bend
            p.x *= 1.0 - vUv.y;                   // taper toward tip
            p.x += sin((instanceMatrix[3].x + instanceMatrix[3].z) * 2.0
                       + uTime) * 0.18 * vUv.y;   // sway
            gl_Position = projectionMatrix * modelViewMatrix
                        * instanceMatrix * vec4(p,1.);
          }`,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vec3 col = mix(vec3(0.12,0.55,0.10),
                            vec3(0.25,0.90,0.25), vUv.y);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    []
  );

  /* ------------------------------------------------------------------ */
  /* 3 — build / rebuild tiles whenever mask or Leva values change      */
  /* ------------------------------------------------------------------ */
  const tiles = useMemo(() => {
    if (!mask) return null;

    const items: JSX.Element[] = [];
    const side = uiFieldSize / uiTiles;
    const bladesTile = Math.floor(bladeCount / (uiTiles * uiTiles));

    /* helper lives inside useMemo so eslint deps are satisfied */
    const makeTile = (cx: number, cz: number) => {
      const mesh = new THREE.InstancedMesh(geo, mat, bladesTile);
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      mesh.position.set(cx, 0, cz);

      const { width, height, data } = mask;
      const sample = (x: number, z: number) => {
        const u = (x - uiOffsetX) / uiMaskSize + 0.5;
        const v = (z - uiOffsetZ) / uiMaskSize + 0.5;
        if (u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0) return 0.0;
        return (
          data[(~~(v * (height - 1)) * width + ~~(u * (width - 1))) * 4] / 255
        );
      };

      const dummy = new THREE.Object3D();
      let placed = 0,
        attempt = 0;
      const maxAttempts = bladesTile * 10;

      while (placed < bladesTile && attempt++ < maxAttempts) {
        const x = (Math.random() - 0.5) * side + cx;
        const z = (Math.random() - 0.5) * side + cz;
        if (sample(x, z) < threshold) continue;

        dummy.position.set(x - cx, 0, z - cz);

        // Constrain rotation so the front face (+Z normal) is always visible
        dummy.rotation.y = (Math.random() - 0.5) * Math.PI; // ±90°

        const s = 0.5 + Math.random() * 0.5;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        mesh.setMatrixAt(placed++, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      return mesh;
    };

    for (let ix = 0; ix < uiTiles; ix++) {
      for (let iz = 0; iz < uiTiles; iz++) {
        const cx = (ix + 0.5) * side - uiFieldSize / 2;
        const cz = (iz + 0.5) * side - uiFieldSize / 2;
        items.push(<primitive key={`${ix}-${iz}`} object={makeTile(cx, cz)} />);
      }
    }
    return items;
  }, [
    mask,
    geo,
    mat,
    bladeCount,
    uiFieldSize,
    uiMaskSize,
    uiOffsetX,
    uiOffsetZ,
    uiTiles,
    threshold,
  ]);

  /* ------------------------------------------------------------------ */
  /* 4 — animate wind sway                                              */
  /* ------------------------------------------------------------------ */
  const SPEED = 2;
  useFrame((_s, dt) => {
    uTime.current.value += dt * SPEED;
  });

  return <>{tiles}</>;
}
