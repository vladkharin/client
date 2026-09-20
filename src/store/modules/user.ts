// store/useUserStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { useSocketStore } from "../index";
import { FriendListItem } from "@/types/types";

interface USER_STATE {
  token: string | null;
  user_id: number | null;
  username: string | null;
  email: string | null;
  name: string | null;
  surname: string | null;
  isHydrated: boolean;
  profileModalOpen: boolean;
  profileModalTab: "profile" | "security" | "appearance" | "voice";
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
  login: (token: string, id: number, username?: string) => void;
  setToken: (token: string) => void;
  hydrate: () => void;
  logout: () => void;
  setProfileModalOpen: (open: boolean, tab?: "profile" | "security" | "appearance" | "voice") => void;
  setProfileModalTab: (tab: "profile" | "security" | "appearance" | "voice") => void;
  setUserProfile: (profile: {
    id: number;
    username: string;
    email?: string | null;
    name?: string | null;
    surname?: string | null;
  }) => void;
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
        username: null,
        email: null,
        name: null,
        surname: null,
        isHydrated: false,
        profileModalOpen: false,
        profileModalTab: "profile",
        friendList: null,
        friendRequestsState: false,
        friendRequests: {
          outgoing: [],
          incoming: [],
        },

        login: (token, id, username) =>
          set({
            token,
            user_id: id,
            ...(username && { username }),
          }),

        setToken: (token) => set({ token }),

        hydrate: () => set({ isHydrated: true }),

        setProfileModalOpen: (open, tab) =>
          set({
            profileModalOpen: open,
            ...(tab && { profileModalTab: tab }),
          }),

        setProfileModalTab: (tab) => set({ profileModalTab: tab }),

        setUserProfile: (profile) =>
          set({
            user_id: profile.id,
            username: profile.username,
            email: profile.email || null,
            name: profile.name || null,
            surname: profile.surname || null,
          }),

        logout: () => {
          const socketState = useSocketStore.getState();
          socketState.disconnect();

          set({
            token: null,
            user_id: null,
            username: null,
            email: null,
            name: null,
            surname: null,
          });

          if (typeof window !== "undefined") {
            localStorage.removeItem("user-storage");
            localStorage.removeItem("token");
            localStorage.removeItem("auth_token");
          }

          console.log("👋 User logged out");
        },

        setFriendRequest: (requests: REQUEST[] | REQUEST, type: "outgoing" | "incoming") =>
          set((state) => ({
            friendRequests: {
              ...state.friendRequests,
              [type]: Array.isArray(requests) ? requests : requests ? [requests] : [],
            },
          })),

        addFriendRequest: (request: REQUEST, type: "outgoing" | "incoming") =>
          set((state) => ({
            friendRequests: {
              ...state.friendRequests,
              [type]: [request, ...(state.friendRequests[type] || [])],
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
      partialize: (state) => ({
        token: state.token,
        user_id: state.user_id,
        username: state.username,
        email: state.email,
        name: state.name,
        surname: state.surname,
      }),
      onRehydrateStorage: () => (state) => {
        state?.hydrate();
      },
    },
  ),
);
