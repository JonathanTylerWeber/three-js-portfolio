import { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  RigidBody,
  CapsuleCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import { PlayerHandle } from "./PlayerModel";
import {
  grassRun,
  grassWalk,
  stoneRun,
  stoneWalk,
} from "../utils/audioManager";
import PlayerModel from "./PlayerModel";
import { useImageData } from "../utils/useImageData";

interface Props {
  intro?: boolean;
  disableInput?: boolean;
  onIntroComplete?: () => void;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
}

/* ────────── constants ────────── */
const WALK_SPEED = 4;
const RUN_SPEED = 8;
const INPUT_RADIUS = 180;

const CLOSE_CAM = new THREE.Vector3(0, 6, 10);
const NORMAL_CAM = new THREE.Vector3(0, 12, 17);

export default function PlayerController({
  intro = false,
  disableInput = false,
  onIntroComplete,
  playerPosRef,
}: Props) {
  /* refs & state */
  const bodyRef = useRef<RapierRigidBody | null>(null);
  const meshGroup = useRef<THREE.Group>(null!);
  const playerHandle = useRef<PlayerHandle>(null);
  const camOffset = useRef(new THREE.Vector3().copy(CLOSE_CAM));

  const isDown = useRef(false);
  const screenVec = useRef(new THREE.Vector2());
  const moveState = useRef<"Idle" | "Walk" | "Run">("Idle");

  const { camera, size, gl } = useThree();
  const stoneMask = useImageData("/masks/stone-mask2.jpg");

  /* mask sampling */
  const MASK_SIZE = 150,
    OFFSET_X = 0.6,
    OFFSET_Z = 4.2;
  function sampleStone(x: number, z: number): number {
    if (!stoneMask) return 0;
    const { width, height, data } = stoneMask;
    const u = (x - OFFSET_X) / MASK_SIZE + 0.5;
    const v = (z - OFFSET_Z) / MASK_SIZE + 0.5;
    if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
    const ix = Math.floor(u * (width - 1));
    const iz = Math.floor(v * (height - 1));
    return data[(iz * width + ix) * 4] / 255;
  }

  /* intro choreography */
  const INTRO_ANGLE = Math.PI / -1.4;
  const [stage, setStage] = useState<"idle" | "move" | "rotate" | "done">(
    "idle"
  );
  const hasStartedIntro = useRef(false);
  const startZ = useRef(0);
  const startQ = useRef(new THREE.Quaternion());

  /* initial spawn */
  useEffect(() => {
    const spawn = { x: 0, y: 0, z: -45 };
    bodyRef.current?.setTranslation(spawn, true);
    camOffset.current.copy(CLOSE_CAM);
    camera.position.copy(camOffset.current).add(spawn);
    camera.lookAt(spawn.x, spawn.y, spawn.z);
  }, [camera]);

  /* kick off intro */
  useEffect(() => {
    if (intro && !hasStartedIntro.current && bodyRef.current) {
      hasStartedIntro.current = true;
      const p = bodyRef.current.translation();
      startZ.current = p.z;
      startQ.current.copy(meshGroup.current.quaternion);
      playerHandle.current?.setAnimation("Walk");
      setStage("move");
    }
  }, [intro]);

  /* pointer handlers */
  useEffect(() => {
    const canvas = gl.domElement;
    const onDown = (e: PointerEvent) => {
      if (stage !== "done" || disableInput) return;
      isDown.current = true;
      screenVec.current.set(
        e.clientX - size.width * 0.5,
        e.clientY - size.height * 0.5
      );
    };
    const onUp = () => (isDown.current = false);
    const onMove = (e: PointerEvent) => {
      if (stage !== "done" || disableInput || !isDown.current) return;
      screenVec.current.set(
        e.clientX - size.width * 0.5,
        e.clientY - size.height * 0.5
      );
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [gl, size, stage, disableInput]);

  /* per‑frame update */
  useFrame(() => {
    if (!bodyRef.current) return;
    const pos = bodyRef.current.translation();
    playerPosRef.current.set(pos.x, pos.y, pos.z);
    const vel = bodyRef.current.linvel();

    /* ── INTRO ── */
    if (intro && stage !== "done") {
      if (stage === "move") {
        bodyRef.current.setLinvel({ x: 0, y: vel.y, z: WALK_SPEED }, true);
        if (pos.z >= startZ.current) {
          setStage("rotate");
          bodyRef.current.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
          playerHandle.current?.setAnimation("Idle");
        }
      } else if (stage === "rotate") {
        const target = startQ.current
          .clone()
          .multiply(
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0),
              INTRO_ANGLE
            )
          );
        meshGroup.current.quaternion.slerp(target, 0.1);
        if (meshGroup.current.quaternion.angleTo(target) < 0.01) {
          meshGroup.current.quaternion.copy(target);
          setStage("done");
          onIntroComplete?.();
        }
      }

      camOffset.current.copy(CLOSE_CAM);
      camera.position.copy(camOffset.current).add(pos);
      camera.lookAt(pos.x, pos.y, pos.z);
      return;
    }

    /* ── AFTER INTRO ── */
    if (stage === "done") {
      if (!disableInput) camOffset.current.lerp(NORMAL_CAM, 0.02); // play phase
      else camOffset.current.copy(CLOSE_CAM); // dialog
    }

    /* input / movement */
    let desired: typeof moveState.current = "Idle";
    let speed = 0;
    const dir = new THREE.Vector3();

    if (isDown.current) {
      const v = screenVec.current,
        len = v.length();
      if (len > 2) {
        desired = len >= INPUT_RADIUS ? "Run" : "Walk";
        speed = desired === "Run" ? RUN_SPEED : WALK_SPEED;

        const right = new THREE.Vector3(1, 0, 0)
          .applyQuaternion(camera.quaternion)
          .setY(0)
          .normalize();
        const forward = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(camera.quaternion)
          .setY(0)
          .normalize();

        dir
          .copy(right.multiplyScalar(v.x).add(forward.multiplyScalar(-v.y)))
          .normalize();
      }
    }

    if (desired !== moveState.current) {
      moveState.current = desired;
      playerHandle.current?.setAnimation(desired);
    }

    /* ─── FOOTSTEP SFX (unchanged) ─── */
    const onStone = sampleStone(pos.x, pos.z) < 0.5;
    if (grassWalk && grassRun && stoneWalk && stoneRun) {
      if (desired === "Run") {
        if (onStone) {
          stoneRun.play();
          stoneWalk.pause();
          grassRun.pause();
          grassWalk.pause();
        } else {
          grassRun.play();
          grassWalk.pause();
          stoneRun.pause();
          stoneWalk.pause();
        }
      } else if (desired === "Walk") {
        if (onStone) {
          stoneWalk.play();
          stoneRun.pause();
          grassWalk.pause();
          grassRun.pause();
        } else {
          grassWalk.play();
          grassRun.pause();
          stoneWalk.pause();
          stoneRun.pause();
        }
      } else {
        grassWalk.pause();
        grassRun.pause();
        stoneWalk.pause();
        stoneRun.pause();
      }
    }

    /* physics & rotation */
    if (speed > 0) {
      bodyRef.current.setLinvel(
        { x: dir.x * speed, y: vel.y, z: dir.z * speed },
        true
      );
      const targetQ = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        dir
      );
      meshGroup.current.quaternion.slerp(targetQ, 0.25);
    } else {
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    /* camera follow */
    camera.position.copy(camOffset.current).add(pos);
    camera.lookAt(pos.x, pos.y, pos.z);
  });

  /* scene graph */
  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      colliders={false}
      lockRotations
      enabledRotations={[false, false, false]}
      linearDamping={8}
    >
      <CapsuleCollider args={[1.0, 0.75]} position={[0, 0, 0]} />
      <group ref={meshGroup}>
        <PlayerModel ref={playerHandle} scale={0.21} />
      </group>
    </RigidBody>
  );
}
