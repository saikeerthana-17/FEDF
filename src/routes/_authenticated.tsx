import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth, primaryRole } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/AppShell";
import { LocationProvider } from "@/hooks/use-location";
import { LocationPrompt } from "@/components/LocationPrompt";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
      return;
    }
    if (!loading && user) {
      const role = primaryRole(roles);
      const path = location.pathname;
      const isAdmin = role === "admin" || role === "super_admin";
      if (path === "/dashboard") {
        if (isAdmin) { navigate({ to: "/admin/dashboard" }); return; }
        if (role === "doctor") { navigate({ to: "/doctor/dashboard" }); return; }
        if (role === "hospital") { navigate({ to: "/hospital/dashboard" }); return; }
        if (role === "ambulance") { navigate({ to: "/ambulance/dashboard" }); return; }
      }
      if (path.startsWith("/admin") && !isAdmin) {
        toast.error("Admins only");
        navigate({ to: "/dashboard" });
        return;
      }
      if (path.startsWith("/doctor/") && !(role === "doctor" || isAdmin)) {
        toast.error("Professional access only");
        navigate({ to: "/dashboard" });
        return;
      }
      if (path.startsWith("/hospital/") && !(role === "hospital" || isAdmin)) {
        toast.error("Hospital portal access only");
        navigate({ to: "/dashboard" });
        return;
      }
      if (path.startsWith("/ambulance/") && !(role === "ambulance" || isAdmin)) {
        toast.error("Ambulance portal access only");
        navigate({ to: "/dashboard" });
        return;
      }
    }
  }, [user, roles, loading, navigate, location.pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <LocationProvider>
      <AppShell>
        <Outlet />
      </AppShell>
      <LocationPrompt />
    </LocationProvider>
  );
}
