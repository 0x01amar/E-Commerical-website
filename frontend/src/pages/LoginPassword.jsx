import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { apiFetchJson, resolveApiErrorMessage } from "../config/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ArrowLeftIcon, LockClosedIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

function LoginPassword() {
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const loginInfoMessage = location.state?.message || "";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const login = async () => {
    try {
      if (!email.trim() || !password) {
        setError("Please enter your email and password to continue.");
        return;
      }
      if (!emailRegex.test(email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }

      setLoading(true);
      setError("");

      const { response, data } = await apiFetchJson("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          asAdmin: false,
        }),
      });

      if (!response.ok) throw new Error(data?.message || "Invalid credentials");

      localStorage.setItem("email", data?.user?.email || email.trim().toLowerCase());
      localStorage.setItem("role", data?.role || "user");
      localStorage.removeItem("adminKey");
      navigate(location.state?.redirectTo || "/dashboard");
    } catch (err) {
      setError(resolveApiErrorMessage(err, "Invalid credentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-cream px-6 py-20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full -translate-x-1/3 translate-y-1/3 blur-3xl" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <Link to="/" className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-primary hover:underline group">
          <ArrowLeftIcon className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Gallery
        </Link>

        <Card className="border-none shadow-xl bg-white rounded-sm overflow-hidden">
          <div className="h-1.5 bg-primary w-full" />
          <CardHeader className="p-10 pb-6 space-y-4">
            <div className="w-12 h-12 bg-neutral-cream rounded-full flex items-center justify-center text-primary">
              <LockClosedIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-heading font-bold">Welcome Back</CardTitle>
              <CardDescription className="text-neutral-dark/40 font-body text-sm">Sign in to your account.</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-10 pt-0 space-y-6">
            {loginInfoMessage && <p className="p-4 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest rounded-sm border border-primary/10">{loginInfoMessage}</p>}
            {error && <p className="p-4 bg-accent/5 text-accent text-[10px] font-bold uppercase tracking-widest rounded-sm border border-accent/10">{error}</p>}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Email Address</label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-dark/20" />
                  <Input className="pl-12" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} />
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

              <Button className="w-full h-14 mt-4" onClick={login} disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              <div className="pt-6 border-t border-neutral-dark/5 text-center">
                <p className="text-xs text-neutral-dark/40 font-body">
                  New here? <Link to="/signup" className="text-primary font-bold hover:underline">Sign up here</Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default LoginPassword;
