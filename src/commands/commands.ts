export const REQUESTS = {
  friendRequest: "friend:request",
  friendRespond: "friend:respond",
  friendList: "friend:list",
  friendIncoming: "friend:incoming",
  friendOutgoing: "friend:outgoing",

  messageSend: "message:send",
  messageHistory: "message:history",
  messageEdit: "message:edit",
  messageDelete: "message:delete",
  messageRead: "message:read",
} as const;

export const NOTIFICATIONS = {
  directChatNew: "notification.direct.chat.new",

  friendRequestReceived: "notification.friend.request.received",
  friendRequestResponded: "notification.friend.request.responded",

  messageNew: "notification.message.new",
  messageReceived: "notification.message.received",
  messageUpdated: "notification.message.updated",
  messageDeleted: "notification.message.deleted",
} as const;
