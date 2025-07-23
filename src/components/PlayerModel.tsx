/* BobModel.tsx
   ───────────────────────────────────────────────────────────────────────── */
import {
  forwardRef,
  useRef,
  useImperativeHandle,
  useEffect,
  memo,
} from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

/* ─── public handle ────────────────────────────────────────────────── */
export interface PlayerHandle {
  setAnimation: (name: "Idle" | "Walk" | "Run") => void;
}

/* ─── props ────────────────────────────────────────────────────────── */
interface PlayerModelProps {
  url?: string;
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/* ─── helper: clone material → basic ───────────────────────────────── */
function toBasic(mat: THREE.Material): THREE.MeshBasicMaterial {
  const std = mat as THREE.MeshStandardMaterial;
  const basic = new THREE.MeshBasicMaterial({
    map: std.map ?? null,
    transparent: std.transparent,
    opacity: std.opacity,
    alphaTest: std.alphaTest,
    side: THREE.FrontSide,
    depthWrite: true,
    depthTest: true,
    toneMapped: false,
  });
  if (basic.map) basic.map.colorSpace = THREE.SRGBColorSpace;
  return basic;
}

/* ─── component ────────────────────────────────────────────────────── */
const PlayerModel = memo(
  forwardRef<PlayerHandle, PlayerModelProps>(function PlayerModel(
    {
      url = "/models/bobAll2.glb",
      scale = 1,
      castShadow = false,
      receiveShadow = false,
    },
    ref
  ) {
    const group = useRef<THREE.Group>(null!);
    const { scene, animations } = useGLTF(url);
    const { actions } = useAnimations(animations, group);

    /* clip name lookup ------------------------------------------------ */
    const lookup = (kw: string) =>
      animations.find((c) => new RegExp(kw, "i").test(c.name))?.name;

    const clip = {
      Idle: lookup("idle") ?? animations[0].name,
      Walk: lookup("walk") ?? animations[1].name,
      Run: lookup("run") ?? animations[2].name,
    };

    /* expose handle --------------------------------------------------- */
    useImperativeHandle(ref, () => ({
      setAnimation(name) {
        const target = clip[name];
        Object.values(actions).forEach((a) => a?.fadeOut(0.15));
        actions[target]?.reset().fadeIn(0.15).play();
      },
    }));

    /* start idle once ------------------------------------------------- */
    useEffect(() => {
      actions[clip.Idle]?.reset().play();
    }, [actions, clip.Idle]);

    /* material swap + shadows ---------------------------------------- */
    useEffect(() => {
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.castShadow = castShadow;
          mesh.receiveShadow = receiveShadow;

          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map(toBasic)
            : toBasic(mesh.material);
        }
      });
    }, [scene, castShadow, receiveShadow]);

    /* render ---------------------------------------------------------- */
    return (
      <group ref={group} dispose={null} scale={scale} position={[0, -1.4, 0]}>
        <primitive object={scene} />
      </group>
    );
  })
);

export default PlayerModel;
useGLTF.preload("/bobAll2.glb");
