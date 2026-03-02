// src/store/callStore.ts
import { create } from "zustand";
import * as mediasoup from "mediasoup-client";

interface RemoteParticipant {
  peerId: string;
  producerId: string;
  audio: HTMLAudioElement;
}

interface LocalProducer {
  id: string;
  kind: "audio" | "video";
  track: MediaStreamTrack;
}

interface CallState {
  // Состояние комнаты
  inCall: boolean;
  conversationId: number | null;
  error: string | null;

  // Локальные ресурсы
  localStream: MediaStream | null;
  producers: LocalProducer[];

  // Удалённые участники
  remoteParticipants: RemoteParticipant[];
  consumers: Record<string, mediasoup.types.Consumer>; // producerId → Consumer

  // Методы
  addRemoteParticipant: (peerId: string, producerId: string, audio: HTMLAudioElement) => void;
  removeRemoteParticipant: (producerId: string) => void;
  addProducer: (producer: LocalProducer) => void;
  removeProducer: (producerId: string) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setConversationId: (id: number | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  inCall: false,
  conversationId: null,
  error: null,

  localStream: null,
  producers: [],
  remoteParticipants: [],
  consumers: {},

  addRemoteParticipant: (peerId, producerId, audio) =>
    set((state) => ({
      remoteParticipants: [...state.remoteParticipants, { peerId, producerId, audio }],
    })),

  removeRemoteParticipant: (producerId) =>
    set((state) => {
      // Останавливаем аудио
      const participant = state.remoteParticipants.find((p) => p.producerId === producerId);
      if (participant) {
        participant.audio.pause();
        if (participant.audio.srcObject) {
          const stream = participant.audio.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        }
      }

      return {
        remoteParticipants: state.remoteParticipants.filter((p) => p.producerId !== producerId),
        consumers: Object.fromEntries(Object.entries(state.consumers).filter(([id]) => id !== producerId)),
      };
    }),

  addProducer: (producer) =>
    set((state) => ({
      producers: [...state.producers, producer],
    })),

  removeProducer: (producerId) =>
    set((state) => ({
      producers: state.producers.filter((p) => p.id !== producerId),
    })),

  setLocalStream: (stream) => set({ localStream: stream }),
  setConversationId: (id) => set({ conversationId: id, inCall: id !== null }),
  setError: (error) => set({ error }),
  reset: () => {
    const state = get();
    // Очистка локального стрима
    if (state.localStream) {
      state.localStream.getTracks().forEach((t) => t.stop());
    }
    // Очистка удалённых аудио
    state.remoteParticipants.forEach((p) => {
      p.audio.pause();
      if (p.audio.srcObject) {
        const stream = p.audio.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    });
    set({
      inCall: false,
      conversationId: null,
      error: null,
      localStream: null,
      producers: [],
      remoteParticipants: [],
      consumers: {},
    });
  },
}));
