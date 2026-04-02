import { useFinderStore } from "@/store";
import { USERS_LIST } from "@/store/modules/finderStore";
import { Socket } from "socket.io-client";

export const UserEvents = (socket: Socket) => {
  socket.on("users:find", (data: { id: number; response: USERS_LIST[] }) => {
    console.log("Получены совпадения", data);
    const { setUsers } = useFinderStore.getState();

    setUsers(data.response);
  });
};
