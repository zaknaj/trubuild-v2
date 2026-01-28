import { create } from "zustand"

const SIDEBAR_MIN_WIDTH = 250
const SIDEBAR_MAX_WIDTH = 500
const SIDEBAR_DEFAULT_WIDTH = 300

const useStore = create<{
  navbarOpen: boolean
  setNavbarOpen: (navbarOpen: boolean) => void
  sidebarWidth: number
  setSidebarWidth: (width: number | ((prev: number) => number)) => void
  chatOpen: boolean
  setChatOpen: (chatOpen: boolean) => void
  // Technical evaluation rounds (keyed by packageId)
  selectedTechRound: Record<string, string>
  setTechRound: (packageId: string, roundId: string) => void
  // Commercial evaluation rounds (keyed by assetId)
  selectedCommRound: Record<string, string>
  setCommRound: (assetId: string, roundId: string) => void
}>((set, get) => ({
  navbarOpen: true,
  setNavbarOpen: (navbarOpen) => set({ navbarOpen }),
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  setSidebarWidth: (width) => {
    const newWidth = typeof width === "function" ? width(get().sidebarWidth) : width
    set({ sidebarWidth: Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, newWidth)) })
  },
  chatOpen: false,
  setChatOpen: (chatOpen) => set({ chatOpen, navbarOpen: !chatOpen }),
  // Technical rounds
  selectedTechRound: {},
  setTechRound: (packageId, roundId) =>
    set((state) => ({
      selectedTechRound: { ...state.selectedTechRound, [packageId]: roundId },
    })),
  // Commercial rounds
  selectedCommRound: {},
  setCommRound: (assetId, roundId) =>
    set((state) => ({
      selectedCommRound: { ...state.selectedCommRound, [assetId]: roundId },
    })),
}))

export default useStore
export { SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_DEFAULT_WIDTH }
