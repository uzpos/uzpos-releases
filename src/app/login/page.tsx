"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Hatalı e-posta veya şifre.");
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center relative overflow-hidden backdrop-blur-md">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-pulse" />
      
      <div className="w-full max-w-md glass-panel rounded-2xl p-8 transform transition-all hover:scale-[1.01]">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tighter text-white mb-2">
            Uzpos<span className="text-primary animate-pulse">.</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Restoran Yönetim Sistemine Giriş Yapın
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-950/50 p-4 text-sm text-red-400 border border-red-900/50 backdrop-blur-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">E-posta Adresi</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@uzpos.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-primary h-12"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-slate-300">Şifre</Label>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-primary h-12"
            />
          </div>

          <Button className="w-full h-12 text-lg font-bold shadow-lg mt-4" type="submit" disabled={loading}>
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Button>
        </form>
      </div>
    </div>
  );
}
