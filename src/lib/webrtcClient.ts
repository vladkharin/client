// src/lib/webrtcClient.ts

import { useSocketStore } from "@/store";

let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let currentConversationId: number | null = null;

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

interface WebRtcOfferAnswer {
  type: "offer" | "answer";
  sdp: string;
}

interface WebRtcIceCandidate {
  candidate: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
}

function isWebRtcOfferAnswer(obj: unknown): obj is WebRtcOfferAnswer {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "type" in obj &&
    (obj.type === "offer" || obj.type === "answer") &&
    "sdp" in obj &&
    typeof obj.sdp === "string"
  );
}

function isWebRtcIceCandidate(obj: unknown): obj is WebRtcIceCandidate {
  return typeof obj === "object" && obj !== null && "candidate" in obj && typeof obj.candidate === "string";
}

// Инициатор звонка (caller)
export const initiateCall = async (calleeId: number, conversationId: number) => {
  cleanup();
  currentConversationId = conversationId;

  try {
    peerConnection = new RTCPeerConnection(configuration);
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Добавляем только аудио-треки
    localStream.getTracks().forEach((track) => {
      peerConnection?.addTrack(track, localStream!);
    });

    // Обработка входящего аудио
    peerConnection.ontrack = (event) => {
      console.log("🎧 Получен аудио-поток:", event.streams[0]);
      const remoteAudio = new Audio();
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.play().catch((e) => {
        console.warn("Авто-воспроизведение аудио заблокировано:", e);
        // Можно показать кнопку "Разрешить звук"
      });
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

    useSocketStore.getState().sendMessage("call:signal", {
      targetUserId: calleeId,
      data: offer,
      conversationId,
    });
  } catch (error) {
    console.error("❌ Не удалось начать аудиозвонок:", error);
    cleanup();
  }
};

// Получатель звонка (callee)
export const answerCall = async (callerId: number, conversationId: number) => {
  cleanup();
  currentConversationId = conversationId;

  try {
    peerConnection = new RTCPeerConnection(configuration);
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    localStream.getTracks().forEach((track) => {
      peerConnection?.addTrack(track, localStream!);
    });

    peerConnection.ontrack = (event) => {
      console.log("🎧 Получен аудио-поток:", event.streams[0]);
      const remoteAudio = new Audio();
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.play().catch((e) => {
        console.warn("Авто-воспроизведение аудио заблокировано:", e);
      });
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

    // 🔥 КРИТИЧЕСКИ ВАЖНО: дождаться offer, затем создать и отправить answer
    // Но на самом деле — answer создаётся в handleWebRtcSignal при получении offer
    // Поэтому здесь достаточно только подготовить peerConnection
    // Однако убедитесь, что handleWebRtcSignal вызывается ДО этого
  } catch (error) {
    console.error("❌ Не удалось ответить на аудиозвонок:", error);
    cleanup();
  }
};

// Обработка всех WebRTC-сигналов
export const handleWebRtcSignal = async (fromId: number, signal: unknown) => {
  console.log("🔧 peerConnection exists:", !!peerConnection);
  console.log("📥 Signal:", signal);

  if (!peerConnection || !currentConversationId) {
    console.warn("⚠️ Пропущен сигнал: peerConnection не готов");
    return;
  }

  try {
    if (isWebRtcOfferAnswer(signal)) {
      const desc: RTCSessionDescriptionInit = {
        type: signal.type,
        sdp: signal.sdp,
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(desc));

      if (desc.type === "offer") {
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        useSocketStore.getState().sendMessage("call:signal", {
          targetUserId: fromId,
          data: answer,
          conversationId: currentConversationId,
        });
      }
    } else if (isWebRtcIceCandidate(signal)) {
      const iceCandidate: RTCIceCandidateInit = {
        candidate: signal.candidate,
        sdpMid: signal.sdpMid,
        sdpMLineIndex: signal.sdpMLineIndex,
      };

      await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
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
};
