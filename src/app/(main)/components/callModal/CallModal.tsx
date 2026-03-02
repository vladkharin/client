import styles from "./callModal.module.css";
import { useSocketStore } from "@/store";
import { useChatStore } from "@/store/modules/chat";
import { findUserNickname } from "@/app/global.service";

export default function CallModal() {
  const { sendMessage } = useSocketStore();
  const { inComingCall } = useChatStore();

  const chat_id = inComingCall?.conversationId;

  const callerNickname = chat_id ? findUserNickname(chat_id)?.user.username : "Неизвестный";

  const clickToCallAccept = () => {
    // const callerId = inComingCall?.callerId;
    // const conversationId = inComingCall?.conversationId;
    // if (conversationId && callerId) {
    // }
    sendMessage("call:accept", { conversationId: inComingCall?.conversationId });
  };

  return (
    <div className={styles.background}>
      <div className={styles.wrapper}>
        <button onClick={() => clickToCallAccept()}>Взять трубку от {callerNickname}</button>
      </div>
    </div>
  );
}
