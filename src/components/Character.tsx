// Character.tsx ────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import {
  TextureLoader,
  Texture,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  SkinnedMesh,
  Material,
  AnimationAction,
  Color,
  SRGBColorSpace,
  Object3D,
} from "three";
import { useControls } from "leva";

const isMesh = (o: Object3D): o is Mesh => (o as Mesh).isMesh === true;

/* ---------------------------------------------------------------- types */
type ClipName =
  | "idle"
  | "clap"
  | "wave"
  | "talking1"
  | "talking2"
  | "talking3"
  | "twerk";

interface ClipInfo {
  action: AnimationAction | null;
  tex: Texture;
  speed: number;
}

interface Props {
  url?: string;
  openTexUrl?: string;
  closedTexUrl?: string;
  headName?: string;
  bodyBrightness?: number;
}

/* ---------------------------------------------------------------- component */
export default function Character({
  url = "/models/acNpc.glb",
  openTexUrl = "/textures/open.png",
  closedTexUrl = "/textures/closed.png",
  headName = "head",
  bodyBrightness = 1.15,
}: Props) {
  /* 1 ─ assets ------------------------------------------------------------ */
  const { scene, animations } = useGLTF(url);
  const [openTex, closedTex] = useLoader(TextureLoader, [
    openTexUrl,
    closedTexUrl,
  ]);
  [openTex, closedTex].forEach((t) => {
    t.colorSpace = SRGBColorSpace;
    t.flipY = false;
    t.needsUpdate = true;
  });

  /* 2 ─ materials --------------------------------------------------------- */
  useEffect(() => {
    scene.traverse((o) => {
      if (!isMesh(o)) return;

      const src = o.material as
        | MeshStandardMaterial
        | MeshPhysicalMaterial
        | MeshBasicMaterial
        | Material;

      const mat = new MeshBasicMaterial({
        map: (src as MeshStandardMaterial).map ?? null,
        color: "color" in src ? (src.color as Color) : new Color(0xffffff),
        transparent: src.transparent,
      }) as MeshBasicMaterial & { skinning?: boolean };

      if ((o as SkinnedMesh).isSkinnedMesh) mat.skinning = true;
      if (mat.map) {
        mat.map.colorSpace = SRGBColorSpace;
        mat.map.needsUpdate = true;
      }

      if (!o.name.toLowerCase().includes(headName.toLowerCase())) {
        mat.color.multiplyScalar(bodyBrightness);
      } else {
        mat.vertexColors = false;
      }
      o.material = mat;
    });
  }, [scene, headName, bodyBrightness]);

  /* 3 ─ find face mesh ---------------------------------------------------- */
  const headRef = useRef<Mesh | null>(null);
  useEffect(() => {
    scene.traverse((o) => {
      if (isMesh(o) && o.name.toLowerCase().includes(headName.toLowerCase())) {
        headRef.current = o;
      }
    });
  }, [scene, headName]);

  /* 4 ─ mixer & controls -------------------------------------------------- */
  const { actions, mixer } = useAnimations(animations, scene);
  const { current } = useControls({
    current: {
      value: "idle",
      options: [
        "idle",
        "clap",
        "wave",
        "talking1",
        "talking2",
        "talking3",
        "twerk",
      ],
    },
  }) as { current: ClipName };

  /* 5 ─ clip table -------------------------------------------------------- */
  const clips: Record<ClipName, ClipInfo> = useMemo(
    () => ({
      idle: { action: actions["idle"] ?? null, tex: openTex, speed: 0.7 },
      clap: { action: actions["clap"] ?? null, tex: closedTex, speed: 0.8 },
      wave: { action: actions["wave"] ?? null, tex: closedTex, speed: 0.8 },
      talking1: {
        action: actions["talking1"] ?? null,
        tex: openTex,
        speed: 0.6,
      },
      talking2: {
        action: actions["talking2"] ?? null,
        tex: closedTex,
        speed: 0.6,
      },
      talking3: {
        action: actions["talking3"] ?? null,
        tex: openTex,
        speed: 0.6,
      },
      twerk: { action: actions["twerk"] ?? null, tex: openTex, speed: 0.5 },
    }),
    [actions, openTex, closedTex]
  );

  /* 6 ─ face PNG setter --------------------------------------------------- */
  const setFaceTexture = (tex: Texture) => {
    const head = headRef.current;
    if (!head) return;
    const mats = Array.isArray(head.material)
      ? (head.material as MeshBasicMaterial[])
      : [head.material as MeshBasicMaterial];
    mats.forEach((m) => {
      if (m.map !== tex) {
        m.map = tex;
        tex.needsUpdate = true;
        m.needsUpdate = true;
      }
    });
  };

  /* 7 ─ cross‑fade logic -------------------------------------------------- */
  const prevActionRef = useRef<AnimationAction | null>(null);
  const FADE = 0.25;

  useEffect(() => {
    const { action: next, tex, speed } = clips[current];
    if (!next) return;

    // first time: play immediately
    if (!prevActionRef.current) {
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.timeScale = speed;
      next.play();
      setFaceTexture(tex);
      prevActionRef.current = next;
      return;
    }

    const prev = prevActionRef.current;
    if (prev === next) return; // same clip selected

    // prepare next clip
    next.reset();
    next.enabled = true;
    next.timeScale = speed;
    next.setEffectiveWeight(1);

    // smooth cross‑fade
    prev.crossFadeTo(next, FADE, false);
    next.play();
    setFaceTexture(tex);
    prevActionRef.current = next;
  }, [current, clips]);

  /* 8 ─ tick mixer -------------------------------------------------------- */
  useFrame((_, dt) => mixer.update(dt));

  return (
    <primitive
      object={scene}
      position={[-1.5, 0.1, -47]}
      rotation={[0, 0.75, 0]}
      scale={1.5}
      dispose={null}
    />
  );
}

useGLTF.preload("/models/acNpc.glb");
