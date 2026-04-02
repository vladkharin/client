import { Socket } from "socket.io-client";

import { CallingEvents } from "./events/calling.event";
import { FriendsEvents } from "./events/friends.event";
import { MessagesEvents } from "./events/messages.event";
import { DirectEvents } from "./events/direct.event";
import { UserEvents } from "./events/user.event";

/**
 * Регистрирует все обработчики событий от сервера
 */
export const registerSocketListeners = (socket: Socket) => {
  CallingEvents(socket);
  FriendsEvents(socket);
  MessagesEvents(socket);
  DirectEvents(socket);
  UserEvents(socket);
};
