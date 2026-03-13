"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type OrderItem = {
  id: string;
  name: string;
  note: string;
};

type OrderType = {
  id: string;
  tableId: string;
  time: string;
  status: string;
  items: OrderItem[];
};

interface OrderCardProps {
  order: OrderType;
  accentColor: string;
  nextStatus: string;
  nextStatusText: string;
}

// Orders for Kitchen handled via state and fetch.

export default function KitchenPage() {
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/kitchen");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/kitchen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, newStatus })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pendingOrders = orders.filter(o => o.status === "PENDING");
  const preparingOrders = orders.filter(o => o.status === "PREPARING");
  
  const OrderCard = ({ order, accentColor, nextStatus, nextStatusText }: OrderCardProps) => (
    <Card className={`relative overflow-hidden transition-all hover:scale-[1.02] border-l-4 ${accentColor} glass-card`}>
      <CardHeader className="pb-2 bg-white/5">
        <div className="flex justify-between items-center w-full">
          <CardTitle className="text-2xl font-black text-white">{order.tableId}</CardTitle>
          <span className="text-xl font-bold bg-white/10 text-white px-3 py-1 rounded-lg">
            {order.time}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ul className="space-y-3 mb-6">
          {order.items.map((item) => (
            <li key={item.id} className="text-lg text-slate-300 flex flex-col">
              <span className="font-bold text-white">{item.name}</span>
              {item.note && <span className="text-sm text-amber-400 italic">Not: {item.note}</span>}
            </li>
          ))}
        </ul>
        <div className="flex justify-end mt-auto pt-4 border-t border-white/10">
          <Button 
            className="w-full h-12 text-lg font-bold shadow-xl"
            variant="glass"
            onClick={() => updateStatus(order.id, nextStatus)}
          >
            {nextStatusText}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col items-center bg-black/95">
      <Navbar />
      
      <main className="flex-1 w-full max-w-[1600px] p-4 md:p-8 mt-4">
        <div className="flex justify-between items-center mb-8 bg-black/40 p-6 rounded-2xl glass-panel border border-white/10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Mutfak Ekranı (KDS)</h1>
            <p className="text-slate-400">Aktif ve hazırlanan siparişleri takip edin.</p>
          </div>
          <div className="flex gap-4">
             <div className="text-center bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
               <div className="text-3xl font-black text-primary">{pendingOrders.length}</div>
               <div className="text-xs text-slate-400 uppercase tracking-widest font-bold">Yeni</div>
             </div>
             <div className="text-center bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
               <div className="text-3xl font-black text-amber-500">{preparingOrders.length}</div>
               <div className="text-xs text-slate-400 uppercase tracking-widest font-bold">Hazırlanıyor</div>
             </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-slate-500 font-bold text-xl uppercase tracking-widest animate-pulse">
            Siparişler Yükleniyor...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            
            {/* BEKLEYEN SİPARİŞLER (PENDING) */}
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-primary animate-pulse"></span>
                Yeni Siparişler
              </h2>
              {pendingOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  accentColor="border-l-primary"
                  nextStatus="PREPARING" 
                  nextStatusText="Hazırlamaya Başla" 
                />
              ))}
              {pendingOrders.length === 0 && (
                <div className="h-40 glass-card flex items-center justify-center text-slate-500 font-medium">
                  Bekleyen yeni sipariş yok.
                </div>
              )}
            </div>

            {/* HAZIRLANAN SİPARİŞLER (PREPARING) */}
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                Hazırlanıyor
              </h2>
              {preparingOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  accentColor="border-l-amber-500"
                  nextStatus="READY" 
                  nextStatusText="Hazır (Gönder)" 
                />
              ))}
              {preparingOrders.length === 0 && (
                <div className="h-40 glass-card flex items-center justify-center text-slate-500 font-medium">
                  Hazırlanan sipariş yok.
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
