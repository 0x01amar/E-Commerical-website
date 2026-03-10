import { useState } from "react";
import { useNavigate } from "react-router-dom";

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

            const response = await fetch("http://localhost:5000/api/auth/signup/request-otp", {
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

            const response = await fetch("http://localhost:5000/api/auth/signup/verify-otp", {
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
        <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-100 via-amber-50 to-slate-200 px-4 py-10">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
                <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
                <p className="mt-2 text-sm text-slate-600">Sign up with your details, then verify OTP sent to your email.</p>

                {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
                {successMessage ? (
                    <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>
                ) : null}

                {step === 1 ? (
                    <div className="mt-5 space-y-4">
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                        />
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                        />
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-16 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-600 hover:text-slate-900"
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
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-16 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-600 hover:text-slate-900"
                            >
                                {showConfirmPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Use at least 8 characters with 1 uppercase letter, 1 number, and 1 special character.
                        </p>
                        <button
                            type="button"
                            onClick={sendOtp}
                            disabled={loading}
                            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Sending OTP..." : "Sign Up & Send OTP"}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
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
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                        />
                        <button
                            type="button"
                            onClick={verifyOtp}
                            disabled={loading}
                            className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Verifying..." : "Verify OTP"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                            Change Signup Details
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserLogin;