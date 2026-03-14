"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Image as ImageIcon, BookOpen, Search, Settings2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Material {
  id: string;
  name: string;
  unit: string;
  purchasePrice: number;
}

interface Recipe {
  id: string;
  name: string;
  finalSalePrice: number;
  estimatedPrice?: number;
  canMake?: number;
  category?: { name: string };
  recipesAsResult: Array<{
    id: string;
    materialId: string;
    quantity: number;
    material: Material;
  }>;
}

type RecipeItem = {
  id: number;
  name: string;
  materialId?: string;
  quantity: number | string;
  unit: string;
  purchasePrice: number | string;
  estimatedCost: number;
};

export default function RecipesPage() {
  const { status } = useSession();
  const router = useRouter();

  const [showBuilder, setShowBuilder] = useState(false);
  const [rawMaterials, setRawMaterials] = useState<Material[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "FOOD" | "MEZE">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Recipe form state
  const [recipeName, setRecipeName] = useState("");
  const [recipeCategory, setRecipeCategory] = useState("cat_yemek");
  const [recipeSalePrice, setRecipeSalePrice] = useState("");
  const [ingredients, setIngredients] = useState<RecipeItem[]>([
    { id: 1, name: "", materialId: "", quantity: 1, unit: "kg", purchasePrice: 0, estimatedCost: 0 }
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
     fetchData();
  }, []);

  const fetchData = async () => {
     try {
        const [materialsRes, recipesRes] = await Promise.all([
           fetch("/api/products?type=MATERIAL"),
           fetch("/api/recipes")
        ]);
        
        if (materialsRes.ok) {
           const mats = await materialsRes.json();
           setRawMaterials(mats);
        }
        if (recipesRes.ok) {
           const recs = await recipesRes.json();
           setRecipes(recs);
        }
     } catch (err) {
        console.error("Failed to load recipes data", err);
     }
  };

  const handleEdit = (recipe: Recipe) => {
     setEditingId(recipe.id);
     setRecipeName(recipe.name);
     setRecipeSalePrice(recipe.finalSalePrice.toString());
     // Map back category to builder values
     if (recipe.category?.name === "Ana Yemekler") setRecipeCategory("cat_yemek");
     else if (recipe.category?.name === "Mezeler") setRecipeCategory("cat_meze");
     
     const mappedIngredients = recipe.recipesAsResult.map((rr) => ({
        id: Math.random(),
        name: rr.material.name,
        materialId: rr.materialId,
        quantity: rr.quantity,
        unit: rr.material.unit,
        purchasePrice: rr.material.purchasePrice,
        estimatedCost: rr.quantity * rr.material.purchasePrice
     }));
     setIngredients(mappedIngredients);
     setShowBuilder(true);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { id: Date.now(), name: "", quantity: 1, unit: "kg", purchasePrice: 0, estimatedCost: 0 }]);
  };

  const removeIngredient = (id: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  const updateIngredient = (id: number, field: keyof RecipeItem, value: string | number) => {
    setIngredients(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === "name" && typeof value === "string") {
          const matchedItem = rawMaterials.find(rm => rm.name.toLowerCase() === value.toLowerCase());
          if (matchedItem) {
             updated.materialId = matchedItem.id;
             updated.unit = matchedItem.unit;
             updated.purchasePrice = matchedItem.purchasePrice;
          }
        }
        updated.estimatedCost = Number(updated.quantity) * Number(updated.purchasePrice);
        return updated;
      }
      return item;
    }));
  };

  const totalRecipeCost = ingredients.reduce((sum, item) => sum + item.estimatedCost, 0);

  const saveRecipe = async () => {
    if (!recipeName || ingredients.some(i => !i.materialId)) {
       alert("Lütfen yemek adı ve malzemeleri eksiksiz doldurun.");
       return;
    }
    
    try {
      const payload = {
        id: editingId,
        name: recipeName,
        categoryId: recipeCategory, 
        finalSalePrice: Number(recipeSalePrice || 0),
        ingredients: ingredients.map(ing => ({
           materialId: ing.materialId,
           quantity: Number(ing.quantity)
        }))
      };

      const res = await fetch("/api/recipes", {
         method: editingId ? "PATCH" : "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(payload)
      });

      if (res.ok) {
         setShowBuilder(false);
         setEditingId(null);
         fetchData(); 
         resetForm();
      } else {
         alert("Kayıt sırasında bir hata oluştu.");
      }
    } catch (err) {
       console.error(err);
    }
  };

  const resetForm = () => {
    setRecipeName("");
    setRecipeSalePrice("");
    setEditingId(null);
    setRecipeCategory("cat_yemek");
    setIngredients([{ id: 1, name: "", materialId: "", quantity: 1, unit: "kg", purchasePrice: 0, estimatedCost: 0 }]);
  };

  const finalRecipes = recipes.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === "ALL") return matchesSearch;
    if (activeTab === "FOOD") return matchesSearch && r.category?.name === "Ana Yemekler";
    if (activeTab === "MEZE") return matchesSearch && r.category?.name === "Mezeler";
    return matchesSearch;
  });

  if (showBuilder) {
    return (
      <div className="min-h-screen bg-black/95 flex flex-col items-center">
        <Navbar />
        <main className="flex-1 w-full max-w-[1400px] p-4 md:p-8 mt-4">
          <div className="glass-panel p-6 rounded-2xl flex justify-between items-center mb-6">
             <div className="flex items-center gap-4">
               <Button variant="ghost" onClick={() => { setShowBuilder(false); resetForm(); }} className="text-slate-400 hover:text-white">← Geri</Button>
               <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                 <BookOpen className="text-primary"/> {editingId ? "Reçete Düzenle" : "Yeni Reçete Ekle"}
               </h2>
             </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-[400px]">
               <Card className="glass-card h-full">
                 <CardHeader>
                   <CardTitle className="text-white text-lg font-black">Yemek Fotoğrafı</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="w-full h-[300px] border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center text-slate-500 bg-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                      <ImageIcon size={48} className="mb-4 text-slate-600 group-hover:text-primary transition-colors" />
                      <p className="font-semibold text-slate-400 group-hover:text-white">Fotoğraf Yükle</p>
                   </div>
                 </CardContent>
               </Card>
            </div>

            <div className="flex-1">
               <Card className="glass-panel border-white/10 h-full flex flex-col relative">
                 <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Yemek / Ürün Adı</label>
                         <Input 
                           value={recipeName}
                           onChange={(e) => setRecipeName(e.target.value)}
                           className="h-12 bg-white/5 border-white/10 text-white focus-visible:ring-primary text-lg" 
                           placeholder="Örn: Ali Nazik"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Kategori / Tür</label>
                         <select 
                           value={recipeCategory}
                           onChange={(e) => setRecipeCategory(e.target.value)}
                           className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 text-white focus:outline-none focus:border-primary"
                         >
                           <option value="cat_yemek" className="bg-slate-900">Ana Yemek</option>
                           <option value="cat_meze" className="bg-slate-900">Meze / Ara Sıcak</option>
                         </select>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                       <h3 className="text-lg font-bold text-white uppercase tracking-wider">İçindekiler</h3>
                       <Button onClick={addIngredient} size="sm" className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50">
                          <Plus size={16} className="mr-2"/> Malzeme Ekle
                       </Button>
                    </div>

                    <div className="overflow-x-auto w-full rounded-xl border border-white/10 bg-[#111]">
                      <table className="w-full text-left">
                        <thead className="border-b border-white/10 text-slate-400 text-xs font-black uppercase">
                          <tr>
                            <th className="p-4 w-[250px]">Malzeme Adı</th>
                            <th className="p-4 w-[120px]">Birim</th>
                            <th className="p-4 w-[120px]">Miktar</th>
                            <th className="p-4 w-[150px]">Fiyat (Birim)</th>
                            <th className="p-4 w-[150px]">Maliyet</th>
                            <th className="p-4 w-16 text-center">Sil</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {ingredients.map((item) => (
                            <tr key={item.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-3">
                                 <input 
                                    type="text" 
                                    value={item.name}
                                    onChange={(e) => updateIngredient(item.id, "name", e.target.value)}
                                    list="raw-materials"
                                    className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white"
                                 />
                              </td>
                               <td className="p-3">
                                <select 
                                   value={item.unit} 
                                   onChange={(e) => updateIngredient(item.id, "unit", e.target.value)}
                                   className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white text-xs"
                                >
                                  <option value="kg">KG</option>
                                  <option value="adet">ADET</option>
                                </select>
                               </td>
                              <td className="p-3">
                                <input type="number" step="0.01" value={item.quantity} onChange={(e) => updateIngredient(item.id, "quantity", e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white text-center"/>
                              </td>
                              <td className="p-3 text-right text-slate-300 font-mono">{Number(item.purchasePrice).toFixed(2)} ₺</td>
                              <td className="p-3 text-right text-white font-bold">{item.estimatedCost.toFixed(2)} ₺</td>
                              <td className="p-3 text-center">
                                 <Button variant="ghost" size="icon" onClick={() => removeIngredient(item.id)} className="text-red-500 hover:bg-red-500/20">
                                   <Trash2 size={16}/>
                                 </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-8 flex flex-col md:flex-row justify-between items-end gap-6 p-6 bg-black/30 border border-white/10 rounded-xl">
                       <div>
                          <p className="text-slate-400 text-xs uppercase font-black mb-1">Toplam Maliyet (1 Porsiyon)</p>
                          <div className="text-3xl font-black text-white">{totalRecipeCost.toFixed(2)} ₺</div>
                       </div>
                       <div className="w-full md:w-64">
                          <label className="text-xs font-black text-primary uppercase mb-2 block tracking-widest">Satış Fiyatı</label>
                          <div className="relative">
                             <Input 
                               type="number" 
                               value={recipeSalePrice}
                               onChange={(e) => setRecipeSalePrice(e.target.value)}
                               className="h-14 bg-primary/10 border-primary/50 text-white text-2xl font-black text-right pr-12"
                             />
                             <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-bold">₺</span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                       <Button onClick={saveRecipe} size="lg" className="h-14 px-10 text-lg font-black shadow-[0_0_20px_rgba(218,26,50,0.4)]">
                         Reçeteyi {editingId ? "Güncelle" : "Kaydet"}
                       </Button>
                    </div>
                 </CardContent>
               </Card>
            </div>
          </div>
          <datalist id="raw-materials">
             {rawMaterials.map(rm => (<option key={rm.id} value={rm.name} />))}
          </datalist>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-black/95">
      <Navbar />
      <main className="flex-1 w-full max-w-[1400px] p-4 md:p-8 mt-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-black/40 p-6 rounded-2xl border border-white/10">
          <div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">REÇETELER <span className="text-primary">&</span> ÜRETİM</h1>
            <p className="text-slate-400 font-medium">Satışta olan yemeklere ait reçeteleri yönetin, porsiyon kapasitenizi izleyin.</p>
          </div>
          <Button onClick={() => setShowBuilder(true)} className="h-14 bg-primary hover:bg-primary/90 text-white font-black px-8 shadow-[0_0_20px_rgba(218,26,50,0.4)]">
            <Plus className="mr-2" size={20} /> YENİ REÇETE EKLE
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-8 justify-between">
           <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button onClick={() => setActiveTab("ALL")} className={`px-8 py-3 rounded-lg text-xs font-black uppercase transition-all ${activeTab === "ALL" ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-white"}`}>Tümü</button>
              <button onClick={() => setActiveTab("FOOD")} className={`px-8 py-3 rounded-lg text-xs font-black uppercase transition-all ${activeTab === "FOOD" ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-white"}`}>Ana Yemekler</button>
              <button onClick={() => setActiveTab("MEZE")} className={`px-8 py-3 rounded-lg text-xs font-black uppercase transition-all ${activeTab === "MEZE" ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-white"}`}>Mezeler</button>
           </div>
           <div className="relative w-full max-w-sm">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
             <Input 
                className="pl-12 bg-white/5 border-white/10 text-white h-14 rounded-xl focus:border-primary text-lg" 
                placeholder="Yemek veya meze ara..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {finalRecipes.map(recipe => (
              <Card key={recipe.id} className="glass-panel border-white/10 hover:border-primary/50 transition-all group overflow-hidden flex flex-col h-[350px]">
                 <div className="h-40 bg-slate-900 flex items-center justify-center relative bg-gradient-to-br from-slate-900 to-black">
                    <ImageIcon className="text-slate-800" size={64}/>
                    <div className="absolute top-3 right-3">
                       <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter border border-primary/30">
                          {recipe.category?.name || "Yemek"}
                       </span>
                    </div>
                 </div>
                 <CardContent className="p-5 flex flex-1 flex-col">
                    <h3 className="text-white text-2xl font-black mb-1 group-hover:text-primary transition-colors truncate">{recipe.name}</h3>
                    <div className="mt-3 space-y-2">
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-bold uppercase text-[10px]">Maliyet</span>
                          <span className="text-slate-300 font-mono font-bold tracking-tight">{(recipe.estimatedPrice || 0).toFixed(2)} ₺</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-bold uppercase text-[10px]">Satış</span>
                          <span className="text-emerald-400 font-black text-lg">{recipe.finalSalePrice.toFixed(2)} ₺</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 font-bold uppercase text-[10px]">Kar</span>
                          <span className="text-green-400 font-black text-lg">
                                {((recipe.finalSalePrice || 0) - (recipe.estimatedPrice || 0)).toLocaleString('tr-TR')} ₺
                              </span>
                       </div>
                    </div>
                         
                    <div className="flex items-center justify-between mb-4 bg-white/5 p-3 rounded-lg border border-white/5">
                       <span className="text-slate-400 text-sm">Yapılabilir Kapasite</span>
                       <span className={`font-black text-xl ${(recipe.canMake ?? 0) < 5 ? 'text-primary' : 'text-emerald-400'}`}>
                          {recipe.canMake ?? 0} Porsiyon
                       </span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(recipe)} className="bg-white/5 hover:bg-primary hover:text-white rounded-xl h-11 w-11 transition-all">
                       <Settings2 size={20}/>
                    </Button>
                 </CardContent>
              </Card>
           ))}
        </div>
      </main>
    </div>
  );
}
