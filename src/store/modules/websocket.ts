"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { io, Socket } from "socket.io-client";
import { generateId } from "@/utils/ids";
import { requestAfterAuthorization } from "@/utils/requestAfterAuthorization";
import { registerSocketListeners } from "@/lib/socketlisteners";

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (token: string, onReady?: () => void) => void;
  disconnect: () => void;
  sendMessage: (event: string, payload: any) => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export const useSocketStore = create<SocketState>()(
  devtools((set, get) => ({
    socket: null,
    isConnected: false,

    connect: (token: string, onReady?: () => void) => {
      if (get().isConnected) return;

      const socket = io(SOCKET_URL, {
        query: { token },
        transports: ["websocket"],
        autoConnect: false,
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

    sendMessage: (event, payload) => {
      const { socket } = get();
      if (socket?.connected) {
        socket.emit(event, { ...payload, id: generateId() });
      } else {
        console.warn("⚠️ Socket not connected");
      }
    },
  })),
);
