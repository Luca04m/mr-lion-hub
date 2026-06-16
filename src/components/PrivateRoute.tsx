import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { getUser } from "@/lib/store";
import { PRIVATE_USERS } from "@/lib/types";
import { AppLayout } from "./layout/AppLayout";

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const userName = getUser();
  const isPrivate = !!userName && (PRIVATE_USERS as readonly string[]).includes(userName);

  useEffect(() => {
    if (userName && !isPrivate) toast.error("Acesso restrito");
  }, [userName, isPrivate]);

  if (!userName) return <Navigate to="/" replace />;
  if (!isPrivate) return <Navigate to="/overview" replace />;

  return <AppLayout>{children}</AppLayout>;
}
