import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetchJson, resolveApiErrorMessage } from "../config/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { 
    ArrowLeftIcon, 
    ShieldCheckIcon, 
    EnvelopeIcon, 
    LockClosedIcon, 
    UserIcon, 
    EyeIcon, 
    EyeSlashIcon 
} from "@heroicons/react/24/outline";
import { showToast } from "../config/toast";

function UserLogin() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState(1);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordPolicyRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    const sendOtp = async () => {
        try {
            if (!name.trim() || !email.trim() || !password || !confirmPassword) {
                setError("Please fill in all the required fields");
                return;
            }
            if (!emailRegex.test(email.trim())) {
                setError("Please enter a valid email address");
                return;
            }
            if (password !== confirmPassword) {
                setError("Passwords do not match. Please check and try again.");
                return;
            }
            if (!passwordPolicyRegex.test(password)) {
                setError("Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.");
                return;
            }

            setLoading(true);
            setError("");

            const { response, data } = await apiFetchJson("/auth/signup/request-otp", {
                method: "POST",
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                    confirmPassword,
                }),
            });

            if (!response.ok) throw new Error(data?.message || "Failed to send OTP");
            
            // Handle cases where email might have failed but signup initiated
            if (data.otp) {
                console.log(" [DEV MODE] OTP received in response:", data.otp);
                showToast("Dev Mode: OTP is " + data.otp, "info");
            } else {
                showToast(data.message || "OTP sent to your email", "success");
            }

            setStep(2);
        } catch (err) {
            setError(resolveApiErrorMessage(err, "Failed to send OTP"));
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        try {
            if (!otp.trim()) {
                setError("Please enter OTP");
                return;
            }

            setLoading(true);
            setError("");

            const { response, data } = await apiFetchJson("/auth/signup/verify-otp", {
                method: "POST",
                body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
            });

            if (!response.ok) throw new Error(data?.message || "OTP verification failed");
            
            showToast("Account verified! You can now log in.", "success");
            navigate("/login");
        } catch (err) {
            setError(resolveApiErrorMessage(err, "Verification failed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-cream px-6 py-20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/5 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />

            <div className="w-full max-w-lg space-y-8 relative z-10">
                <button onClick={() => navigate("/")} className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-primary hover:underline group">
                    <ArrowLeftIcon className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                    Back to Gallery
                </button>

                <Card className="border-none shadow-xl bg-white rounded-sm overflow-hidden">
                    <div className="h-1.5 bg-primary w-full" />
                    <CardHeader className="p-10 pb-6 space-y-4">
                        <div className="w-12 h-12 bg-neutral-cream rounded-full flex items-center justify-center text-primary">
                            <ShieldCheckIcon className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-3xl font-heading font-bold">
                                {step === 1 ? "Sign Up for Excellence" : "Verify Your Email"}
                            </CardTitle>
                            <CardDescription className="text-neutral-dark/40 font-body">
                                {step === 1 ? "Create an account to start your journey." : "We've sent a code to your inbox."}
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="p-10 pt-0 space-y-6">
                        {error && (
                            <p className="p-4 bg-accent/5 text-accent text-xs font-bold rounded-sm border border-accent/10">
                                {error}
                            </p>
                        )}

                        {step === 1 ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Full Name</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-dark/20" />
                                        <Input className="pl-12" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Email Address</label>
                                    <div className="relative">
                                        <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-dark/20" />
                                        <Input className="pl-12" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Confirm</label>
                                        <div className="relative">
                                            <Input 
                                                className="pr-12" 
                                                type={showConfirmPassword ? "text" : "password"} 
                                                placeholder="••••••••" 
                                                value={confirmPassword} 
                                                onChange={e => setConfirmPassword(e.target.value)} 
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-dark/20 hover:text-primary transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <Button className="w-full h-14 mt-4" onClick={sendOtp} disabled={loading}>
                                    {loading ? "Preparing..." : "Create Account"}
                                </Button>

                                <p className="text-center text-xs text-neutral-dark/40 pt-4 font-body">
                                    Already a member? <Link to="/login" className="text-primary font-bold hover:underline">Log in here</Link>
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40 text-center block">Enter 6-Digit OTP</label>
                                    <Input 
                                        className="text-center text-2xl tracking-[0.5em] h-16 font-bold" 
                                        maxLength={6} 
                                        placeholder="000000"
                                        value={otp} 
                                        onChange={e => setOtp(e.target.value)} 
                                    />
                                </div>
                                <Button className="w-full h-14" onClick={verifyOtp} disabled={loading}>
                                    {loading ? "Verifying..." : "Complete Signup"}
                                </Button>
                                <Button variant="ghost" className="w-full text-[10px]" onClick={() => setStep(1)}>
                                    Change signup details
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default UserLogin;
