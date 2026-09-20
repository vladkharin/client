import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface MediaSettingsState {
  audioInputDeviceId: string;
  audioOutputDeviceId: string;
  videoInputDeviceId: string;
  inputVolume: number; // 0 - 100
  outputVolume: number; // 0 - 100
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;

  setAudioInputDeviceId: (id: string) => void;
  setAudioOutputDeviceId: (id: string) => void;
  setVideoInputDeviceId: (id: string) => void;
  setInputVolume: (vol: number) => void;
  setOutputVolume: (vol: number) => void;
  setEchoCancellation: (val: boolean) => void;
  setNoiseSuppression: (val: boolean) => void;
  setAutoGainControl: (val: boolean) => void;
  applyOutputSettings: () => void;
}

export const useMediaSettingsStore = create<MediaSettingsState>()(
  persist(
    devtools(
      (set, get) => ({
        audioInputDeviceId: "default",
        audioOutputDeviceId: "default",
        videoInputDeviceId: "default",
        inputVolume: 100,
        outputVolume: 100,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,

        setAudioInputDeviceId: (id) => set({ audioInputDeviceId: id }),

        setAudioOutputDeviceId: (id) => {
          set({ audioOutputDeviceId: id });
          get().applyOutputSettings();
        },

        setVideoInputDeviceId: (id) => set({ videoInputDeviceId: id }),

        setInputVolume: (vol) => set({ inputVolume: Math.max(0, Math.min(100, vol)) }),

        setOutputVolume: (vol) => {
          const clamped = Math.max(0, Math.min(100, vol));
          set({ outputVolume: clamped });
          get().applyOutputSettings();
        },

        setEchoCancellation: (val) => set({ echoCancellation: val }),
        setNoiseSuppression: (val) => set({ noiseSuppression: val }),
        setAutoGainControl: (val) => set({ autoGainControl: val }),

        applyOutputSettings: () => {
          if (typeof document === "undefined") return;
          const { outputVolume, audioOutputDeviceId } = get();
          const audioElements = document.querySelectorAll<HTMLAudioElement>('audio[id^="remote-audio-"]');
          audioElements.forEach((audio) => {
            audio.volume = outputVolume / 100;
            if (audioOutputDeviceId && audioOutputDeviceId !== "default" && typeof (audio as any).setSinkId === "function") {
              (audio as any).setSinkId(audioOutputDeviceId).catch((err: any) => {
                console.warn("Не удалось применить setSinkId к аудио:", err);
              });
            }
          });
        },
      }),
      { name: "media-settings-store" },
    ),
    {
      name: "crafthive-media-settings",
    },
  ),
);
