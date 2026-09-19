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
    const item = window.localStorage.getItem(key) as SERVER_TYPE | null;
    if (item && (item === SERVER_TYPE.PROD || item === SERVER_TYPE.DEV)) {
      return item;
    }
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return SERVER_TYPE.DEV;
    }
    return fallback;
  } catch (error) {
    console.warn(`Failed to read ${key} from localStorage`, error);
    return fallback;
  }
};

export const useGlobalStore = create<GLOBAL_STATE>()(
  devtools(
    () => ({
      server: getFromLocalStorage("server", SERVER_TYPE.PROD),
    }),
    {
      name: "global-store",
    },
  ),
);
