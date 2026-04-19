// src/lib/mediasoupManager.ts
import * as mediasoup from "mediasoup-client";
import { useSocketStore } from "@/store";
import { useCallStore } from "@/store";

let device: mediasoup.types.Device | null = null;
let sendTransport: mediasoup.types.Transport | null = null;
let recvTransport: mediasoup.types.Transport | null = null;
let audioProduced = false;

export const joinMediasoupRoom = async (conversationId: number) => {
  console.log("📞 joinMediasoupRoom вызван");
  try {
    const { sendMessage } = useSocketStore.getState();

    const routerRtpCapabilities = await sendMessage("mediasoup:getRouterRtpCapabilities", { conversationId });
    device = new mediasoup.Device();
    await device.load({ routerRtpCapabilities });
    console.log("✅ Device loaded");

    const sendTransportInfo = await sendMessage("mediasoup:createWebRtcTransport", { convId: conversationId, direction: "send" });
    sendTransport = device.createSendTransport(sendTransportInfo);
    setupSendTransport(sendTransport, conversationId);
    console.log("📤 Send transport создан");

    const recvTransportInfo = await sendMessage("mediasoup:createWebRtcTransport", { convId: conversationId, direction: "recv" });
    recvTransport = device.createRecvTransport(recvTransportInfo);
    setupRecvTransport(recvTransport, conversationId);
    console.log("📥 Recv transport создан");

    setTimeout(() => {
      produceAudio().catch(console.error);
    }, 5000);

    useCallStore.setState({ conversationId, inCall: true, error: null });
  } catch (error) {
    console.error("❌ joinMediasoupRoom failed:", error);
    useCallStore.setState({ error: String(error), inCall: false });
    leaveMediasoupRoom();
  }
};

function setupSendTransport(transport: mediasoup.types.Transport, conversationId: number) {
  transport.on("connect", ({ dtlsParameters }, callback, errback) => {
    console.log("📡 Попытка выполнить mediasoup:connectTransport...");

    useSocketStore
      .getState()
      .sendMessage("mediasoup:connectTransport", { convId: conversationId, transportId: transport.id, dtlsParameters })
      .then((response) => {
        // Если бэк вернул { success: true }, мы должны это увидеть здесь
        console.log("✅ Ответ от сервера на connect:", response);
        callback(); // <--- Только после этого mediasoup-client начнет вещать!
      })
      .catch((err) => {
        console.error("❌ Ошибка в connectTransport:", err);
        errback(err);
      });
  });

  // Аналогично в produce
  transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
    console.log("📤 Попытка выполнить mediasoup:produce...");
    useSocketStore
      .getState()
      .sendMessage("mediasoup:produce", { convId: conversationId, transportId: transport.id, kind, rtpParameters })
      .then((data) => {
        console.log("✅ Сервер подтвердил Produce:", data);
        if (data && data.id) {
          callback({ id: data.id });
        } else {
          errback(new Error("No producer ID returned from server"));
        }
      })
      .catch(errback);
  });

  transport.on("connectionstatechange", (state) => {
    console.log("📡 sendTransport state:", state);
    if (state === "connected" && !audioProduced) {
      setTimeout(() => produceAudio().catch(console.error), 100);
    }
  });
}

function setupRecvTransport(transport: mediasoup.types.Transport, conversationId: number) {
  transport.on("connect", ({ dtlsParameters }, callback, errback) => {
    console.log("📡 recvTransport.connect вызван");

    useSocketStore
      .getState()
      .sendMessage("mediasoup:connectTransport", { convId: conversationId, transportId: transport.id, dtlsParameters })
      .then(() => {
        console.log("✅ recvTransport подключён");
        callback();
      })
      .catch(errback);
  });
}

