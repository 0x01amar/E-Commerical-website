import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetchJson, resolveApiErrorMessage } from "../config/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ArrowLeftIcon, ShieldCheckIcon, LockClosedIcon, KeyIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      if (!email.trim() || !password || !adminKey.trim()) {
        setError("Please provide your admin email, password, and master key.");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError("Please enter a valid administrative email address.");
        return;
      }

      setLoading(true);
      setError("");

      const { response, data } = await apiFetchJson("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          adminKey: adminKey.trim(),
          asAdmin: true,
        }),
      });

      if (!response.ok) throw new Error(data?.message || "Invalid credentials");

      localStorage.setItem("email", data?.user?.email || email.trim().toLowerCase());
      localStorage.setItem("role", data?.role || "admin");
      localStorage.setItem("adminKey", adminKey.trim());
      navigate("/admin");
    } catch (err) {
      setError(resolveApiErrorMessage(err, "Invalid credentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-cream px-6 py-20 relative overflow-hidden">
      {/* Brand dynamic background */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <Link to="/" className="inline-flex items-center text-sm font-bold uppercase tracking-widest text-primary hover:underline group transition-all">
          <ArrowLeftIcon className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Gallery
        </Link>

        <Card className="border-none shadow-2xl bg-white rounded-sm overflow-hidden">
          <div className="h-1.5 bg-primary w-full" />
          <CardHeader className="p-10 pb-6 space-y-6 text-center">
            <div className="h-10 w-auto mx-auto flex justify-center">
              <svg className="h-full w-auto" viewBox="0 0 300 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="40,10 75,30 75,70 40,90 5,70 5,30" fill="#4A5D4E" />
                <path d="M20 65 V35 L40 55 L60 35 V65" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                <text x="95" y="55" fontFamily="Playfair Display, serif" fontWeight="bold" fontSize="36" fill="#1A1A1A">Maa Sheela</text>
                <text x="95" y="82" fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="14" fill="#1A1A1A" opacity="0.6" letterSpacing="6">IRON ARTS</text>
              </svg>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-heading font-bold tracking-tight">Admin Vault</CardTitle>
              <CardDescription className="text-neutral-dark/40 font-body text-xs font-bold uppercase tracking-widest">Authorized Personnel Only</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-10 pt-0 space-y-6">
            {error && (
              <p className="p-4 bg-accent/5 text-accent text-[10px] font-bold uppercase tracking-widest rounded-sm border border-accent/10">
                {error}
              </p>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Email</label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-dark/20" />
                  <Input className="pl-12" placeholder="admin@maasheela.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Password</label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-dark/20" />
                  <Input 
                    className="pl-12 pr-12" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-dark/20 hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Master Key</label>
                <div className="relative">
                  <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-dark/20" />
                  <Input className="pl-12" type="password" placeholder="Admin PIN" value={adminKey} onChange={e => setAdminKey(e.target.value)} />
                </div>
              </div>

              <Button className="w-full h-14 text-lg mt-4 shadow-xl shadow-primary/10" type="submit" disabled={loading}>
                {loading ? "Authenticating..." : "Enter Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AdminLogin;
