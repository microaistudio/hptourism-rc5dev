import { useLocation } from "wouter";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getNavigationForRole, type NavItem } from "@/config/navigation";
import type { User, HomestayApplication } from "@shared/schema";

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  
  const { data: userData } = useQuery<{ user: User }>({
    queryKey: ["/api/auth/me"],
  });

  const user = userData?.user;

  const { data: ownerApplicationsData } = useQuery<{ applications: HomestayApplication[] }>({
    queryKey: ["/api/applications"],
    enabled: user?.role === "property_owner",
    staleTime: 30 * 1000,
  });

  const ownerPrimaryApplication =
    user?.role === "property_owner"
      ? ownerApplicationsData?.applications?.[0] ?? null
      : null;
  const ownerHasCertificate =
    !!ownerPrimaryApplication &&
    ownerPrimaryApplication.status === "approved" &&
    !!ownerPrimaryApplication.certificateNumber;
  const navigation = getNavigationForRole(user?.role || 'property_owner');
  const { data: daInspections } = useQuery<{ reportSubmitted: boolean }[]>({
    queryKey: ["/api/da/inspections"],
    enabled: user?.role === "dealing_assistant",
  });
  const pendingInspectionCount =
    user?.role === "dealing_assistant"
      ? (daInspections ?? []).filter((order) => !order.reportSubmitted).length
      : 0;
  const navigationSections = useMemo(() => {
    if (user?.role !== "dealing_assistant" || pendingInspectionCount === 0) {
      return navigation;
    }
    return navigation.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.url === "/da/inspections") {
          return {
            ...item,
            badge: pendingInspectionCount > 99 ? "99+" : String(pendingInspectionCount),
          };
        }
        return item;
      }),
    }));
  }, [navigation, pendingInspectionCount, user?.role]);

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      property_owner: 'Property Owner',
      district_officer: 'District Officer',
      state_officer: 'State Officer',
      admin: 'Administrator',
    };
    return labels[role] || 'User';
  };

  const navigateTo = (url: string) => {
    const [base, hash] = url.split("#");
    if (hash) {
      if (location !== base) {
        setLocation(base);
        setTimeout(() => {
          const target = document.getElementById(hash);
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 120);
      } else {
        const target = document.getElementById(hash);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.location.hash = hash;
        }
      }
      return;
    }
    if (location !== url) {
      setLocation(url);
    }
  };

  const handleNavClick = (item: NavItem) => {
    if (user?.role === "property_owner" && ownerPrimaryApplication) {
      if (item.url === "/applications/new" || item.url === "/existing-owner") {
        navigateTo(`/applications/${ownerPrimaryApplication.id}`);
        return;
      }
      if (item.url === "/dashboard?filter=approved") {
        if (!ownerHasCertificate) {
          return;
        }
        navigateTo(`/applications/${ownerPrimaryApplication.id}#registration-certificate`);
        return;
      }
    }
    navigateTo(item.url);
  };

  if (!user) {
    return null;
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">HP</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">HP Tourism</h2>
            <p className="text-xs text-muted-foreground truncate">eServices Portal</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigationSections.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = location === item.url;
                  const isDownloadRcEntry =
                    user?.role === "property_owner" && item.url === "/dashboard?filter=approved";
                  const disableDownloadRc =
                    isDownloadRcEntry && (!ownerPrimaryApplication || !ownerHasCertificate);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        onClick={() => {
                          if (disableDownloadRc) {
                            return;
                          }
                          handleNavClick(item);
                        }}
                        isActive={isActive}
                        disabled={disableDownloadRc}
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs bg-primary/10">
              {getUserInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {getRoleLabel(user.role)}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
