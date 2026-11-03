import { create } from "zustand";

interface UiState {
  collapsed: boolean;
  mobileOpen: boolean;
  setCollapsed: (v: boolean) => void;
  toggleCollapsed: () => void;
  setMobileOpen: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  collapsed: false,
  mobileOpen: false,
  setCollapsed: (collapsed) => set({ collapsed }),
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
}));