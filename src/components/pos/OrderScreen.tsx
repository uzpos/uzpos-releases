"use client";

import { useCallback, useEffect, useState } from "react";
import { usePosStore, PosProduct } from "@/store/posStore";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
  type: string;
}

interface OrderItemResponse {
  productId: string;
  product: { name: string };
  price: number;
  quantity: number;
}

export function OrderScreen() {
  const { selectedTableId, selectedTableName, cart, addToCart, removeFromCart, clearCart, selectTable, setCart, updateNote } = usePosStore();
  const [categories, setCategories] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  const fetchActiveOrder = useCallback(async () => {
     try {
       const res = await fetch(`/api/orders/active?tableId=${selectedTableId}`);
       if (res.ok) {
         const data = await res.json();
         if (data && data.items) {
            const mappedCart = data.items.map((item: OrderItemResponse) => ({
               productId: item.productId,
               name: item.product.name,
               price: item.price,
               quantity: item.quantity
            }));
            setCart(mappedCart);
         } else {
            setCart([]);
         }
       } else {
          setCart([]); 
       }
     } catch (err) { console.error(err); setCart([]); }
  }, [selectedTableId, setCart]);

  const fetchMenu = useCallback(async () => {
    try {
      setIsLoading(true);
      const [catRes, prodRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/products")
      ]);
      if (catRes.ok && prodRes.ok) {
         const catData: Category[] = await catRes.json();
         const prodData = await prodRes.json();
         
         const menuCats = catData.filter(c => c.type !== "MATERIAL");
         setCategories(menuCats);
         if (menuCats.length > 0) setActiveCategory(menuCats[0].id);

         const menuProds = prodData
            .filter((p: { type: string }) => p.type !== "MATERIAL")
            .map((p: { id: string, name: string, finalSalePrice: number, estimatedPrice: number, purchasePrice: number, categoryId: string }) => ({
               id: p.id,
               name: p.name,
               price: p.finalSalePrice || p.estimatedPrice || p.purchasePrice,
               categoryId: p.categoryId
            }));
         setProducts(menuProds);
      }
    } catch (err) {
       console.error(err);
    } finally {
       setIsLoading(false);
    }
  }, []);

  const handleAddToCart = async (product: PosProduct) => {
     // 1. UI Update
     addToCart(product);

     // 2. DB Sync
     try {
        if (selectedTableId && selectedTableId !== "DIRECT_SALE" && selectedTableId !== "TAKEAWAY") {
           const orderRes = await fetch(`/api/orders/active?tableId=${selectedTableId}`);
           let orderId;
           if (orderRes.ok) {
              const orderData = await orderRes.json();
              orderId = orderData?.id;
           }

           if (!orderId) {
              // Create a new order if none exists for the table
              const createOrderRes = await fetch("/api/orders", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({
                    tableId: selectedTableId,
                    items: [{ productId: product.id, quantity: 1, price: product.price }],
                    paymentMethod: null,
                    status: "PENDING"
                 })
              });
              if (createOrderRes.ok) {
                 const newOrderData = await createOrderRes.json();
                 orderId = newOrderData.id;
              }
           } else {
              // Add item to existing order
              await fetch("/api/orders/items", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({
                    orderId: orderId,
                    productId: product.id,
                    quantity: 1,
                    price: product.price
                 })
              });
           }
        }
     } catch (e) { console.error(e); }
  };

  useEffect(() => {
     if (selectedTableId && selectedTableId !== "DIRECT_SALE" && selectedTableId !== "TAKEAWAY") {
        fetchActiveOrder();
     } else {
        setCart([]); 
     }
  }, [selectedTableId, fetchActiveOrder, setCart]);

  useEffect(() => {
     fetchMenu();
  }, [fetchMenu]);

  const handleRemoveFromCart = async (productId: string) => {
     // 1. UI Update
     removeFromCart(productId);

     // 2. DB Sync
     try {
        if (selectedTableId && selectedTableId !== "DIRECT_SALE" && selectedTableId !== "TAKEAWAY") {
           const orderRes = await fetch(`/api/orders/active?tableId=${selectedTableId}`);
           if (orderRes.ok) {
              const orderData = await orderRes.json();
              if (orderData && orderData.id) {
                 await fetch(`/api/orders/items?orderId=${orderData.id}&productId=${productId}`, {
                    method: "DELETE"
                 });
              }
           }
        }
     } catch (e) { console.error(e); }
  };

  const filteredProducts = products.filter(p => p.categoryId === activeCategory);
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePayment = async (method: "CASH" | "CREDIT") => {
    if (cart.length === 0) return;
    try {
      setIsPaying(true);
      const isDirectSale = selectedTableId === "DIRECT_SALE";
      const payload = {
         tableId: selectedTableId,
          items: cart.map(item => ({ 
             productId: item.productId, 
             quantity: item.quantity, 
             price: item.price,
             note: item.note 
          })),
          paymentMethod: method,
          totalAmount,
          isDirectSale
      };
      
      const res = await fetch("/api/orders", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(payload)
      });

      if (res.ok) {
         alert(`Hesap Kapatıldı: ${totalAmount} ₺ - ${method === 'CASH' ? 'Nakit' : 'Kredi Kartı'}\n${isDirectSale ? 'Peşin Satış: Stoktan anında düşüldü.' : ''}`);
         clearCart();
         selectTable(null);
      } else {
         alert("Sipariş işlenirken bir hata oluştu.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-black/95">
      {/* Sol Taraf: Menü ve Kategoriler */}
      <div className="flex-1 flex flex-col min-h-0 relative z-0">
        
        {/* Kategoriler */}
        <div className="p-3 md:p-4 flex gap-2 md:gap-3 overflow-x-auto border-b border-white/10 bg-black/80 backdrop-blur-md scrollbar-hide shrink-0">
          <Button variant="ghost" size="sm" onClick={() => selectTable(null)} className="mr-1 md:mr-2 text-slate-300 h-10">
            ← <span className="hidden md:inline ml-1">Masalar</span>
          </Button>
          <div className="h-6 w-px bg-white/20 mx-1 md:mx-2 self-center"></div>
          {categories.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 md:px-6 py-2 rounded-full text-sm md:text-base font-medium transition-all duration-300 whitespace-nowrap border ${
                activeCategory === cat.id 
                  ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(218,26,50,0.5)]" 
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
 
        {/* Ürün Izgarası */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide">
          {isLoading ? (
             <div className="text-center text-slate-400 py-12">Menü Yükleniyor...</div>
          ) : filteredProducts.length === 0 ? (
             <div className="text-center text-slate-400 py-12">Bu kategoriye ait ürün bulunmuyor.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => handleAddToCart(product)}
                  className="group relative h-32 md:h-36 flex flex-col p-3 md:p-4 bg-[#1a1a1a] rounded-2xl border border-white/10 hover:border-primary/50 justify-between items-start text-left shadow-lg active:scale-95 transition-transform"
                >
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 rounded-2xl transition-colors duration-300 pointer-events-none" />
                  
                  <span className="font-bold text-base md:text-lg text-white group-hover:text-primary transition-colors leading-tight z-10 w-full line-clamp-2">
                    {product.name}
                  </span>
                  
                  <div className="flex justify-between items-center w-full mt-2 md:mt-4 z-10">
                    <span className="text-lg md:text-xl font-black tracking-tighter text-slate-300 group-hover:text-white">
                      {product.price} ₺
                    </span>
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-primary group-hover:shadow-[0_0_10px_rgba(218,26,50,0.8)] transition-all">
                      +
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
 
      {/* Sağ Taraf: Adisyon Sepeti */}
      <div className="w-full lg:w-[450px] bg-[#111111] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col h-[50vh] lg:h-full shadow-2xl z-20 shrink-0">
        <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-black/20 shrink-0">
          <div>
            <h3 className="text-[10px] md:text-sm font-semibold text-slate-400 uppercase tracking-widest">Aktif Adisyon</h3>
            <div className="text-xl md:text-3xl font-black text-white mt-0.5 md:mt-1">
              {selectedTableName || "Seçilmedi"}
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 md:h-10 border-white/20 text-xs md:text-sm text-slate-300 hover:text-white" onClick={() => {
            alert("Masa taşıma ekranı açılacak.");
            selectTable(null);
          }}>
            Masa Taşı
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-hidden">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                🛒
              </div>
              <p>Sipariş eklemek için soldan ürün seçin.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="flex flex-row items-center p-4 bg-[#1a1a1a] rounded-xl border border-white/5 justify-between group hover:border-white/20 transition-colors shadow-sm">
                <div className="flex-1">
                  <div className="font-bold text-white text-lg">{item.name}</div>
                  <div className="text-sm text-primary font-medium mt-1">{item.price} ₺ <span className="text-slate-500 font-normal">x {item.quantity}</span></div>
                  <input 
                    type="text" 
                    placeholder="Not ekle..." 
                    value={item.note || ""} 
                    onChange={(e) => updateNote(item.productId, e.target.value)}
                    className="mt-2 w-full bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="font-bold text-xl text-white">{item.price * item.quantity} ₺</div>
                  <button 
                    className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                    onClick={() => handleRemoveFromCart(item.productId)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-[#0a0a0a] border-t border-white/10 mt-auto">
          <div className="flex justify-between items-end mb-6">
            <span className="text-slate-400 text-lg uppercase tracking-wider font-semibold">Toplam Tutar</span>
            <span className="text-4xl font-black text-white text-glow">{totalAmount} ₺</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button variant="glass" size="lg" className="h-16 text-lg w-full bg-emerald-600/80 hover:bg-emerald-500 text-white border-none shadow-[0_0_20px_rgba(5,150,105,0.3)]" onClick={() => handlePayment("CASH")} disabled={cart.length === 0 || isPaying}>
              {isPaying ? "İşleniyor..." : "NAKİT AL"}
            </Button>
            <Button variant="glass" size="lg" className="h-16 text-lg w-full bg-primary/80 hover:bg-primary text-white border-none shadow-[0_0_20px_rgba(218,26,50,0.3)]" onClick={() => handlePayment("CREDIT")} disabled={cart.length === 0 || isPaying}>
              {isPaying ? "İşleniyor..." : "KREDİ KARTI"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <Button variant="outline" size="lg" className="h-14 text-sm w-full border-white/20 text-slate-300 hover:bg-white/10 hover:text-white flex-col" onClick={async () => {
              if (cart.length === 0) return;
              try {
                // Sent to Mutfak (Pending)
                setIsPaying(true);
                const isDirectSale = selectedTableId === "DIRECT_SALE";
                if (isDirectSale) {
                   alert("Peşin Satışlar beklemeye alınamaz, sadece anında ödenebilir.");
                   setIsPaying(false);
                   return;
                }
                const res = await fetch("/api/orders", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({
                     tableId: selectedTableId,
                      items: cart.map(item => ({ 
                        productId: item.productId, 
                        quantity: item.quantity, 
                        price: item.price,
                        note: item.note 
                      })),
                      paymentMethod: null,
                      totalAmount,
                      isDirectSale: false
                    })
                });
                if (res.ok) {
                   alert("Sipariş mutfağa (Beklemeye) gönderildi.");
                   clearCart();
                   selectTable(null);
                }
              } catch (e) { console.error(e) } finally { setIsPaying(false) }
            }} disabled={cart.length === 0 || isPaying}>
              BEKLEMEYE AL
              <span className="text-[10px] text-slate-500 font-normal leading-none">(Mutfağa Gönder)</span>
            </Button>
            <Button variant="outline" size="lg" className="h-14 text-sm w-full border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300" onClick={clearCart} disabled={cart.length === 0 || isPaying}>
              İPTAL ET
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
