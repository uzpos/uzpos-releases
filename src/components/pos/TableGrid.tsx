"use client";

import { useEffect, useState } from "react";
import { usePosStore } from "@/store/posStore";
import { Plus, Trash2, ShoppingBag, Package, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Table {
  id: string;
  name: string;
  status: string;
  group?: { name: string };
}

export function TableGrid() {
  const { selectTable } = usePosStore();
  
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add Table Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableGroup, setNewTableGroup] = useState("Genel");

  useEffect(() => {
     fetchTables();
     const interval = setInterval(fetchTables, 30000);
     return () => clearInterval(interval);
  }, []);

  const fetchTables = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/tables");
      if (res.ok) {
         const data = await res.json();
         setTables(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTable = async () => {
     if (!newTableName) return;
     try {
       const res = await fetch("/api/tables", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ name: newTableName, groupName: newTableGroup })
       });
       if (res.ok) {
          setIsAddModalOpen(false);
          setNewTableName("");
          fetchTables();
       }
     } catch (err) {
       console.error(err);
     }
  };

  const handleDeleteTable = async (e: React.MouseEvent, id: string) => {
     e.stopPropagation(); // prevent selecting the table
     if (!window.confirm("Bu masayı silmek istediğinize emin misiniz?")) return;
     
     try {
       const res = await fetch(`/api/tables/${id}`, { method: "DELETE" });
       if (res.ok) fetchTables();
     } catch (err) {
       console.error(err);
     }
  };

  // Groups logic
  const groupedTables = tables.reduce((acc, table) => {
     const gName = table.group?.name || "Genel";
     if (!acc[gName]) acc[gName] = [];
     acc[gName].push(table);
     return acc;
  }, {} as Record<string, Table[]>);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-4">
             Masa & Sipariş Seçimi
             <Button onClick={() => setIsAddModalOpen(true)} variant="outline" size="sm" className="border-white/20 text-slate-300 hover:text-white hover:bg-white/10 h-8 text-xs ml-2">
                <Plus size={14} className="mr-1" /> Masa Ekle
             </Button>
          </h2>
          <p className="text-slate-400 mt-1">Sipariş almak veya hesap kapatmak için bir masa veya sipariş tipi seçin.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-white/10 border border-white/20"></span>
            <span className="text-sm text-slate-400">Boş</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(218,26,50,0.5)]"></span>
            <span className="text-sm text-slate-400">Dolu</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 relative mb-8">
        {/* Special Direct Sales Tiles */}
        <button
          onClick={() => selectTable("DIRECT_SALE", "Peşin Satış")}
          className="relative h-40 rounded-2xl flex flex-col items-center justify-center p-6 border transition-all duration-300 transform hover:scale-105 hover:shadow-2xl active:scale-95 z-10 bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 border-emerald-500/50 text-emerald-100 hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        >
          <ShoppingBag size={40} className="mb-2 text-emerald-400" />
          <span className="text-2xl font-black tracking-tight text-glow">
            Peşin Satış
          </span>
          <span className="text-xs mt-2 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-500/30">
            Hızlı Teslim
          </span>
        </button>

        <button
          onClick={() => selectTable("TAKEAWAY", "Paket Sipariş")}
          className="relative h-40 rounded-2xl flex flex-col items-center justify-center p-6 border transition-all duration-300 transform hover:scale-105 hover:shadow-2xl active:scale-95 z-10 bg-gradient-to-br from-blue-500/20 to-blue-900/40 border-blue-500/50 text-blue-100 hover:border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
        >
          <Package size={40} className="mb-2 text-blue-400" />
          <span className="text-2xl font-black tracking-tight text-glow">
            Paket Sipariş
          </span>
          <span className="text-xs mt-2 px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 border border-blue-500/30">
            Kurye Teslim
          </span>
        </button>
      </div>

      {isLoading ? (
         <div className="text-center text-slate-400 py-12">Masalar Yükleniyor...</div>
      ) : Object.keys(groupedTables).length === 0 ? (
         <div className="text-center text-slate-400 py-12">Henüz kayıtlı masa bulunmuyor.</div>
      ) : (
        Object.entries(groupedTables).map(([groupName, groupTables]) => (
          <div key={groupName} className="mb-12">
            <h3 className="text-xl font-bold text-slate-300 mb-6 border-b border-white/10 pb-2">{groupName}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 relative">
              {groupTables.map(table => {
                const isOccupied = table.status === "OCCUPIED";
                return (
                  <button
                    key={table.id}
                    onClick={() => selectTable(table.id, table.name)}
                    className={`relative h-40 rounded-2xl flex flex-col items-center justify-center p-6 border transition-all duration-300 transform hover:scale-105 hover:shadow-2xl active:scale-95 z-10 group/table 
                      ${isOccupied 
                        ? "bg-primary/40 border-primary shadow-[0_0_15px_rgba(218,26,50,0.5)] text-white" 
                        : "bg-black/80 border-white/20 text-slate-200 hover:bg-black hover:border-white/40 shadow-lg"
                      }`}
                  >
                    {!isOccupied && (
                       <div 
                         onClick={(e) => handleDeleteTable(e, table.id)} 
                         className="absolute top-3 left-3 opacity-0 group-hover/table:opacity-100 transition-opacity bg-black/50 p-2 rounded-full hover:bg-red-500/20 hover:text-red-500 text-slate-400 cursor-pointer"
                         title="Yalnızca boş masalar silinebilir."
                       >
                          <Trash2 size={14} />
                       </div>
                    )}
                    <span className={`text-2xl font-black tracking-tight ${isOccupied ? "text-white text-glow" : "text-white"}`}>
                      {table.name}
                    </span>
                    <span className={`text-xs mt-2 px-3 py-1 rounded-full ${isOccupied ? "bg-primary/50 text-white" : "bg-white/10 text-slate-300"}`}>
                      {groupName}
                    </span>
                    <span className={`absolute top-4 right-4 flex w-3 h-3`}>
                      {isOccupied && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full w-3 h-3 ${isOccupied ? "bg-white" : "bg-white/20"}`}></span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Add Table Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="border-white/10 glass-panel text-white">
          <DialogHeader>
            <DialogTitle>Yeni Masa Ekle</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Masa Adı / Numarası</label>
              <Input 
                value={newTableName} 
                onChange={(e) => setNewTableName(e.target.value)} 
                placeholder="Örn: Masa 12" 
                className="bg-black/50 border-white/10 focus-visible:ring-primary text-white" 
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Bulunduğu Grup</label>
              <Input 
                value={newTableGroup} 
                onChange={(e) => setNewTableGroup(e.target.value)} 
                placeholder="Örn: Bahçe" 
                className="bg-black/50 border-white/10 focus-visible:ring-primary text-white" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="border-white/20 text-slate-300 hover:text-white hover:bg-white/10">
              <X size={16} className="mr-2"/> İptal
            </Button>
            <Button onClick={handleAddTable} className="bg-primary hover:bg-primary/90 text-white font-bold shadow-[0_0_15px_rgba(218,26,50,0.5)]">
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
