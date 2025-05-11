'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NormalizedLandmark, HolisticLandmarker } from '@mediapipe/tasks-vision';

// Define the Connection type locally if not exported by MediaPipe
interface MediaPipeConnection {
    start: number;
    end: number;
}

interface SkeletonPartProps {
  landmarks: NormalizedLandmark[];
  connections?: MediaPipeConnection[]; // Use locally defined Connection type
  color: THREE.ColorRepresentation;
  pointSize?: number;
  lineWidth?: number;
}

const SkeletonPart: React.FC<SkeletonPartProps> = ({ 
  landmarks, 
  connections, 
  color,
  pointSize = 5,
  lineWidth = 2 
}) => {
  const groupRef = useRef<THREE.Group>(null);

  console.log(`SkeletonPart (${color}): Received landmarks count:`, landmarks.length);

  useFrame(() => {
    if (!groupRef.current) return;

    // Clear previous skeleton part
    while(groupRef.current.children.length > 0){
      groupRef.current.remove(groupRef.current.children[0]);
    }

    if (!landmarks || landmarks.length === 0) {
        return;
    }
    
    const videoWidth = 640; 
    const videoHeight = 480; 
    
    const points = landmarks.map(lm => {
      if (!lm) return null;
      return new THREE.Vector3(
        (lm.x - 0.5) * videoWidth,    
        -(lm.y - 0.5) * videoHeight,   
        0
      );
    }).filter(pt => pt !== null) as THREE.Vector3[];

    let addedObjectsCount = 0;

    // Draw points (joints)
    if (points.length > 0) {
      points.forEach(point => {
        const geometry = new THREE.SphereGeometry(pointSize, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(point);
        groupRef.current?.add(sphere);
        addedObjectsCount++;
      });
    }

    // Draw lines (bones)
    if (connections && points.length > 0) {
      connections.forEach(({ start: startIdx, end: endIdx }) => { 
        if (points[startIdx] && points[endIdx]) {
          const material = new THREE.LineBasicMaterial({ color, linewidth: lineWidth });
          const geometry = new THREE.BufferGeometry().setFromPoints([points[startIdx], points[endIdx]]);
          const line = new THREE.Line(geometry, material);
          groupRef.current?.add(line);
          addedObjectsCount++;
        }
      });
    }

    if (landmarks.length > 0 && addedObjectsCount === 0) {
        console.warn(`SkeletonPart (${color}): Landmarks were received but NO objects were added to the scene. Points: ${points.length}, Connections defined: ${connections?.length}`);
    }
  });

  return <group ref={groupRef} />;
};

interface SkeletonCanvasProps {
  poseLandmarks?: NormalizedLandmark[];
  leftHandLandmarks?: NormalizedLandmark[];
  rightHandLandmarks?: NormalizedLandmark[];
}

export default function SkeletonCanvas({ 
  poseLandmarks = [], 
  leftHandLandmarks = [], 
  rightHandLandmarks = [] 
}: SkeletonCanvasProps) {

  console.log("SkeletonCanvas: Received props:", { poseLandmarks, leftHandLandmarks, rightHandLandmarks });

  return (
    <Canvas orthographic camera={{ zoom: 0.2, near: 0.1, far: 10000, position: [0, 0, 1000] }} style={{ width: '100%', height: '100%', backgroundColor: 'lightblue' }}>
      <ambientLight intensity={0.8} />
      <pointLight position={[100, 200, 300]} intensity={0.6} />
      <directionalLight position={[-100, -100, 200]} intensity={0.4}/>
      
      {/* Pose Skeleton */}
      {poseLandmarks && poseLandmarks.length > 0 && (
        <SkeletonPart 
          landmarks={poseLandmarks} 
          connections={HolisticLandmarker.POSE_CONNECTIONS as MediaPipeConnection[]} 
          color={0x00cc00} // Brighter Green for pose
          pointSize={15}
          lineWidth={4}
        />
      )}

      {/* Left Hand Skeleton */}
      {leftHandLandmarks && leftHandLandmarks.length > 0 && (
        <SkeletonPart 
          landmarks={leftHandLandmarks} 
          connections={HolisticLandmarker.HAND_CONNECTIONS as MediaPipeConnection[]} 
          color={0xee4444} // Brighter Red for left hand
          pointSize={10}
          lineWidth={2.5}
        />
      )}

      {/* Right Hand Skeleton */}
      {rightHandLandmarks && rightHandLandmarks.length > 0 && (
        <SkeletonPart 
          landmarks={rightHandLandmarks} 
          connections={HolisticLandmarker.HAND_CONNECTIONS as MediaPipeConnection[]} 
          color={0x4444ee} // Brighter Blue for right hand
          pointSize={10}
          lineWidth={2.5}
        />
      )}
      
      {/* <OrbitControls /> */}
    </Canvas>
  );
} 