"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Search, 
  Plus, 
  Download, 
  AlertTriangle, 
  TrendingUp, 
  Filter,
  Edit3,
  Trash2,
  X,
  Save,
  Building2,
  Layers,
  CheckCircle2,
  ShoppingBag,
  Hammer
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import * as xlsx from "xlsx";
import { saveAs } from "file-saver";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function InventoryPage() {
  const { status } = useSession();
  const router = useRouter();

  const [inventory, setInventory] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"ALL" | "KRİTİK" | "STOKTA" | "DRINK" | "PRODUCTION">("ALL");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Add Product State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ 
    name: "", 
    categoryId: "", 
    supplierId: "",
    isForProduction: false,
    isForSale: true,
    categoryType: "FOOD",
    purchasePrice: 0, 
    kdv: 20, 
    markup: 20, 
    criticalLevel: 10,
    unit: "adet"
  });
  const [isAdding, setIsAdding] = useState(false);

  // Edit State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editCriticalLevel, setEditCriticalLevel] = useState<number>(10);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
     fetchInventory();
  }, []);

  const fetchInventory = async () => {
     try {
        setIsLoading(true);
        const [invRes, catRes, compRes] = await Promise.all([
           fetch("/api/products"),
           fetch("/api/categories"),
           fetch("/api/companies")
        ]);
        if (invRes.ok && catRes.ok && compRes.ok) {
           const data = await invRes.json();
           const catData = await catRes.json();
           const compData = await compRes.json();
           setCategories(catData);
           setCompanies(compData);
           setInventory(data);
        }
     } catch (err) {
        console.error("Failed to load inventory", err);
     } finally {
        setIsLoading(false);
     }
  };

  const filteredInventory = inventory.filter(item => {
     const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
     if (!matchesSearch) return false;

     if (selectedCompany && item.supplierId !== selectedCompany) return false;

     if (activeTab === "KRİTİK" && item.stockCount > (item.criticalLevel || 10)) return false;
     if (activeTab === "STOKTA" && item.stockCount <= 0) return false;
     if (activeTab === "DRINK" && item.categoryType !== "DRINK") return false;
     if (activeTab === "PRODUCTION" && !item.isForProduction) return false;

     return true;
  });

  const lowStockItems = inventory.filter(p => p.stockCount <= p.criticalLevel);
  const totalValue = inventory.reduce((acc, p) => acc + (p.purchasePrice * p.stockCount), 0);

  const exportToExcel = () => {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(inventory.map(p => ({
        "Ürün Adı": p.name,
        "Cari": p.supplier?.name || "-",
        "Kategori": p.category?.name || "Genel",
        "Stok": p.stockCount,
        "Birim": p.unit,
        "Alış Fiyatı": p.purchasePrice,
        "Satış Fiyatı": p.finalSalePrice
    })));
    xlsx.utils.book_append_sheet(wb, ws, "Envanter");
    const excelBuffer = xlsx.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `Uzpos_Depo_${new Date().toLocaleDateString()}.xlsx`);
  };

  const saveNewProduct = async () => {
     if (!newProduct.name || !newProduct.supplierId) return;
     try {
       setIsAdding(true);
       const priceWithKdv = Number(newProduct.purchasePrice) * ((Number(newProduct.kdv) / 100) + 1);
       const suggestedPrice = priceWithKdv * ((Number(newProduct.markup) / 100) + 1);

       const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
             ...newProduct,
             finalSalePrice: Number(suggestedPrice.toFixed(2))
          })
       });

       if (res.ok) {
          setIsAddModalOpen(false);
          setNewProduct({ name: "", categoryId: "", supplierId: "", isForProduction: false, isForSale: true, categoryType: "FOOD", purchasePrice: 0, kdv: 20, markup: 20, criticalLevel: 10, unit: "adet" });
          fetchInventory();
       }
     } catch (e) { console.error(e); } finally { setIsAdding(false); }
  };

  const handleUpdate = async () => {
     if (!editingProduct) return;
     try {
        setIsSaving(true);
        const res = await fetch(`/api/products/${editingProduct.id}`, {
           method: "PATCH",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ stockCount: Number(editQuantity), criticalLevel: Number(editCriticalLevel) })
        });
        if (res.ok) { setEditingProduct(null); fetchInventory(); }
     } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
     if (!window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
     try {
        const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
        if (res.ok) fetchInventory();
     } catch (e) { console.error(e); }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0c] text-slate-200 overflow-hidden font-sans">
      {/* Header Bar - More Professional & Integrated */}
      <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-2 rounded-xl ring-1 ring-primary/30">
            <Package className="text-primary w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">DEPO & STOK <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-400 font-bold uppercase tracking-widest">{filteredInventory.length} KALEM</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Profesyonel Envanter Yönetim Paneli</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ürün veya cari ara..." 
              className="bg-white/5 border border-white/10 rounded-full pl-9 pr-4 h-9 w-64 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-600"
            />
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white font-black text-xs gap-2 px-6 h-9 rounded-full shadow-lg shadow-primary/20">
            <Plus size={16} strokeWidth={3} /> YENİ ÜRÜN
          </Button>
          <Button variant="outline" onClick={exportToExcel} className="border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 h-9 w-9 p-0 rounded-full">
            <Download size={16} />
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Filters & Categories */}
        <aside className="w-64 border-r border-white/5 bg-black/20 p-4 shrink-0 flex flex-col gap-6">
          <section>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-2">GÖRÜNÜM</h3>
            <div className="space-y-1">
              {[
                { id: "ALL", label: "TÜM ENVANTER", icon: Package },
                { id: "DRINK", label: "İÇECEKLER", icon: ShoppingBag, color: "text-blue-500" },
                { id: "PRODUCTION", label: "ÜRETİM MALZEMELERİ", icon: Hammer, color: "text-orange-500" },
                { id: "KRİTİK", label: "KRİTİK STOKLAR", icon: AlertTriangle, color: "text-amber-500" },
                { id: "STOKTA", label: "ELDEKİLER", icon: CheckCircle2, color: "text-emerald-500" }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"}`}
                >
                  <tab.icon size={14} className={activeTab === tab.id ? "text-primary" : tab.color} />
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          <section className="flex-1 overflow-y-auto no-scrollbar">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-2">CARİLER</h3>
            <div className="space-y-1">
              <button 
                onClick={() => setSelectedCompany(null)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${selectedCompany === null ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"}`}
              >
                <Building2 size={14} /> HEPSİ
              </button>
              {companies.map(comp => (
                <button 
                  key={comp.id}
                  onClick={() => setSelectedCompany(comp.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all ${selectedCompany === comp.id ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  <span className="truncate flex-1 text-left">{comp.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Quick Stats at bottom of sidebar */}
          <section className="pt-4 border-t border-white/5">
             <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                   <TrendingUp size={12} className="text-emerald-500" />
                   <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">Envanter Değeri</span>
                </div>
                <p className="text-lg font-black text-white">{totalValue.toLocaleString()} ₺</p>
             </div>
          </section>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0c0c0e]">
          {/* Information Strip */}
          <div className="h-12 border-b border-white/5 flex items-center px-6 gap-6 bg-black/20">
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Filtre:</span>
                <span className="text-[11px] font-bold text-white bg-primary/20 px-2 py-0.5 rounded border border-primary/20 capitalize">{selectedCompany ? companies.find(c=>c.id === selectedCompany)?.name : "Tüm Cariler"}</span>
             </div>
             {lowStockItems.length > 0 && (
               <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  <AlertTriangle size={12} className="text-amber-500" />
                  <span className="text-[10px] font-black text-amber-500 uppercase">{lowStockItems.length} ÜRÜN KRİTİK SEVİYEDE</span>
               </div>
             )}
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
            <div className="border border-white/5 rounded-2xl bg-black/40 overflow-hidden shadow-2xl">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">
                    <th className="py-4 px-4 text-left font-black">Ürün / Tanım</th>
                    <th className="py-4 px-4 text-left font-black">Cari</th>
                    <th className="py-4 px-4 text-left font-black">Kategori</th>
                    <th className="py-4 px-4 text-right font-black">Birim Fiyat</th>
                    <th className="py-4 px-4 text-center font-black">Mevcut Stok</th>
                    <th className="py-4 px-4 text-center font-black">Durum</th>
                    <th className="py-4 px-4 text-right font-black pr-6">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr><td colSpan={7} className="py-20 text-center text-slate-600 text-xs animate-pulse">Ümumi Envanter Verileri Getiriliyor...</td></tr>
                  ) : filteredInventory.length === 0 ? (
                    <tr><td colSpan={7} className="py-20 text-center text-slate-600 text-xs italic">Seçili kriterlere uygun kayıt bulunamadı.</td></tr>
                  ) : filteredInventory.map(item => (
                    <tr key={item.id} className="group hover:bg-white/[0.02] transition-all">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-slate-400 text-xs group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                            {item.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[12px] font-black text-white">{item.name}</p>
                            <div className="flex gap-1.5 mt-0.5">
                               {item.isForProduction && (
                                 <span className="flex items-center gap-1 text-[8px] font-black text-blue-500 uppercase bg-blue-500/10 px-1 rounded-sm border border-blue-500/10" title="Üretim Malzemesi"><Hammer size={8} /> ÜRETİM</span>
                               )}
                               {item.isForSale && (
                                 <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-1 rounded-sm border border-emerald-500/10" title="Doğrudan Satış"><ShoppingBag size={8} /> SATIŞ</span>
                               )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors uppercase">{item.supplier?.name || "TANIMSIZ"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[9px] font-black text-slate-500 border border-white/5 bg-white/5 px-2 py-0.5 rounded-full uppercase">{item.category?.name || "GENEL"}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="text-[12px] font-black text-white">{item.purchasePrice.toFixed(2)} ₺</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">SON ALIŞ</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                            <span className={`text-[13px] font-black ${item.stockCount <= item.criticalLevel ? "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" : "text-white"}`}>
                              {item.stockCount} <span className="text-[10px] font-bold opacity-40 uppercase">{item.unit}</span>
                            </span>
                            <div className="w-12 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                               <div className={`h-full rounded-full ${item.stockCount <= item.criticalLevel ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min((item.stockCount / (item.criticalLevel * 2)) * 100, 100)}%` }} />
                            </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.stockCount <= item.criticalLevel ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase">
                            <AlertTriangle size={10} /> KRİTİK
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase">
                            <CheckCircle2 size={10} /> STOKTA
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
                          <Button onClick={() => { setEditingProduct(item); setEditQuantity(item.stockCount); setEditCriticalLevel(item.criticalLevel); }} variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-primary/20 text-slate-500 hover:text-primary"><Edit3 size={14} /></Button>
                          <Button onClick={() => handleDelete(item.id)} variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-500"><Trash2 size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal - Compact */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="border-white/10 bg-[#0d0d0f] text-white max-w-sm rounded-[24px]">
          <DialogHeader className="mb-4">
             <DialogTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Edit3 size={16} /> STOK DÜZENLE
             </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
             <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">DÜZENLENEN ÜRÜN</p>
                <p className="text-sm font-bold text-white">{editingProduct?.name}</p>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">MEVCUT STOK</label>
                   <Input type="number" value={editQuantity} onChange={(e) => setEditQuantity(Number(e.target.value))} className="h-10 text-xs bg-black/50 border-white/10 rounded-xl focus:ring-primary/40" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">KRİTİK EŞİK</label>
                   <Input type="number" value={editCriticalLevel} onChange={(e) => setEditCriticalLevel(Number(e.target.value))} className="h-10 text-xs bg-black/50 border-white/10 rounded-xl focus:ring-primary/40 transition-all" />
                </div>
             </div>
          </div>
          <DialogFooter className="mt-6 gap-2">
             <Button variant="ghost" onClick={() => setEditingProduct(null)} className="h-10 text-[11px] font-black text-slate-500 hover:text-white rounded-xl">VAZGEÇ</Button>
             <Button onClick={handleUpdate} disabled={isSaving} className="h-10 text-[11px] font-black bg-primary rounded-xl px-8">KAYDET</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Modal - Modern & Business Flow */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="border-white/10 bg-[#0d0d0f] text-white max-w-md rounded-[28px] p-8 shadow-2xl">
           <DialogHeader className="mb-6">
              <div className="flex items-center gap-3">
                 <div className="bg-primary/20 p-2 rounded-xl"><Plus className="text-primary w-5 h-5" /></div>
                 <div>
                    <DialogTitle className="text-lg font-black tracking-tight text-white uppercase">YENİ ÜRÜN KAYDI</DialogTitle>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Stok ve tedarik zinciri entegrasyonu</p>
                 </div>
              </div>
           </DialogHeader>
           
           <div className="space-y-5">
              {/* Product Identity */}
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ÜRÜN / MALZEME ADI</label>
                 <Input value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className="h-11 text-[13px] font-bold bg-black/40 border-white/10 rounded-xl focus:border-primary/50 placeholder:text-slate-800" placeholder="Örn: Coca Cola Zero 330ml" />
              </div>

              {/* Entity Association - PRIMARY FOCUS */}
              <div className="grid grid-cols-2 gap-5">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Building2 size={10} /> CARİ / TEDARİKÇİ</label>
                    <select value={newProduct.supplierId} onChange={(e) => setNewProduct({...newProduct, supplierId: e.target.value})} className="w-full h-11 text-[12px] font-bold bg-black/40 border border-white/10 rounded-xl px-3 text-white outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer">
                       <option value="">Cari Seçiniz</option>
                       {companies.map(c => <option key={c.id} value={c.id} className="bg-[#0d0d0f]">{c.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1"><Layers size={10} /> KATEGORİ</label>
                    <select value={newProduct.categoryId} onChange={(e) => setNewProduct({...newProduct, categoryId: e.target.value})} className="w-full h-11 text-[12px] font-bold bg-black/40 border border-white/10 rounded-xl px-3 text-white outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer">
                       <option value="">Kategori Seçiniz</option>
                       {categories.map(c => <option key={c.id} value={c.id} className="bg-[#0d0d0f]">{c.name}</option>)}
                    </select>
                 </div>
              </div>

              {/* Flags - Modern Checkboxes */}
              <div className="p-1 gap-1 grid grid-cols-2 bg-white/5 rounded-2xl border border-white/5">
                 <label className={`flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${newProduct.isForProduction ? "bg-primary/10 text-primary border border-primary/20" : "text-slate-500 hover:bg-white/5"}`}>
                    <input type="checkbox" checked={newProduct.isForProduction} onChange={(e) => setNewProduct({...newProduct, isForProduction: e.target.checked})} className="hidden" />
                    <Hammer size={16} />
                    <span className="text-[11px] font-black uppercase tracking-tighter">ÜRETİMDE</span>
                 </label>
                 <label className={`flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${newProduct.isForSale ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "text-slate-500 hover:bg-white/5"}`}>
                    <input type="checkbox" checked={newProduct.isForSale} onChange={(e) => setNewProduct({...newProduct, isForSale: e.target.checked})} className="hidden" />
                    <ShoppingBag size={16} />
                    <span className="text-[11px] font-black uppercase tracking-tighter">SATIŞTA</span>
                 </label>
              </div>

              {/* Pricing & Logistics */}
              <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">ALIŞ (TL)</label>
                    <Input type="number" value={newProduct.purchasePrice} onChange={(e) => setNewProduct({...newProduct, purchasePrice: Number(e.target.value)})} className="h-10 text-xs font-bold bg-black/30 border-white/10 rounded-xl" />
                 </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">TÜRE GÖRE</label>
                    <select value={newProduct.categoryType} onChange={(e) => setNewProduct({...newProduct, categoryType: e.target.value})} className="w-full h-10 text-xs font-bold bg-black/30 border border-white/10 rounded-xl px-2 text-white outline-none">
                       <option value="FOOD">YİYECEK / MEZE</option>
                       <option value="DRINK">İÇECEK</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-500 uppercase">BİRİM</label>
                     <select value={newProduct.unit} onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})} className="w-full h-10 text-xs font-bold bg-black/30 border border-white/10 rounded-xl px-2 text-white outline-none">
                        <option value="adet">ADET</option>
                        <option value="kg">KG</option>
                     </select>
                  </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase">KRİTİK</label>
                    <Input type="number" value={newProduct.criticalLevel} onChange={(e) => setNewProduct({...newProduct, criticalLevel: Number(e.target.value)})} className="h-10 text-xs font-bold bg-black/30 border-white/10 rounded-xl" />
                 </div>
              </div>
           </div>

           <DialogFooter className="mt-8 gap-3">
              <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="h-11 text-[11px] font-black text-slate-500 hover:text-white rounded-2xl flex-1">İPTAL EDİLSİN</Button>
              <Button onClick={saveNewProduct} disabled={isAdding} className="h-11 text-[11px] font-black bg-primary rounded-2xl flex-1 shadow-xl shadow-primary/20">SİSTEME KAYDET</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

