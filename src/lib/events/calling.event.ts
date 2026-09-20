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
  socket.off("mediasoup:getRouterRtpCapabilities");
  socket.on("mediasoup:getRouterRtpCapabilities", handleResponse("mediasoup:getRouterRtpCapabilities"));
  socket.off("mediasoup:createWebRtcTransport");
  socket.on("mediasoup:createWebRtcTransport", handleResponse("mediasoup:createWebRtcTransport"));
  socket.off("mediasoup:produce");
  socket.on("mediasoup:produce", handleResponse("mediasoup:produce"));
  socket.off("mediasoup:consume");
  socket.on("mediasoup:consume", handleResponse("mediasoup:consume"));

  socket.off("call:incoming");
  socket.on("call:incoming", (data) => {
    useChatStore.getState().setIncomingCall({ callerId: data.from, conversationId: data.conversationId });
  });

  socket.off("call:accepted");
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

  socket.off("webrtc_signal");
  socket.on("webrtc_signal", (data) => {
    console.log("📡 WebRTC сигнал от", data.from, ":", data.data);
  });

  socket.off("call:newProducer");
  socket.on("call:newProducer", (data: { producerId: string; userId: number; conversationId: number }) => {
    console.log("📥 Получен new-producer:", data);
    consumeProducer(data.conversationId, data.producerId, String(data.userId));
  });

  socket.off("producer-closed");
  socket.on("producer-closed", (payload: { producerId: string }) => {
    console.log("📡 Собеседник закрыл поток:", payload.producerId);

    const { reset } = useCallStore.getState();
    reset();
  });

  socket.off("call:cancelled");
  socket.on("call:cancelled", (payload: { producerId: string }) => {
    console.log("📡 Собеседник закрыл поток:", payload.producerId);

    const { reset } = useCallStore.getState();
    const { setIncomingCall } = useChatStore.getState();

    setIncomingCall(null);
    reset();
  });

  socket.off("voice:roomUsers");
  socket.on("voice:roomUsers", (data: { conversationId: number; users: any[] }) => {
    console.log("👥 [voice:roomUsers] Обновлен список участников канала:", data);
    useCallStore.getState().setChannelParticipants(data.conversationId, data.users || []);
  });

  socket.off("call:peerLeft");
  socket.on("call:peerLeft", (data: { userId: number }) => {
    console.log("👋 [call:peerLeft] Пользователь вышел:", data.userId);
    useCallStore.getState().removeRemoteParticipant(String(data.userId));
  });
};

