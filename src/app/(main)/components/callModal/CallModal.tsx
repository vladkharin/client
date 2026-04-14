import styles from "./callModal.module.css";
import { useSocketStore } from "@/store";
import { useChatStore } from "@/store/modules/chat";
import { findUserusername } from "@/app/global.service";

export default function CallModal() {
  const { sendMessage } = useSocketStore();
  const { inComingCall, setIncomingCall } = useChatStore(); // Добавим сеттер для закрытия

  const chat_id = inComingCall?.conversationId;
  const callerData = chat_id ? findUserusername(chat_id) : null;
  const callerusername = callerData?.user.username || "Неизвестный";

  const clickToCallAccept = () => {
    sendMessage("call:accept", { conversationId: inComingCall?.conversationId });
    setIncomingCall(null); // Закрываем модалку после ответа
  };

  const clickToDecline = () => {
    // Если есть событие отклонения на бэкенде
    sendMessage("call:decline", { conversationId: inComingCall?.conversationId });
    setIncomingCall(null);
  };

  return (
    <div className={styles.background}>
      <div className={styles.wrapper}>
        <div className={styles.avatar_placeholder}>{callerusername[0]?.toUpperCase()}</div>

        <div className={styles.caller_info}>
          <h3>{callerusername}</h3>
          <p className={styles.status}>Входящий вызов...</p>
        </div>

        <div className={styles.button_group}>
          <button className={styles.accept_btn} onClick={clickToCallAccept}>
            Ответить
          </button>
          <button className={styles.decline_btn} onClick={clickToDecline}>
            Сбросить
          </button>
        </div>
      </div>
    </div>
  );
}
