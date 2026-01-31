import { create } from "zustand";
import { devtools } from "zustand/middleware";

export enum SERVER_TYPE {
  PROD = "production",
  DEV = "development",
}

interface GLOBAL_STATE {
  server: SERVER_TYPE;
}

const getFromLocalStorage = (key: string, fallback: SERVER_TYPE) => {
  if (typeof window === "undefined") return fallback; // SSR-безопасность
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`Failed to read ${key} from localStorage`, error);
    return fallback;
  }
};

export const useGlobalStore = create<GLOBAL_STATE>()(
  devtools(
    (set) => ({
      server: getFromLocalStorage("server", SERVER_TYPE.DEV),
    }),
    {
      name: "global-store",
    }
  )
);
