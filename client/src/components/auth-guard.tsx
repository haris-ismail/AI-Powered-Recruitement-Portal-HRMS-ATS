import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuthMigration } from "@/lib/auth-migration";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const [, navigate] = useLocation();
  const { user, loading, logout } = useAuthMigration();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
        return;
      }

      if (requiredRole && user.role !== requiredRole) {
        // Redirect based on user role
        if (user.role === "admin") {
          navigate("/admin/jobs");
        } else {
          navigate("/candidate");
        }
        return;
      }
    }
  }, [user, loading, requiredRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requiredRole && user.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
