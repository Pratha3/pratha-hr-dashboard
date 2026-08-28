import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  tableDensity: 'compact' | 'comfortable';
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTableDensity: (density: 'compact' | 'comfortable') => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  tableDensity: 'comfortable',
  commandPaletteOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setTableDensity: (density) => set({ tableDensity: density }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open })
}));
