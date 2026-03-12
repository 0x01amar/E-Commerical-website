import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";

function LoginPassword(){

	const [email, setEmail] = useState(localStorage.getItem("email") || "");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate();
	const location = useLocation();
	const loginInfoMessage = location.state?.message || "";

	const login = async () => {
		try {
			const normalizedEmail = email.trim().toLowerCase();

			if (!normalizedEmail || !password) {
				setError("Email and password are required");
				return;
			}

			setLoading(true);
			setError("");

			const response = await fetch(apiUrl("/auth/login"), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: normalizedEmail,
					password,
					asAdmin: false,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.message || "Wrong email or password");
			}

			localStorage.setItem("email", data?.user?.email || normalizedEmail);
			localStorage.setItem("role", data?.role || "user");
			localStorage.removeItem("adminKey");
			navigate(location.state?.redirectTo || "/dashboard");
		} catch (loginError) {
			setError(loginError.message || "Wrong email or password");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="flex min-h-screen items-center justify-center px-4 py-10"
			style={{
				background: "radial-gradient(ellipse at 30% 20%, rgba(0,212,255,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(168,85,247,0.06) 0%, transparent 50%)",
			}}
		>
			<div
				className="w-full max-w-md rounded-3xl p-6 sm:p-8"
				style={{
					background: "rgba(255,255,255,0.04)",
					backdropFilter: "blur(20px)",
					WebkitBackdropFilter: "blur(20px)",
					border: "1px solid rgba(0,212,255,0.15)",
					boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 60px rgba(0,212,255,0.04)",
				}}
			>
				<div className="mb-1 text-xs uppercase tracking-widest font-semibold" style={{ color: "#00d4ff" }}>User Portal</div>
				<h1 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>Sign In</h1>
				<p className="mt-1 text-sm" style={{ color: "#64748b" }}>Login with your email and password.</p>

				{loginInfoMessage ? (
					<p className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>
						{loginInfoMessage}
					</p>
				) : null}

				{error ? (
					<p className="mt-4 rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
						{error}
					</p>
				) : null}

				<div className="mt-5 space-y-4">
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

					<button
						type="button"
						onClick={login}
						disabled={loading}
						className="btn-neon w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? "Signing in..." : "Sign In"}
					</button>

					<div className="flex flex-col gap-2 pt-1">
						<button
							type="button"
							onClick={() => navigate("/signup")}
							className="btn-ghost w-full py-2.5"
						>
							Create New Account
						</button>
						<button
							type="button"
							onClick={() => navigate("/admin-login")}
							className="w-full rounded-lg py-2.5 text-sm font-medium transition-all duration-250"
							style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)", color: "#c084fc" }}
							onMouseEnter={e => { e.currentTarget.style.background = "rgba(168,85,247,0.15)"; e.currentTarget.style.boxShadow = "0 0 15px rgba(168,85,247,0.2)"; }}
							onMouseLeave={e => { e.currentTarget.style.background = "rgba(168,85,247,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
						>
							Admin Login
						</button>
					</div>
				</div>
			</div>
		</div>
	);

}

export default LoginPassword;