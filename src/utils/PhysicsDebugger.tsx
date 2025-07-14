import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { useRef, useEffect } from "react";
import * as THREE from "three";

export default function PhysicsDebugger() {
  const { world } = useRapier();
  const lineRef = useRef<THREE.LineSegments>(new THREE.LineSegments());

  useEffect(() => {
    lineRef.current.geometry = new THREE.BufferGeometry();
    lineRef.current.material = new THREE.LineBasicMaterial({
      color: "#ff0077",
      transparent: true,
      opacity: 0.75,
      depthTest: false,
    });
  }, []);

  useFrame(() => {
    const { vertices, colors } = world.debugRender();

    lineRef.current.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 3)
    );
    lineRef.current.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 4)
    );
    lineRef.current.geometry.attributes.position.needsUpdate = true;
    lineRef.current.geometry.attributes.color.needsUpdate = true;
  });

  return <primitive object={lineRef.current} />;
}
