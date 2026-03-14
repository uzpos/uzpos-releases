"use client"

import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [terminalIP, setTerminalIP] = useState("...");

  useEffect(() => {
    const win = window as any;
    if (win.electron && win.electron.getConnectivityInfo) {
      win.electron.getConnectivityInfo().then((info: any) => {
        setTerminalIP(`${info.ip}:${info.port}`);
      }).catch(() => {});
    }
  }, []);

  const getPageTitle = () => {
    if (pathname.startsWith("/pos")) return "Satış Ekranı";
    if (pathname.startsWith("/kitchen")) return "Mutfak Paneli";
    if (pathname.startsWith("/recipes")) return "Reçete Yönetimi";
    if (pathname.startsWith("/inventory")) return "Depo ve Stok";
    if (pathname.startsWith("/accounting")) return "Muhasebe ve Finans";
    if (pathname.startsWith("/settings")) return "Sistem Ayarları";
    return "Dashboard";
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 bg-black/40 backdrop-blur-md">
      <div className="flex h-16 items-center px-6 w-full">
        <div className="flex items-center gap-4 flex-1">
          <h1 className="text-xl font-bold text-white tracking-tight">{getPageTitle()}</h1>
        </div>
        
        <div className="flex items-center justify-end space-x-6">
          <div className="hidden lg:flex flex-col text-right border-r border-white/10 pr-6">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Bağlantı</span>
            <span className="text-xs font-mono font-bold text-primary select-all tracking-tighter">
              {terminalIP}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-sm font-bold text-white leading-none">{session?.user?.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-primary font-black mt-1">{session?.user?.role}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut()} title="Çıkış Yap" className="rounded-full w-10 h-10 hover:bg-red-500/10 hover:text-red-500 text-slate-400 transition-colors">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
