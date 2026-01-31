import { useSocketStore } from "@/store";

export const requestAfterAuthorization = () => {
  const { sendMessage } = useSocketStore.getState();

  sendMessage("dm:list", {});
};
