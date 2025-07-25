/* Bugs.tsx  – “classic” version (unchanged visuals) */
import { useMemo, useRef, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useImageData } from "../../utils/useImageData";

export default function Bugs({
  area = 100,
  count = 10,
  maskUrl = "/masks/butterfly-mask.jpg",
  threshold = 0.5,
}: {
  count?: number;
  area?: number;
  maskUrl?: string;
  threshold?: number;
}) {
  const mask = useImageData(maskUrl);

  /* 2 ─ geometry (same as before) ----------------------------------------- */
  const geometry = useMemo(() => {
    const positions: number[] = [],
      sides: number[] = [];
    const addWing = (s: number) => {
      const r = [0, 0, 0],
        l = [0, 0.28, s * 0.45],
        m = [0, 0.1, s * 0.25],
        t = [0, -0.22, s * 0.4];
      positions.push(
        ...r,
        ...m,
        ...l,
        ...r,
        ...l,
        ...m,
        ...r,
        ...t,
        ...m,
        ...r,
        ...m,
        ...t
      );
      for (let i = 0; i < 12; i++) sides.push(s);
    };
    addWing(1);
    addWing(-1);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("side", new THREE.Float32BufferAttribute(sides, 1));
    return g;
  }, []);

  /* 3 ─ per-instance attributes ------------------------------------------- */
  const offsets = useMemo(() => new Float32Array(count * 3), [count]);
  const phases = useMemo(() => new Float32Array(count), [count]);

  const mesh = useRef<THREE.InstancedMesh>(null!);
  const uTime = useRef<{ value: number }>({ value: 0 });

  useLayoutEffect(() => {
    if (!mask) return;
    const { width, height, data } = mask;
    const lum = (x: number, z: number) => {
      const u = x / area + 0.5,
        v = z / area + 0.5;
      if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
      return (
        data[(~~(v * (height - 1)) * width + ~~(u * (width - 1))) * 4] / 255
      );
    };

    let placed = 0,
      tries = 0;
    const max = count * 20;
    while (placed < count && tries++ < max) {
      const x = (Math.random() - 0.5) * area,
        z = (Math.random() - 0.5) * area;
      if (lum(x, z) < threshold) continue;
      const i = placed * 3;
      offsets[i] = x;
      offsets[i + 1] = Math.random() * 2.5 + 1;
      offsets[i + 2] = z;
      phases[placed] = Math.random() * Math.PI * 2;
      placed++;
    }
    if (placed === 0) console.warn("Bugs: no placement found – mask too dark?");

    geometry.setAttribute(
      "offset",
      new THREE.InstancedBufferAttribute(offsets, 3)
    );
    geometry.setAttribute(
      "phase",
      new THREE.InstancedBufferAttribute(phases, 1)
    );
    geometry.attributes.offset.needsUpdate = true;
    geometry.attributes.phase.needsUpdate = true;

    (
      mesh.current.geometry.getAttribute(
        "offset"
      ) as THREE.InstancedBufferAttribute
    ).setUsage(THREE.StaticDrawUsage);

    (
      mesh.current.geometry.getAttribute(
        "phase"
      ) as THREE.InstancedBufferAttribute
    ).setUsage(THREE.StaticDrawUsage);

    // identity matrices – also never change
    mesh.current.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  }, [mask, geometry, offsets, phases, count, area, threshold]);

  /* 4 ─ shader material (unchanged) --------------------------------------- */
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: uTime.current },
        side: THREE.DoubleSide,
        vertexShader: /* glsl */ `
      uniform float uTime; attribute float side; attribute vec3 offset; attribute float phase;
      varying float vFade;
      vec2 rot(vec2 v,float a){float s=sin(a),c=cos(a);return vec2(c*v.x-s*v.y,s*v.x+c*v.y);}
      void main(){
        vec3 p=position; float t=uTime+phase;
        /* wing open/close */ p.xz=rot(p.xz, side*0.9*(0.5+0.5*sin(t*6.0)));
        /* bob & wander      */ vec3 c=offset;
        c.x+=sin(t*0.4)*1.8; c.y+=sin(t*0.7)*0.7; c.z+=cos(t*0.5)*1.8;
        /* face direction    */ float h=atan(-sin(t*0.5)*1.8,cos(t*0.4)*1.8);
        p.xz=rot(p.xz,h);
        vec4 world=vec4(p+c,1.0);
        gl_Position=projectionMatrix*modelViewMatrix*world;
        vFade=abs(position.z)*2.5;
      }`,
        fragmentShader: /* glsl */ `
      varying float vFade;
      void main(){ gl_FragColor=vec4(mix(vec3(0.10,0.20,0.75),vec3(0.55,0.80,1.00),clamp(vFade,0.,1.)),1.); }`,
      }),
    []
  );

  /* 5 ─ per-frame update --------------------------------------------------- */
  useFrame((_s, dt) => {
    uTime.current.value += dt;
  });

  /* 6 ─ render ------------------------------------------------------------- */
  return mask ? (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, count]}
      frustumCulled={false} /* keep visible even if offscreen initially */
    />
  ) : null;
}
