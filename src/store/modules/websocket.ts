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
  pendingRequests: Map<string, { resolve: (value: any) => void; reject: (err: Error) => void }>;

  connect: (token: string, onReady?: () => void) => void;
  disconnect: () => void;
  sendMessage: <T extends Record<string, unknown>>(event: string, payload: T) => Promise<any>;
}

const PROD_SOCKET_URL = "https://crafthive.ru";
const DEV_SOCKET_URL = "http://localhost:3001";

// Синглтон для работы с Socket.io вне жизненного цикла React/Zustand (важно для HMR)
const getGlobalSocket = (): Socket | null => (globalThis as any).__socketInstance ?? null;
const setGlobalSocket = (socket: Socket | null) => {
  (globalThis as any).__socketInstance = socket;
};

export const useSocketStore = create<SocketState>()(
  devtools((set, get) => ({
    socket: null,
    isConnected: false,
    pendingRequests: new Map(),

    connect: (token: string, onReady?: () => void) => {
      const currentGlobal = getGlobalSocket();

      // Если сокет уже есть и подключен — просто обновляем стейт
      if (currentGlobal?.connected) {
        set({ socket: currentGlobal, isConnected: true });
        onReady?.();
        return;
      }

      // Если сокет существует, но мертв — чистим его перед новым созданием
      if (currentGlobal) {
        currentGlobal.removeAllListeners();
        currentGlobal.disconnect();
      }

      const { server } = useGlobalStore.getState();
      const SOCKET_URL = server === SERVER_TYPE.PROD ? PROD_SOCKET_URL : DEV_SOCKET_URL;

      const socket = io(SOCKET_URL, {
        query: { token },
        transports: ["websocket"],
        autoConnect: true, // Включаем авто-коннект
        reconnection: true,
      });

      setGlobalSocket(socket);

      // --- ОБРАБОТЧИКИ СОБЫТИЙ ---

      socket.on("connect", () => {
        console.log("🟢 Socket connected:", socket.id);
        set({ isConnected: true, socket });
      });

      socket.on("auth:ready", () => {
        console.log("🔐 Auth ready");
        // Вызываем запросы после авторизации
        requestAfterAuthorization();
        registerSocketListeners(socket);
        onReady?.();
      });

      socket.on("disconnect", (reason) => {
        console.warn("🟡 Socket disconnected:", reason);
        set({ isConnected: false });
      });

      // Универсальный слушатель ответов (если сервер шлет ответ не через callback)
      socket.onAny((event, data) => {
        if (data?.id && get().pendingRequests.has(data.id)) {
          console.log(`📩 [onAny] Ответ для ${event}`);
          const { resolve, reject } = get().pendingRequests.get(data.id)!;
          get().pendingRequests.delete(data.id);

          if (data.error) reject(new Error(data.error));
          else resolve(data.response ?? data);
        }
      });

      set({ socket });
    },

    disconnect: () => {
      const { socket, pendingRequests } = get();
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        setGlobalSocket(null);
      }
      pendingRequests.forEach((req) => req.reject(new Error("Socket disconnected")));
      pendingRequests.clear();
      set({ socket: null, isConnected: false });
    },

    /**
     * Самый надежный метод отправки:
     * 1. Ждет соединения, если оно еще не установлено
     * 2. Использует встроенные ACK (callbacks)
     * 3. Имеет страховку через timeout
     */
    sendMessage: async (event, payload) => {
      const id = generateId();

      // Логика ожидания коннекта
      const ensureConnected = (): Promise<Socket> => {
        return new Promise((resolve, reject) => {
          const s = get().socket || getGlobalSocket();
          if (s?.connected) return resolve(s);

          const timeout = setTimeout(() => reject(new Error(`Connection timeout for ${event}`)), 5000);

          const checkInterval = setInterval(() => {
            const currentSocket = get().socket || getGlobalSocket();
            if (currentSocket?.connected) {
              clearInterval(checkInterval);
              clearTimeout(timeout);
              resolve(currentSocket);
            }
          }, 100);
        });
      };

      try {
        const socket = await ensureConnected();

        return new Promise((resolve, reject) => {
          // Ставим тайм-аут на ответ от сервера
          const responseTimeout = setTimeout(() => {
            if (get().pendingRequests.has(id)) {
              get().pendingRequests.delete(id);
              reject(new Error(`Server response timeout: ${event}`));
            }
          }, 10000);

          // Сохраняем запрос в Map (страховка для onAny)
          get().pendingRequests.set(id, {
            resolve: (val) => {
              clearTimeout(responseTimeout);
              resolve(val);
            },
            reject: (err) => {
              clearTimeout(responseTimeout);
              reject(err);
            },
          });

          console.log(`📤 [Emit] ${event}`, { ...payload, id });

          // Отправляем с Callback (NestJS его подхватит)
          socket.emit(event, { ...payload, id }, (response: any) => {
            // Если мы уже обработали этот ID через onAny или таймаут — выходим
            if (!get().pendingRequests.has(id)) return;

            clearTimeout(responseTimeout);
            get().pendingRequests.delete(id);

            console.log(`📩 [Ack] ${event}`, response);

            if (response?.error) reject(new Error(response.error));
            else resolve(response?.response ?? response);
          });
        });
      } catch (err) {
        console.error(`❌ [Send Error] ${event}:`, err);
        throw err;
      }
    },
  })),
);
