// lib/mediapipeController.ts
// This file will contain the logic for MediaPipe Holistic Landmarker initialization,
// camera frame processing, and landmark extraction.

import { HolisticLandmarker, FilesetResolver, DrawingUtils, NormalizedLandmark } from '@mediapipe/tasks-vision';

// Define a more specific type for results if possible, based on HolisticLandmarkerResult
export interface ExtendedHolisticResult {
  poseLandmarks?: NormalizedLandmark[];
  faceLandmarks?: NormalizedLandmark[];
  leftHandLandmarks?: NormalizedLandmark[];
  rightHandLandmarks?: NormalizedLandmark[];
  segmentationMasks?: any; // Adjust if you use segmentation masks
  // Add any other properties you expect from the results
}

export class MediaPipeController {
  private holisticLandmarker?: HolisticLandmarker;
  private drawingUtils?: DrawingUtils;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null; // For 2D drawing utils, if needed
  private lastVideoTime = -1;
  private requestAFId: number | null = null;
  private onResultsCallback: (results: ExtendedHolisticResult, controller: MediaPipeController) => void = () => {};

  constructor() {
    // Initialization will be handled in an async method
  }

  public async initialize(
    videoElement: HTMLVideoElement,
    outputCanvasElement: HTMLCanvasElement, // Canvas for DrawingUtils
    onResults: (results: ExtendedHolisticResult, controller: MediaPipeController) => void
  ): Promise<void> {
    console.log("MediaPipeController: Initializing...");
    this.videoElement = videoElement;
    this.canvasElement = outputCanvasElement; // This canvas is for the DrawingUtils if you use them.
    this.onResultsCallback = onResults;

    console.log("MediaPipeController: videoElement:", this.videoElement);
    console.log("MediaPipeController: canvasElement for DrawingUtils:", this.canvasElement);

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
      );
      console.log("MediaPipeController: FilesetResolver created.", vision);

