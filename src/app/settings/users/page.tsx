"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserPlus, Edit2, Trash2, X, Save } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "KASIYER" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user.role === "ADMIN") {
      fetchUsers();
    }
  }, [status, session]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      // console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", role: "KASIYER" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: "", role: user.role });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "İşlem başarısız.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Silme başarısız.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-black/95 flex flex-col items-center">
      <Navbar />
      
      <main className="flex-1 w-full max-w-[1400px] p-4 md:p-8 mt-4">
        <div className="flex justify-between items-center mb-8 bg-black/40 p-6 rounded-2xl glass-panel border border-white/10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Kullanıcı Yönetimi</h1>
            <p className="text-slate-400">Personel hesaplarını ve yetkilerini (Admin/Kasiyer) yönetin.</p>
          </div>
          <Button 
            onClick={handleOpenAdd}
            className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_rgba(218,26,50,0.5)] h-12 px-6 font-bold gap-2"
          >
            <UserPlus size={18} /> Yeni Kullanıcı Ekle
          </Button>
        </div>

        <Card className="glass-panel border-white/10 overflow-hidden">
          <CardHeader className="border-b border-white/10 p-6 bg-white/5">
            <CardTitle className="text-white">Sistem Kullanıcıları</CardTitle>
            <CardDescription className="text-slate-400">Toplam {users.length} kayıtlı personel.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent bg-black/20 text-slate-400">
                  <TableHead className="p-4 font-bold">İsim</TableHead>
                  <TableHead className="font-bold">E-posta</TableHead>
                  <TableHead className="font-bold">Rol / Yetki</TableHead>
                  <TableHead className="font-bold">Kayıt Tarihi</TableHead>
                  <TableHead className="text-right p-4 font-bold">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                    <TableCell className="font-bold text-white p-4">{user.name}</TableCell>
                    <TableCell className="text-slate-300">{user.email}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-black ring-1 ring-inset ${
                        user.role === "ADMIN" 
                        ? "bg-primary/20 text-primary ring-primary/40" 
                        : "bg-blue-500/20 text-blue-400 ring-blue-500/40"
                      }`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-right p-4">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenEdit(user)}
                          className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                        >
                          <Edit2 size={14} className="mr-1"/> Düzenle
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(user.id)}
                          className="text-red-500 hover:bg-red-500 hover:text-white"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="border-white/10 glass-panel text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Kullanıcı Düzenle" : "Yeni Kullanıcı Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tam İsim</label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Örn: Ahmet Yılmaz" 
                className="bg-black/50 border-white/10 focus-visible:ring-primary h-11"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">E-posta</label>
              <Input 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="ahmet@uzpos.com" 
                className="bg-black/50 border-white/10 focus-visible:ring-primary h-11"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {editingUser ? "Yeni Parola (Boş bırakılabilir)" : "Parola"}
              </label>
              <Input 
                type="password"
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="••••••" 
                className="bg-black/50 border-white/10 focus-visible:ring-primary h-11"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Yetki Seviyesi</label>
              <select 
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full h-11 bg-black/50 border border-white/10 rounded-md px-3 text-sm focus:outline-none focus:border-primary text-white"
              >
                <option value="KASIYER">Kasiyer (Sınırlı Yetki)</option>
                <option value="CHEF">Aşçı (Sadece Mutfak)</option>
                <option value="ADMIN">Admin (Tam Yetki)</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="border-white/10 text-slate-400 hover:text-white">
              <X size={16} className="mr-2"/> İptal
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 text-white font-bold shadow-[0_0_15px_rgba(218,26,50,0.5)] flex-1 h-11"
            >
              {isSaving ? "Kaydediliyor..." : <><Save size={16} className="mr-2"/> {editingUser ? "Değişiklikleri Kaydet" : "Kullanıcıyı Oluştur"}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
