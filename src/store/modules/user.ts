// store/useUserStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { useSocketStore } from "../index"; // 👈 Импортируем сокет-стор
import { FriendListItem } from "@/types/types";

interface USER_STATE {
  token: string | null;
  user_id: number | null;
  isHydrated: boolean;
  friendList: FriendListItem[] | null;
  friendListState: boolean;
  friendRequests: {
    outgoing: REQUEST[];
    incoming: REQUEST[];
  };
  friendRequestsState: boolean;
}

export interface REQUEST {
  id: number;
  username: string;
}

interface USER_ACTIONS {
  login: (token: string, id: number) => void;
  setToken: (token: string) => void;
  hydrate: () => void;
  logout: () => void; // 👈 Новый метод
  setFriendList: (list: FriendListItem[]) => void;
  addFriend: (friend: FriendListItem) => void;
  setFriendRequest: (request: REQUEST[] | REQUEST, type: "outgoing" | "incoming") => void;
  setFriendRequestState: (state: boolean) => void;
  setFriendListState: (state: boolean) => void;
  addFriendRequest: (request: REQUEST, type: "outgoing" | "incoming") => void;
  removeFriendRequest: (id: number, type: "outgoing" | "incoming") => void;
}

export const useUserStore = create<USER_STATE & USER_ACTIONS>()(
  persist(
    devtools(
      (set) => ({
        token: null,
        user_id: null,
        isHydrated: false,
        friendList: null,
        friendRequestsState: false,
        friendRequests: {
          outgoing: [],
          incoming: [],
        },

        login: (token, id) => set({ token, user_id: id }),

        setToken: (token) => set({ token }),

        hydrate: () => set({ isHydrated: true }),

        logout: () => {
          // 1. Отключаем сокет (если подключен)
          const socketState = useSocketStore.getState();
          socketState.disconnect();

          // 2. Очищаем состояние (но НЕ сбрасываем isHydrated!)
          set({ token: null, user_id: null });

          // 3. Удаляем данные из localStorage
          // persist использует ключ "user-storage" по умолчанию
          if (typeof window !== "undefined") {
            localStorage.removeItem("user-storage");
          }

          console.log("👋 User logged out");
        },

        setFriendRequest: (requests: REQUEST[] | REQUEST, type: "outgoing" | "incoming") =>
          set((state) => ({
            friendRequests: {
              ...state.friendRequests,
              [type]: requests,
            },
          })),

        addFriendRequest: (request: REQUEST, type: "outgoing" | "incoming") =>
          set((state) => ({
            friendRequests: {
              ...state.friendRequests,
              [type]: [request, ...state.friendRequests[type]],
            },
          })),
        removeFriendRequest: (id: number, type: "outgoing" | "incoming") =>
          set((state) => ({
            friendRequests: {
              ...state.friendRequests,
              [type]: state.friendRequests[type].filter((req) => req.id !== id),
            },
          })),
        setFriendRequestState: (state: boolean) => set({ friendRequestsState: state }),
        setFriendListState: (state: boolean) => set({ friendListState: state }),

        setFriendList: (list: FriendListItem[]) => set({ friendList: list }),
        addFriend: (friend: FriendListItem) =>
          set((state) => ({
            friendList: state.friendList ? [...state.friendList, friend] : [friend],
          })),
      }),
      { name: "user-store" },
    ),
    {
      name: "user-storage",
      partialize: (state) => ({ token: state.token, user_id: state.user_id }),
      onRehydrateStorage: () => (state) => {
        state?.hydrate();
      },
    },
  ),
);
