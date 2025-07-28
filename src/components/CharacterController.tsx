import { useEffect, useRef } from "react";
import { LoopRepeat, AnimationAction, Vector3, MathUtils } from "three";
import { useFrame } from "@react-three/fiber";
import CharacterModel, { CharacterModelHandle } from "./CharacterModel";

/* available clip names */
export type ClipName =
  | "idle"
  | "clap"
  | "wave"
  | "talking1"
  | "talking2"
  | "talking3"
  | "twerk";

interface Props {
  dialogClip?: ClipName;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  playerPosRef: React.RefObject<Vector3>;
}

/* tuning */
const FADE_TIME = 1;
const FACE_MAX_DIST = 12; // units within which NPC faces/waves

export default function CharacterController({
  dialogClip,
  position,
  rotation,
  scale,
  playerPosRef,
}: Props) {
  const modelRef = useRef<CharacterModelHandle>(null);
  const prevRef = useRef<AnimationAction | null>(null);
  const baseYaw = useRef<number>(0);

  /* helper: cross‑fade to a new clip if different */
  const playClip = (name: ClipName) => {
    const m = modelRef.current;
    if (!m) return;
    const info = m.clips[name];
    if (!info.action || prevRef.current === info.action) return;

    const next = info.action;
    next.reset();
    next.setLoop(LoopRepeat, Infinity);
    next.timeScale = info.speed;
    next.fadeIn(FADE_TIME).play();

    prevRef.current?.fadeOut(FADE_TIME);

    m.setFaceTexture(info.tex);
    prevRef.current = next;
  };

  /* first mount → idle */
  useEffect(() => {
    playClip("idle");
    baseYaw.current = modelRef.current?.object.rotation.y ?? 0;
  }, []);

  /* external dialog clip overrides everything */
  useEffect(() => {
    if (dialogClip) playClip(dialogClip);
  }, [dialogClip]);

  /* each frame: rotate & choose idle/wave when no dialog clip */
  useFrame((_, dt) => {
    const m = modelRef.current;
    const target = playerPosRef.current;
    if (!m || !target) return;

    m.mixer.update(dt);

    const obj = m.object;

    /* X‑Z distance + yaw */
    const dx = target.x - obj.position.x;
    const dz = target.z - obj.position.z;
    const dist = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);

    /* rotate only around Y */
    const desiredYaw = dist < FACE_MAX_DIST ? yaw : baseYaw.current;
    obj.rotation.y = MathUtils.lerp(obj.rotation.y, desiredYaw, 0.15);

    /* auto wave when no dialog clip active */
    if (!dialogClip) {
      playClip(dist < FACE_MAX_DIST ? "wave" : "idle");
    }
  });

  return (
    <CharacterModel
      ref={modelRef}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}
