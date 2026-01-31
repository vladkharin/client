import { useSocketStore, useUserStore } from "@/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useUserStore((state) => state.token);
  const isConnected = useSocketStore((state) => state.isConnected);

  useEffect(() => {
    if (!token) {
      router.push("/authorization");
    } else if (token && !isConnected) {
      useSocketStore.getState().connect(token, () => {
        router.push("/main");
      });
    }
  }, [token, isConnected, router]);

  if (!token) return <div>Загрузка...</div>;

  return children;
}
