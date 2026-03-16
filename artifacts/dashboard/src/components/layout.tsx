import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  Workflow,
  Facebook,
  FileText,
  Terminal,
  Activity,
  Bot
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/products", label: "Sản phẩm", icon: Package },
  { href: "/prompts", label: "Prompt AI", icon: Bot },
  { href: "/scenarios", label: "Kịch bản", icon: Workflow },
  { href: "/pages", label: "Trang FB", icon: Facebook },
  { href: "/reports", label: "Báo cáo", icon: FileText },
  { href: "/logs", label: "Nhật ký hệ thống", icon: Terminal },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-64 flex-shrink-0 border-r border-border bg-card/30 backdrop-blur-xl flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Activity className="w-6 h-6 text-primary mr-3" />
          <span className="font-display font-bold text-lg tracking-tight text-gradient">
            OpenClaw
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-primary/10 text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 mr-3 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground font-bold shadow-lg">
              A
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">Quản trị viên</p>
              <p className="text-xs text-muted-foreground">admin@openclaw.ai</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

        <header className="h-16 flex-shrink-0 border-b border-border bg-background/50 backdrop-blur-md flex items-center px-8 z-10">
          <h1 className="text-xl font-display font-semibold">
            {navItems.find((i) => i.href === location)?.label || "Bảng điều khiển"}
          </h1>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8 z-10">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
