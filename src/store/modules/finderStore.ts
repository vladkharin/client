import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface USERS_LIST {
  id: number;
  username: string;
  isFriend: boolean;
  hasPendingRequest: boolean;
  isRequestReceived: boolean;
}

interface FinderState {
  state: boolean;
  usersList: USERS_LIST[] | null;
  setState: (state: boolean) => void;
  setUsers: (users: USERS_LIST[] | null) => void;
  setUser: (user: USERS_LIST) => void; // Обновление конкретного юзера
}

export const useFinderStore = create<FinderState>()(
  devtools(
    (set) => ({
      state: false,
      usersList: null,

      setState: (state: boolean) => set({ state }),

      setUsers: (users: USERS_LIST[] | null) => set({ usersList: users }),

      setUser: (updatedUser: USERS_LIST) =>
        set((state) => ({
          usersList: state.usersList ? state.usersList.map((user) => (user.id === updatedUser.id ? updatedUser : user)) : null,
        })),
    }),
    {
      name: "finder-store",
    },
  ),
);
