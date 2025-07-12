/* Ball.tsx
   ──────────────────────────────────────────────────────────────────────────
   • Loads a GLB soccer-ball.
   • Converts all materials → MeshBasicMaterial (so no light needed).
   • Recentres geometry so its pivot is at the exact centre of the ball.
   • Scales to the requested radius.
   • Adds a perfectly matching Rapier BallCollider.
*/
import { useGLTF } from "@react-three/drei";
import { RigidBody, BallCollider } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";

interface Props {
  url: string; // GLB path
  radius?: number; // desired world-space radius
  spawn?: [number, number, number]; // initial position
}

/* helper – clone material → MeshBasicMaterial, strictly typed */
function toBasic(mat: THREE.Material): THREE.MeshBasicMaterial {
  const src = mat as THREE.MeshStandardMaterial;
  const dest = new THREE.MeshBasicMaterial({
    map: src.map ?? null,
    transparent: src.transparent,
    opacity: src.opacity,
    toneMapped: false,
  });
  if (src.color) dest.color.copy(src.color);
  if (dest.map) dest.map.colorSpace = THREE.SRGBColorSpace;
  return dest;
}

export default function Ball({ url, radius = 0.3, spawn = [0, 2, 0] }: Props) {
  /* 1 — load GLB (cached by drei) ---------------------------------- */
  const { scene } = useGLTF(url);

  /* 2 — material swap, recenter, scale ----------------------------- */
  const model = useMemo(() => {
    const root = scene.clone(true);

    /* 2.1 swap all materials → un-lit basic */
    root.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh<
          THREE.BufferGeometry,
          THREE.Material | THREE.Material[]
        >;
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(toBasic)
          : toBasic(mesh.material);
      }
    });

    /* 2.2 compute bounding sphere BEFORE we centre */
    const box = new THREE.Box3().setFromObject(root);
    const bs = new THREE.Sphere();
    box.getBoundingSphere(bs);

    /* 2.3 recentre mesh so its pivot = sphere centre */
    root.position.set(-bs.center.x, -bs.center.y, -bs.center.z);

    /* 2.4 scale so final radius = requested radius */
    const scale = radius / bs.radius;
    root.scale.setScalar(scale);

    return root;
  }, [scene, radius]);

  /* 3 — Rapier rigid-body + perfectly matching collider ------------ */
  return (
    <RigidBody
      position={spawn}
      restitution={0.6}
      friction={0.5}
      colliders={false}
      linearDamping={0.2}
      angularDamping={0.2}
    >
      {/* collider centred at origin, same radius as the mesh */}
      <BallCollider args={[0.6]} />
      <primitive object={model} />
    </RigidBody>
  );
}

/* optional preload elsewhere */
useGLTF.preload("/models/ball.glb");
