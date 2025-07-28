import {
  useEffect,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  SkinnedMesh,
  Texture,
  Color,
  SRGBColorSpace,
  Object3D,
} from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { AnimationAction, AnimationMixer, TextureLoader } from "three";
import { ClipName } from "./CharacterController";

interface ClipInfo {
  action: AnimationAction | null;
  tex: Texture;
  speed: number;
}

export interface CharacterModelHandle {
  clips: Record<ClipName, ClipInfo>;
  mixer: AnimationMixer;
  setFaceTexture: (tex: Texture) => void;
}

interface Props {
  /* model / texture paths */
  url?: string;
  openTexUrl?: string;
  closedTexUrl?: string;
  headName?: string;
  bodyBrightness?: number;
  /* transform */
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

const isMesh = (o: Object3D): o is Mesh => (o as Mesh).isMesh === true;
useGLTF.preload("/models/acNpc.glb");

const CharacterModel = forwardRef<CharacterModelHandle, Props>(
  (
    {
      url = "/models/acNpc.glb",
      openTexUrl = "/textures/open.png",
      closedTexUrl = "/textures/closed.png",
      headName = "head",
      bodyBrightness = 1.15,
      position = [-1.5, 0.1, -47],
      rotation = [0, 0.75, 0],
      scale = 1.5,
    },
    ref
  ) => {
    /* load model & textures */
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

    /* replace materials */
    useEffect(() => {
      scene.traverse((o) => {
        if (!isMesh(o)) return;
        const src = o.material as
          | MeshStandardMaterial
          | MeshPhysicalMaterial
          | MeshBasicMaterial;
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
        if (!o.name.toLowerCase().includes(headName.toLowerCase()))
          mat.color.multiplyScalar(bodyBrightness);
        else mat.vertexColors = false;

        o.material = mat;
      });
    }, [scene, headName, bodyBrightness]);

    /* head mesh reference */
    const headRef = useRef<Mesh | null>(null);
    useEffect(() => {
      scene.traverse((o) => {
        if (isMesh(o) && o.name.toLowerCase().includes(headName.toLowerCase()))
          headRef.current = o;
      });
    }, [scene, headName]);

    /* animations */
    const { actions, mixer } = useAnimations(animations, scene);

    /* clip dictionary */
    const clips: Record<ClipName, ClipInfo> = useMemo(
      () => ({
        idle: { action: actions.idle ?? null, tex: openTex, speed: 0.5 },
        clap: { action: actions.clap ?? null, tex: closedTex, speed: 0.6 },
        wave: { action: actions.wave ?? null, tex: closedTex, speed: 0.5 },
        talking1: {
          action: actions.talking1 ?? null,
          tex: openTex,
          speed: 0.4,
        },
        talking2: {
          action: actions.talking2 ?? null,
          tex: closedTex,
          speed: 0.5,
        },
        talking3: {
          action: actions.talking3 ?? null,
          tex: openTex,
          speed: 0.6,
        },
        twerk: { action: actions.twerk ?? null, tex: openTex, speed: 0.5 },
      }),
      [actions, openTex, closedTex]
    );

    /* face‑swap helper */
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

    /* expose API to controller */
    useImperativeHandle(
      ref,
      () => ({
        clips,
        mixer,
        setFaceTexture,
      }),
      [clips, mixer]
    );

    /* advance mixer automatically */
    useFrame((_, dt) => mixer.update(dt));

    return (
      <primitive
        object={scene}
        position={position}
        rotation={rotation}
        scale={scale}
        dispose={null}
      />
    );
  }
);

export default CharacterModel;
