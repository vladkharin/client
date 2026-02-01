import { useChatStore } from "@/store/modules/chat";
import { Socket } from "socket.io-client";
import { handleWebRtcSignal, initiateCall } from "./webrtcClient";

/**
 * Регистрирует все обработчики событий от сервера
 */
export const registerSocketListeners = (socket: Socket) => {
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

  socket.on("incoming_call", (data) => {
    useChatStore.getState().setIncomingCall({ callerId: data.from, conversationId: data.conversationId });
  });

  socket.on("call_accepted", (data) => {
    console.log("✅ Звонок принят:", data);
    initiateCall(data.by, data.conversationId);
    useChatStore.getState().setAcceptedCall({
      callerId: data.by,
      conversationId: data.conversationId,
    });
  });

  socket.on("webrtc_signal", (data) => {
    console.log("📡 WebRTC сигнал от", data.from, ":", data.data);
    handleWebRtcSignal(data.from, data.data);
  });
};
