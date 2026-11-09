import { create } from "zustand";

interface UiState {
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileOpen: false,
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
}));