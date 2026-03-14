"use client";

import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Receipt, 
  PlusCircle, 
  Trash2, 
  Settings2, 
  FileText, 
  Check, 
  Search, 
  Save, 
  Users, 
  X,
  CreditCard,
  Plus,
  TrendingDown,
  Building2,
  Calendar,
  ChevronRight,
  Edit2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// --- Types ---
interface Product {
  id: string;
  name: string;
  type: string;
  unit: string;
  purchasePrice: number;
  markup: number;
  piecesPerBox: number;
  finalSalePrice: number | string;
  category?: { name: string; id: string };
  kdv?: number;
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

interface InvoiceItem {
  id: number;
  productId: string;
  productName: string;
  unit: string;
  piecesPerBox: number;
  quantity: number | string;
  basePrice: number | string;
  kdv: number | string;
  marginValue: number | string;
  finalPrice: number | string;
}

export default function AccountingPage() {
  const { status } = useSession();
  const router = useRouter();

  const [activeView, setActiveView] = useState<"DASHBOARD" | "INVOICE_BUILDER" | "PRICE_CHANGE" | "COMPANIES">("DASHBOARD");
  
  // Data State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Invoice State
  const [invoiceFirm, setInvoiceFirm] = useState("");
  const [invoiceName, setInvoiceName] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { id: Date.now(), productId: "", productName: "", unit: "adet", piecesPerBox: 1, quantity: 1, basePrice: 0, kdv: 20, marginValue: 20, finalPrice: 0 }
  ]);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // Modal State
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: "", contactPerson: "", phone: "" });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
     setIsLoading(true);
     try {
       const [invRes, compRes, prodRes, catRes] = await Promise.all([
         fetch("/api/invoices"),
         fetch("/api/companies"),
         fetch("/api/products"),
         fetch("/api/categories")
       ]);
       if (invRes.ok) setInvoices(await invRes.json());
       if (compRes.ok) setCompanies(await compRes.json());
       if (prodRes.ok) setProducts((await prodRes.json()).filter((p: any) => p.type !== 'RECIPE'));
       if (catRes.ok) setCategories(await catRes.json());
     } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const calculateTotal = (items: InvoiceItem[]) => {
    return items.reduce((sum, item) => sum + (Number(item.basePrice) * Number(item.quantity) * (1 + Number(item.kdv)/100)), 0);
  };

  const processInvoice = async () => {
     if (!invoiceFirm) {
        alert("Lütfen önce bir Cari (Firma) seçiniz.");
        return;
     }
     if (invoiceItems.length === 0 || invoiceItems.some(i => !i.productId)) {
        alert("Lütfen en az bir geçerli ürün ekleyiniz.");
        return;
     }
     try {
       const res = await fetch(editingInvoiceId ? `/api/invoices/${editingInvoiceId}` : "/api/invoices", {
          method: editingInvoiceId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
             companyId: invoiceFirm,
             invoiceName,
             totalAmount: calculateTotal(invoiceItems),
             type: "PURCHASE",
             items: invoiceItems.map(i => ({
                productId: i.productId,
                quantity: Number(i.quantity),
                unit: i.unit,
                basePrice: Number(i.basePrice),
                marginValue: Number(i.marginValue),
                finalPrice: Number(i.finalPrice)
             }))
          })
       });
       if (res.ok) { setActiveView("DASHBOARD"); fetchData(); resetInvoice(); }
     } catch (e) { console.error(e); }
  };

  const resetInvoice = () => {
    setInvoiceFirm(""); setInvoiceName(""); setInvoiceItems([{ id: Date.now(), productId: "", productName: "", unit: "adet", piecesPerBox: 1, quantity: 1, basePrice: 0, kdv: 20, marginValue: 20, finalPrice: 0 }]); setEditingInvoiceId(null);
  };

  const handleEditInvoice = async (invoice: Invoice) => {
     setEditingInvoiceId(invoice.id);
     setActiveView("INVOICE_BUILDER");
     const res = await fetch(`/api/invoices/${invoice.id}`);
     if (res.ok) {
        const full = await res.json();
        setInvoiceFirm(full.companyId);
        setInvoiceName(full.invoiceName || "");
        setInvoiceDate(new Date(full.createdAt).toISOString().split('T')[0]);
        setInvoiceItems(full.items.map((i: any) => ({
           id: i.id, productId: i.productId, productName: i.product?.name || "", unit: i.unit, piecesPerBox: i.product?.piecesPerBox || 1, quantity: i.quantity, basePrice: i.basePrice, kdv: i.product?.kdv || 20, marginValue: i.product?.markup || 0, finalPrice: i.finalPrice
        })));
     }
  };

  const handleCompanySave = async () => {
    if (!companyForm.name) return;
    try {
      const res = await fetch(editingCompany ? `/api/companies/${editingCompany.id}` : "/api/companies", {
        method: editingCompany ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyForm)
      });
      if (res.ok) {
        setIsCompanyModalOpen(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCompany = async (id: string) => {
    if (!window.confirm("Bu cariyi silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // --- Views ---

  if (activeView === "INVOICE_BUILDER") {
    return (
      <div className="flex flex-col h-screen bg-[#0a0a0c] text-slate-200 overflow-hidden font-sans">
        <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => { setActiveView("DASHBOARD"); resetInvoice(); }} className="h-9 w-9 p-0 rounded-full hover:bg-white/10">
              <X size={18} />
            </Button>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2 uppercase">FATURA GİRİŞ PANELİ</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Malzeme Tedariği ve Stok Besleme</p>
            </div>
          </div>
          <div className="text-right bg-primary/10 px-6 py-2 rounded-2xl border border-primary/20">
            <p className="text-[9px] text-primary font-black uppercase tracking-widest mb-0.5">Fatura Toplamı</p>
            <p className="text-xl font-black text-white">{calculateTotal(invoiceItems).toFixed(2)} ₺</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">TEDARİKÇİ FİRMA</label>
              <select value={invoiceFirm} onChange={(e) => setInvoiceFirm(e.target.value)} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white outline-none focus:border-primary/50 appearance-none cursor-pointer font-bold">
                <option value="">Cari Seçiniz</option>
                {companies.map(c => <option key={c.id} value={c.id} className="bg-[#0a0a0c]">{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">FATURA NO / TANIM</label>
              <input value={invoiceName} onChange={(e) => setInvoiceName(e.target.value)} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white outline-none focus:border-primary/50 font-bold placeholder:text-slate-800" placeholder="Örn: ET-ALIŞ-001" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">İŞLEM TARİHİ</label>
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-xs text-white outline-none focus:border-primary/50 font-bold" />
            </div>
          </section>

          <Card className="border border-white/5 bg-black/40 rounded-2xl overflow-hidden shadow-2xl">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">
                  <th className="py-4 px-6 text-left">MALZEME / ÜRETİM</th>
                  <th className="py-4 px-4 text-center">BİRİM</th>
                  <th className="py-4 px-4 text-center">MİKTAR</th>
                  <th className="py-4 px-4 text-right">BİRİM FİYAT</th>
                  <th className="py-4 px-4 text-center">KDV</th>
                   <th className="py-4 px-4 text-center">MARJ (%)</th>
                   <th className="py-4 px-4 text-right">ÖNERİLEN</th>
                   <th className="py-4 px-4 text-right">SATIŞ FİYATI</th>
                   <th className="py-4 px-6 text-center">İŞLEM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invoiceItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-all">
                    <td className="py-3 px-6">
                      <input list="prod-list" className="w-full h-9 bg-black/40 border border-white/5 rounded-lg px-3 text-[11px] text-white font-bold outline-none focus:border-primary/30" value={item.productName} onChange={(e) => {
                         const val = e.target.value;
                         const matched = products.find(p => p.name === val);
                         setInvoiceItems(prev => prev.map(i => i.id === item.id ? { ...i, productName: val, productId: matched?.id || "", basePrice: matched?.purchasePrice || 0, unit: matched?.unit || 'adet', marginValue: matched?.markup || 0 } : i));
                      }} placeholder="Malzeme ara..." />
                    </td>
                    <td className="py-3 px-4">
                      <select className="h-9 w-full bg-black/40 border border-white/5 rounded-lg px-2 text-[10px] text-white font-black" value={item.unit} onChange={(e) => setInvoiceItems(prev => prev.map(i => i.id === item.id ? { ...i, unit: e.target.value } : i))}>
                        <option value="adet">ADET</option><option value="kg">KG</option><option value="lt">LT</option><option value="paket">PAKET</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center"><input type="number" className="w-20 h-9 bg-black/40 border border-white/5 rounded-lg text-center text-[11px] text-white font-black outline-none" value={item.quantity} onChange={(e) => setInvoiceItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: e.target.value } : i))} /></td>
                    <td className="py-3 px-4 text-right"><input type="number" step="0.01" className="w-24 h-9 bg-black/40 border border-white/5 rounded-lg text-right text-[11px] text-white font-black px-2 outline-none" value={item.basePrice} onChange={(e) => setInvoiceItems(prev => prev.map(i => i.id === item.id ? { ...i, basePrice: e.target.value } : i))} /></td>
                    <td className="py-3 px-4 text-center"><input type="number" className="w-16 h-9 bg-black/40 border border-white/5 rounded-lg text-center text-[10px] text-white font-black outline-none" value={item.kdv} onChange={(e) => setInvoiceItems(prev => prev.map(i => i.id === item.id ? { ...i, kdv: e.target.value } : i))} /></td>
                    <td className="py-3 px-4 text-center"><input type="number" className="w-16 h-9 bg-black/40 border border-white/5 rounded-lg text-center text-[10px] text-white font-black outline-none" value={item.marginValue} onChange={(e) => setInvoiceItems(prev => prev.map(i => i.id === item.id ? { ...i, marginValue: e.target.value } : i))} /></td>
                    <td className="py-3 px-4 text-right">
                       <span className="text-[10px] text-slate-500 font-bold">{(Number(item.basePrice) * (1 + Number(item.kdv)/100) * (1 + Number(item.marginValue)/100)).toFixed(2)} ₺</span>
                    </td>
                    <td className="py-3 px-4 text-right px-6">
                      <input type="number" step="0.01" className="w-24 h-9 bg-black/40 border border-primary/20 rounded-lg text-right text-[12px] text-emerald-400 font-black px-2 outline-none" value={item.finalPrice} onChange={(e) => setInvoiceItems(prev => prev.map(i => i.id === item.id ? { ...i, finalPrice: e.target.value } : i))} />
                    </td>
                    <td className="py-3 px-6 text-center">
                      <Button variant="ghost" size="sm" onClick={() => setInvoiceItems(prev => prev.length > 1 ? prev.filter(i => i.id !== item.id) : prev)} className="h-8 w-8 p-0 rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-500 group transition-all">
                        <Trash2 size={14} className="group-hover:scale-110" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-6 border-t border-white/5 bg-black/20 flex justify-between items-center">
                <Button variant="ghost" onClick={() => setInvoiceItems([...invoiceItems, { id: Date.now(), productId: "", productName: "", unit: "adet", piecesPerBox: 1, quantity: 1, basePrice: 0, kdv: 20, marginValue: 20, finalPrice: 0 }])} className="text-xs font-black gap-2 text-slate-400 hover:text-white group">
                  <div className="bg-white/5 p-1 rounded-md group-hover:bg-primary/20 transition-all"><Plus size={14} /></div> SATIR EKLE
                </Button>
               <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => { setActiveView("DASHBOARD"); resetInvoice(); }} className="h-11 px-8 rounded-xl text-slate-500 font-bold hover:text-white transition-all">VAZGEÇ</Button>
                  <Button className="bg-primary hover:bg-primary/90 h-11 px-10 rounded-xl text-white font-black text-xs shadow-xl shadow-primary/20 gap-2" onClick={processInvoice}>
                    <Check size={18} strokeWidth={3} /> SİSTEME KAYDET
                  </Button>
               </div>
            </div>
          </Card>
        </main>
        <datalist id="prod-list">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0c] text-slate-200 overflow-hidden font-sans">
      <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-2 rounded-xl ring-1 ring-primary/30">
            <Receipt className="text-primary w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">MUHASEBE & FİNANS <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-400 font-bold uppercase tracking-widest">{invoices.length} BELGE</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cari Takip ve Gider Yönetimi</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => setActiveView("INVOICE_BUILDER")} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs gap-2 px-6 h-9 rounded-full shadow-lg shadow-emerald-500/20">
            <PlusCircle size={16} strokeWidth={3} /> FATURA İŞLE
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-white/5 bg-black/20 p-4 shrink-0 flex flex-col gap-6">
          <section>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-2">MENÜ</h3>
            <div className="space-y-1">
              {[
                { id: "DASHBOARD", label: "GENEL ÖZET", icon: Receipt },
                { id: "COMPANIES", label: "CARİ HESAPLAR", icon: Building2 },
                { id: "PRICE_CHANGE", label: "FİYAT YÖNETİMİ", icon: Settings2 }
              ].map(v => (
                <button 
                  key={v.id}
                  onClick={() => setActiveView(v.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${activeView === v.id ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"}`}
                >
                  <v.icon size={16} className={activeView === v.id ? "text-primary" : "text-slate-600"} />
                  {v.label}
                </button>
              ))}
            </div>
          </section>

          <section className="flex-1 pt-6 border-t border-white/5">
             <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                   <ArrowUpRight size={14} className="text-red-500" />
                   <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Aylık Gider</span>
                </div>
                <p className="text-xl font-black text-white">{invoices.reduce((s, i) => s + i.totalAmount, 0).toLocaleString()} ₺</p>
                <div className="w-full h-1 bg-red-500/10 rounded-full mt-3 overflow-hidden">
                   <div className="h-full bg-red-500 rounded-full" style={{ width: '45%' }} />
                </div>
             </div>
          </section>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 bg-[#0c0c0e]">
          {activeView === "DASHBOARD" && (
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6">
              {/* Stat Cards High-Density */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: "TOPLAM GİDER", value: invoices.reduce((s, i) => s + i.totalAmount, 0).toLocaleString() + " ₺", icon: ArrowUpRight, color: "text-red-500", bg: "bg-red-500/10" },
                  { label: "CARİ SAYISI", value: companies.length, icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10" },
                  { label: "İŞLENEN EVRAK", value: invoices.length, icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10" },
                  { label: "GENEL BAKİYE", value: "0 ₺", icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10" }
                ].map((s, i) => (
                  <Card key={i} className="border border-white/5 bg-black/40 p-4 rounded-2xl hover:border-white/10 transition-all flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                      <p className="text-lg font-black text-white">{s.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center`}>
                      <s.icon size={18} />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Recent Invoices Table */}
              <div className="border border-white/5 rounded-2xl bg-black/40 overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileText size={14} className="text-primary" /> SON İŞLEMLER
                  </h2>
                  <Button variant="ghost" size="sm" className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-tighter">Tümünü Gör <ChevronRight size={12} /></Button>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] border-b border-white/5">
                      <th className="py-3 px-6 text-left">TARİH</th>
                      <th className="py-3 px-4 text-left">CARİ / TEDARİKÇİ</th>
                      <th className="py-3 px-4 text-left">AÇIKLAMA / NO</th>
                      <th className="py-3 px-4 text-right">TOPLAM TUTAR</th>
                      <th className="py-3 px-6 text-center">İŞLEM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {isLoading ? (
                      <tr><td colSpan={5} className="py-12 text-center text-slate-600 text-[11px] animate-pulse uppercase font-black">Finansal Veriler Yükleniyor...</td></tr>
                    ) : invoices.map(inv => (
                      <tr key={inv.id} className="group hover:bg-white/[0.02] transition-all">
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-slate-600" />
                            <span className="text-[11px] font-bold text-slate-400">{new Date(inv.createdAt).toLocaleDateString("tr-TR")}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                           <span className="text-[12px] font-black text-white uppercase tracking-tight">{inv.company?.name || "Bilinmiyor"}</span>
                        </td>
                        <td className="py-3 px-4 text-[11px] font-medium text-slate-500 italic">{inv.invoiceName || "Satın Alma Faturası"}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-[12px] font-black text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.2)]">{inv.totalAmount.toLocaleString()} ₺</span>
                        </td>
                        <td className="py-3 px-6 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
                            <Button size="sm" variant="ghost" onClick={() => handleEditInvoice(inv)} className="h-8 w-8 p-0 rounded-full hover:bg-primary/20 text-slate-500 hover:text-primary"><Edit2 size={14} /></Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-500"><Trash2 size={14} /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === "PRICE_CHANGE" && (
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6">
               <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">FİYAT YÖNETİMİ</h2>
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    {["TÜMÜ", "YEMEKLER", "MEZELER", "İÇECEKLER", "ÜRETİM"].map(cat => (
                      <button 
                        key={cat}
                        onClick={() => {
                          // Simple local filter for demo, usually would fetch from API or filter existing state
                          alert(`${cat} kategorisi seçildi.`);
                        }}
                        className="px-4 py-2 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
               </div>
               
               <div className="border border-white/5 rounded-2xl bg-black/40 overflow-hidden shadow-2xl">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">
                        <th className="py-4 px-6 text-left">ÜRÜN ADI</th>
                        <th className="py-4 px-4 text-left">TÜR</th>
                        <th className="py-4 px-4 text-right">ALIŞ FİYATI</th>
                        <th className="py-4 px-4 text-right">MEVCUT SATIŞ</th>
                        <th className="py-4 px-4 text-right">ÖNERİLEN (%20)</th>
                        <th className="py-4 px-6 text-center">İŞLEM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {products.map(p => (
                        <tr key={p.id} className="group hover:bg-white/[0.02] transition-all">
                          <td className="py-3 px-6">
                            <span className="text-[12px] font-black text-white uppercase">{p.name}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[9px] font-black text-slate-500 border border-white/5 bg-white/5 px-2 py-0.5 rounded-full uppercase">{p.type}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-[11px] font-bold text-slate-400">{p.purchasePrice.toFixed(2)} ₺</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-[12px] font-black text-white">{Number(p.finalSalePrice).toFixed(2)} ₺</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-[11px] font-bold text-emerald-500">{(p.purchasePrice * 1.2).toFixed(2)} ₺</span>
                          </td>
                          <td className="py-3 px-6 text-center">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-primary/20 text-slate-500 hover:text-primary"><Edit2 size={14} /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

