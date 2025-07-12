/* Experience.tsx ---------------------------------------------------------- */
import { Suspense, useMemo } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

export default function World() {
  /* 1 — load assets ------------------------------------------------------- */
  // GLB: exported with the same UVs you baked to
  const { scene } = useGLTF("/models/world15new.glb");

  // Bake:  PNG with RGB + alpha
  const map = useTexture("/textures/bake15EditComp.png");
  map.flipY = false; // GLTF UVs are already “Y-up”
  map.colorSpace = THREE.SRGBColorSpace; // r152+ (use .encoding on r151-)
  map.needsUpdate = true;

  /* 2 — one material for the whole model ---------------------------------- */
  const bakedMat = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      map,
      transparent: true, // enables alpha
      alphaTest: 0.8, // discard fully “cut-out” pixels
      depthWrite: true, // keeps OIT issues away in small scenes
      side: THREE.FrontSide, // remove if you want back-face culling
      toneMapped: false, // keep baked lighting intact
    });

    return mat;
  }, [map]);

  /* 3 — apply the material once ------------------------------------------ */
  useMemo(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) (obj as THREE.Mesh).material = bakedMat;
    });
  }, [scene, bakedMat]);

  /* 4 — render ------------------------------------------------------------ */
  return (
    <>
      {/* Suspense ensures the scene appears only after assets are ready */}
      <Suspense fallback={null}>
        <primitive object={scene} scale={0.5} dispose={null} />
      </Suspense>
    </>
  );
}

/* ---- remember to tell drei about the GLB once so it’s cached ---- */
useGLTF.preload("/world12.glb");
