// src/components/Character.tsx
import { useEffect, useMemo, useRef, useCallback } from "react";
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
  LoopRepeat,
  Color,
  SRGBColorSpace,
  Object3D,
} from "three";

export type ClipName =
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
  dialogClip?: ClipName;
}

const isMesh = (o: Object3D): o is Mesh => (o as Mesh).isMesh === true;

useGLTF.preload("/models/acNpc.glb");

export default function Character({
  url = "/models/acNpc.glb",
  openTexUrl = "/textures/open.png",
  closedTexUrl = "/textures/closed.png",
  headName = "head",
  bodyBrightness = 1.15,
  dialogClip,
}: Props) {
  // Load model and textures
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

  // Replace materials with MeshBasicMaterial
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

  // Get head mesh to swap face textures
  const headRef = useRef<Mesh | null>(null);
  useEffect(() => {
    scene.traverse((o) => {
      if (isMesh(o) && o.name.toLowerCase().includes(headName.toLowerCase())) {
        headRef.current = o;
      }
    });
  }, [scene, headName]);

  // Set up mixer and actions
  const { actions, mixer } = useAnimations(animations, scene);

  // Build clip info
  const clips: Record<ClipName, ClipInfo> = useMemo(
    () => ({
      idle: { action: actions.idle ?? null, tex: openTex, speed: 0.7 },
      clap: { action: actions.clap ?? null, tex: closedTex, speed: 0.8 },
      wave: { action: actions.wave ?? null, tex: closedTex, speed: 0.8 },
      talking1: { action: actions.talking1 ?? null, tex: openTex, speed: 0.6 },
      talking2: {
        action: actions.talking2 ?? null,
        tex: closedTex,
        speed: 0.6,
      },
      talking3: { action: actions.talking3 ?? null, tex: openTex, speed: 0.6 },
      twerk: { action: actions.twerk ?? null, tex: openTex, speed: 0.5 },
    }),
    [actions, openTex, closedTex]
  );

  // Memoized face texture setter
  const setFaceTexture = useCallback((tex: Texture) => {
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
  }, []);

  // Track previous action
  const prevRef = useRef<AnimationAction | null>(null);
  const FADE_DURATION = 0.5;

  // On mount: play idle
  useEffect(() => {
    const info = clips.idle;
    const action = info.action;
    if (action) {
      action.reset();
      action.setLoop(LoopRepeat, Infinity);
      action.fadeIn(FADE_DURATION);
      action.timeScale = info.speed;
      action.play();
      setFaceTexture(info.tex);
      prevRef.current = action;
    }
  }, [clips.idle, setFaceTexture]);

  // On dialogClip change: cross-fade
  useEffect(() => {
    const name = dialogClip ?? "idle";
    const info = clips[name];
    const next = info.action;
    if (!next) return;
    const prev = prevRef.current;
    if (prev === next) return;

    next.reset();
    next.setLoop(LoopRepeat, Infinity);
    next.fadeIn(FADE_DURATION);
    next.timeScale = info.speed;
    next.play();

    if (prev) {
      prev.fadeOut(FADE_DURATION);
    }
    setFaceTexture(info.tex);
    prevRef.current = next;
  }, [dialogClip, clips, setFaceTexture]);

  // Advance mixer
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
