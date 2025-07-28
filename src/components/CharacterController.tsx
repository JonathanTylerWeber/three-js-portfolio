import { useEffect, useRef } from "react";
import { LoopRepeat, AnimationAction } from "three";
import { useFrame } from "@react-three/fiber";
import CharacterModel, { CharacterModelHandle } from "./CharacterModel";

export type ClipName =
  | "idle"
  | "clap"
  | "wave"
  | "talking1"
  | "talking2"
  | "talking3"
  | "twerk";

interface Props {
  /** name of the clip to show (or undefined for idle) */
  dialogClip?: ClipName;
  /* optional transform overrides */
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

const FADE_TIME = 0.5;

export default function CharacterController({
  dialogClip,
  position,
  rotation,
  scale,
}: Props) {
  const modelRef = useRef<CharacterModelHandle>(null);
  const prevRef = useRef<AnimationAction | null>(null);

  /* play idle on mount */
  useEffect(() => {
    const m = modelRef.current;
    if (!m) return;
    const info = m.clips.idle;
    if (!info.action) return;

    info.action.reset();
    info.action.setLoop(LoopRepeat, Infinity);
    info.action.timeScale = info.speed;
    info.action.play();
    m.mixer.update(0);
    m.setFaceTexture(info.tex);
    prevRef.current = info.action;
  }, []);

  /* cross‑fade whenever dialogClip changes */
  useEffect(() => {
    const m = modelRef.current;
    if (!m) return;

    const name = dialogClip ?? "idle";
    const info = m.clips[name];
    if (!info.action) return;

    const next = info.action;
    const prev = prevRef.current;
    if (prev === next) return;

    next.reset();
    next.setLoop(LoopRepeat, Infinity);
    next.timeScale = info.speed;
    next.fadeIn(FADE_TIME);
    next.play();

    prev?.fadeOut(FADE_TIME);

    m.setFaceTexture(info.tex);
    prevRef.current = next;
  }, [dialogClip]);

  /* keep mixer advancing in case the parent disabled the global useFrame */
  useFrame((_, dt) => modelRef.current?.mixer.update(dt));

  return (
    <CharacterModel
      ref={modelRef}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}
