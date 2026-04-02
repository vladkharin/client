import { NOTIFICATIONS, REQUESTS } from "@/commands/commands";
import { useUserStore } from "@/store";
import { REQUEST } from "@/store/modules/user";
import { FriendListItem, RespondToRequestResult } from "@/types/types";
import { Socket } from "socket.io-client";

export const FriendsEvents = (socket: Socket) => {
  socket.on(REQUESTS.friendIncoming, (data: { id: number; response: REQUEST[] }) => {
    const { setFriendRequest } = useUserStore.getState();

    setFriendRequest(data.response, "incoming");
  });

  socket.on(
    NOTIFICATIONS.friendRequestReceived,
    (data: { createdAt: string; friendshipId: number; from: { id: number; username: string } }) => {
      const { addFriendRequest } = useUserStore.getState();

      addFriendRequest(data.from, "incoming");
    },
  );

  socket.on(REQUESTS.friendList, (data: { response: FriendListItem[]; id: number }) => {
    const { setFriendList } = useUserStore.getState();
    setFriendList(data.response);
  });

  socket.on(REQUESTS.friendRespond, (data: { response: RespondToRequestResult; id: number }) => {
    const { addFriend, removeFriendRequest } = useUserStore.getState();
    if (data.response.friend) {
      addFriend(data.response?.friend);
    }

    if (data.response?.friendshipId) {
      removeFriendRequest(data.response?.friendshipId, "incoming");
    }
  });

  socket.on(NOTIFICATIONS.friendRequestResponded, (data: { response: RespondToRequestResult; id: number }) => {
    const { addFriend, removeFriendRequest } = useUserStore.getState();

    if (data.response.action == "accepted") {
      if (data.response.friend) {
        addFriend(data.response?.friend);
      }
    }

    if (data.response?.friendshipId) {
      removeFriendRequest(data.response?.friendshipId, "incoming");
    }
  });
};
