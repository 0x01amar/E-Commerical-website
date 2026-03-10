import { useState } from "react";
import { useNavigate } from "react-router-dom";

function UserLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState(1);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const passwordPolicyRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    const sendOtp = async () => {
        try {
            const normalizedEmail = email.trim().toLowerCase();

            if (!normalizedEmail) {
                setError("Please enter your email");
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

            const response = await fetch("http://localhost:5000/api/auth/send-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: normalizedEmail, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || "Failed to send OTP");
            }

            setEmail(normalizedEmail);
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

            const response = await fetch("http://localhost:5000/api/auth/verify-otp", {
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

            localStorage.setItem("email", email);

            if (data.userExists && !data.needsProfile) {
                navigate("/login-password");
                return;
            }

            navigate("/complete-profile");
        } catch (verifyError) {
            setError(verifyError.message || "OTP verification failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-100 via-amber-50 to-slate-200 px-4 py-10">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
                <h1 className="text-2xl font-bold text-slate-900">User Login</h1>
                <p className="mt-2 text-sm text-slate-600">We will send a one-time OTP to your email.</p>

                {error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

                {step === 1 ? (
                    <div className="mt-5 space-y-4">
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                        />
                        <input
                            type="password"
                            placeholder="Create password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                        />
                        <p className="text-xs text-slate-500">
                            Use at least 8 characters with 1 uppercase letter, 1 number, and 1 special character.
                        </p>
                        <button
                            type="button"
                            onClick={sendOtp}
                            disabled={loading}
                            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Sending OTP..." : "Send OTP"}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/login-password")}
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                            Already have password? Login with Email & Password
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
                            Change Email
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserLogin;