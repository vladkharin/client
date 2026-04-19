import { useCallStore, useChatStore, useSocketStore } from "@/store";
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
    const { setOutgoing } = useCallStore.getState();

    console.log("✅ Звонок принят:", data);
    useChatStore.getState().setAcceptedCall({
      callerId: data.by,
      conversationId: data.conversationId,
    });

    setOutgoing(false);
    console.log("✅ Звонок начался, подключаемся к MediaSoup");
    joinMediasoupRoom(data.conversationId);
  });

  // socket.on("call:started", (data) => {
  //   setOutgoing(false);
  //   console.log("✅ Звонок начался, подключаемся к MediaSoup");
  //   joinMediasoupRoom(data.conversationId);
  // });

  socket.on("webrtc_signal", (data) => {
    console.log("📡 WebRTC сигнал от", data.from, ":", data.data);
  });

  socket.on("call:newProducer", (data: { producerId: string; userId: number; conversationId: number }) => {
    console.log("📥 Получен new-producer:", data);
    consumeProducer(data.conversationId, data.producerId, String(data.userId));
  });

  socket.on("producer-closed", (payload: { producerId: string }) => {
    console.log("📡 Собеседник закрыл поток:", payload.producerId);

    const { reset } = useCallStore.getState();

    // 1. Удаляем конкретного участника из стора
    // removeRemoteParticipant(payload.producerId);

    // 2. Если это был единственный собеседник в комнате (для личек),
    // или если логика бэкенда подразумевает полное закрытие звонка:
    reset();
  });

  socket.on("call:cancelled", (payload: { producerId: string }) => {
    console.log("📡 Собеседник закрыл поток:", payload.producerId);

    const { reset } = useCallStore.getState();
    const { setIncomingCall } = useChatStore.getState();

    setIncomingCall(null);
    // 1. Удаляем конкретного участника из стора
    // removeRemoteParticipant(payload.producerId);

    // 2. Если это был единственный собеседник в комнате (для личек),
    // или если логика бэкенда подразумевает полное закрытие звонка:
    reset();
  });
};
