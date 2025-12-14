import {
  Home,
  FileText,
  Bell,
  BarChart3,
  BarChart,
  Users,
  ClipboardList,
  Settings,
  Database,
  ClipboardCheck,
  User,
  Activity,
  MapPin,
  Search,
  Download,
  Shield,
  RefreshCw,
  CreditCard,
  MessageSquare,
  Lock,
  FileArchive,
  TestTube,
  Server,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Property Owner Navigation Menu
export const ownerNavigation: NavSection[] = [
  {
    title: "New Registration",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
      },
      {
        title: "New Application",
        url: "/applications/new",
        icon: ClipboardList,
      },
    ],
  },
  {
    title: "Current Homestay/B&B License Holders",
    items: [
      {
        title: "Existing RC Registration",
        url: "/existing-owner",
        icon: FileText,
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        title: "My Profile",
        url: "/profile",
        icon: User,
      },
      {
        title: "Download RC",
        url: "/dashboard?filter=approved",
        icon: Download,
      },
    ],
  },
];

// Officer Navigation Menu (District & State Officers)
export const officerNavigation: NavSection[] = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
      },
      {
        title: "Workflow Monitoring",
        url: "/workflow-monitoring",
        icon: BarChart3,
      },
      {
        title: "Analytics",
        url: "/analytics",
        icon: BarChart3,
      },
    ],
  },
];

// Admin Navigation Menu
export const adminNavigation: NavSection[] = [
  {
    title: "Admin",
    items: [
      {
        title: "User Management",
        url: "/admin/users",
        icon: Users,
      },
      {
        title: "LGD Import",
        url: "/admin/lgd-import",
        icon: MapPin,
      },
      {
        title: "Admin Console",
        url: "/admin/console",
        icon: Database,
      },
    ],
  },
];

// Super Admin Navigation Menu
export const superAdminNavigation: NavSection[] = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        url: "/admin/super-dashboard",
        icon: Home,
      },
      {
        title: "User Management",
        url: "/admin/users",
        icon: Users,
      },
      {
        title: "LGD Import",
        url: "/admin/lgd-import",
        icon: MapPin,
      },
      {
        title: "Super Console",
        url: "/admin/super-console",
        icon: Settings,
      },
    ],
  },
  {
    title: "Super Console",
    items: [
      { title: "System Status", url: "/admin/super-console#system-overview", icon: Database },
      { title: "Reset & Seeds", url: "/admin/super-console#reset-zone", icon: RefreshCw },
      { title: "Payments", url: "/admin/super-console#payment-settings", icon: CreditCard },
      { title: "Communications", url: "/admin/super-console#communications", icon: MessageSquare },
      { title: "Security", url: "/admin/super-console#security", icon: Shield },
      { title: "District Staff", url: "/admin/super-console#staff-tools", icon: Users },
      { title: "Smoke Tests", url: "/admin/super-console#smoke-tests", icon: Server },
      { title: "Test Data", url: "/admin/super-console#test-data", icon: TestTube },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        title: "Workflow Monitor",
        url: "/workflow-monitoring",
        icon: BarChart3,
      },
      {
        title: "Analytics",
        url: "/analytics",
        icon: BarChart3,
      },
    ],
  },
];

// Dealing Assistant Navigation Menu
export const daNavigation: NavSection[] = [
  {
    title: "Main Workflow",
    items: [
      {
        title: "Dashboard",
        url: "/da/dashboard",
        icon: Home,
      },
      {
        title: "Inspections",
        url: "/da/inspections",
        icon: ClipboardCheck,
      },
      {
        title: "Search Application",
        url: "/da/search",
        icon: Search,
      },
      {
        title: "Analytics",
        url: "/analytics",
        icon: BarChart,
      },
      {
        title: "Workflow Monitor",
        url: "/workflow-monitoring",
        icon: Activity,
      },
      {
        title: "My Profile",
        url: "/da/profile",
        icon: User,
      },
    ],
  },
  {
    title: "Current Homestay/B&B License Holders",
    items: [
      {
        title: "Existing RC Registration",
        url: "/da/legacy",
        icon: FileText,
      },
    ],
  },
];

// DTDO Navigation Menu
export const dtdoNavigation: NavSection[] = [
  {
    title: "Main Workflow",
    items: [
      {
        title: "Dashboard",
        url: "/dtdo/dashboard",
        icon: Home,
      },
      {
        title: "Analytics",
        url: "/analytics",
        icon: BarChart,
      },
      {
        title: "Workflow Monitor",
        url: "/workflow-monitoring",
        icon: Activity,
      },
      {
        title: "Search Application",
        url: "/dtdo/search",
        icon: Search,
      },
      {
        title: "My Profile",
        url: "/dtdo/profile",
        icon: User,
      },
    ],
  },
  {
    title: "Current Homestay/B&B License Holders",
    items: [
      {
        title: "Existing RC Queue",
        url: "/dtdo/dashboard?view=legacy",
        icon: FileText,
      },
    ],
  },
];

// Get navigation based on user role
export function getNavigationForRole(role: string): NavSection[] {
  if (role === 'super_admin') {
    return superAdminNavigation;
  }
  if (role === 'admin') {
    return adminNavigation;
  }
  if (role === 'dealing_assistant') {
    return daNavigation;
  }
  if (role === 'district_tourism_officer' || role === 'district_officer') {
    return dtdoNavigation; // DTDO has dedicated navigation
  }
  if (role === 'state_officer') {
    return officerNavigation;
  }
  return ownerNavigation;
}

// Get default route for role
export function getDefaultRouteForRole(role: string): string {
  if (role === 'super_admin') {
    return '/admin/super-dashboard';
  }
  if (role === 'admin') {
    return '/admin/users';
  }
  if (role === 'dealing_assistant') {
    return '/da/dashboard';
  }
  if (role === 'district_tourism_officer' || role === 'district_officer') {
    return '/dtdo/dashboard';
  }
  // All other roles now land on /dashboard with role-specific content
  return '/dashboard';
}
