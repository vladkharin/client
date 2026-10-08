"use client";

import { useMediaSettingsStore } from "@/store/modules/mediaSettingsStore";

export interface AudioProcessingChain {
  audioContext: AudioContext;
  rawStream: MediaStream;
  processedStream: MediaStream;
  sourceNode: MediaStreamAudioSourceNode;
  highPassNode: BiquadFilterNode | null;
  rnnoiseNode: any | null;
  noiseGateNode: any | null;
  compressorNode: DynamicsCompressorNode | null;
  gainNode: GainNode;
  analyserNode: AnalyserNode;
  destinationNode: MediaStreamAudioDestinationNode;
  destroy: () => void;
}

let activeChain: AudioProcessingChain | null = null;
let rnnoiseWasmBinary: ArrayBuffer | null = null;
let isRnnoiseWorkletAdded = false;
let isNoiseGateWorkletAdded = false;

// Dynamically imported module reference
let suppressorModule: typeof import("@sapphi-red/web-noise-suppressor") | null = null;

async function getSuppressorModule() {
  if (typeof window === "undefined") return null;
  if (!suppressorModule) {
    try {
      suppressorModule = await import("@sapphi-red/web-noise-suppressor");
    } catch (e) {
      console.warn("Failed to load @sapphi-red/web-noise-suppressor:", e);
    }
  }
  return suppressorModule;
}

/**
 * Preloads RNNoise WASM and registers worklet modules
 */
export async function initAudioProcessors(audioContext: AudioContext): Promise<void> {
  if (typeof window === "undefined" || !audioContext.audioWorklet) return;

  const mod = await getSuppressorModule();
  if (!mod) return;

  try {
    if (!isRnnoiseWorkletAdded) {
      await audioContext.audioWorklet.addModule("/audio-processors/rnnoiseWorklet.js");
      isRnnoiseWorkletAdded = true;
    }
  } catch (err) {
    console.warn("Не удалось загрузить rnnoiseWorklet.js:", err);
  }

  try {
    if (!isNoiseGateWorkletAdded) {
      await audioContext.audioWorklet.addModule("/audio-processors/noiseGateWorklet.js");
      isNoiseGateWorkletAdded = true;
    }
  } catch (err) {
    console.warn("Не удалось загрузить noiseGateWorklet.js:", err);
  }

  if (!rnnoiseWasmBinary) {
    try {
      rnnoiseWasmBinary = await mod.loadRnnoise({
        url: "/audio-processors/rnnoise.wasm",
        simdUrl: "/audio-processors/rnnoise_simd.wasm",
      });
      console.log("⚡ RNNoise WASM успешно загружен в память");
    } catch (err) {
      console.warn("Не удалось загрузить RNNoise WASM:", err);
    }
  }
}

/**
 * Builds the complete DSP audio pipeline for microphone stream
 */
