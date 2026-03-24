import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface FinderState {
  state: boolean;
  usersList: USERS_LIST[] | null;
  setState: (state: boolean) => void;
  setUsers: (users: USERS_LIST[] | null) => void;
}

export interface USERS_LIST {
  id: number;
  username: string;
}

export const useFinderStore = create<FinderState>()(
  devtools(
    (set) => ({
      state: false,
      usersList: null,
      setState: (state: boolean) => set({ state }),
      setUsers: (users: USERS_LIST[] | null) => set({ usersList: users }),
    }),
    {
      name: "finder-store",
    },
  ),
);
