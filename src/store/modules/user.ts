import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface USER_STATE {
  token: string | null;
  user_id: number | null;
}

interface USER_ACTIONS {
  login: (token: string, id: number) => void;
}

export const useUserStore = create<USER_STATE & USER_ACTIONS>()(
  devtools(
    (set) => ({
      token: null,
      user_id: null,
      login: (token, id) => set({ token, user_id: id }),
    }),
    { name: "user-store" }
  )
);
