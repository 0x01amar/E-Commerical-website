import { useNavigate, Link } from "react-router-dom";
import { apiFetchJson, resolveApiErrorMessage } from "../config/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { GoogleLogin } from '@react-oauth/google';
import { ArrowLeftIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { showToast } from "../config/toast";
import { useState } from "react";

function UserLogin() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            setLoading(true);
            setError("");
            
            const { response, data } = await apiFetchJson("/auth/google-login", {
                method: "POST",
                body: JSON.stringify({ token: credentialResponse.credential }),
            });

            if (!response.ok) throw new Error(data?.message || "Google login failed");

            localStorage.setItem("email", data?.user?.email);
            localStorage.setItem("role", data?.role || "user");
            localStorage.removeItem("adminKey");
            
            showToast("Welcome to Maa Sheela Iron Arts!", "success");
            navigate("/dashboard");
        } catch (err) {
            setError(resolveApiErrorMessage(err, "Authentication failed"));
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
                                Join Our Collection
                            </CardTitle>
                            <CardDescription className="text-neutral-dark/40 font-body">
                                Sign in securely with your Google account.
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="p-10 pt-0 space-y-8">
                        {error && (
                            <p className="p-4 bg-accent/5 text-accent text-xs font-bold rounded-sm border border-accent/10">
                                {error}
                            </p>
                        )}

                        <div className="flex justify-center w-full py-4 overflow-hidden">
                            <div className="max-w-xs w-full flex justify-center">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setError("Google Sign-In failed. Please try again.")}
                                    theme="filled_blue"
                                    shape="rectangular"
                                    width="240"
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-neutral-dark/5 text-center">
                            <p className="text-xs text-neutral-dark/40 font-body">
                                Are you an administrator? <Link to="/admin-login" className="text-primary font-bold hover:underline">Admin Login</Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default UserLogin;
