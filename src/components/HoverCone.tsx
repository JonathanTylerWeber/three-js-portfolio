import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useRef, useMemo } from "react";
import * as THREE from "three";

export interface HoverConeProps {
  /* visible cone ------------------------------------------------------ */
  conePosition?: [number, number, number]; // world position
  coneScale?: number; // uniform scale
  /* sensor / hit‑zone -------------------------------------------------- */
  sensorPosition?: [number, number, number]; // world position
  /** half‑sizes <x,y,z> — for Rapier’s CuboidCollider                */
  sensorScale?: [number, number, number];
  /* behaviour --------------------------------------------------------- */
  hoverAmplitude?: number; // vertical ± range
  hoverPeriod?: number; // seconds per cycle
  onClick?: () => void; // pointer click
  color?: THREE.ColorRepresentation; // base colour
  hoverColor?: THREE.ColorRepresentation; // pointer‑over colour
}

export default function HoverCone({
  /* cone */
  conePosition = [0, 3, 0],
  coneScale = 0.75,
  /* sensor */
  sensorPosition = conePosition, // default: same spot
  sensorScale = [0.8, 0.8, 0.8],
  /* behaviour */
  hoverAmplitude = 0.25,
  hoverPeriod = 3,
  onClick,
  color = "yellow",
  hoverColor = "darkorange",
}: HoverConeProps) {
  /* refs ------------------------------------------------------------- */
  const bobRef = useRef<THREE.Group>(null!); // inner bobbing group
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color }), [color]);

  /* shared geometry -------------------------------------------------- */
  const geom = useMemo(() => {
    const g = new THREE.ConeGeometry(0.3 * coneScale, 1.2 * coneScale, 16, 1);
    g.rotateX(Math.PI); // tip pointing down
    return g;
  }, [coneScale]);

  /* subtle vertical animation ---------------------------------------- */
  useFrame(({ clock }) => {
    const y =
      Math.sin((clock.elapsedTime * 2 * Math.PI) / hoverPeriod) *
      hoverAmplitude;
    if (bobRef.current) bobRef.current.position.y = y; // local offset
  });

  /* colour swap helpers --------------------------------------------- */
  const setHover = (active: boolean) =>
    mat.color.set(active ? hoverColor : color);

  /* ------------------------------------------------------------------ */
  return (
    <>
      {/* ▾ PARENT group sits at absolute world position -------------- */}
      <group position={conePosition}>
        {/* ▾ CHILD group only moves up/down around parent ------------- */}
        <group ref={bobRef}>
          <mesh
            geometry={geom}
            material={mat}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
            onClick={onClick}
          />
        </group>
      </group>

      {/* Physics sensor + hidden pick box ---------------------------- */}
      <RigidBody type="fixed" colliders={false} position={sensorPosition}>
        <CuboidCollider args={sensorScale} sensor collisionGroups={0} />

        {/* 2× scale so the raycaster gets a forgiving hit zone -------- */}
        <mesh
          visible={false}
          scale={sensorScale.map((v) => v * 2) as [number, number, number]}
          onPointerOver={() => setHover(true)}
          onPointerOut={() => setHover(false)}
          onClick={onClick}
        >
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      </RigidBody>
    </>
  );
}
