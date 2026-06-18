import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Calendar, CreditCard, FileText, Video,
  Stethoscope, Bell, LogOut, Shield, ClipboardList, Activity, Pill, UserCog, BookTemplate, MapPin,
  Building2, BedDouble, Ambulance, Truck, Navigation, Network, Crown, KeyRound, Mail,
} from "lucide-react";
import { useAuth, primaryRole, AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import logo from "@/assets/medicare-logo.png";
import { SOSButton } from "@/components/SOSButton";

const navByRole: Record<AppRole, ReadonlyArray<{ to: string; label: string; icon: any }>> = {
  patient: [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/doctors", label: "Find Doctors", icon: Users },
    { to: "/appointments", label: "Appointments", icon: Calendar },
    { to: "/prescriptions", label: "Prescriptions", icon: FileText },
    
    { to: "/book-ambulance", label: "Ambulance", icon: Ambulance },
    { to: "/nearby", label: "Nearby", icon: MapPin },
    { to: "/payments", label: "Payments", icon: CreditCard },
    { to: "/profile", label: "My Profile", icon: UserCog },
  ],
  doctor: [
    { to: "/doctor/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/doctor/schedule", label: "Schedule", icon: Calendar },
    { to: "/doctor/patients", label: "Patients", icon: Users },
    { to: "/doctor/templates", label: "Rx Templates", icon: BookTemplate },
    { to: "/doctor/workspace", label: "Workspace", icon: ClipboardList },
    { to: "/doctor/analytics", label: "Analytics", icon: Activity },
  ],
  hospital: [
    { to: "/hospital/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/hospital/branches", label: "Branches", icon: Building2 },
    { to: "/hospital/departments", label: "Departments", icon: Network },
    { to: "/hospital/beds", label: "Beds & ICU", icon: BedDouble },
  ],
  ambulance: [
    { to: "/ambulance/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/ambulance/driver", label: "Driver App", icon: Navigation },
    { to: "/ambulance/fleet", label: "Fleet", icon: Truck },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/admin/invites", label: "Invitations", icon: Mail },
    { to: "/admin/doctors", label: "Doctors", icon: Stethoscope },
    { to: "/admin/hospitals", label: "Hospitals", icon: Building2 },
    { to: "/admin/ambulance", label: "Ambulance", icon: Ambulance },
    { to: "/admin/pharmacy", label: "Pharmacy", icon: Pill },
    { to: "/admin/patients", label: "Patients", icon: Users },
    { to: "/admin/appointments", label: "Appointments", icon: Calendar },
    { to: "/admin/payments", label: "Finance", icon: CreditCard },
    { to: "/admin/emergency", label: "Emergency", icon: Shield },
  ],
  super_admin: [
    { to: "/admin/super", label: "Super Admin", icon: Crown },
    { to: "/admin/permissions", label: "Permissions", icon: KeyRound },
    { to: "/admin/invites", label: "Invitations", icon: Mail },
    { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/admin/doctors", label: "Doctors", icon: Stethoscope },
    { to: "/admin/hospitals", label: "Hospitals", icon: Building2 },
    { to: "/admin/ambulance", label: "Ambulance", icon: Ambulance },
    { to: "/admin/pharmacy", label: "Pharmacy", icon: Pill },
    { to: "/admin/patients", label: "Patients", icon: Users },
    { to: "/admin/appointments", label: "Appointments", icon: Calendar },
    { to: "/admin/payments", label: "Finance", icon: CreditCard },
    { to: "/admin/emergency", label: "Emergency", icon: Shield },
  ],
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles, signOut } = useAuth();
  const role = primaryRole(roles);
  const items = navByRole[role] ?? navByRole.patient;
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-border/60 bg-sidebar px-4 py-6 md:flex">
        <Link to="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <img src={logo} alt="MediCare logo" className="h-10 w-10 object-contain" />
          <div>
            <div className="font-display text-base font-bold leading-none">MediCare<span className="text-accent">+</span></div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{role.replace("_", " ")} portal</div>
          </div>
        </Link>
        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 rounded-xl border border-border/60 bg-card p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                {initials(user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user?.email}</div>
              <div className="text-xs capitalize text-muted-foreground">{role.replace("_", " ")}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur-xl">
          <div className="text-sm text-muted-foreground">
            Welcome back, <span className="font-medium text-foreground">{user?.email?.split("@")[0]}</span>
          </div>
          <div className="flex items-center gap-2">
            <SOSButton />
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <Link to="/consult" className="hidden md:block">
              <Button size="sm" variant="outline" className="gap-2">
                <Video className="h-4 w-4" />Quick join
              </Button>
            </Link>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
