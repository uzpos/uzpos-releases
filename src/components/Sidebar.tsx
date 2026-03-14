"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  UtensilsCrossed, 
  PackageOpen, 
  Calculator, 
  ChefHat, 
  BookOpen, 
  Settings,
  LayoutDashboard,
  Users
} from "lucide-react";
import { useSession } from "next-auth/react";

const navItems = [
  { name: "Satış", href: "/pos", icon: UtensilsCrossed, roles: ["ADMIN", "KASIYER"] },
  { name: "Mutfak", href: "/kitchen", icon: ChefHat, roles: ["ADMIN", "CHEF"] },
  { name: "Reçeteler", href: "/recipes", icon: BookOpen, roles: ["ADMIN"] },
  { name: "Depo", href: "/inventory", icon: PackageOpen, roles: ["ADMIN"] },
  { name: "Muhasebe", href: "/accounting", icon: Calculator, roles: ["ADMIN"] },
  { name: "Cari", href: "/accounting?view=COMPANIES", icon: Users, roles: ["ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user.role;

  const filteredItems = navItems.filter(item => !item.roles || item.roles.includes(role || ""));

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 flex flex-col items-center py-6 bg-black/60 backdrop-blur-xl border-r border-white/5 z-[60] transition-all duration-300 hover:w-56 group">
      <div className="mb-8 flex items-center justify-center w-full px-3 overflow-hidden">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(218,26,50,0.3)]">
          <span className="text-xl font-black text-white">U</span>
        </div>
        <span className="ml-3 text-xl font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Uzpos<span className="text-primary">.</span></span>
      </div>

      <nav className="flex-1 w-full space-y-2 px-3">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href.split('?')[0]);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center w-full h-10 rounded-lg transition-all duration-300 overflow-hidden ${
                isActive 
                  ? "bg-primary text-white shadow-[0_0_10px_rgba(218,26,50,0.2)]" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="w-12 min-w-[48px] flex items-center justify-center">
                <Icon size={18} className={isActive ? "animate-pulse" : ""} />
              </div>
              <span className="ml-1 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto w-full px-2">
        {session?.user.role === "ADMIN" && (
          <Link
            href="/settings"
            className={`flex items-center w-full h-10 rounded-lg transition-all duration-300 mb-2 overflow-hidden ${
              pathname.startsWith("/settings") 
                ? "bg-primary/20 text-primary border border-primary/30" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="w-12 min-w-[48px] flex items-center justify-center">
              <Settings size={18} />
            </div>
            <span className="ml-1 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              Ayarlar
            </span>
          </Link>
        )}
      </div>
    </aside>
  );
}
