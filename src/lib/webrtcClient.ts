// src/lib/webrtcClient.ts

import { useSocketStore } from "@/store";

let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let currentConversationId: number | null = null;

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Универсальная функция для отображения удалённого видео
const setupRemoteVideo = (stream: MediaStream) => {
  const remoteVideo = document.getElementById("remoteVideo") as HTMLVideoElement;
  if (remoteVideo) {
    remoteVideo.srcObject = stream;
  }
};

// Инициатор звонка (caller)
export const initiateCall = async (calleeId: number, conversationId: number) => {
  cleanup();
  currentConversationId = conversationId;

  peerConnection = new RTCPeerConnection(configuration);
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

  localStream.getTracks().forEach((track) => peerConnection?.addTrack(track, localStream!));

  // Показываем своё видео
  const localVideo = document.getElementById("localVideo") as HTMLVideoElement;
  if (localVideo) localVideo.srcObject = localStream;

  // Когда приходит видео от собеседника
  peerConnection.ontrack = (event) => {
    setupRemoteVideo(event.streams[0]);
  };

  // Отправка ICE-кандидатов
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && peerConnection) {
      useSocketStore.getState().sendMessage("call:signal", {
        targetUserId: calleeId,
        data: event.candidate,
        conversationId,
      });
    }
  };

  // Создаём offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // Отправляем offer через WebSocket
  useSocketStore.getState().sendMessage("call:signal", {
    targetUserId: calleeId,
    data: offer,
    conversationId,
  });
};

// Получатель звонка (callee)
export const answerCall = async (callerId: number, conversationId: number) => {
  cleanup();
  currentConversationId = conversationId;

  peerConnection = new RTCPeerConnection(configuration);
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

  localStream.getTracks().forEach((track) => peerConnection?.addTrack(track, localStream!));

  const localVideo = document.getElementById("localVideo") as HTMLVideoElement;
  if (localVideo) localVideo.srcObject = localStream;

  peerConnection.ontrack = (event) => {
    setupRemoteVideo(event.streams[0]);
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && peerConnection) {
      useSocketStore.getState().sendMessage("call:signal", {
        targetUserId: callerId,
        data: event.candidate,
        conversationId,
      });
    }
  };
};

// Обработка всех WebRTC-сигналов (offer, answer, ice-candidate)
export const handleWebRtcSignal = async (fromId: number, signal: any) => {
  if (!peerConnection || !currentConversationId) return;

  try {
    if (signal.type === "offer") {
      // Получили offer → отвечаем answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      useSocketStore.getState().sendMessage("call:signal", {
        targetUserId: fromId,
        data: answer,
        conversationId: currentConversationId,
      });
    } else if (signal.type === "answer") {
      // Получили answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
    } else if (signal.candidate) {
      // ICE-кандидат
      await peerConnection.addIceCandidate(new RTCIceCandidate(signal));
    }
  } catch (error) {
    console.error("🔥 WebRTC error:", error);
  }
};

// Очистка ресурсов
export const cleanup = () => {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }
  if (peerConnection) {
    peerConnection.close();
  }
  peerConnection = null;
  localStream = null;
  currentConversationId = null;

  // Очищаем видео
  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");
  if (localVideo) localVideo.srcObject = null;
  if (remoteVideo) remoteVideo.srcObject = null;
};
