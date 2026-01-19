import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LogOut, 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  CalendarCheck, 
  Settings, 
  Menu,
  X,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = location === href;
    return (
      <Link href={href}>
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
          isActive 
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
            : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
        )}>
          <Icon className="w-5 h-5" />
          <span>{label}</span>
        </div>
      </Link>
    );
  };

  const roleLinks = {
    student: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/subjects", icon: BookOpen, label: "My Subjects" },
      { href: "/attendance", icon: CalendarCheck, label: "Attendance History" },
    ],
    teacher: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/subjects", icon: BookOpen, label: "My Classes" },
      { href: "/reports", icon: CalendarCheck, label: "Reports" },
    ],
    superadmin: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/users", icon: Users, label: "User Management" },
      { href: "/settings", icon: Settings, label: "System Settings" },
    ]
  };

  const links = roleLinks[user.role as keyof typeof roleLinks] || [];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-50 h-screen w-72 bg-white border-r border-border flex flex-col transition-transform duration-300 ease-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-primary leading-none">AttendED</h1>
              <span className="text-xs text-muted-foreground font-medium">De La Salle University</span>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-6 space-y-1">
          {links.map((link) => (
            <NavItem key={link.href} {...link} />
          ))}
        </div>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold">
              {user.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.fullName}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-border p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            <span className="font-bold text-primary">AttendED</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
