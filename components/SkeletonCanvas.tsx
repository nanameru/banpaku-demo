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

// Face mesh connections - simplified version for facial features
// These connections will create lines connecting major facial features like eyes, nose, mouth, etc.
const FACE_CONNECTIONS: MediaPipeConnection[] = [
  // Eyes (connecting the main eye landmarks)
  { start: 33, end: 133 }, // Left eye to right eye
  { start: 159, end: 145 }, // Left eye outer to inner
  { start: 145, end: 33 },  // Left eye inner to top
  { start: 33, end: 133 },  // Left eye top to bottom
  { start: 133, end: 159 }, // Left eye bottom to outer
  
  { start: 362, end: 263 }, // Right eye outer to inner
  { start: 263, end: 386 }, // Right eye inner to top
  { start: 386, end: 374 }, // Right eye top to bottom
  { start: 374, end: 362 }, // Right eye bottom to outer
  
  // Eyebrows
  { start: 65, end: 55 },   // Left eyebrow
  { start: 55, end: 107 },
  { start: 107, end: 66 },
  { start: 66, end: 65 },
  
  { start: 295, end: 285 }, // Right eyebrow
  { start: 285, end: 336 },
  { start: 336, end: 296 },
  { start: 296, end: 295 },
  
  // Nose
  { start: 1, end: 4 },     // Bridge of nose
  { start: 4, end: 5 },
  { start: 5, end: 195 },
  { start: 195, end: 197 },
  
  // Lips - outer contour
  { start: 61, end: 185 },  // Outer lip contour
  { start: 185, end: 40 },
  { start: 40, end: 39 },
  { start: 39, end: 37 },
  { start: 37, end: 0 },
  { start: 0, end: 267 },
  { start: 267, end: 269 },
  { start: 269, end: 270 },
  { start: 270, end: 409 },
  { start: 409, end: 291 },
  { start: 291, end: 375 },
  { start: 375, end: 321 },
  { start: 321, end: 405 },
  { start: 405, end: 314 },
  { start: 314, end: 17 },
  { start: 17, end: 84 },
  { start: 84, end: 181 },
  { start: 181, end: 91 },
  { start: 91, end: 146 },
  { start: 146, end: 61 },
  
  // Face contour
  { start: 10, end: 338 },  // Jawline
  { start: 338, end: 297 },
  { start: 297, end: 332 },
  { start: 332, end: 284 },
  { start: 284, end: 251 },
  { start: 251, end: 389 },
  { start: 389, end: 356 },
  { start: 356, end: 454 },
  { start: 454, end: 323 },
  { start: 323, end: 361 },
  { start: 361, end: 288 },
  { start: 288, end: 397 },
  { start: 397, end: 365 },
  { start: 365, end: 379 },
  { start: 379, end: 378 },
  { start: 378, end: 400 },
  { start: 400, end: 377 },
  { start: 377, end: 152 },
  { start: 152, end: 148 },
  { start: 148, end: 176 },
  { start: 176, end: 149 },
  { start: 149, end: 150 },
  { start: 150, end: 136 },
  { start: 136, end: 172 },
  { start: 172, end: 58 },
  { start: 58, end: 132 },
  { start: 132, end: 93 },
  { start: 93, end: 234 },
  { start: 234, end: 127 },
  { start: 127, end: 162 },
  { start: 162, end: 21 },
  { start: 21, end: 54 },
  { start: 54, end: 103 },
  { start: 103, end: 67 },
  { start: 67, end: 109 },
  { start: 109, end: 10 }
];

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
        if (startIdx < points.length && endIdx < points.length && points[startIdx] && points[endIdx]) {
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
  faceLandmarks?: NormalizedLandmark[];
}

export default function SkeletonCanvas({ 
  poseLandmarks = [], 
  leftHandLandmarks = [], 
  rightHandLandmarks = [],
  faceLandmarks = [] 
}: SkeletonCanvasProps) {

  console.log("SkeletonCanvas: Received props:", { poseLandmarks, leftHandLandmarks, rightHandLandmarks, faceLandmarks });

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

      {/* Face Landmarks */}
      {faceLandmarks && faceLandmarks.length > 0 && (
        <SkeletonPart 
          landmarks={faceLandmarks} 
          connections={FACE_CONNECTIONS} 
          color={0xffcc00} // Yellow for face
          pointSize={2}
          lineWidth={1}
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