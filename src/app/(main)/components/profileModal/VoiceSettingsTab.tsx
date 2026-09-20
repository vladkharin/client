"use client";

import React, { useState, useEffect, useRef } from "react";
import { useMediaSettingsStore } from "@/store";
import { switchAudioInput, switchVideoInput } from "@/lib/mediasoupManager";
import styles from "./profileModal.module.css";

export default function VoiceSettingsTab() {
  const {
    audioInputDeviceId,
    audioOutputDeviceId,
    videoInputDeviceId,
    inputVolume,
    outputVolume,
    echoCancellation,
    noiseSuppression,
    autoGainControl,
    setAudioInputDeviceId,
    setAudioOutputDeviceId,
    setVideoInputDeviceId,
    setInputVolume,
    setOutputVolume,
    setEchoCancellation,
    setNoiseSuppression,
    setAutoGainControl,
  } = useMediaSettingsStore();

  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [hasPermission, setHasPermission] = useState(false);

  // Mic test state
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0); // 0 to 100
  const [hearMyself, setHearMyself] = useState(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const micAnimFrameRef = useRef<number | null>(null);
  const micGainRef = useRef<GainNode | null>(null);

  // Camera test state
  const [isTestingCam, setIsTestingCam] = useState(false);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Sound test state
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);

  const loadDevices = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const aIn = devices.filter((d) => d.kind === "audioinput");
      const aOut = devices.filter((d) => d.kind === "audiooutput");
      const vIn = devices.filter((d) => d.kind === "videoinput");

      setAudioInputs(aIn);
      setAudioOutputs(aOut);
      setVideoInputs(vIn);

      const hasLabels = devices.some((d) => Boolean(d.label));
      setHasPermission(hasLabels);
    } catch (e) {
      console.warn("Ошибка перечисления медиа-устройств:", e);
    }
  };

  useEffect(() => {
    loadDevices();
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", loadDevices);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", loadDevices);
      };
    }
  }, []);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((t) => t.stop());
      setHasPermission(true);
      await loadDevices();
    } catch (err) {
      console.error("Пользователь отклонил доступ к микрофону/камере:", err);
    }
  };

  // --- Микрофон: переключение устройства ---
  const handleAudioInputChange = (deviceId: string) => {
    setAudioInputDeviceId(deviceId);
    switchAudioInput(deviceId).catch(console.error);

    if (isTestingMic) {
      stopMicTest();
      setTimeout(() => startMicTest(deviceId), 100);
    }
  };

  // --- Микрофон: тест в реальном времени ---
  const startMicTest = async (targetDeviceId?: string) => {
    stopMicTest();
    const devId = targetDeviceId || audioInputDeviceId;

    try {
      const constraints: MediaTrackConstraints = {
        echoCancellation,
        noiseSuppression,
        autoGainControl,
        deviceId: devId && devId !== "default" ? { exact: devId } : undefined,
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      micAudioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;

      const gainNode = audioCtx.createGain();
      gainNode.gain.value = hearMyself ? 1.0 : 0.0;
      micGainRef.current = gainNode;

      source.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100 * (inputVolume / 100)));
        setMicLevel(normalized);

        micAnimFrameRef.current = requestAnimationFrame(updateMeter);
      };

      setIsTestingMic(true);
      updateMeter();
    } catch (err) {
      console.error("Не удалось запустить проверку микрофона:", err);
      setIsTestingMic(false);
    }
  };

  const stopMicTest = () => {
    if (micAnimFrameRef.current) {
      cancelAnimationFrame(micAnimFrameRef.current);
      micAnimFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (micAudioCtxRef.current) {
      micAudioCtxRef.current.close().catch(() => {});
      micAudioCtxRef.current = null;
    }
    micGainRef.current = null;
    setMicLevel(0);
    setIsTestingMic(false);
  };

  // Toggle hear myself during test
  const handleHearMyselfToggle = (val: boolean) => {
    setHearMyself(val);
    if (micGainRef.current) {
      micGainRef.current.gain.value = val ? 1.0 : 0.0;
    }
  };

  // --- Динамики: проверка звука ---
  const playSoundTest = async () => {
    if (isPlayingTestSound) return;
    setIsPlayingTestSound(true);

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const masterGain = audioCtx.createGain();
      masterGain.gain.value = (outputVolume / 100) * 0.35;
      masterGain.connect(audioCtx.destination);

      // Проигрываем красивый аккорд (C5 - E5 - G5 - C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const startTime = audioCtx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const noteGain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime + idx * 0.12);

        noteGain.gain.setValueAtTime(0, startTime + idx * 0.12);
        noteGain.gain.linearRampToValueAtTime(1, startTime + idx * 0.12 + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.12 + 0.45);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(startTime + idx * 0.12);
        osc.stop(startTime + idx * 0.12 + 0.5);
      });

      setTimeout(() => {
        setIsPlayingTestSound(false);
        audioCtx.close().catch(() => {});
      }, 1000);
    } catch (e) {
      console.warn("Ошибка тестового звука:", e);
      setIsPlayingTestSound(false);
    }
  };

  // --- Камера: проверка и переключение ---
  const handleVideoInputChange = (deviceId: string) => {
    setVideoInputDeviceId(deviceId);
    switchVideoInput(deviceId).catch(console.error);

    if (isTestingCam) {
      stopCamTest();
      setTimeout(() => startCamTest(deviceId), 100);
    }
  };

  const startCamTest = async (targetDeviceId?: string) => {
    stopCamTest();
    const devId = targetDeviceId || videoInputDeviceId;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          deviceId: devId && devId !== "default" ? { exact: devId } : undefined,
        },
      });
      videoStreamRef.current = stream;
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
      }
      setIsTestingCam(true);
    } catch (err) {
      console.error("Не удалось запустить видеокамеру:", err);
      setIsTestingCam(false);
    }
  };

  const stopCamTest = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    setIsTestingCam(false);
  };

  useEffect(() => {
    return () => {
      stopMicTest();
      stopCamTest();
    };
  }, []);

  return (
    <div className={styles.voiceSettingsContainer}>
      {!hasPermission && (
        <div className={styles.permissionCard}>
          <div className={styles.permissionInfo}>
            <span className={styles.permissionTitle}>🔒 Требуется доступ к оборудованию</span>
            <span className={styles.permissionDesc}>
              Разрешите доступ к микрофону и камере, чтобы отобразить точные названия устройств.
            </span>
          </div>
          <button type="button" className={styles.actionBtn} onClick={requestPermissions}>
            Предоставить доступ
          </button>
        </div>
      )}

      {/* --- СЕКЦИЯ 1: МИКРОФОН (ВВОД) --- */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeaderRow}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIcon}>🎙️</span>
            <span>Устройство ввода (Микрофон)</span>
          </div>
          <span className={styles.badgeText}>{audioInputs.length} найдено</span>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Микрофон</label>
          <select
            className={styles.selectInput}
            value={audioInputDeviceId}
            onChange={(e) => handleAudioInputChange(e.target.value)}
          >
            <option value="default">По умолчанию (Системный микрофон)</option>
            {audioInputs.map((device, idx) => (
              <option key={device.deviceId || idx} value={device.deviceId}>
                {device.label || `Микрофон ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.sliderHeader}>
            <label className={styles.label}>Громкость микрофона</label>
            <span className={styles.sliderValue}>{inputVolume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={inputVolume}
            onChange={(e) => setInputVolume(Number(e.target.value))}
            className={styles.rangeSlider}
          />
        </div>

        {/* Проверка микрофона */}
        <div className={styles.testBox}>
          <div className={styles.testBoxHeader}>
            <div>
              <span className={styles.testBoxTitle}>Проверка микрофона</span>
              <span className={styles.testBoxSubtitle}>
                {isTestingMic
                  ? micLevel > 15
                    ? "🟢 Отлично! Микрофон улавливает голос"
                    : "Говорите в микрофон, чтобы проверить..."
                  : "Нажмите кнопку, чтобы проверить громкость и чувствительность"}
              </span>
            </div>
            <button
              type="button"
              className={`${styles.testBtn} ${isTestingMic ? styles.testBtnActive : ""}`}
              onClick={() => (isTestingMic ? stopMicTest() : startMicTest())}
            >
              {isTestingMic ? "⏹️ Остановить" : "🎙️ Проверить"}
            </button>
          </div>

          {/* VU Meter Bar */}
          <div className={styles.vuMeterContainer}>
            <div
              className={styles.vuMeterFill}
              style={{
                width: `${micLevel}%`,
                background:
                  micLevel > 80
                    ? "linear-gradient(90deg, #10b981, #f59e0b, #ef4444)"
                    : micLevel > 40
                    ? "linear-gradient(90deg, #10b981, #f59e0b)"
                    : "linear-gradient(90deg, #10b981, #34d399)",
              }}
            />
          </div>

          {isTestingMic && (
            <label className={styles.checkboxLabel} style={{ marginTop: "10px" }}>
              <input
                type="checkbox"
                checked={hearMyself}
                onChange={(e) => handleHearMyselfToggle(e.target.checked)}
              />
              <span>🎧 Слышать себя в наушниках (самопрослушивание)</span>
            </label>
          )}
        </div>

        {/* Улучшение звука и фильтры */}
        <div className={styles.togglesGroup}>
          <span className={styles.togglesGroupTitle}>Обработка и улучшение звука</span>

          <label className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleTitle}>🛡️ Шумоподавление (Noise Suppression)</span>
              <span className={styles.toggleDesc}>
                Фильтрует фоновые шумы: кулеры, щелчки клавиатуры, шум комнаты.
              </span>
            </div>
            <input
              type="checkbox"
              checked={noiseSuppression}
              onChange={(e) => setNoiseSuppression(e.target.checked)}
              className={styles.switchInput}
            />
          </label>

          <label className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleTitle}>🔊 Эхоподавление (Echo Cancellation)</span>
              <span className={styles.toggleDesc}>
                Предотвращает возникновение эха и обратной связи из динамиков.
              </span>
            </div>
            <input
              type="checkbox"
              checked={echoCancellation}
              onChange={(e) => setEchoCancellation(e.target.checked)}
              className={styles.switchInput}
            />
          </label>

          <label className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleTitle}>🎚️ Авторегулировка усиления (Auto Gain)</span>
              <span className={styles.toggleDesc}>
                Автоматически выравнивает уровень шепота и громкого голоса.
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoGainControl}
              onChange={(e) => setAutoGainControl(e.target.checked)}
              className={styles.switchInput}
            />
          </label>
        </div>
      </div>

      {/* --- СЕКЦИЯ 2: ДИНАМИКИ / НАУШНИКИ (ВЫВОД) --- */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeaderRow}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIcon}>🔊</span>
            <span>Устройство вывода (Динамики / Наушники)</span>
          </div>
          <span className={styles.badgeText}>{audioOutputs.length || 1} найдено</span>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Динамики</label>
          <select
            className={styles.selectInput}
            value={audioOutputDeviceId}
            onChange={(e) => setAudioOutputDeviceId(e.target.value)}
          >
            <option value="default">По умолчанию (Системные динамики)</option>
            {audioOutputs.map((device, idx) => (
              <option key={device.deviceId || idx} value={device.deviceId}>
                {device.label || `Динамики ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.sliderHeader}>
            <label className={styles.label}>Громкость звука</label>
            <span className={styles.sliderValue}>{outputVolume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={outputVolume}
            onChange={(e) => setOutputVolume(Number(e.target.value))}
            className={styles.rangeSlider}
          />
        </div>

        {/* Проверка звука */}
        <div className={styles.testBox}>
          <div className={styles.testBoxHeader}>
            <div>
              <span className={styles.testBoxTitle}>Проверка динамиков</span>
              <span className={styles.testBoxSubtitle}>
                Воспроизвести гармоничный тестовый сигнал CraftHive для проверки звука.
              </span>
            </div>
            <button
              type="button"
              className={`${styles.testBtn} ${isPlayingTestSound ? styles.testBtnActive : ""}`}
              onClick={playSoundTest}
              disabled={isPlayingTestSound}
            >
              {isPlayingTestSound ? "🎵 Играет..." : "🔊 Проверить звук"}
            </button>
          </div>
        </div>
      </div>

      {/* --- СЕКЦИЯ 3: ВИДЕОКАМЕРА --- */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionHeaderRow}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIcon}>📹</span>
            <span>Видеокамера</span>
          </div>
          <span className={styles.badgeText}>{videoInputs.length} найдено</span>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Камера</label>
          <select
            className={styles.selectInput}
            value={videoInputDeviceId}
            onChange={(e) => handleVideoInputChange(e.target.value)}
          >
            <option value="default">По умолчанию (Системная камера)</option>
            {videoInputs.map((device, idx) => (
              <option key={device.deviceId || idx} value={device.deviceId}>
                {device.label || `Камера ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Тест камеры */}
        <div className={styles.testBox}>
          <div className={styles.testBoxHeader}>
            <div>
              <span className={styles.testBoxTitle}>Предпросмотр видео</span>
              <span className={styles.testBoxSubtitle}>
                Проверьте освещение и угол обзора перед звонком.
              </span>
            </div>
            <button
              type="button"
              className={`${styles.testBtn} ${isTestingCam ? styles.testBtnActive : ""}`}
              onClick={() => (isTestingCam ? stopCamTest() : startCamTest())}
            >
              {isTestingCam ? "⏹️ Выключить" : "📹 Включить камеру"}
            </button>
          </div>

          {isTestingCam && (
            <div className={styles.camPreviewWrapper}>
              <video
                ref={videoElementRef}
                autoPlay
                playsInline
                muted
                className={styles.camPreviewVideo}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
