import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface USER_STATE {
  token: string | null;
  user_id: number | null;
}

interface USER_ACTIONS {
  login: (token: string, id: number) => void;
  setToken: (token: string) => void;
}

export const useUserStore = create<USER_STATE & USER_ACTIONS>()(
  devtools(
    (set) => ({
      token: null,
      user_id: null,
      login: (token, id) => {
        // Сохраняем в localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_token", token);
          localStorage.setItem("user_id", id.toString());
        }
        set({ token, user_id: id });
      },
      setToken: (token) => set({ token }),
    }),
    { name: "user-store" },
  ),
);
