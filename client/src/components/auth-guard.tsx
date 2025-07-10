import { getCurrentUser } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const [, navigate] = useLocation();
  const user = getCurrentUser();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (requiredRole && user.role !== requiredRole) {
      // Redirect based on user role
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/candidate");
      }
      return;
    }
  }, [user, requiredRole, navigate]);

  if (!user) {
    return null;
  }

  if (requiredRole && user.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
