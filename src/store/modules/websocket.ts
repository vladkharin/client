// store/useSocketStore.ts
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
  sendMessage: <T extends Record<string, unknown>>(event: string, payload: T) => Promise<any>;
  flushMessageQueue: () => void;
  pendingRequests: Map<string, { resolve: (value: any) => void; reject: (err: Error) => void }>;
  messageQueue: Array<{
    event: string;
    payload: Record<string, unknown>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }>;
}

const PROD_SOCKET_URL = "https://app.domcraft.digital"; // 👈 Убрали пробелы!
const DEV_SOCKET_URL = "http://localhost:3001";

export const useSocketStore = create<SocketState>()(
  devtools((set, get) => ({
    socket: null,
    isConnected: false,
    pendingRequests: new Map(),
    messageQueue: [],

    connect: (token: string, onReady?: () => void) => {
      console.log("🔌 connect() вызван", {
        isConnected: get().isConnected,
        hasSocket: !!get().socket,
        socketConnected: get().socket?.connected,
        timestamp: new Date().toISOString(),
      });
      // 👇 Если уже подключены — просто вызываем коллбэк
      if (get().isConnected) {
        onReady?.();
        return;
      }

      // 👇 Если сокет уже существует и подключается — не создаём новый
      const existingSocket = get().socket;
      if (existingSocket && existingSocket.connected) {
        onReady?.();
        return;
      }

      // 👇 Если сокет есть, но не подключен — очищаем перед переподключением
      if (existingSocket) {
        existingSocket.removeAllListeners();
        existingSocket.disconnect();
      }

      const { server } = useGlobalStore.getState();
      const SOCKET_URL = server === SERVER_TYPE.PROD ? PROD_SOCKET_URL : DEV_SOCKET_URL;

      const socket = io(SOCKET_URL, {
        query: { token },
        transports: ["websocket"],
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // 👇 Обработчик ответов
      const onResponse = (data: any) => {
        if (data?.id && get().pendingRequests.has(data.id)) {
          const { resolve, reject } = get().pendingRequests.get(data.id)!;
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data.response);
          }
          get().pendingRequests.delete(data.id);
        }
      };

      socket.onAny(onResponse);

      socket.on("connect", () => {
        console.log("🔗 Socket.IO connected");
        set({ isConnected: true });
        get().flushMessageQueue();
      });

      socket.on("auth:ready", () => {
        console.log("✅ Auth ready on server");
        requestAfterAuthorization();
        registerSocketListeners(socket);
        onReady?.();
      });

      socket.on("disconnect", (reason) => {
        console.log("❌ Socket.IO disconnected:", reason);
        set({ isConnected: false });
      });

      socket.on("connect_error", (error) => {
        console.error("🔥 Socket.IO connection error:", error);
        set({ isConnected: false });
      });

      socket.on("new_message", (data) => {
        console.log("📩 New message:", data);
      });

      set({ socket });

      // 👇 Небольшая задержка перед connect, чтобы слушатели успели зарегистрироваться
      setTimeout(() => {
        if (!socket.connected) {
          socket.connect();
        }
      }, 0);
    },

    disconnect: () => {
      const { socket } = get();
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();

        get().pendingRequests.clear();
        set({ socket: null, isConnected: false });
      }
    },

    sendMessage: <T extends Record<string, unknown>>(event: string, payload: T): Promise<any> => {
      return new Promise((resolve, reject) => {
        const id = generateId();
        const state = get();
        const socket = state.socket;

        if (!socket?.connected) {
          console.warn("⚠️ Socket not ready, queuing:", event);
          set((state) => ({
            messageQueue: [...state.messageQueue, { event, payload, resolve, reject }],
          }));
          return;
        }

        state.pendingRequests.set(id, { resolve, reject });
        socket.emit(event, { ...payload, id });
      });
    },

    flushMessageQueue: () => {
      const state = get();
      const socket = state.socket;

      if (!socket?.connected || state.messageQueue.length === 0) return;

      console.log(`🚀 Flushing ${state.messageQueue.length} queued messages`);

      const queue = [...state.messageQueue];
      set({ messageQueue: [] });

      for (const { event, payload, resolve, reject } of queue) {
        const id = generateId();
        state.pendingRequests.set(id, { resolve, reject });
        socket.emit(event, { ...payload, id });
      }
    },
  })),
);
