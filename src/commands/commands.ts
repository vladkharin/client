export const REQUESTS = {
  friendRequest: "friend:request",
  friendRespond: "friend:respond",
  friendList: "friend:list",
  friendIncoming: "friend:incoming",
  friendOutgoing: "friend:outgoing",

  groupChatCreate: "group:create",
  groupChatList: "group:get_all",

  messageSend: "message:send",
  messageHistory: "message:history",
  messageEdit: "message:edit",
  messageDelete: "message:delete",
  messageRead: "message:read",

  typingStart: "typing:start",
  typingStop: "typing:stop",
} as const;

export const NOTIFICATIONS = {
  directChatNew: "notification.direct.chat.new",
  groupChatNew: "notification.group.chat.new",

  friendRequestReceived: "notification.friend.request.received",
  friendRequestResponded: "notification.friend.request.responded",

  messageNew: "notification.message.new",
  messageReceived: "notification.message.received",
  messageUpdated: "notification.message.updated",
  messageDeleted: "notification.message.deleted",

  userTyping: "notification.user.typing",
  userStatus: "notification.user.status",
} as const;
