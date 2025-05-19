'use client';

import React, { useEffect, useRef, useState } from 'react';
import SkeletonCanvas from '@/components/SkeletonCanvas';
import { useMocapStore } from '@/store/mocapStore';
import { MediaPipeController, ExtendedHolisticResult } from '@/lib/mediapipeController';
import { NormalizedLandmark } from '@mediapipe/tasks-vision';
import Image from "next/image";
import ParticleBackground from '@/components/ParticleBackground';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
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
  // Adding face landmarks state
  const [faceLandmarks, setFaceLandmarks] = useState<NormalizedLandmark[]>([]);

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
    // Process face landmarks
    if (results.faceLandmarks && results.faceLandmarks.length > 0) { 
      setFaceLandmarks(results.faceLandmarks);
      allLmsForStore.push(...results.faceLandmarks);
      console.log("MocapPage: Updated faceLandmarks state:", results.faceLandmarks);
    } else {
      setFaceLandmarks([]);
      console.log("MocapPage: No faceLandmarks received or array is empty.");
    }
    if (results.leftHandLandmarks && results.leftHandLandmarks.length > 0) { 
      setLeftHandLandmarks(results.leftHandLandmarks);
      allLmsForStore.push(...results.leftHandLandmarks);
      console.log("MocapPage: Updated leftHandLandmarks state:", results.leftHandLandmarks);
    } else {
      setLeftHandLandmarks([]);
    }
    if (results.rightHandLandmarks && results.rightHandLandmarks.length > 0) { 
      setRightHandLandmarks(results.rightHandLandmarks);
      allLmsForStore.push(...results.rightHandLandmarks);
      console.log("MocapPage: Updated rightHandLandmarks state:", results.rightHandLandmarks);
    } else {
      setRightHandLandmarks([]);
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
    <div className="relative min-h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* パーティクル背景 */}
      <ParticleBackground
        particleColor="#ffffff"
        background="transparent"
        particleDensity={80}
        speed={2}
      />
      
      {/* ヘッダー */}
      <header className="relative z-10 p-4 border-b border-gray-800 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sparkles Effect</h1>
        <div className="flex items-center space-x-4">
          {/* キャプチャー制御ボタン */}
          <button
            onClick={handleToggleCapture}
            className={`px-4 py-2 rounded font-semibold transition-colors 
              ${isCapturing ? 'bg-red-500 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} 
              text-white disabled:bg-gray-700`}
            disabled={isMediaPipeLoading}
          >
            {isMediaPipeLoading ? "Loading..." : (isCapturing ? 'Stop Capture' : 'Start Capture')}
          </button>
        </div>
      </header>
      
      <div className="relative z-10 flex-1 flex flex-col md:flex-row p-4 gap-4">
        {/* 説明テキスト */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center z-0 pointer-events-none">
          {!isCapturing && (
            <p className="text-xl text-gray-400">
              A beautiful particle animation that adds visual<br />
              interest to your UI.
            </p>
          )}
        </div>
        
        {/* 左側: チャットインターフェース */}
        <div className="w-full md:w-1/2 bg-gray-800 bg-opacity-70 rounded-lg shadow-xl overflow-hidden z-10">
          <ChatInterface />
        </div>
        
        {/* 右側: モーションキャプチャー */}
        <div className="w-full md:w-1/2 flex flex-col space-y-4 z-10">
          {/* カメラとオーバーレイ */}
          <div className="relative w-full aspect-video bg-gray-800 bg-opacity-70 rounded-lg shadow-xl overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay muted />
            <canvas ref={outputCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" /> 
          </div>
          
          {/* スケルトンキャンバス */}
          <div className="w-full aspect-video bg-gray-800 bg-opacity-70 rounded-lg shadow-xl overflow-hidden">
            {isCameraReady && !isMediaPipeLoading ? (
              <SkeletonCanvas 
                poseLandmarks={poseLandmarks}
                leftHandLandmarks={leftHandLandmarks}
                rightHandLandmarks={rightHandLandmarks}
                faceLandmarks={faceLandmarks}
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
      </div>
    </div>
  );
}
