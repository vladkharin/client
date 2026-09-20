import { create } from "zustand";
import * as mediasoup from "mediasoup-client";
import { devtools } from "zustand/middleware";

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
  isOutgoing: boolean; // Статус исходящего вызова (ожидание ответа)
  conversationId: number | null;
  error: string | null;

  // Локальные ресурсы
  localStream: MediaStream | null;
  producers: LocalProducer[];

  // Удалённые участники
  remoteParticipants: RemoteParticipant[];
  consumers: Record<string, mediasoup.types.Consumer>; // producerId → Consumer

  // Методы
  setOutgoing: (isOutgoing: boolean) => void;
  setConversationId: (id: number | null) => void;
  setInCall: (inCall: boolean) => void;

  addRemoteParticipant: (peerId: string, producerId: string, audio: HTMLAudioElement) => void;
  removeRemoteParticipant: (producerId: string) => void;
  addProducer: (producer: LocalProducer) => void;
  removeProducer: (producerId: string) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setError: (error: string | null) => void;

  reset: () => void;
}

export const useCallStore = create<CallState>()(
  devtools(
    (set, get) => ({
      inCall: false,
      isOutgoing: false,
      conversationId: null,
      error: null,

      localStream: null,
      producers: [],
      remoteParticipants: [],
      consumers: {},

      // Управление статусами
      setOutgoing: (isOutgoing) => set({ isOutgoing }),

      setConversationId: (id) =>
        set({
          conversationId: id,
          // Если мы устанавливаем ID, но это не исходящий вызов, значит мы уже в процессе
          inCall: id !== null && !get().isOutgoing,
        }),

      setInCall: (inCall) => set({ inCall }),

      // Управление участниками
      addRemoteParticipant: (peerId, producerId, audio) =>
        set((state) => {
          const old = state.remoteParticipants.find((p) => p.peerId === peerId || p.producerId === producerId);
          if (old && old.audio !== audio) {
            old.audio.pause();
            old.audio.remove();
          }
          const filtered = state.remoteParticipants.filter((p) => p.peerId !== peerId && p.producerId !== producerId);
          return {
            remoteParticipants: [...filtered, { peerId, producerId, audio }],
          };
        }),

      removeRemoteParticipant: (id: string) =>
        set((state) => {
          const participant = state.remoteParticipants.find(
            (p) => p.producerId === id || p.peerId === id,
          );
          if (participant) {
            participant.audio.pause();
            participant.audio.remove();
            if (participant.audio.srcObject) {
              const stream = participant.audio.srcObject as MediaStream;
              stream.getTracks().forEach((track) => track.stop());
            }
          }

          const newConsumers = { ...state.consumers };
          delete newConsumers[id];
          if (participant?.producerId) {
            delete newConsumers[participant.producerId];
          }

          return {
            remoteParticipants: state.remoteParticipants.filter(
              (p) => p.producerId !== id && p.peerId !== id,
            ),
            consumers: newConsumers,
          };
        }),

      // Локальные медиа
      addProducer: (producer) =>
        set((state) => ({
          producers: [...state.producers, producer],
        })),

      removeProducer: (producerId) =>
        set((state) => ({
          producers: state.producers.filter((p) => p.id !== producerId),
        })),

      setLocalStream: (stream) => set({ localStream: stream }),

      setError: (error) => set({ error }),

      // Полная очистка при выходе из звонка или отмене
      reset: () => {
        const state = get();

        // Остановка локальных треков
        if (state.localStream) {
          state.localStream.getTracks().forEach((t) => t.stop());
        }

        // Остановка всех удалённых аудио-потоков
        state.remoteParticipants.forEach((p) => {
          p.audio.pause();
          if (p.audio.srcObject) {
            const stream = p.audio.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
          }
        });

        // Закрытие всех потребителей (если необходимо на стороне клиента)
        Object.values(state.consumers).forEach((consumer) => {
          consumer.close();
        });

        set({
          inCall: false,
          isOutgoing: false,
          conversationId: null,
          error: null,
          localStream: null,
          producers: [],
          remoteParticipants: [],
          consumers: {},
        });
      },
    }),
    {
      name: "call-store",
    },
  ),
);
