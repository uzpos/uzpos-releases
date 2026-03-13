"use client";

import { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownRight, ArrowUpRight, Receipt, PlusCircle, Trash2, Settings2, FileText, Check, Search, Save, Users, Edit2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  type: string;
  unit: string;
  purchasePrice: number;
  markup: number;
  piecesPerBox: number;
  finalSalePrice: number | string;
  category?: { name: string; type: string; id: string };
  marginType?: string;
  marginValue?: number | string;
  kdv?: number;
  estimatedPrice?: number;
}

interface Invoice {
  id: string;
  companyId: string;
  company?: { name: string };
  totalAmount: number;
  createdAt: string;
  invoiceName?: string;
}

interface Company {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  balance?: number;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

type InvoiceItem = {
  id: number;
  productId: string;
  productName: string;
  unit: string;
  piecesPerBox: number;
  quantity: number | string;
  basePrice: number | string;
  kdv: number | string;
  marginType: string;
  marginValue: number | string;
  finalPrice: number | string;
};

export default function AccountingPage() {
  const { status } = useSession();
  const router = useRouter();

  const [activeView, setActiveView] = useState<"DASHBOARD" | "INVOICE_BUILDER" | "PRICE_CHANGE" | "COMPANIES">("DASHBOARD");
  
  // Real Data State for Price Change View & Products
  const [globalProducts, setGlobalProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  // Invoice Builder State
  const [invoiceFirm, setInvoiceFirm] = useState("");
  const [invoiceName, setInvoiceName] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Real Data for Dashboard
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Company Modal State
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: "", contactPerson: "", phone: "" });
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", categoryId: "", type: "MATERIAL", piecesPerBox: 1, purchasePrice: 0, kdv: 20, markup: 30, criticalLevel: 10 });
  const [isAdding, setIsAdding] = useState(false);
  
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { id: 1, productId: "", productName: "", unit: "adet", piecesPerBox: 1, quantity: 1, basePrice: 0, kdv: 1, marginType: "%", marginValue: 0, finalPrice: 0 }
  ]);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  const addNewTableRow = () => {
    setInvoiceItems([...invoiceItems, { 
      id: Date.now(), productId: "", productName: "", unit: "adet", piecesPerBox: 1, quantity: 1, basePrice: 0, kdv: 1, marginType: "%", marginValue: 0, finalPrice: 0 
    }]);
  };

  const removeTableRow = (id: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: number, field: keyof InvoiceItem, value: string | number) => {
    setInvoiceItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Auto-fill from product selection
        if (field === "productName" && typeof value === "string") {
           // check if globalProducts has it
           const matchedProduct = globalProducts.find((p: Product) => p.name.toLowerCase() === value.toLowerCase());
           if (matchedProduct) {
             updated.productId = matchedProduct.id;
             updated.unit = matchedProduct.unit;
             updated.piecesPerBox = matchedProduct.piecesPerBox || 1;
             updated.basePrice = matchedProduct.purchasePrice || 0;
           }
        }
        
        return updated;
      }
      return item;
    }));
  };

  const calculateSuggestedPrice = (item: InvoiceItem) => {
    // basePrice + KDV + Margin
    const kdvMultiplier = (Number(item.kdv) / 100) + 1;
    const priceWithKdv = Number(item.basePrice) * kdvMultiplier;
    
    let suggestedPrice = priceWithKdv;
    if (item.marginType === "%") {
       suggestedPrice = priceWithKdv * ((Number(item.marginValue) / 100) + 1);
    } else {
       suggestedPrice = priceWithKdv + Number(item.marginValue);
    }
    
    updateItem(item.id, "finalPrice", suggestedPrice.toFixed(2));
  };


  const totalInvoiceAmount = invoiceItems.reduce((sum, item) => sum + (Number(item.basePrice) * Number(item.quantity) * ((Number(item.kdv)/100)+1)), 0);

  // --- API INTEGRATION ---
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (activeView === "PRICE_CHANGE" || activeView === "INVOICE_BUILDER") {
      fetchProducts();
    }
    if (activeView === "DASHBOARD") {
      fetchInvoices();
    }
    if (activeView === "INVOICE_BUILDER" || activeView === "COMPANIES") {
      fetchCompanies();
    }
    if (activeView === "INVOICE_BUILDER") {
      fetchCategories();
    }
  }, [activeView]);

  const fetchInvoices = async () => {
     try {
       const res = await fetch("/api/invoices");
       if (res.ok) {
         setInvoices(await res.json());
       }
     } catch (err) { console.error(err); }
  };

  const fetchCompanies = async () => {
     try {
       const res = await fetch("/api/companies");
       if (res.ok) {
         setCompanies(await res.json());
       }
     } catch (err) { console.error(err); }
  };

  const fetchCategories = async () => {
     try {
       const res = await fetch("/api/categories");
       if (res.ok) {
         setCategories(await res.json());
       }
     } catch (err) { console.error(err); }
  };

  const handleCompanySave = async () => {
    try {
       const url = editingCompany ? `/api/companies/${editingCompany.id}` : `/api/companies`;
       const method = editingCompany ? "PATCH" : "POST";

       const res = await fetch(url, {
          method,
          headers: { "Content-Type" : "application/json" },
          body: JSON.stringify(companyForm)
       });

       if (res.ok) {
          setIsCompanyModalOpen(false);
          fetchCompanies();
          setEditingCompany(null);
          setCompanyForm({ name: "", contactPerson: "", phone: "" });
       } else {
          alert("Firma kaydedilemedi.");
       }
    } catch (err) {
       console.error(err);
    }
  };

  const handleCompanyDelete = async (id: string) => {
     if (!window.confirm("Bu cari/firmayı silmek istediğinizden emin misiniz?")) return;
     try {
       const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
       if (res.ok) fetchCompanies();
     } catch (err) { console.error(err); }
  };

  const deleteInvoice = async (id: string, e: React.MouseEvent) => {
     e.stopPropagation();
     if (!window.confirm("Bu faturayı tamamen silmek istediğinizden emin misiniz? (Stoklar geri alınacaktır)")) return;
     try {
       const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
       if (res.ok) fetchInvoices();
     } catch (err) { console.error(err); }
  };

  const fetchActiveInvoice = useCallback(async () => {
    try {
      if (!editingInvoiceId) return; // Ensure editingInvoiceId is set
      const res = await fetch(`/api/invoices/${editingInvoiceId}`);
      if (res.ok) {
        const fullInvoice = await res.json();
        setInvoiceFirm(fullInvoice.companyId);
        setInvoiceName(fullInvoice.invoiceName || fullInvoice.id.slice(-6));
        setInvoiceDate(new Date(fullInvoice.createdAt).toISOString().split('T')[0]);
        
        const mappedItems = fullInvoice.items.map((item: { id: number; productId: string; product: Product; quantity: number; basePrice: number; finalPrice: number }) => ({
           id: item.id,
           productId: item.productId,
           productName: item.product?.name || "Bilinmiyor",
           unit: item.product?.unit || "adet", 
           piecesPerBox: item.product?.piecesPerBox || 1,
           quantity: item.quantity,
           basePrice: item.basePrice,
           kdv: item.product?.kdv || 20, 
           marginType: "%",
           marginValue: item.product?.markup || 0,
           finalPrice: item.finalPrice
        }));
        setInvoiceItems(mappedItems);
      }
    } catch (err) {
      console.error(err);
    }
  }, [editingInvoiceId]);

  const handleEditInvoice = (invoice: Invoice) => {
     try {
        setEditingInvoiceId(invoice.id);
        setActiveView("INVOICE_BUILDER");
     } catch (err) {
        console.error(err);
     }
  };

  useEffect(() => {
    if (activeView === "INVOICE_BUILDER" && editingInvoiceId) {
      fetchActiveInvoice();
    }
  }, [activeView, editingInvoiceId, fetchActiveInvoice]);

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        // Set default values for margin Type/Value if not existing on backend yet (UI only states, can be added to prisma later or calculated)
        const mappedData = data.filter((p: Product) => p.type !== "RECIPE").map((p: Product) => ({
           ...p,
           marginType: "%",
           marginValue: p.markup,
           kdv: 20 // default KDV for simulation
        }));
        setGlobalProducts(mappedData);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const updateGlobalProductLine = (id: string, field: string, value: string | number) => {
    setGlobalProducts(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field as string]: value };
        // Auto calculate suggested on change
        const kdvMulti = (Number(updated.kdv || 20) / 100) + 1;
        const priceWithKdv = (updated.type === "RECIPE" ? (updated.estimatedPrice || 0) : Number(updated.purchasePrice || 0)) * kdvMulti;
        let suggested = priceWithKdv;
        if (updated.marginType === "%") {
           suggested = priceWithKdv * ((Number(updated.marginValue || 0) / 100) + 1);
        } else {
           suggested = priceWithKdv + Number(updated.marginValue || 0);
        }
        updated.finalSalePrice = suggested.toFixed(2);
        return updated;
      }
      return item;
    }));
  };

  const saveProductPrice = async (product: Product) => {
     try {
       const res = await fetch(`/api/products/${product.id}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           purchasePrice: Number(product.purchasePrice),
           markup: Number(product.marginValue),
           finalSalePrice: Number(product.finalSalePrice)
         })
       });
       if (res.ok) {
         // optionally show success toast
         alert(`${product.name} fiyatları başarıyla güncellendi!`);
         fetchProducts();
       }
     } catch (err) {
        console.error("Failed to save product price", err);
     }
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
             unit: "adet",
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
          fetchProducts();
       } else {
          alert("Ürün eklenirken hata oluştu.");
       }
     } catch (e) {
        console.error(e);
     } finally {
        setIsAdding(false);
     }
  };

  const processInvoice = async () => {
     try {
       if (!invoiceFirm || invoiceItems.length === 0) {
          alert("Lütfen firma seçin ve en az bir ürün ekleyin.");
          return;
       }

       const payload = {
          companyId: invoiceFirm,
          invoiceName,
          totalAmount: totalInvoiceAmount,
          type: "PURCHASE", 
          items: invoiceItems.map(item => ({
             productId: item.productId, 
             quantity: Number(item.quantity),
             unit: item.unit.toLowerCase(),
             basePrice: Number(item.basePrice),
             marginValue: Number(item.marginValue),
             finalPrice: Number(item.finalPrice)
          }))
       };

       const url = editingInvoiceId ? `/api/invoices/${editingInvoiceId}` : "/api/invoices";
       const method = editingInvoiceId ? "PATCH" : "POST";

       const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
       });

       if (res.ok) {
          alert(editingInvoiceId ? "Fatura başarıyla güncellendi!" : "Fatura başarıyla işlendi!");
          setActiveView("DASHBOARD");
          setInvoiceItems([{ id: 1, productId: "", productName: "", unit: "adet", piecesPerBox: 1, quantity: 1, basePrice: 0, kdv: 1, marginType: "%", marginValue: 0, finalPrice: 0 }]);
          setInvoiceFirm("");
          setEditingInvoiceId(null);
          fetchInvoices();
       }     
     } catch (err) {
        console.error("Failed to process invoice", err);
     }
  };


  if (activeView === "INVOICE_BUILDER") {
    return (
      <div className="min-h-screen flex flex-col items-center bg-black/95">
        <Navbar />
        <main className="flex-1 w-full max-w-[1600px] p-4 md:p-8 mt-4">
          <div className="glass-panel p-6 rounded-2xl flex justify-between items-center mb-6">
             <div className="flex items-center gap-4">
               <Button variant="ghost" onClick={() => setActiveView("DASHBOARD")} className="text-slate-400">← İptal</Button>
               <h2 className="text-2xl font-bold text-white flex items-center gap-2"><FileText className="text-primary"/> Yeni Fatura İşleme</h2>
             </div>
             <div className="text-right">
               <div className="text-sm text-slate-400 tracking-widest uppercase mb-1">Fatura Toplamı</div>
               <div className="text-3xl font-black text-white text-glow">{totalInvoiceAmount.toFixed(2)} ₺</div>
             </div>
          </div>

          <Card className="glass-card mb-6">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 relative">
               <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Firma / Tedarikçi</label>
                  <select 
                    value={invoiceFirm}
                    onChange={(e) => setInvoiceFirm(e.target.value)}
                    className="w-full h-12 bg-black/50 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="" disabled>Firma Seçin</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Fatura Adı / No</label>
                  <input 
                    type="text" 
                    value={invoiceName}
                    onChange={(e) => setInvoiceName(e.target.value)}
                    placeholder="Örn: OCAK_ET_01"
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-primary transition-colors"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Fatura Tarihi</label>
                  <input 
                    type="date" 
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-primary transition-colors"
                  />
               </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10 mt-8 relative">
            <div className="absolute -top-14 right-4 flex gap-2">
               <Button onClick={() => setIsAddModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white border border-primary/50 shadow-[0_0_15px_rgba(218,26,50,0.5)]">
                 <PlusCircle size={18} className="mr-2"/> Yeni Ürün Ekle
               </Button>
               <Button onClick={addNewTableRow} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/50">
                 <PlusCircle size={18} className="mr-2"/> Ürün Satırı
               </Button>
            </div>
            
            <div className="overflow-x-auto w-full rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-[#111] border-b border-white/10 text-slate-400 text-sm">
                  <tr>
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4 w-[250px]">Ürün Adı</th>
                    <th className="p-4 w-[120px]">Birim (Adet/Koli)</th>
                    <th className="p-4 w-[100px]">Miktar</th>
                    <th className="p-4 w-[120px]">Alış Fiyatı</th>
                    <th className="p-4 w-[100px]">KDV (%)</th>
                    <th className="p-4 w-[150px]">Kar Marjı Tipi</th>
                    <th className="p-4 w-[120px]">Marj Değeri</th>
                    <th className="p-4 w-[150px]">Satış Fiyatı</th>
                    <th className="p-4 w-32 border-l border-white/5 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invoiceItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-white/5 group transition-colors">
                      <td className="p-3 text-center text-slate-500 font-bold">{idx + 1}</td>
                      <td className="p-2">
                         <input 
                            type="text" 
                            value={item.productName}
                            onChange={(e) => updateItem(item.id, "productName", e.target.value)}
                            list="products-list"
                            placeholder="Ürün seçin..."
                            className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white focus:border-primary"
                         />
                      </td>
                      <td className="p-2">
                         <select 
                           value={item.unit} 
                           onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                           className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white focus:border-primary"
                         >
                           <option value="adet">Adet</option>
                           <option value="koli">Koli</option>
                           <option value="kg">Kg</option>
                           <option value="gr">Gr</option>
                         </select>
                      </td>
                      <td className="p-2">
                        <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white text-center"/>
                      </td>
                      <td className="p-2 relative">
                        <input type="number" step="0.01" value={item.basePrice} onChange={(e) => updateItem(item.id, "basePrice", e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white text-right"/>
                      </td>
                      <td className="p-2">
                        <input type="number" min="0" value={item.kdv} onChange={(e) => updateItem(item.id, "kdv", e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white text-center"/>
                      </td>
                      <td className="p-2">
                         <select 
                           value={item.marginType} 
                           onChange={(e) => updateItem(item.id, "marginType", e.target.value)}
                           className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white focus:border-primary"
                         >
                           <option value="%">% (Yüzde)</option>
                           <option value="TL">TL (Sabit)</option>
                         </select>
                      </td>
                      <td className="p-2">
                        <input type="number" value={item.marginValue} onChange={(e) => updateItem(item.id, "marginValue", e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white text-right"/>
                      </td>
                      <td className="p-2">
                         <input type="number" step="0.01" value={item.finalPrice} onChange={(e) => updateItem(item.id, "finalPrice", e.target.value)} className="w-full bg-primary/20 border border-primary/50 text-white font-bold rounded-md p-2 text-right shadow-[0_0_10px_rgba(218,26,50,0.1)]"/>
                      </td>
                      <td className="p-2 border-l border-white/5 flex gap-2 justify-center">
                         <Button variant="ghost" size="sm" onClick={() => calculateSuggestedPrice(item)} title="Önerilen Satış Fiyatını Hesapla" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white">
                           <Settings2 size={16}/>
                         </Button>
                         <Button variant="ghost" size="sm" onClick={() => removeTableRow(item.id)} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white">
                           <Trash2 size={16}/>
                         </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-white/10 bg-[#0a0a0a] rounded-b-xl flex justify-end">
              <Button onClick={processInvoice} size="lg" className="h-14 px-12 text-lg font-bold shadow-[0_0_20px_rgba(218,26,50,0.4)] gap-2">
                <Check size={20}/> Faturayı Sisteme İşle
              </Button>
            </div>

            {/* Datalist for autocomplete */}
            <datalist id="products-list">
               {globalProducts.map(p => (<option key={p.id} value={p.name} />))}
            </datalist>

          </Card>

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
                             const drinkCat = categories.find((c: Category) => c.name === "İçecekler");
                             setNewProduct({...newProduct, type: val, categoryId: drinkCat?.id || newProduct.categoryId});
                          } else if (val === "SALE_FOOD") {
                             const foodCat = categories.find((c: Category) => c.name === "Mezeler");
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
                         {categories.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
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

  // --- PRICE CHANGE VIEW ---
  if (activeView === "PRICE_CHANGE") {
    return (
      <div className="min-h-screen flex flex-col items-center bg-black/95">
        <Navbar />
        <main className="flex-1 w-full max-w-[1600px] p-4 md:p-8 mt-4">
          <div className="glass-panel p-6 rounded-2xl flex justify-between items-center mb-6">
             <div className="flex items-center gap-4">
               <Button variant="ghost" onClick={() => setActiveView("DASHBOARD")} className="text-slate-400 hover:text-white">← Geri</Button>
               <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                 <Settings2 className="text-primary"/> Fiyat Değişikliği (Satış Menüsü)
               </h2>
             </div>
             <div className="relative w-80">
               <input type="text" placeholder="Ürün veya reçete ara..." className="w-full h-10 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors" />
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             </div>
          </div>

          <Card className="glass-panel border-white/10">
             <div className="overflow-x-auto w-full rounded-xl">
               <table className="w-full text-left">
                 <thead className="bg-[#111] border-b border-white/10 text-slate-400 text-sm">
                   <tr>
                     <th className="p-4 w-[250px]">Ürün Adı</th>
                     <th className="p-4 w-[120px]">Tür</th>
                     <th className="p-4 w-[160px]">Maliyet (Alış/Üretim)</th>
                     <th className="p-4 w-[100px]">KDV (%)</th>
                     <th className="p-4 w-[150px]">Kar Marjı Tipi</th>
                     <th className="p-4 w-[120px]">Marj Değeri</th>
                     <th className="p-4 w-[150px]">Önerilen Fiyat</th>
                     <th className="p-4 w-[150px]">Satış Fiyatı</th>
                     <th className="p-4 w-24 text-center">İşlem</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5 text-white">
                   
                   {isLoadingProducts ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">Ürünler Yükleniyor...</td>
                      </tr>
                   ) : globalProducts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">Kayıtlı ürün veya reçete bulunamadı.</td>
                      </tr>
                   ) : (
                     globalProducts.map(gp => (
                       <tr key={gp.id} className="hover:bg-white/5 group transition-colors">
                          <td className="p-4 font-bold text-lg">{gp.name}</td>
                          <td className={`p-4 ${gp.type === "RECIPE" ? "text-primary font-semibold" : "text-slate-400"}`}>
                             {gp.type === "RECIPE" ? "Yemek (Reçete)" : gp.type === "READY" ? "Depo (Hazır)" : "Hammadde"}
                          </td>
                          <td className="p-4">
                             <input 
                               type="number" 
                               value={gp.type === "RECIPE" ? gp.estimatedPrice : gp.purchasePrice} 
                               onChange={(e) => updateGlobalProductLine(gp.id, "purchasePrice", e.target.value)}
                               disabled={gp.type === "RECIPE"} 
                               title={gp.type === "RECIPE" ? "Maliyet reçeteden hesaplanır" : ""} 
                               className={`w-full font-bold p-2 text-right rounded-md border border-white/10 ${gp.type === "RECIPE" ? "bg-white/5 opacity-50 cursor-not-allowed" : "bg-black/50 focus:border-primary"}`}
                             />
                          </td>
                          <td className="p-4">
                            {gp.type === "RECIPE" ? (
                              <div className="text-slate-500 text-center font-bold">-</div>
                            ) : (
                              <input type="number" value={gp.kdv} onChange={(e) => updateGlobalProductLine(gp.id, "kdv", e.target.value)} className="w-full font-bold bg-black/50 border border-white/10 rounded-md p-2 text-center focus:border-primary"/>
                            )}
                          </td>
                          <td className="p-4">
                             <select value={gp.marginType} onChange={(e) => updateGlobalProductLine(gp.id, "marginType", e.target.value)} className="w-full font-bold bg-black/50 border border-white/10 rounded-md p-2 focus:border-primary">
                               <option value="%">% (Yüzde)</option>
                               <option value="TL">TL (Sabit)</option>
                             </select>
                          </td>
                          <td className="p-4"><input type="number" value={gp.marginValue} onChange={(e) => updateGlobalProductLine(gp.id, "marginValue", e.target.value)} className="w-full font-bold bg-black/50 border border-white/10 rounded-md p-2 text-right focus:border-primary"/></td>
                          
                          {/* calculated suggested */}
                           <td className="p-4 text-emerald-400 font-black text-right text-lg">
                             {gp.type === 'RECIPE' 
                               ? ((gp.estimatedPrice || 0) + (gp.marginType === '%' ? ((gp.estimatedPrice || 0) * Number(gp.marginValue || 0) / 100) : Number(gp.marginValue || 0))).toFixed(2)
                               : (Number(gp.purchasePrice || 0) * (1 + Number(gp.kdv || 0)/100) + (gp.marginType === '%' ? ((Number(gp.purchasePrice || 0) * (1 + Number(gp.kdv || 0)/100)) * Number(gp.marginValue || 0) / 100) : Number(gp.marginValue || 0))).toFixed(2)
                             } ₺
                           </td>
                          
                          <td className="p-4"><input type="number" value={gp.finalSalePrice || 0} onChange={(e) => updateGlobalProductLine(gp.id, "finalSalePrice", e.target.value)} className="w-full bg-primary/20 border border-primary/50 text-white font-black text-lg rounded-md p-2 text-right shadow-[0_0_10px_rgba(218,26,50,0.1)]"/></td>
                          <td className="p-4 text-center">
                            <Button onClick={() => saveProductPrice(gp)} variant="ghost" size="sm" className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white" title="Kaydet">
                              <Save size={16}/>
                            </Button>
                          </td>
                       </tr>
                     ))
                   )}

                 </tbody>
               </table>
             </div>
          </Card>
        </main>
      </div>
    );
  }

  // --- COMPANIES VIEW ---
  if (activeView === "COMPANIES") {
    return (
      <div className="min-h-screen flex flex-col items-center bg-black/95">
        <Navbar />
        <main className="flex-1 w-full max-w-[1600px] p-4 md:p-8 mt-4">
          <div className="glass-panel p-6 rounded-2xl flex justify-between items-center mb-6 border border-blue-500/20">
             <div className="flex items-center gap-4">
               <Button variant="ghost" onClick={() => setActiveView("DASHBOARD")} className="text-slate-400 hover:text-white">← Geri</Button>
               <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                 <Users className="text-blue-500"/> Cari / Tedarikçi Yönetimi
               </h2>
             </div>
             <div>
               <Button 
                  onClick={() => { setEditingCompany(null); setCompanyForm({name: "", contactPerson: "", phone: ""}); setIsCompanyModalOpen(true); }} 
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
               >
                 <PlusCircle size={18} className="mr-2"/> Yeni Cari Ekle
               </Button>
             </div>
          </div>

          <Card className="glass-panel border-white/10">
             <div className="overflow-x-auto w-full rounded-xl">
               <table className="w-full text-left">
                 <thead className="bg-[#111] border-b border-white/10 text-slate-400 text-sm">
                   <tr>
                     <th className="p-4 w-[300px]">Firma / Cari Adı</th>
                     <th className="p-4 w-[250px]">Yetkili / Sorumlu</th>
                     <th className="p-4 w-[200px]">Telefon Numarası</th>
                     <th className="p-4 w-[150px] text-right">Bakiye</th>
                     <th className="p-4 w-32 text-center">İşlem</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5 text-white">
                   {companies.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">Kayıtlı cari/tedarikçi bulunamadı.</td>
                      </tr>
                   ) : (
                     companies.map(comp => (
                       <tr key={comp.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-bold text-lg">{comp.name}</td>
                          <td className="p-4 text-slate-300">{comp.contactPerson || "-"}</td>
                          <td className="p-4 text-slate-300">{comp.phone || "-"}</td>
                          <td className="p-4 text-right font-black text-slate-400">{comp.balance?.toLocaleString('tr-TR') || 0} ₺</td>
                          <td className="p-4 text-center flex justify-center gap-2">
                            <Button onClick={() => { setEditingCompany(comp); setCompanyForm({name: comp.name, contactPerson: comp.contactPerson || "", phone: comp.phone || ""}); setIsCompanyModalOpen(true); }} variant="ghost" size="sm" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white" title="Düzenle">
                              <Edit2 size={16}/>
                            </Button>
                            <Button onClick={() => handleCompanyDelete(comp.id)} variant="ghost" size="sm" className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white" title="Sil">
                              <Trash2 size={16}/>
                            </Button>
                          </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </Card>
        </main>

        <Dialog open={isCompanyModalOpen} onOpenChange={setIsCompanyModalOpen}>
          <DialogContent className="border-white/10 glass-panel text-white">
            <DialogHeader>
              <DialogTitle>{editingCompany ? "Cari/Firma Düzenle" : "Yeni Cari/Firma Ekle"}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4 text-left">
               <div>
                 <label className="text-sm text-slate-400 mb-1 block">Firma Adı <span className="text-red-500">*</span></label>
                 <Input value={companyForm.name} onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})} placeholder="Örn: Ayhan Et Dünyası" className="bg-black/50 border-white/10 form-input text-white" />
               </div>
               <div>
                 <label className="text-sm text-slate-400 mb-1 block">Yetkili / Sorumlu Adı</label>
                 <Input value={companyForm.contactPerson} onChange={(e) => setCompanyForm({...companyForm, contactPerson: e.target.value})} placeholder="Örn: Ahmet Bey" className="bg-black/50 border-white/10 form-input text-white" />
               </div>
               <div>
                 <label className="text-sm text-slate-400 mb-1 block">Telefon Numarası</label>
                 <Input value={companyForm.phone} onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})} placeholder="Örn: 0555 123 4567" className="bg-black/50 border-white/10 form-input text-white" />
               </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end">
               <Button variant="outline" onClick={() => setIsCompanyModalOpen(false)} className="border-white/20 text-slate-300 hover:text-white hover:bg-white/10">
                 <X size={16} className="mr-2"/> İptal
               </Button>
               <Button onClick={handleCompanySave} className="bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                 <Save size={16} className="mr-2"/> Kaydet
               </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- DASHBOARD VIEW (Original Accounting Page slightly refactored with new button action) ---
  const totalIncome = 12500; // Mock aggregates for dashboard view
  const totalExpense = 4800;
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="min-h-screen flex flex-col items-center">
      <Navbar />
      
      <main className="flex-1 w-full max-w-[1400px] p-4 md:p-8 mt-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-black/40 p-6 rounded-2xl glass-panel border border-white/10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Muhasebe & Faturalar</h1>
            <p className="text-slate-400">Gelir/giderleri yönetin, yeni gelen malzeme faturalarını detaylı işleyin.</p>
          </div>
          <div className="flex gap-4">
            <Button 
               onClick={() => setActiveView("PRICE_CHANGE")} 
               variant="outline"
               className="h-12 border-primary/30 text-slate-200 hover:bg-primary/20 hover:text-white gap-2 font-bold px-6"
            >
              <Settings2 size={18} /> Toplu Fiyat Değiştir
            </Button>
            <Button 
               onClick={() => setActiveView("COMPANIES")} 
               variant="outline"
               className="h-12 border-blue-500/30 text-slate-200 hover:bg-blue-500/20 hover:text-white gap-2 font-bold px-6"
            >
              <Users size={18} /> Cari & Firmalar
            </Button>
            <Button 
               onClick={() => setActiveView("INVOICE_BUILDER")} 
               className="h-12 bg-primary hover:bg-primary/90 text-white gap-2 font-bold px-6 shadow-[0_0_15px_rgba(218,26,50,0.5)]"
            >
              <FileText size={18} /> Yeni Fatura İşle
            </Button>
          </div>
        </div>

        {/* Dashboard Özetleri */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <Card className="glass-card border-l-4 border-l-emerald-500 overflow-hidden relative">
            <div className="absolute -bottom-4 -right-4 text-emerald-500/10"><ArrowUpRight size={120} /></div>
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-400 uppercase tracking-widest font-bold">Aylık Toplam Gelir</CardDescription>
              <CardTitle className="text-4xl text-white font-black">{totalIncome.toLocaleString('tr-TR')} ₺</CardTitle>
            </CardHeader>
          </Card>

          <Card className="glass-card border-l-4 border-l-red-500 overflow-hidden relative">
            <div className="absolute -bottom-4 -right-4 text-red-500/10"><ArrowDownRight size={120} /></div>
            <CardHeader className="pb-2">
              <CardDescription className="text-red-400 uppercase tracking-widest font-bold">Aylık Toplam Gider</CardDescription>
              <CardTitle className="text-4xl text-white font-black">{totalExpense.toLocaleString('tr-TR')} ₺</CardTitle>
            </CardHeader>
          </Card>

           <Card className={`glass-card border-l-4 overflow-hidden relative ${netProfit >= 0 ? 'border-l-blue-500' : 'border-l-red-500'}`}>
             <div className="absolute -bottom-4 -right-4 text-white/5"><Receipt size={120} /></div>
            <CardHeader className="pb-2">
              <CardDescription className={`uppercase tracking-widest font-bold ${netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>Net Durum</CardDescription>
              <CardTitle className={`text-4xl font-black ${netProfit >= 0 ? 'text-white' : 'text-red-50'}`}>
                {netProfit.toLocaleString('tr-TR')} ₺
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Saved Invoices List */}
        <Card className="glass-panel border-white/10">
          <CardHeader className="border-b border-white/10 p-6 flex flex-row items-center justify-between">
            <div>
               <CardTitle className="text-white flex items-center gap-2"><Receipt size={20} className="text-primary" /> Kayıtlı Faturalar</CardTitle>
               <CardDescription className="text-slate-400 mt-1">Sisteme işlenmiş geçmiş alım faturaları. Üzerine tıklayarak inceleyebilir veya silebilirsiniz.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <Table>
               <TableHeader>
                 <TableRow className="border-white/10 hover:bg-transparent">
                   <TableHead className="text-slate-400 py-4 px-6">Fatura Adı/No</TableHead>
                   <TableHead className="text-slate-400">Tedarikçi Firma</TableHead>
                   <TableHead className="text-slate-400">Tarih</TableHead>
                   <TableHead className="text-slate-400 text-right px-6">Toplam Tutar</TableHead>
                   <TableHead className="text-slate-400 text-center px-6">İşlem</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {invoices.length === 0 ? (
                     <TableRow>
                         <TableCell colSpan={5} className="text-center py-6 text-slate-400">Henüz kaydedilmiş fatura yok.</TableCell>
                     </TableRow>
                 ) : (
                   invoices.map(inv => (
                      <TableRow key={inv.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell className="px-6 py-4">
                           <div className="flex flex-col">
                              <span className="font-black text-white uppercase tracking-tighter">#{inv.id.slice(-6)}</span>
                              {inv.invoiceName && <span className="text-[10px] text-slate-500 uppercase font-black">{inv.invoiceName}</span>}
                           </div>
                        </TableCell>
                        <TableCell className="text-slate-300">
                           <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs">
                                 {inv.company?.name?.charAt(0) || "F"}
                              </div>
                              <span className="font-semibold">{inv.company?.name || "Bilinmiyor"}</span>
                           </div>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                           {new Date(inv.createdAt).toLocaleDateString("tr-TR", { day: '2-digit', month: 'long', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right px-6">
                           <span className="text-xl font-black text-primary drop-shadow-[0_0_10px_rgba(218,26,50,0.3)]">
                              {inv.totalAmount.toLocaleString('tr-TR')} ₺
                           </span>
                        </TableCell>
                        <TableCell className="px-6 text-center">
                           <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button onClick={() => handleEditInvoice(inv)} variant="ghost" size="sm" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white">
                                <Edit2 size={16}/>
                              </Button>
                              <Button onClick={(e) => deleteInvoice(inv.id, e)} variant="ghost" size="sm" className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white">
                                <Trash2 size={16}/>
                              </Button>
                           </div>
                        </TableCell>
                      </TableRow>
                   ))
                 )}
               </TableBody>
             </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
