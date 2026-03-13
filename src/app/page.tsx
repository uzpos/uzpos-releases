"use client"

import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { UtensilsCrossed, PackageOpen, Calculator, Settings, ReceiptText } from "lucide-react";

export default function Dashboard() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="p-8 text-center text-primary animate-pulse">Uzpos Başlatılıyor...</div>;
  }

  const modules = [
    {
      title: "Satış & Masalar (POS)",
      description: "Yeni siparişler oluşturun, masaları yönetin ve hesap alın.",
      href: "/pos",
      icon: UtensilsCrossed,
      color: "text-red-500",
    },
    {
      title: "Mutfak Ekranı (KDS)",
      description: "Gelen siparişleri görün, durumlarını hazırlık ve hazır olarak güncelleyin.",
      href: "/kitchen",
      icon: ReceiptText,
      color: "text-orange-400",
    },
    {
      title: "Depo & Stok",
      description: "Ürünlerin stoğunu kontrol edin, sayım yapın ve azalan ürünleri görün.",
      href: "/inventory",
      icon: PackageOpen,
      color: "text-emerald-400",
    },
    {
      title: "Muhasebe",
      description: "Gelir/Gider takibi yapın, faturaları işleyin ve firma ödemelerini görün.",
      href: "/accounting",
      icon: Calculator,
      color: "text-purple-400",
    },
  ];

  if (session?.user.role === "ADMIN") {
    modules.push({
      title: "Ayarlar & Personel",
      description: "Uygulama ayarları, menü düzenleme ve personel yetkilendirmesi.",
      href: "/settings",
      icon: Settings,
      color: "text-slate-400",
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center">
      <Navbar />
      
      <main className="flex-1 w-full max-w-6xl p-4 md:p-8 mt-10">
        <div className="flex flex-col space-y-2 mb-12 items-center text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2">
            Hoşgeldiniz, <span className="text-primary text-glow">{session?.user?.name}</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            Uzpos Restoran Yönetim Sisteminde bugün hangi işlemi gerçekleştirmek istersiniz?
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.href} className="group cursor-pointer">
                <CardHeader className="pb-4">
                  <div className={`mb-4 inline-flex p-3 rounded-lg bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300 ${module.color}`}>
                    <Icon size={24} />
                  </div>
                  <CardTitle className="text-xl text-white group-hover:text-primary transition-colors">
                    {module.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-400 mb-6 text-base">
                    {module.description}
                  </CardDescription>
                  <Link href={module.href} className="w-full">
                    <Button className="w-full" variant="glass" size="lg">Sisteme Gir</Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  );
}
