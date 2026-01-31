import { useSocketStore } from "@/store";
import { useChatStore } from "@/store/modules/chat";

export default function WrapperzMessages() {
  const { activeChat } = useChatStore();
  const { sendMessage } = useSocketStore();
  const clickToCall = () => {
    sendMessage("call:request", { conversationId: activeChat?.id });
  };
  return (
    <div>
      {activeChat === null ? (
        <div>Нет активного чата</div>
      ) : (
        <div>
          <div>Сообщения</div>

          <button onClick={() => clickToCall()}>Позвонить</button>
        </div>
      )}
    </div>
  );
}
