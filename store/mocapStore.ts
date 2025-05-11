import {create} from 'zustand';

interface MocapState {
  landmarks: any[]; // Replace 'any' with a proper Landmark type/interface
  isCapturing: boolean;
  setLandmarks: (landmarks: any[]) => void;
  toggleCapturing: () => void;
  // TODO: Add more state and actions as needed
}

export const useMocapStore = create<MocapState>((set) => ({
  landmarks: [],
  isCapturing: false,
  setLandmarks: (landmarks) => set({ landmarks }),
  toggleCapturing: () => set((state) => ({ isCapturing: !state.isCapturing })),
})); 