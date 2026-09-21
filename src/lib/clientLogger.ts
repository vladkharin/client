import { useUserStore, useGlobalStore } from "@/store";
import { SERVER_TYPE } from "@/store/modules/global";

const DEV_API_URL = "http://localhost:3001/api";
const PROD_API_URL = "https://api.crafthive.ru/api";

export interface ClientErrorPayload {
  source: "webrtc" | "webrtc_mic" | "webrtc_transport" | "webrtc_join" | "socket" | "react" | "unhandled_rejection" | "api" | "general";
  message: string;
  stack?: string;
  context?: Record<string, any>;
}

// Защита от спама одинаковыми ошибками (дедупликация 10 сек)
const recentErrors = new Map<string, number>();

export function getDeviceInfo() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { isServer: true };
  }

  const ua = navigator.userAgent;
  let os = "Unknown OS";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Unknown Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/OPR\//i.test(ua) || /Opera\//i.test(ua)) browser = "Opera";

  return {
    os,
    browser,
    userAgent: ua,
    screen: `${window.innerWidth}x${window.innerHeight}`,
    isSecureContext: window.isSecureContext ?? false,
    hasMediaDevices: typeof navigator.mediaDevices !== "undefined",
    hasGetUserMedia: typeof navigator.mediaDevices?.getUserMedia === "function",
    hasWebRTC: typeof window.RTCPeerConnection !== "undefined",
  };
}

export function reportClientError(payload: ClientErrorPayload) {
  if (typeof window === "undefined") return;

  const key = `${payload.source}:${payload.message}`;
  const now = Date.now();
  const lastTime = recentErrors.get(key);

  if (lastTime && now - lastTime < 10000) {
    return; // Пропускаем дубликат за последние 10 сек
  }
  recentErrors.set(key, now);

  try {
    const userState = useUserStore.getState();
    const { server } = useGlobalStore.getState();
    const API_URL = server === SERVER_TYPE.PROD ? PROD_API_URL : DEV_API_URL;

    const data = {
      userId: userState.user_id ?? null,
      userEmail: userState.email || userState.username || null,
      source: payload.source,
      message: payload.message || "Unknown error",
      stack: payload.stack || null,
      context: {
        ...getDeviceInfo(),
        ...(payload.context || {}),
      },
      url: window.location.href,
    };

    // Отправляем без блокировки UI
    fetch(`${API_URL}/logs/client-error`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(() => {
      // Игнорируем сетевые сбои отправки логов
    });
  } catch (err) {
    console.warn("Не удалось отправить лог ошибки:", err);
  }
}