      this.holisticLandmarker = await HolisticLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        outputFaceLandmarks: true,
        outputPoseLandmarks: true,
        outputSegmentationMasks: false, // Disable if not needed for performance
        // outputHolisticLandmarks: true, // This option seems to be for the deprecated solution.
                                      // The new HolisticLandmarker directly outputs pose, face, left/right hand landmarks.
      });
      console.log('MediaPipeController: Holistic Landmarker created successfully.', this.holisticLandmarker);

      const canvasCtx = this.canvasElement.getContext('2d');
      if (!canvasCtx) {
        console.error('MediaPipeController: Could not get 2D context from canvas for DrawingUtils');
        throw new Error('Could not get 2D context from canvas');
      }
      this.drawingUtils = new DrawingUtils(canvasCtx);
      console.log('MediaPipeController: DrawingUtils created successfully.', this.drawingUtils);

      console.log('MediaPipe Holistic Landmarker initialized');

    } catch (error) {
      console.error("MediaPipeController: Error during initialization:", error);
      // Optionally, re-throw or handle more gracefully
      // For now, holisticLandmarker will remain undefined if an error occurs here.
    }
  }

  private predictWebcam(): void {
    // console.log("MediaPipeController: predictWebcam called"); // Potentially too noisy
    if (!this.videoElement || !this.holisticLandmarker || !this.canvasElement || !this.drawingUtils) {
      console.warn("Elements not ready for prediction", {
          videoElementExists: !!this.videoElement,
          holisticLandmarkerExists: !!this.holisticLandmarker,
          canvasElementExists: !!this.canvasElement,
          drawingUtilsExists: !!this.drawingUtils,
      });
      this.requestAFId = requestAnimationFrame(() => this.predictWebcam());
      return;
    }
    
    // Ensure video is playing and has data
    if (this.videoElement.paused || this.videoElement.ended || this.videoElement.readyState < 3) {
        this.requestAFId = requestAnimationFrame(() => this.predictWebcam());
        return;
    }

    const nowInMs = Date.now();
    // Check if video time has changed to avoid re-processing the same frame
    if (this.videoElement.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.videoElement.currentTime;
      // The detectForVideo method performs the landmark detection.
      const results = this.holisticLandmarker.detectForVideo(this.videoElement, nowInMs);
      
      console.log("MediaPipeController: predictWebcam - results from detectForVideo:", results);

      // Optional: Draw results on the 2D canvas (can be useful for debugging)
      const ctx = this.canvasElement.getContext('2d')!;
      ctx.save();
      ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      
      // Example: Drawing pose landmarks
      if (results.poseLandmarks) {
        // this.drawingUtils.drawConnectors(results.poseLandmarks, HolisticLandmarker.POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
        // this.drawingUtils.drawLandmarks(results.poseLandmarks, {color: '#FF0000', radius: 2});
      }
      // Draw face landmarks
      if (results.faceLandmarks) {
        // this.drawingUtils.drawConnectors(results.faceLandmarks, HolisticLandmarker.FACE_CONNECTIONS, {color: '#E0E0E0', lineWidth: 0.5});
      }
      // Draw hand landmarks
      // results.leftHandLandmarks.forEach(landmark => this.drawingUtils.drawLandmarks(landmark, {color: '#FF0000', lineWidth: 1}));
      // results.rightHandLandmarks.forEach(landmark => this.drawingUtils.drawLandmarks(landmark, {color: '#0000FF', lineWidth: 1}));
      ctx.restore();

      // Pass all landmarks to the callback
      const allLandmarks: ExtendedHolisticResult = {
        poseLandmarks: results.poseLandmarks && results.poseLandmarks.length > 0 ? results.poseLandmarks[0] : [],
        faceLandmarks: results.faceLandmarks && results.faceLandmarks.length > 0 ? results.faceLandmarks[0] : [],
        leftHandLandmarks: results.leftHandLandmarks && results.leftHandLandmarks.length > 0 ? results.leftHandLandmarks[0] : [],
        rightHandLandmarks: results.rightHandLandmarks && results.rightHandLandmarks.length > 0 ? results.rightHandLandmarks[0] : [],
        // segmentationMasks: results.segmentationMasks, // If you use them and they have a similar structure
      };
      this.onResultsCallback(allLandmarks, this);
      console.log("MediaPipeController: predictWebcam - onResultsCallback called with:", allLandmarks);
    }
    this.requestAFId = requestAnimationFrame(() => this.predictWebcam());
  }

  public startProcessingLoop(): void {
    if (!this.videoElement) {
        console.error("Video element not set before starting processing loop.");
        return;
    }
    if (this.requestAFId) {
      this.stopProcessingLoop(); // Stop any existing loop
    }
    // Wait for the video to be ready to play
    this.videoElement.onloadeddata = () => {
        console.log("Video data loaded, starting MediaPipe processing loop.");
        this.lastVideoTime = -1; // Reset last video time
        this.predictWebcam();
    };
    // If video is already playing or metadata loaded
     if (this.videoElement.readyState >= 2) { // HAVE_CURRENT_DATA or greater
        console.log("Video already loaded or playing, starting MediaPipe processing loop.");
        this.lastVideoTime = -1;
        this.predictWebcam();
    } else {
        console.log("Video not ready, waiting for loadeddata event.");
    }
  }

  public stopProcessingLoop(): void {
    if (this.requestAFId) {
      cancelAnimationFrame(this.requestAFId);
      this.requestAFId = null;
      console.log("MediaPipe processing loop stopped.");
    }
  }

  public getDrawingUtils(): DrawingUtils | undefined {
    return this.drawingUtils;
  }
}

// Example usage (will be in a React component or hook)
// const controller = new MediaPipeController();
// async function setup() {
//   const video = document.getElementById('webcam') as HTMLVideoElement;
//   const canvas = document.getElementById('output_canvas') as HTMLCanvasElement;
//   await controller.initialize(video, canvas, (results) => {
//     console.log(results.poseLandmarks);
//     // Update state store with landmarks (e.g., useMocapStore.getState().setLandmarks)
//   });
// } 