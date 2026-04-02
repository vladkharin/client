import { useChatStore, useSocketStore } from "@/store";
import { consumeProducer, joinMediasoupRoom } from "../mediasoupManager";
import { Socket } from "socket.io-client";

export const CallingEvents = (socket: Socket) => {
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
};
