// Character.tsx -------------------------------------------------------------
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
} from "three";
import { useControls } from "leva";

/* ─── extend @types/three so `.skinning` is recognised ─── */
interface MeshBasicMaterialWithSkin extends MeshBasicMaterial {
  skinning: boolean;
}

/* ---------------------------------------------------------------- types */
type ClipName = "idle" | "clap";

interface ClipInfo {
  action: AnimationAction | null;
  tex: Texture;
}

interface Props {
  url?: string; // GLB file
  openTexUrl?: string; // PNG for open mouth
  closedTexUrl?: string; // PNG for closed mouth
  headName?: string; // substring of the face-mesh name
}

/* ---------------------------------------------------------------- component */
export default function Character({
  url = "/models/acNpc.glb",
  openTexUrl = "/textures/open.png",
  closedTexUrl = "/textures/closed.png",
  headName = "head",
}: Props) {
  /* 1 ─ load model & two textures */
  const { scene, animations } = useGLTF(url);
  const [openTex, closedTex] = useLoader(TextureLoader, [
    openTexUrl,
    closedTexUrl,
  ]);

  /* 2 ─ ensure we really loaded two different bitmaps (dev only) */
  useEffect(() => {
    console.log(
      "openTex:",
      openTex.image?.src,
      openTex.image?.width,
      "×",
      openTex.image?.height
    );
    console.log(
      "closedTex:",
      closedTex.image?.src,
      closedTex.image?.width,
      "×",
      closedTex.image?.height
    );
  }, [openTex, closedTex]);

  /* 3 ─ convert every material → unlit MeshBasicMaterial */
  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;

      const src = mesh.material as
        | MeshStandardMaterial
        | MeshPhysicalMaterial
        | MeshBasicMaterial
        | Material;

      const mat = new MeshBasicMaterial({
        map: (src as MeshStandardMaterial).map ?? null,
        color: "color" in src ? (src.color as Color) : new Color(0xffffff),
        transparent: "transparent" in src && !!src.transparent,
      }) as MeshBasicMaterialWithSkin;

      if ((mesh as SkinnedMesh).isSkinnedMesh) mat.skinning = true;
      if ("vertexColors" in src) mat.vertexColors = src.vertexColors;

      mesh.material = mat;
    });
  }, [scene]);

  /* 4 ─ locate the face mesh once */
  const headRef = useRef<Mesh | null>(null);
  useEffect(() => {
    scene.traverse((o) => {
      if (
        o.type === "Mesh" &&
        o.name.toLowerCase().includes(headName.toLowerCase())
      ) {
        headRef.current = o as Mesh;
      }
    });
  }, [scene, headName]);

  /* 5 ─ animation mixer & exact clip-to-texture mapping */
  const { actions, mixer } = useAnimations(animations, scene);

  const clips: Record<ClipName, ClipInfo> = useMemo(
    () => ({
      idle: { action: actions["idle"] ?? null, tex: openTex },
      clap: { action: actions["clap"] ?? null, tex: closedTex },
    }),
    [actions, openTex, closedTex]
  );

  /* 6 ─ Leva dropdown */
  const leva = useControls("Animation", {
    current: { value: "idle", options: ["idle", "clap"] },
  });
  const current = leva.current as ClipName;

  /* 7 ─ play selected clip & swap face texture */
  useEffect(() => {
    (Object.values(clips) as ClipInfo[]).forEach(({ action }) =>
      action?.stop()
    );

    const { action, tex } = clips[current];
    action?.reset().fadeIn(0.25).play();

    const head = headRef.current;
    if (head) {
      const mat = head.material as MeshBasicMaterial;
      if (mat.map !== tex) {
        mat.map = tex;
        tex.colorSpace = SRGBColorSpace; // unify gamma
        tex.needsUpdate = true; // <-- forces GPU upload
        mat.needsUpdate = true;
      }
    }
  }, [current, clips]);

  /* 8 ─ drive mixer every frame */
  useFrame((_, dt) => mixer.update(dt));

  return (
    <primitive
      object={scene}
      scale={1.5}
      dispose={null}
      position={[0, 0, -45]}
    />
  );
}

/* optional preload for faster first render */
useGLTF.preload("/models/acNpc.glb");
