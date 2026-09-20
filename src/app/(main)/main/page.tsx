"use client";

import { AuthGuard } from "@/components/guards/AuthGuard";
import ChatList from "../components/chatList/ChatList";
import styles from "./page.module.css";
import WrapperMessages from "../components/wrapperMessages/WrapperMessages";
import { useChatStore } from "@/store/modules/chat";
import CallModal from "../components/callModal/CallModal";
import FinderModal from "../components/finderModal/FinderModal";
import { useCallStore, useFinderStore, useUserStore } from "@/store";
import IncomingRequestsModal from "../components/friendRequests/IncomingRequests";
import MainHeader from "../components/mainHeader/MainHeader";
import FriendModal from "../components/friendModal/FriendModal";
import OutgoingCallModal from "../components/outgoingCallModal/outgoingCallModal";
import CreateGroupModal from "../components/createGroupModal/CreateGroupModal";
import CreateServerModal from "../components/createServerModal/CreateServerModal";
import ProfileModal from "../components/profileModal/ProfileModal";
import ServerBar from "../components/serverBar/ServerBar";
import CallOverlay from "../components/callOverlay/callOverlay";

export default function Page() {
  const { inComingCall, createGroupModalOpen, createServerModalOpen, activeChat } = useChatStore();
  const { isOutgoing, inCall } = useCallStore();
  const { state } = useFinderStore();
  const { friendRequestsState, friendListState, profileModalOpen } = useUserStore();

  return (
    <AuthGuard>
      <div className={styles.wrapper}>
        <MainHeader />
        <div className={`${styles.content} ${activeChat ? styles.hasActiveChat : styles.noActiveChat}`}>
          {/* Левая боковая панель серверов */}
          <div className={styles.serverBarContainer}>
            <ServerBar />
          </div>

          {/* Список чатов или каналов сервера */}
          <div className={styles.chatListContainer}>
            <ChatList />
          </div>


          {/* Сообщения активного диалога */}
          <div className={styles.messagesContainer}>
            <WrapperMessages />
          </div>
        </div>

        {/* Оверлей активного звонка и видеосетки */}
        {inCall && <CallOverlay />}

        {inComingCall && <CallModal />}
        {isOutgoing && <OutgoingCallModal />}
        {state && <FinderModal />}
        {friendRequestsState && <IncomingRequestsModal />}
        {friendListState && <FriendModal />}
        {createGroupModalOpen && <CreateGroupModal />}
        {createServerModalOpen && <CreateServerModal />}
        {profileModalOpen && <ProfileModal />}
      </div>
    </AuthGuard>
  );
}
