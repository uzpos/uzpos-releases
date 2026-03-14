"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Wifi, ShieldCheck, Users, Info } from "lucide-react";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [connectivity, setConnectivity] = useState({ ip: "...", port: "..." });
  const [updateStatus, setUpdateStatus] = useState("Sistem güncel.");
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    // Only available in Electron
    const win = window as any;
    if (win.electron) {
      win.electron.getConnectivityInfo().then(setConnectivity).catch(() => {});
      win.electron.onUpdateStatus((status: string) => {
        setUpdateStatus(status);
        setIsChecking(false);
      });
    }
  }, []);

  const handleCheckUpdate = () => {
    const win = window as any;
    if (win.electron) {
      setIsChecking(true);
      setUpdateStatus("Güncellemeler denetleniyor...");
      win.electron.checkForUpdates();
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white text-xl font-bold">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-black/95 flex flex-col items-center">
      <Navbar />
      
      <main className="flex-1 w-full max-w-[1000px] p-4 md:p-8 mt-4">
        <div className="mb-8 bg-black/40 p-6 rounded-2xl glass-panel border border-white/10">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Sistem Ayarları</h1>
          <p className="text-slate-400">Genel yapılandırma, güncellemeler ve sistem bilgilerini yönetin.</p>
        </div>

        <div className="grid gap-6">
          {/* Connectivity Card */}
          <Card className="glass-panel border-white/10 bg-white/5 overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <Wifi size={24} />
                </div>
                <div>
                  <CardTitle className="text-white">Bağlantı Bilgileri</CardTitle>
                  <CardDescription className="text-slate-400">Mobil cihazların (garson terminali) bağlanabilmesi için gerekli adres.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-black/40 p-6 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Yerel Erişim Adresi:</span>
                <span className="text-2xl md:text-3xl font-mono font-black text-blue-400 tracking-wider shadow-[0_0_20px_rgba(59,130,246,0.2)] px-4 py-2 rounded-lg bg-blue-500/5">
                  {connectivity.ip}:{connectivity.port}
                </span>
              </div>
              <div className="flex gap-2 items-start text-xs text-slate-500 bg-white/5 p-3 rounded-lg border border-white/5">
                <Info size={14} className="mt-0.5 shrink-0" />
                <p>
                  * Garson tabletleri veya telefonlarınızın bu ana bilgisayar ile <strong>aynı Wi-Fi ağına</strong> bağlı olduğundan emin olun.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Updates Card */}
          <Card className="glass-panel border-white/10 bg-white/5 overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                  <RefreshCcw size={24} />
                </div>
                <div>
                  <CardTitle className="text-white">Sistem Güncellemeleri</CardTitle>
                  <CardDescription className="text-slate-400">Uygulama sürümünü kontrol edin ve en yeni özellikleri edinin.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1 w-full text-center md:text-left">
                  <p className="text-slate-200 font-bold">Mevcut Durum</p>
                  <p className={`text-sm ${updateStatus.includes('Hata') ? 'text-red-400' : 'text-slate-400'}`}>
                    {updateStatus}
                  </p>
                </div>
                <Button 
                  onClick={handleCheckUpdate} 
                  disabled={isChecking}
                  className="bg-green-600 hover:bg-green-500 text-white font-black h-12 px-8 shadow-[0_0_20px_rgba(34,197,94,0.3)] min-w-[240px]"
                >
                  {isChecking ? (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      Denetleniyor...
                    </>
                  ) : "Güncellemeleri Denetle"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security & Data */}
          <Card className="glass-panel border-white/10 bg-white/5 overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg text-primary">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <CardTitle className="text-white">Veri Güvenliği</CardTitle>
                  <CardDescription className="text-slate-400">Veritabanı ve yedekleme durumu.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="flex items-center gap-3 text-sm text-slate-300 bg-black/20 p-3 rounded-lg border border-white/5">
                  <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                  <span>Veritabanı konumu güvenli (%AppData%)</span>
               </div>
               <div className="flex items-center gap-3 text-sm text-slate-300 bg-black/20 p-3 rounded-lg border border-white/5">
                  <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                  <span>Güncelleme koruması aktif</span>
               </div>
               <div className="flex items-center gap-3 text-sm text-slate-300 bg-black/20 p-3 rounded-lg border border-white/5">
                  <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                  <span>Otomatik yedekleme aktif</span>
               </div>
               <div className="flex items-center gap-3 text-sm text-slate-300 bg-black/20 p-3 rounded-lg border border-white/5">
                  <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  <span>Bulut senkronizasyonu hazır</span>
               </div>
            </CardContent>
          </Card>

          {/* Action Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
             <Button 
                onClick={() => router.push("/settings/users")}
                className="h-24 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 justify-start px-6 gap-5 transition-all group"
             >
                <div className="p-4 bg-purple-500/20 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                  <Users size={28} />
                </div>
                <div className="text-left">
                   <p className="font-black text-white text-lg">Personel Yönetimi</p>
                   <p className="text-xs text-slate-400">Kullanıcı ekle, yetkileri düzenle.</p>
                </div>
             </Button>

             <div className="h-24 bg-white/5 border border-white/10 rounded-md flex items-center px-6 gap-5 select-none">
                <div className="p-4 bg-orange-500/20 rounded-xl text-orange-400">
                  <Info size={28} />
                </div>
                <div className="text-left">
                   <p className="font-black text-white text-lg uppercase tracking-wider">Uzpos v1.0.1</p>
                   <p className="text-xs text-slate-400">Stabil Sürüm (Windows x64)</p>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
