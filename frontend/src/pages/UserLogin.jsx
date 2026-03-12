import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";

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
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const passwordPolicyRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    const sendOtp = async () => {
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const trimmedName = name.trim();

            if (!trimmedName) {
                setError("Please enter your full name");
                return;
            }

            if (!normalizedEmail) {
                setError("Please enter your email");
                return;
            }

            if (!password || !confirmPassword) {
                setError("Please enter password and confirm password");
                return;
            }

            if (password !== confirmPassword) {
                setError("Password and confirm password must match");
                return;
            }

            if (!passwordPolicyRegex.test(password)) {
                setError(
                    "Password must be at least 8 characters and include uppercase, number, and special character"
                );
                return;
            }

            setLoading(true);
            setError("");
            setSuccessMessage("");

            const response = await fetch(apiUrl("/auth/signup/request-otp"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: trimmedName,
                    email: normalizedEmail,
                    password,
                    confirmPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || "Failed to send OTP");
            }

            setEmail(normalizedEmail);
            setSuccessMessage("OTP sent to your email");
            setStep(2);
        } catch (sendOtpError) {
            setError(sendOtpError.message || "Failed to send OTP");
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
            setSuccessMessage("");

            const response = await fetch(apiUrl("/auth/signup/verify-otp"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    otp: otp.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || "OTP verification failed");
            }

            setSuccessMessage("Signup successful. Please login.");

            setTimeout(() => {
                navigate("/login");
            }, 1000);
        } catch (verifyError) {
            setError(verifyError.message || "OTP verification failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="flex min-h-screen items-center justify-center px-4 py-10"
            style={{
                background: "radial-gradient(ellipse at 30% 20%, rgba(0,212,255,0.07) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(20,184,166,0.05) 0%, transparent 50%)",
            }}
        >
            <div
                className="w-full max-w-md rounded-3xl p-6 sm:p-8"
                style={{
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(0,212,255,0.15)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 60px rgba(0,212,255,0.03)",
                }}
            >
                <div className="mb-1 text-xs uppercase tracking-widest font-semibold" style={{ color: "#00d4ff" }}>
                    {step === 1 ? "New Account" : "OTP Verification"}
                </div>
                <h1 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>
                    {step === 1 ? "Create Account" : "Verify OTP"}
                </h1>
                <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
                    {step === 1 ? "Sign up and verify via email OTP." : "Enter the OTP sent to your email."}
                </p>

                {error ? (
                    <p className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                        {error}
                    </p>
                ) : null}
                {successMessage ? (
                    <p className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)", color: "#2dd4bf" }}>
                        {successMessage}
                    </p>
                ) : null}

                {step === 1 ? (
                    <div className="mt-5 space-y-4">
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className="input-dark"
                        />
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="input-dark"
                        />
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="input-dark pr-14"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute inset-y-0 right-3 text-xs font-semibold transition-colors"
                                style={{ color: "#475569" }}
                                onMouseEnter={e => e.currentTarget.style.color = "#00d4ff"}
                                onMouseLeave={e => e.currentTarget.style.color = "#475569"}
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                className="input-dark pr-14"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                className="absolute inset-y-0 right-3 text-xs font-semibold transition-colors"
                                style={{ color: "#475569" }}
                                onMouseEnter={e => e.currentTarget.style.color = "#00d4ff"}
                                onMouseLeave={e => e.currentTarget.style.color = "#475569"}
                            >
                                {showConfirmPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                        <p className="text-xs" style={{ color: "#334155" }}>
                            Min 8 chars with 1 uppercase, 1 number, 1 special character.
                        </p>
                        <button
                            type="button"
                            onClick={sendOtp}
                            disabled={loading}
                            className="btn-neon w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Sending OTP..." : "Sign Up & Send OTP"}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="btn-ghost w-full py-2.5"
                        >
                            Already have an account? Login
                        </button>
                    </div>
                ) : (
                    <div className="mt-5 space-y-4">
                        <input
                            type="text"
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(event) => setOtp(event.target.value)}
                            className="input-dark"
                        />
                        <button
                            type="button"
                            onClick={verifyOtp}
                            disabled={loading}
                            className="btn-neon w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Verifying..." : "Verify OTP"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="btn-ghost w-full py-2.5"
                        >
                            ← Change Signup Details
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserLogin;