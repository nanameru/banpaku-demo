'use client';

import React, { useEffect, useRef, useState } from 'react';
import SkeletonCanvas from '@/components/SkeletonCanvas';
import { useMocapStore } from '@/store/mocapStore';
import { MediaPipeController, ExtendedHolisticResult } from '@/lib/mediapipeController';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';

export default function MocapPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const mediaPipeController = useRef<MediaPipeController | null>(null);
  const { isCapturing, toggleCapturing, setLandmarks: setStoreLandmarks } = useMocapStore();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isMediaPipeLoading, setIsMediaPipeLoading] = useState(false);

  // Separate states for different landmark groups
  const [poseLandmarks, setPoseLandmarks] = useState<NormalizedLandmark[]>([]);
  const [leftHandLandmarks, setLeftHandLandmarks] = useState<NormalizedLandmark[]>([]);
  const [rightHandLandmarks, setRightHandLandmarks] = useState<NormalizedLandmark[]>([]);
  // We can also keep face landmarks if needed for other purposes or future SkeletonCanvas enhancements
  // const [faceLandmarks, setFaceLandmarks] = useState<NormalizedLandmark[]>([]);


  useEffect(() => {
    mediaPipeController.current = new MediaPipeController();
    return () => {
      mediaPipeController.current?.stopProcessingLoop();
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleResults = (results: ExtendedHolisticResult) => {
    console.log("MocapPage: handleResults received:", results);
    const allLmsForStore: NormalizedLandmark[] = [];
    if (results.poseLandmarks && results.poseLandmarks.length > 0) { 
      setPoseLandmarks(results.poseLandmarks);
      allLmsForStore.push(...results.poseLandmarks);
      console.log("MocapPage: Updated poseLandmarks state:", results.poseLandmarks);
    } else {
      setPoseLandmarks([]);
      console.log("MocapPage: No poseLandmarks received or array is empty.");
    }
    // if (results.faceLandmarks) { // Optional: store if needed
    //   setFaceLandmarks(results.faceLandmarks);
    //   allLmsForStore.push(...results.faceLandmarks);
    // } else {
    //   setFaceLandmarks([]);
    // }
    if (results.leftHandLandmarks && results.leftHandLandmarks.length > 0) { 
      setLeftHandLandmarks(results.leftHandLandmarks);
      allLmsForStore.push(...results.leftHandLandmarks);
      console.log("MocapPage: Updated leftHandLandmarks state:", results.leftHandLandmarks);
    } else {
      setLeftHandLandmarks([]);
      // console.log("MocapPage: No leftHandLandmarks received or array is empty.");
    }
    if (results.rightHandLandmarks && results.rightHandLandmarks.length > 0) { 
      setRightHandLandmarks(results.rightHandLandmarks);
      allLmsForStore.push(...results.rightHandLandmarks);
      console.log("MocapPage: Updated rightHandLandmarks state:", results.rightHandLandmarks);
    } else {
      setRightHandLandmarks([]);
      // console.log("MocapPage: No rightHandLandmarks received or array is empty.");
    }

    if (allLmsForStore.length > 0) {
      useMocapStore.getState().setLandmarks(allLmsForStore);
    } else {
      useMocapStore.getState().setLandmarks([]);
    }
  };

  const setupCameraAndMediaPipe = async () => {
    if (!videoRef.current || !outputCanvasRef.current || !mediaPipeController.current) return;
    setIsMediaPipeLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      videoRef.current.srcObject = stream;
      await new Promise<void>((resolve) => {
        videoRef.current!.onloadedmetadata = () => {
          setIsCameraReady(true);
          videoRef.current?.play();
          resolve();
        };
      });
      
      if (mediaPipeController.current && videoRef.current && outputCanvasRef.current) {
        await mediaPipeController.current.initialize(
          videoRef.current,
          outputCanvasRef.current,
          handleResults
        );
        console.log("MediaPipe Controller Initialized from Page");
      } else {
        console.error("Elements for MediaPipe initialization are not ready after video load.");
      }
      setIsMediaPipeLoading(false);
    } catch (error) {
      console.error('Error accessing webcam or initializing MediaPipe:', error);
      setIsMediaPipeLoading(false);
      alert("Could not access webcam. Please ensure permission is granted and try again.");
    }
  };

  const handleToggleCapture = async () => {
    if (!mediaPipeController.current) return;

    if (!isCapturing) {
      if (!isCameraReady || !mediaPipeController.current.getDrawingUtils()) {
        await setupCameraAndMediaPipe();
      }
      if (mediaPipeController.current && mediaPipeController.current.getDrawingUtils()) {
        mediaPipeController.current.startProcessingLoop();
        toggleCapturing();
      } else {
        console.warn("MediaPipe not fully initialized yet, cannot start capture. Check logs from setupCameraAndMediaPipe.");
      }
    } else {
      mediaPipeController.current.stopProcessingLoop();
      toggleCapturing();
    }
  };

  return (
    <div className="container mx-auto p-4 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Physical Image - MoCap Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
        <div className="relative w-full aspect-video bg-gray-800 rounded overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay muted />
          <canvas ref={outputCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" /> 
        </div>
        <div className="w-full aspect-video bg-gray-700 rounded overflow-hidden">
          {isCameraReady && !isMediaPipeLoading ? (
            <SkeletonCanvas 
              poseLandmarks={poseLandmarks}
              leftHandLandmarks={leftHandLandmarks}
              rightHandLandmarks={rightHandLandmarks}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-400">
                {isMediaPipeLoading ? "Loading MediaPipe..." : (isCameraReady ? "Ready for Skeleton" : "Initializing Camera...")}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={handleToggleCapture}
          className={`px-6 py-3 text-lg rounded font-semibold transition-colors 
            ${isCapturing ? 'bg-red-500 hover:bg-red-700' : 'bg-green-500 hover:bg-green-700'} 
            text-white disabled:bg-gray-400`}
          disabled={isMediaPipeLoading}
        >
          {isMediaPipeLoading ? "Loading..." : (isCapturing ? 'Stop Capture' : 'Start Capture')}
        </button>
      </div>
    </div>
  );
} 