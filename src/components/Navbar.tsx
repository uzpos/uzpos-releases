"use client"

import { signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "./ui/button";
import { useSession } from "next-auth/react";
import { LogOut, UtensilsCrossed, PackageOpen, Calculator, Settings, ChefHat, BookOpen } from "lucide-react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  const role = session?.user.role;
  const navItems = [
    { name: "Satış", href: "/pos", icon: UtensilsCrossed, roles: ["ADMIN", "CASHIER", "WAITER"] },
    { name: "Mutfak", href: "/kitchen", icon: ChefHat, roles: ["ADMIN", "CHEF", "CASHIER", "WAITER"] },
    { name: "Reçeteler", href: "/recipes", icon: BookOpen, roles: ["ADMIN", "CASHIER"] },
    { name: "Depo", href: "/inventory", icon: PackageOpen, roles: ["ADMIN", "CASHIER"] },
    { name: "Muhasebe", href: "/accounting", icon: Calculator, roles: ["ADMIN", "CASHIER"] },
  ].filter(item => !item.roles || item.roles.includes(role || ""));

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b-0">
      <div className="container flex h-16 items-center px-4 max-w-7xl mx-auto">
        <div className="flex md:flex-1">
          <Link href="/" className="flex items-center space-x-2 font-bold text-2xl tracking-tighter group">
            <span className="text-white group-hover:text-glow transition-all">Uzpos</span>
            <span className="text-primary group-hover:animate-pulse">.</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center space-x-2 text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                  isActive ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_rgba(218,26,50,0.2)]" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {item.name}
              </Link>
            )
          })}
          
          {session?.user.role === "ADMIN" && (
            <Link 
              href="/settings" 
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                pathname.startsWith("/settings") ? "bg-primary/20 text-primary border border-primary/30" : "text-slate-300 hover:bg-white/10"
              }`}
            >
              <Settings size={16} />
              Ayarlar
            </Link>
          )}
        </nav>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <div className="hidden lg:flex flex-col text-right mr-2 border-r border-white/10 pr-4">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Terminal IP</span>
            <span className="text-xs font-mono font-bold text-primary select-all">
              {process.env.NEXT_PUBLIC_LOCAL_IP || '127.0.0.1'}
            </span>
          </div>
          <div className="hidden md:flex flex-col text-right mr-2">
            <span className="text-sm font-bold text-white">{session?.user?.name}</span>
            <span className="text-[10px] uppercase tracking-wider text-primary font-bold">{session?.user?.role}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => signOut()} title="Çıkış Yap" className="rounded-full">
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </header>
  );
}
