import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SplashState {

  dismissed: boolean;

  setDismissed: (dismissed: boolean) => void;

}

export const useSplashStore = create<SplashState>()(
  persist(
    set => ({
      dismissed: false,
      setDismissed: dismissed => set({ dismissed }),
    }),
    { name: 'iiif-workbench-splash' }
  )
)