async function produceAudio() {
  if (audioProduced || !device?.canProduce("audio") || !sendTransport) return;
  audioProduced = true;

  try {
    console.log("🎤 Запрашиваем микрофон...");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    useCallStore.getState().setLocalStream(stream);

    const track = stream.getAudioTracks()[0];
    console.log("🎧 Аудиотрек:", track, "readyState:", track.readyState, "enabled:", track.enabled);

    if (!track || track.readyState === "ended" || !track.enabled) {
      throw new Error("Invalid audio track");
    }

    console.log("🔄 Вызываем sendTransport.produce...");
    const producer = await sendTransport.produce({ track });
    console.log("✅ Producer успешно создан:", producer.id);

    useCallStore.getState().addProducer({ id: producer.id, kind: "audio", track });

    producer.on("transportclose", () => {
      console.log("CloseOperation producer");
      useCallStore.getState().removeProducer(producer.id);
    });
  } catch (e) {
    console.error("💥 produceAudio failed:", e);
    // Для отладки: попробуем без track
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = stream.getAudioTracks()[0];

      // ✅ Правильно: передаём track
      const producer = await sendTransport.produce({ track });
      console.log("✅ Producer (без track) создан:", producer.id);
    } catch (e) {
      console.error("❌ Даже без track — провал" + e);
    }
  }
}

export const consumeProducer = async (conversationId: number, producerId: string, peerId: string) => {
  console.log("🎧 [Consume] Начинаем процесс для:", { producerId, peerId, conversationId });

  if (!device || !recvTransport) {
    console.error("❌ [Consume] Ошибка: Device или recvTransport не инициализированы");
    return;
  }

  try {
    const { sendMessage } = useSocketStore.getState();

    // 1. Запрос к серверу на создание консьюмера
    console.log("📤 [Consume] Отправляем запрос mediasoup:consume...");
    const response = await sendMessage("mediasoup:consume", {
      convId: Number(conversationId),
      producerId: producerId,
      rtpCapabilities: device.rtpCapabilities,
    });

    console.log("📩 [Consume] Ответ от сервера получен:", response);

    // 2. Создание локального объекта consumer в mediasoup-client
    const consumer = await recvTransport.consume({
      id: response.id, // Используем ID из ответа сервера
      producerId: response.producerId,
      kind: response.kind,
      rtpParameters: response.rtpParameters,
    });

    console.log("✅ [Consume] MediaSoup Consumer создан локально:", consumer.id);

    // 3. Firefox/Chrome: Жизненно важно убедиться, что консьюмер не на паузе
    if (consumer.paused) {
      console.warn("⚠️ [Consume] Consumer на паузе, пробуем resume...");
      // Если на бэке не прописано resume, можно попробовать пнуть здесь,
      // но обычно это делается через сигнальный сервер.
    }

    // 4. Работа с медиа-потоком
    const { track } = consumer;
    console.log("🎵 [Track State]:", {
      id: track.id,
      kind: track.kind,
      readyState: track.readyState, // Должно быть 'live'
      enabled: track.enabled, // Должно быть true
    });

    const stream = new MediaStream([track]);
    const audio = new Audio();
    audio.srcObject = stream;
    audio.volume = 1.0;
    audio.muted = false; // На всякий случай

    // 5. Обработка воспроизведения с логированием успеха
    audio.onloadedmetadata = () => {
      console.log("📡 [Audio] Метаданные трека загружены");
      audio
        .play()
        .then(() => {
          console.log(`🔊 [Audio] Звук для пользователя ${peerId} успешно запущен!`);
        })
        .catch((err) => {
          console.error("🔇 [Audio] Автоплей заблокирован браузером. Требуется клик пользователя.", err);
          // Можно добавить визуальный индикатор "Включить звук" в UI
        });
    };

    // Слушаем ошибки трека
    track.onended = () => console.warn(`📢 [Track] Трек ${track.id} завершен (ended)`);
    track.onmute = () => console.warn(`📢 [Track] Трек ${track.id} замучен (muted)`);
    track.onunmute = () => console.log(`📢 [Track] Трек ${track.id} размучен (unmuted)`);

    // 6. Сохраняем в стор
    // ВАЖНО: убедись, что peerId здесь не undefined
    useCallStore.getState().addRemoteParticipant(peerId, producerId, audio);

    console.log(`✨ [Consume] Процесс завершен для peerId: ${peerId}`);
  } catch (error) {
    console.error("❌ [Consume] Критическая ошибка в consumeProducer:", error);
  }
};
export const leaveMediasoupRoom = () => {
  audioProduced = false;
  sendTransport?.close();
  recvTransport?.close();
  sendTransport = null;
  recvTransport = null;
  device = null;

  const { conversationId } = useCallStore.getState();
  if (conversationId) {
    useSocketStore.getState().sendMessage("mediasoup:leaveRoom", { convId: conversationId });
  }
  useCallStore.getState().reset();
  console.log("🧹 MediaSoup сессия завершена");
};
