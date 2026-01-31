import { create } from "zustand";

interface InitState {
  dmLoaded: boolean;

  setDmLoaded: () => void;

  isFullyInitialized: () => boolean;
}

export const useInitStore = create<InitState>((set, get) => ({
  dmLoaded: false,
  userStatusLoaded: false,
  notificationsLoaded: false,

  setDmLoaded: () => set({ dmLoaded: true }),

  isFullyInitialized: () => {
    const state = get();
    return state.dmLoaded;
  },
}));
