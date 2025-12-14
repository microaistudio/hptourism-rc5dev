import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { LogOut, Home } from "lucide-react";
import { getDefaultRouteForRole } from "@/config/navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const [location, setLocation] = useLocation();
  
  const { data: userData } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      // CRITICAL: Clear all cached queries to prevent role-switching bugs
      queryClient.clear();
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still clear cache even on error to ensure clean state
      queryClient.clear();
      setLocation("/");
    }
  };

  const handleGoHome = () => {
    const homeRoute = getDefaultRouteForRole(userData?.user?.role || 'property_owner');
    setLocation(homeRoute);
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="fixed inset-0 flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-h-0">
          <header className="flex items-center justify-between gap-2 p-3 border-b bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoHome}
                data-testid="button-home"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
