"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { io, Socket } from "socket.io-client";
import { generateId } from "@/utils/ids";
import { requestAfterAuthorization } from "@/utils/requestAfterAuthorization";
import { registerSocketListeners } from "@/lib/socketlisteners";
import { SERVER_TYPE, useGlobalStore } from "./global";

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (token: string, onReady?: () => void) => void;
  disconnect: () => void;
  sendMessage: <T extends Record<string, unknown>>(event: string, payload: T) => void;
  pendingRequests: Map<string, { resolve: (any) => void; reject: (err: Error) => void }>;
}

const PROD_SOCKET_URL = "https://app.domcraft.digital";
const DEV_SOCKET_URL = "http://localhost:3001";

export const useSocketStore = create<SocketState>()(
  devtools((set, get) => ({
    socket: null,
    isConnected: false,

    connect: (token: string, onReady?: () => void) => {
      if (get().isConnected) return;

      const { server } = useGlobalStore.getState();
      const SOCKET_URL = server == SERVER_TYPE.PROD ? PROD_SOCKET_URL : DEV_SOCKET_URL;

      const socket = io(SOCKET_URL, {
        query: { token },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.onAny((event, data) => {
        if (data?.id && get().pendingRequests.has(data.id)) {
          const { resolve, reject } = get().pendingRequests.get(data.id)!;
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data.response);
          }
          get().pendingRequests.delete(data.id);
        }
      });

      socket.on("auth:ready", () => {
        console.log("✅ Auth ready on server");
        set({ isConnected: true });

        requestAfterAuthorization();
        registerSocketListeners(socket);

        // 🔥 Вызываем коллбэк, если он передан
        if (onReady) onReady();
      });

      socket.on("disconnect", (reason) => {
        console.log("❌ Socket.IO disconnected:", reason);
        set({ isConnected: false });
      });

      socket.on("connect_error", (error) => {
        console.error("🔥 Socket.IO connection error:", error);
      });

      socket.on("new_message", (data) => {
        console.log("📩 New message:", data);
      });

      set({ socket });
      socket.connect();
    },

    disconnect: () => {
      const { socket } = get();
      if (socket) {
        socket.disconnect();
        set({ socket: null, isConnected: false });
      }
    },
    pendingRequests: new Map(),

    sendMessage: <T extends Record<string, unknown>>(event: string, payload: T): Promise<any> => {
      return new Promise((resolve, reject) => {
        const id = generateId();
        const { socket } = get();
        if (!socket?.connected) {
          reject(new Error("Socket not connected"));
          return;
        }

        // Сохраняем промис
        get().pendingRequests.set(id, { resolve, reject });

        // Отправляем запрос
        socket.emit(event, { ...payload, id });
      });
    },
  })),
);