export async function createProcessedAudioStream(
  rawStream: MediaStream
): Promise<{ processedStream: MediaStream; chain: AudioProcessingChain }> {
  if (typeof window === "undefined") {
    return {
      processedStream: rawStream,
      chain: {
        audioContext: null as any,
        rawStream,
        processedStream: rawStream,
        sourceNode: null as any,
        highPassNode: null,
        rnnoiseNode: null,
        noiseGateNode: null,
        compressorNode: null,
        gainNode: null as any,
        analyserNode: null as any,
        destinationNode: null as any,
        destroy: () => {},
      },
    };
  }

  // If there's an existing chain, clean it up
  if (activeChain) {
    activeChain.destroy();
    activeChain = null;
  }

  const settings = useMediaSettingsStore.getState();

  // Create 48kHz AudioContext
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContextClass({
    sampleRate: 48000,
    latencyHint: "interactive",
  });

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const mod = await getSuppressorModule();
  await initAudioProcessors(audioContext);

  const sourceNode = audioContext.createMediaStreamSource(rawStream);
  let currentNode: AudioNode = sourceNode;

  // 1. High-Pass Filter (80Hz) — срез низкочастотного гула и вибраций стола
  let highPassNode: BiquadFilterNode | null = null;
  if (settings.highPassFilterEnabled) {
    highPassNode = audioContext.createBiquadFilter();
    highPassNode.type = "highpass";
    highPassNode.frequency.value = 80;
    highPassNode.Q.value = 0.7;
    currentNode.connect(highPassNode);
    currentNode = highPassNode;
  }

  // 2. RNNoise AI Worklet Node (Нейросетевое шумоподавление)
  let rnnoiseNode: any | null = null;
  if (settings.rnnoiseEnabled && isRnnoiseWorkletAdded && rnnoiseWasmBinary && mod?.RnnoiseWorkletNode) {
    try {
      rnnoiseNode = new mod.RnnoiseWorkletNode(audioContext, {
        maxChannels: 1,
        wasmBinary: rnnoiseWasmBinary,
      });
      currentNode.connect(rnnoiseNode);
      currentNode = rnnoiseNode;
    } catch (e) {
      console.warn("Ошибка создания RnnoiseWorkletNode:", e);
    }
  }

  // 3. Noise Gate Worklet Node (Шумовой затвор для отсечения дыхания и фоновой тишины)
  let noiseGateNode: any | null = null;
  if (settings.noiseGateEnabled && isNoiseGateWorkletAdded && mod?.NoiseGateWorkletNode) {
    try {
      const threshold = settings.autoNoiseGate ? -48 : settings.noiseGateThreshold;
      noiseGateNode = new mod.NoiseGateWorkletNode(audioContext, {
        openThreshold: threshold,
        closeThreshold: threshold - 3,
        holdMs: 80,
        maxChannels: 1,
      });
      currentNode.connect(noiseGateNode);
      currentNode = noiseGateNode;
    } catch (e) {
      console.warn("Ошибка создания NoiseGateWorkletNode:", e);
    }
  }

  // 4. Dynamics Compressor (Выравнивание громкости и защита от перегрузок)
  let compressorNode: DynamicsCompressorNode | null = null;
  if (settings.compressorEnabled) {
    compressorNode = audioContext.createDynamicsCompressor();
    compressorNode.threshold.value = -24;
    compressorNode.knee.value = 30;
    compressorNode.ratio.value = 4;
    compressorNode.attack.value = 0.003;
    compressorNode.release.value = 0.25;
    currentNode.connect(compressorNode);
    currentNode = compressorNode;
  }

  // 5. Gain Node (Регулировка входной громкости)
  const gainNode = audioContext.createGain();
  const volumeFraction = (settings.inputVolume ?? 100) / 100;
  gainNode.gain.value = volumeFraction;
  currentNode.connect(gainNode);
  currentNode = gainNode;

  // 6. Analyser Node (Для индикации громкости)
  const analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 256;
  analyserNode.smoothingTimeConstant = 0.3;
  currentNode.connect(analyserNode);

  // 7. Destination Node -> Получаем чистый MediaStream
  const destinationNode = audioContext.createMediaStreamDestination();
  currentNode.connect(destinationNode);

  const processedStream = destinationNode.stream;

  const chain: AudioProcessingChain = {
    audioContext,
    rawStream,
    processedStream,
    sourceNode,
    highPassNode,
    rnnoiseNode,
    noiseGateNode,
    compressorNode,
    gainNode,
    analyserNode,
    destinationNode,
    destroy: () => {
      try {
        if (rnnoiseNode && typeof rnnoiseNode.destroy === "function") {
          rnnoiseNode.destroy();
        }
      } catch {}
      try {
        sourceNode.disconnect();
        if (highPassNode) highPassNode.disconnect();
        if (rnnoiseNode) rnnoiseNode.disconnect();
        if (noiseGateNode) noiseGateNode.disconnect();
        if (compressorNode) compressorNode.disconnect();
        gainNode.disconnect();
        analyserNode.disconnect();
        destinationNode.disconnect();
      } catch {}
      try {
        if (audioContext && audioContext.state !== "closed") {
          audioContext.close();
        }
      } catch {}
    },
  };

  activeChain = chain;
  return { processedStream, chain };
}

export function getActiveAudioChain(): AudioProcessingChain | null {
  return activeChain;
}

export function destroyActiveAudioChain(): void {
  if (activeChain) {
    activeChain.destroy();
    activeChain = null;
  }
}
