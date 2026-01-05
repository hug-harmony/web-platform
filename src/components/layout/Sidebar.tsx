// components/Sidebar.tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/hooks/useUserProfile";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import {
  MessageSquare,
  Clock,
  LogOut,
  Video,
  CreditCard,
  Bell,
  Users,
  Eye,
  Package,
  Sparkles,
  LayoutDashboard,
  UserSearch,
  ClipboardList,
  Menu,
  X,
  ChevronRight,
  VideoIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  highlight?: boolean;
}

const iconClass = "h-4 w-4 shrink-0";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user, isProfessional, applicationStatus, unreadNotifications } =
    useUserProfile();

  const hasStartedApplication = applicationStatus !== null;

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [];

    // Professional application item
    if (!isProfessional) {
      if (hasStartedApplication) {
        items.push({
          href: "/dashboard/edit-profile/professional-application/status",
          label: "Application Status",
          icon: <ClipboardList className={iconClass} />,
        });
      } else {
        items.push({
          href: "/dashboard/edit-profile/professional-application",
          label: "Become a Pro",
          icon: <Sparkles className={iconClass} />,
          highlight: true,
        });
      }
    }

    // Core navigation
    items.push(
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className={iconClass} />,
      },
      {
        href: "/dashboard/professionals",
        label: "Professionals",
        icon: <UserSearch className={iconClass} />,
      },
      {
        href: "/dashboard/appointments",
        label: "Appointments",
        icon: <Clock className={iconClass} />,
      },
      {
        href: "/dashboard/video-session",
        label: "Video Sessions",
        icon: <Video className={iconClass} />,
      },
      {
        href: "/dashboard/notifications",
        label: "Notifications",
        icon: <Bell className={iconClass} />,
        badge: unreadNotifications,
      },
      {
        href: "/dashboard/messaging",
        label: "Messages",
        icon: <MessageSquare className={iconClass} />,
      },
      {
        href: "/dashboard/forum",
        label: "Forum",
        icon: <Users className={iconClass} />,
      },
      {
        href: "/dashboard/merchandise",
        label: "Merch",
        icon: <Package className={iconClass} />,
      },
      {
        href: `/dashboard/orders`,
        label: "My Orders",
        icon: <Package className={iconClass} />,
      }
    );

    if (isProfessional) {
      items.push(
        {
          href: "/dashboard/profile-visits",
          label: "Profile Visits",
          icon: <Eye className={iconClass} />,
        },
        {
          href: "/dashboard/payment",
          label: "Payments",
          icon: <CreditCard className={iconClass} />,
        },
        {
          href: "/dashboard/training-videos",
          label: "Training Videos",
          icon: <VideoIcon className={iconClass} />,
        }
      );
    }

    return items;
  }, [user.id, isProfessional, hasStartedApplication, unreadNotifications]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut({ callbackUrl: "/login" });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header: User Profile + Logo */}
      <div className="flex items-center justify-between gap-3 p-4 shrink-0">
        {/* User Profile */}
        <button
          onClick={() => handleNavigation(`/dashboard/edit-profile/${user.id}`)}
          className="flex items-center gap-3 flex-1 min-w-0 p-2 -m-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage
              src={user.avatar}
              alt={user.name}
              className="object-cover"
            />
            <AvatarFallback className="text-sm font-semibold">
              {user.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold text-sm truncate">{user.name}</p>
            <div className="flex items-center gap-2">
              {/* <p className="text-xs text-muted-foreground truncate">
                {isProfessional ? "Professional" : "View Profile"}
              </p> */}
              {isProfessional && (
                <span className="inline-block bg-black text-[#F3CFC6] text-[9px] font-medium px-1.5 py-0.5 rounded">
                  PRO
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>

        {/* Logo */}
        {/* <Link
          href="/dashboard"
          className="flex items-center justify-center h-10 w-10 rounded-lg border bg-white shadow-sm hover:bg-gray-50 transition-colors shrink-0"
        >
          <Image
            src="/hh-icon.png"
            alt="Home"
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
          />
        </Link> */}
      </div>

      <Separator className="shrink-0" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-h-0">
        <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Navigation
        </p>

        {navItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all relative ${
                active
                  ? "bg-[#F3CFC6] text-black"
                  : item.highlight
                    ? "bg-gradient-to-r from-[#F3CFC6]/30 to-transparent text-foreground hover:from-[#F3CFC6]/50"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {item.badge && item.badge > 0 && (
                <Badge
                  variant={active ? "secondary" : "destructive"}
                  className="h-5 px-1.5 text-xs"
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </Badge>
              )}
              {item.highlight && !active && (
                <span className="h-2 w-2 bg-[#F3CFC6] rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      <Separator className="shrink-0" />

      {/* Footer */}
      <div className="p-3 shrink-0">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b h-14 flex items-center justify-between px-4">
        {/* Left: Menu + User Info */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <button
            onClick={() => router.push(`/dashboard/edit-profile/${user.id}`)}
            className="flex items-center gap-2"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-xs">
                {user.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm truncate max-w-[120px]">
              {user.name}
            </span>
          </button>
        </div>

        {/* Right: Notifications + Logo */}
        <div className="flex items-center gap-2">
          <NotificationsDropdown />
          <Link
            href="/dashboard"
            className="flex items-center justify-center h-9 w-9 rounded-md border bg-white shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Image
              src="/hh-icon.png"
              alt="Home"
              width={20}
              height={20}
              className="h-5 w-5 object-contain"
            />
          </Link>
        </div>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="lg:hidden fixed top-14 left-0 bottom-0 w-72 bg-card border-r z-40 overflow-hidden"
      >
        <SidebarContent />
      </motion.aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed top-0 left-0 bottom-0 w-64 border-r bg-card z-30 overflow-hidden">
        <SidebarContent />
      </aside>
    </>
  );
}
