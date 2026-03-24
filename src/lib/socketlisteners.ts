import { useChatStore } from "@/store/modules/chat";
import { Socket } from "socket.io-client";
import { consumeProducer, joinMediasoupRoom } from "./mediasoupManager";
import { useSocketStore } from "@/store";
import { useFinderStore, USERS_LIST } from "@/store/modules/finderStore";
import { REQUEST, useUserStore } from "@/store/modules/user";
import { NOTIFICATIONS } from "@/commands/commands";

/**
 * Регистрирует все обработчики событий от сервера
 */
export const registerSocketListeners = (socket: Socket) => {
  const { setUsers } = useFinderStore.getState();
  const { setFriendRequest, addFriendRequest } = useUserStore.getState();
  const handleResponse = (event: string) => (data: { id: string; response?: unknown; error?: string }) => {
    console.log(event);
    const { id, response, error } = data;
    const { pendingRequests } = useSocketStore.getState();

    if (id && pendingRequests.has(id)) {
      const { resolve, reject } = pendingRequests.get(id)!;
      pendingRequests.delete(id);

      if (error) {
        reject(new Error(error));
      } else {
        resolve(response);
      }
    }
  };

  // Регистрируем обработчики
  socket.on("mediasoup:getRouterRtpCapabilities", handleResponse("mediasoup:getRouterRtpCapabilities"));
  socket.on("mediasoup:createWebRtcTransport", handleResponse("mediasoup:createWebRtcTransport"));
  socket.on("mediasoup:produce", handleResponse("mediasoup:produce"));
  socket.on("mediasoup:consume", handleResponse("mediasoup:consume"));
  // Пример: обработка списка чатов
  socket.on("dm:list", (data) => {
    if ("response" in data) {
      console.log("📥 Получен список чатов:", data.response);

      useChatStore.getState().setChats(data.response);
      // Обновляем Zustand-состояние
      //   useChatStore.getState().setChats(data.response);
    } else if ("error" in data) {
      console.error("❌ Ошибка загрузки чатов:", data.error);
    }
  });

  socket.on("call:incoming", (data) => {
    console.log();
    useChatStore.getState().setIncomingCall({ callerId: data.from, conversationId: data.conversationId });
  });

  socket.on("call:accepted", (data) => {
    console.log("✅ Звонок принят:", data);
    useChatStore.getState().setAcceptedCall({
      callerId: data.by,
      conversationId: data.conversationId,
    });
  });

  socket.on("call:started", (data) => {
    console.log("✅ Звонок начался, подключаемся к MediaSoup");
    joinMediasoupRoom(data.conversationId);
  });

  socket.on("webrtc_signal", (data) => {
    console.log("📡 WebRTC сигнал от", data.from, ":", data.data);
  });

  socket.on("new-producer", (data: { producerId: string; peerId: number; conversationId: number }) => {
    console.log("📥 Получен new-producer:", data);
    consumeProducer(data.conversationId, data.producerId, String(data.peerId));
  });

  socket.on("producer-closed", (data: { producerId: string }) => {
    console.log("CloseOperation producer:", data.producerId);
    // Можно добавить удаление из UI
  });

  socket.on("users:find", (data: { id: number; response: USERS_LIST[] }) => {
    console.log("Получены совпадения", data);
    setUsers(data.response);
  });

  socket.on("friend:incoming", (data: { id: number; response: REQUEST[] }) => {
    setFriendRequest(data.response, "incoming");
  });

  socket.on(
    NOTIFICATIONS.friendRequestReceived,
    (data: { createdAt: string; friendshipId: number; from: { id: number; username: string } }) => {
      addFriendRequest(data.from, "incoming");
    },
  );
};
