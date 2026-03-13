"use client";

import { Navbar } from "@/components/Navbar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Plus, Search, Layers, Calculator, Edit2, Save, X, Download, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import * as xlsx from "xlsx";
import { saveAs } from "file-saver";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function InventoryPage() {
  const { status } = useSession();
  const router = useRouter();

  const [inventory, setInventory] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [categories, setCategories] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, RECIPE, DRINK, MATERIAL

  // Add Product State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", categoryId: "", type: "MATERIAL", piecesPerBox: 1, purchasePrice: 0, kdv: 20, markup: 30, criticalLevel: 10 });
  const [isAdding, setIsAdding] = useState(false);

  // Edit State
  const [editingItem, setEditingItem] = useState<any | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editCriticalLevel, setEditCriticalLevel] = useState<number>(10);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

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
        const [invRes, catRes] = await Promise.all([
           fetch("/api/products"),
           fetch("/api/categories")
        ]);
        if (invRes.ok && catRes.ok) {
           const data = await invRes.json();
           const catData = await catRes.json();
           setCategories(catData);
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
                          item.category?.name?.toLowerCase().includes(searchTerm.toLowerCase());
     if (!matchesSearch) return false;

     if (showCriticalOnly && item.stockCount > (item.criticalLevel || 10)) return false;

     if (activeTab === "ALL") return true;
     if (activeTab === "RECIPE") return item.type === "RECIPE";
     if (activeTab === "MATERIAL") return item.type === "MATERIAL";
     if (activeTab === "DRINK") return item.category?.type === "DRINK" || item.category?.name?.toLowerCase().includes("içecek") || item.type === "READY";
     return true;
  });

  const lowStockItems = filteredInventory.filter(item => item.stockCount <= (item.criticalLevel || 20)); 
  const totalValue = filteredInventory.reduce((sum, item) => sum + (item.stockCount * (item.purchasePrice || item.estimatedPrice || 0)), 0);

  const exportToExcel = () => {
    const wb = xlsx.utils.book_new();
    const getSheetData = (filterType: string) => {
       const filtered = inventory.filter(p => {
           if (filterType === "RECIPE") return p.type === "RECIPE";
           if (filterType === "MATERIAL") return p.type === "MATERIAL";
           if (filterType === "DRINK") return p.category?.type === "DRINK" || p.category?.name?.toLowerCase().includes("içecek") || p.type === "READY";
           return true; 
       });
        return filtered.map(p => ({
            "Ürün Adı": p.name,
            "Kategori": p.category?.name || "Belirsiz",
            "Stok Miktarı": p.stockCount,
            "Birim": p.unit,
            "Birim Maliyeti (₺)": p.purchasePrice || p.estimatedPrice || 0,
            "Tahmini Değer (₺)": p.stockCount * (p.purchasePrice || p.estimatedPrice || 0)
        }));
    };

    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(getSheetData("ALL")), "Tüm Ürünler");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(getSheetData("RECIPE")), "Üretim");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(getSheetData("DRINK")), "İçecek");
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(getSheetData("MATERIAL")), "Sarf Malzeme");

    const excelBuffer = xlsx.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "Uzpos_Depo_Raporu.xlsx");
  };

  const saveNewProduct = async () => {
     if (!newProduct.name || !newProduct.type) return;
     try {
       setIsAdding(true);
       
       const kdvMulti = (Number(newProduct.kdv) / 100) + 1;
       const priceWithKdv = Number(newProduct.purchasePrice) * kdvMulti;
       const suggestedPrice = priceWithKdv * ((Number(newProduct.markup) / 100) + 1);

       const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
             name: newProduct.name,
           type: newProduct.type,
           categoryId: newProduct.categoryId,
           unit: "adet", // default
           piecesPerBox: Number(newProduct.piecesPerBox),
           purchasePrice: Number(newProduct.purchasePrice),
           markup: Number(newProduct.markup),
           criticalLevel: Number(newProduct.criticalLevel),
           finalSalePrice: Number(suggestedPrice.toFixed(2))
        })
     });

     if (res.ok) {
        setIsAddModalOpen(false);
        setNewProduct({ name: "", categoryId: "", type: "MATERIAL", piecesPerBox: 1, purchasePrice: 0, kdv: 20, markup: 30, criticalLevel: 10 });
        fetchInventory();
     } else {
          alert("Ürün eklenirken hata oluştu.");
       }
     } catch (e) {
        console.error(e);
     } finally {
        setIsAdding(false);
     }
  };

   const handleEditClick = (item: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      setEditingItem(item);
      setEditQuantity(item.stockCount);
      setEditCriticalLevel(item.criticalLevel || 10);
   };

   const handleDeleteProduct = async () => {
      if (!editingItem) return;
      if (!window.confirm(`"${editingItem.name}" ürününü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
      
      try {
         setIsSaving(true);
         const res = await fetch(`/api/products/${editingItem.id}`, { method: "DELETE" });
         if (res.ok) {
            setEditingItem(null);
            fetchInventory();
         } else {
            alert("Ürün silinemedi. Bu ürün faturada veya reçetede kullanılıyor olabilir.");
         }
      } catch (e) {
         console.error(e);
      } finally {
         setIsSaving(false);
      }
   };

  const saveInventoryUpdate = async () => {
     if (!editingItem) return;
     try {
        setIsSaving(true);
         const res = await fetch(`/api/products/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
             stockCount: Number(editQuantity),
             criticalLevel: Number(editCriticalLevel)
          })
       });
        
        if (res.ok) {
           setEditingItem(null);
           fetchInventory();
        } else {
           alert("Güncelleme başarısız.");
        }
     } catch (err) {
        console.error(err);
     } finally {
        setIsSaving(false);
     }
  };

  return (
    <div className="min-h-screen flex flex-col items-center">
      <Navbar />
      
      <main className="flex-1 w-full max-w-[1400px] p-4 md:p-8 mt-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-black/40 p-6 rounded-2xl glass-panel border border-white/10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Depo ve Stok Yönetimi</h1>
            <p className="text-slate-400">Ürün mevcudiyetini, kritik stokları ve depo değerini analiz edin.</p>
          </div>
          <div className="flex gap-4">
            <Button onClick={exportToExcel} variant="outline" className="h-12 border-white/20 text-slate-300 hover:text-white hover:bg-white/10 gap-2">
              <Download size={18} /> Excel&apos;e Aktar
            </Button>
            <Button onClick={() => setIsAddModalOpen(true)} className="h-12 bg-primary hover:bg-primary/90 text-white gap-2 font-bold px-6 shadow-[0_0_15px_rgba(218,26,50,0.5)]">
              <Plus size={18} /> Ürün Ekle
            </Button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2 overflow-x-auto mb-6 bg-black/40 p-2 rounded-xl border border-white/10 w-max">
           {[
             { id: "ALL", label: "Tüm Ürünler" },
             { id: "RECIPE", label: "Üretim (Reçeteli)" },
             { id: "DRINK", label: "İçecek & Hazır" },
             { id: "MATERIAL", label: "Sarf Malzeme" }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 whitespace-nowrap ${
                 activeTab === tab.id 
                   ? "bg-primary text-white shadow-[0_0_15px_rgba(218,26,50,0.5)]" 
                   : "text-slate-400 hover:text-white hover:bg-white/5"
               }`}
             >
               {tab.label}
             </button>
           ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-card border-l-4 border-l-blue-500 overflow-hidden relative">
            <div className="absolute -bottom-4 -right-4 text-blue-500/10">
              <Layers size={120} />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-400 uppercase tracking-widest font-bold">Toplam Kalem</CardDescription>
              <CardTitle className="text-4xl text-white font-black">{filteredInventory.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="glass-card border-l-4 border-l-red-500 overflow-hidden relative">
             <div className="absolute -bottom-4 -right-4 text-red-500/10 animate-pulse">
              <AlertTriangle size={120} />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-red-400 uppercase tracking-widest font-bold">Kritik Stok</CardDescription>
              <CardTitle className="text-4xl text-white font-black">{lowStockItems.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="glass-card border-l-4 border-l-emerald-500 overflow-hidden relative">
             <div className="absolute -bottom-4 -right-4 text-emerald-500/10">
              <Calculator size={120} />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-400 uppercase tracking-widest font-bold">Depo Değeri</CardDescription>
              <CardTitle className="text-4xl text-white font-black">{totalValue.toLocaleString('tr-TR')} ₺</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {lowStockItems.length > 0 && (
          <div className="mb-8 p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex flex-col md:flex-row items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-red-500/20 rounded-full text-red-500 animate-pulse">
                 <AlertTriangle size={24} />
               </div>
               <div>
                  <h3 className="text-red-400 font-bold text-lg">Azalan Ürün Uyarıları</h3>
                  <p className="text-slate-300 text-sm">Depoda kritik seviyenin altına düşen {lowStockItems.length} ürün var. Sipariş vermeyi unutmayın.</p>
               </div>
            </div>
            <Button variant="outline" className="border-red-500 text-red-400 hover:bg-red-500/20">Hemen Sipariş Ver</Button>
          </div>
        )}

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                 <CardTitle className="text-white">Güncel Depo Durumu</CardTitle>
                 <CardDescription className="text-slate-400">Tüm ürünlerin anlık stok ve maliyet listesi.</CardDescription>
               </div>
                <div className="flex flex-wrap gap-2">
                   <Button 
                     onClick={() => setShowCriticalOnly(!showCriticalOnly)}
                     variant={showCriticalOnly ? "destructive" : "outline"}
                     className={`h-11 gap-2 font-bold px-4 ${showCriticalOnly ? 'animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'border-white/10 text-slate-400'}`}
                   >
                     <AlertTriangle size={18} /> {showCriticalOnly ? "Tümünü Göster" : "Sadece Kritik Stok"}
                   </Button>
                   <div className="relative w-full md:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <Input 
                        placeholder="Ürün veya kategori ara..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-11 pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-primary rounded-xl"
                      />
                   </div>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-slate-400">Ürün Adı</TableHead>
                  <TableHead className="text-slate-400">Kategori</TableHead>
                  <TableHead className="text-slate-400 text-right">Mevcut Stok</TableHead>
                  <TableHead className="text-slate-400 text-right">Kritik Seviye</TableHead>
                  <TableHead className="text-slate-400 text-right">Durum</TableHead>
                  <TableHead className="text-slate-400 text-right">Birim Maliyet</TableHead>
                  <TableHead className="text-slate-400 text-center w-16">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">Yükleniyor...</TableCell>
                  </TableRow>
                ) : filteredInventory.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={7} className="text-center py-8 text-slate-400">Bu gruba ait kayıtlı ürün bulunamadı.</TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((item) => {
                    const isLow = item.stockCount <= (item.criticalLevel || 20); // 20 is placeholder minimum array limit
                    return (
                      <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="font-bold text-white py-4">{item.name}</TableCell>
                        <TableCell className="text-slate-400">
                          <span className="bg-white/5 px-2 py-1 rounded-md text-xs">{item.category?.name || "Kategori Yok"}</span>
                        </TableCell>
                        <TableCell className={`text-right font-bold text-lg ${isLow ? 'text-red-400' : 'text-slate-200'}`}>
                          {item.stockCount} <span className="text-sm font-normal text-slate-500">{item.unit}</span>
                        </TableCell>
                        <TableCell className="text-right text-slate-400">{item.criticalLevel || 20}</TableCell>
                        <TableCell className="text-right w-[150px]">
                          {isLow ? (
                             <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400 border border-red-500/30">
                                Yetersiz
                             </span>
                          ) : (
                             <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                                Yeterli
                             </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-slate-300 font-medium">{item.purchasePrice} ₺</TableCell>
                        <TableCell className="text-center">
                          <Button 
                             onClick={() => handleEditClick(item)} 
                             variant="ghost" size="icon" title="Ürünü Düzenle" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full w-8 h-8"
                          >
                            <Edit2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Modal */}
        <Dialog open={!!editingItem} onOpenChange={(open: boolean) => !open && setEditingItem(null)}>
          <DialogContent className="border-white/10 glass-panel text-white">
            <DialogHeader>
              <DialogTitle>Stok Düzenle</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
               <div>
                 <label className="text-sm text-slate-400 mb-1 block">Ürün Adı</label>
                 <Input value={editingItem?.name || ""} disabled className="bg-white/5 border-white/10 text-slate-300" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-sm text-slate-400 mb-1 block">Güncel Stok ({(editingItem?.unit) || 'Adet'})</label>
                     <Input 
                       type="number" 
                       value={editQuantity} 
                       onChange={(e) => setEditQuantity(Number(e.target.value))} 
                       className="bg-black/50 border-white/10 focus-visible:ring-primary text-lg font-bold" 
                     />
                  </div>
                  <div>
                     <label className="text-sm text-slate-400 mb-1 block">Kritik Stok Seviyesi</label>
                     <Input 
                       type="number" 
                       value={editCriticalLevel} 
                       onChange={(e) => setEditCriticalLevel(Number(e.target.value))} 
                       className="bg-black/50 border-white/10 focus-visible:ring-primary text-lg font-bold" 
                     />
                  </div>
               </div>
               <p className="text-xs text-slate-500 mt-2">*Sayım sonucu çıkan net miktarı ve kritik stok uyarısı için eşik değeri güncelleyebilirsiniz.</p>
            </div>
            <DialogFooter className="flex gap-2 justify-between items-center w-full">
               <Button variant="destructive" onClick={handleDeleteProduct} disabled={isSaving} className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/50">
                 <Trash2 size={16} className="mr-2"/> Ürünü Sil
               </Button>
               <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingItem(null)} className="border-white/20 text-slate-300 hover:text-white hover:bg-white/10">
                    <X size={16} className="mr-2"/> İptal
                  </Button>
                  <Button onClick={saveInventoryUpdate} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white font-bold shadow-[0_0_15px_rgba(218,26,50,0.5)]">
                    {isSaving ? "Kaydediliyor..." : <><Save size={16} className="mr-2"/> Kaydet</>}
                  </Button>
               </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Product Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="border-white/10 glass-panel text-white">
            <DialogHeader>
              <DialogTitle>Yeni Ürün / Malzeme Ekle</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4 text-left">
               <div>
                 <label className="text-sm text-slate-400 mb-1 block">Ürün Adı <span className="text-red-500">*</span></label>
                 <Input value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} placeholder="Örn: Un" className="bg-black/50 border-white/10 focus-visible:ring-primary text-slate-200" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-sm text-slate-400 mb-1 block">Türü <span className="text-red-500">*</span></label>
                     <select 
                       value={newProduct.type} 
                       onChange={(e) => {
                         const val = e.target.value;
                         if (val === "DRINK") {
                            const drinkCat = categories.find(c => c.name === "İçecekler");
                            setNewProduct({...newProduct, type: val, categoryId: drinkCat?.id || newProduct.categoryId});
                         } else if (val === "SALE_FOOD") {
                            const foodCat = categories.find(c => c.name === "Mezeler");
                            setNewProduct({...newProduct, type: val, categoryId: foodCat?.id || newProduct.categoryId});
                         } else {
                            setNewProduct({...newProduct, type: val});
                         }
                       }} 
                       className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white outline-none focus:border-primary"
                     >
                        <option value="MATERIAL">Üretim (Hammadde)</option>
                        <option value="SALE_FOOD">Satış (Meze/Yemek)</option>
                        <option value="DRINK">İçecek</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-sm text-slate-400 mb-1 block">Kategori</label>
                     <select value={newProduct.categoryId} onChange={(e) => setNewProduct({...newProduct, categoryId: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white outline-none focus:border-primary">
                        <option value="">İsteğe Bağlı (Genel)</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-sm text-slate-400 mb-1 block">Koli İçi Adet</label>
                     <Input type="number" value={newProduct.piecesPerBox || ''} onChange={(e) => setNewProduct({...newProduct, piecesPerBox: Number(e.target.value)})} placeholder="1" className="bg-black/50 border-white/10 focus-visible:ring-primary" />
                  </div>
                  <div>
                     <label className="text-sm text-slate-400 mb-1 block">Kritik Stok Seviyesi</label>
                     <Input type="number" value={newProduct.criticalLevel || ''} onChange={(e) => setNewProduct({...newProduct, criticalLevel: Number(e.target.value)})} placeholder="10" className="bg-black/50 border-white/10 focus-visible:ring-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                     <label className="text-sm text-slate-400 mb-1 block">Varsayılan KDV (%)</label>
                     <Input type="number" value={newProduct.kdv} onChange={(e) => setNewProduct({...newProduct, kdv: Number(e.target.value)})} className="bg-black/50 border-white/10 focus-visible:ring-primary text-center" />
                  </div>
                  <div className="col-span-1">
                     <label className="text-sm text-slate-400 mb-1 block">Hedef Kar Marjı (%)</label>
                     <Input type="number" value={newProduct.markup} onChange={(e) => setNewProduct({...newProduct, markup: Number(e.target.value)})} className="bg-black/50 border-white/10 focus-visible:ring-primary text-center" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">*Ürün eklendiğinde stok 0 olarak başlar. Stok girişi için fatura işlenmelidir.</p>
            </div>
            <DialogFooter className="flex gap-2 justify-end">
               <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="border-white/20 text-slate-300 hover:text-white hover:bg-white/10">
                 <X size={16} className="mr-2"/> İptal
               </Button>
               <Button onClick={saveNewProduct} disabled={isAdding} className="bg-primary hover:bg-primary/90 text-white font-bold shadow-[0_0_15px_rgba(218,26,50,0.5)]">
                 {isAdding ? "Ekleniyor..." : <><Save size={16} className="mr-2"/> Sisteme Ekle</>}
               </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
