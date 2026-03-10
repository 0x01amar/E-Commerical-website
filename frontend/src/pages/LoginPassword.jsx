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
		<div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-100 via-amber-50 to-slate-200 px-4 py-10">
			<div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
				<h1 className="text-2xl font-bold text-slate-900">User Login</h1>
				<p className="mt-2 text-sm text-slate-600">Login with your email and password.</p>

				{loginInfoMessage ? (
					<p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{loginInfoMessage}</p>
				) : null}

				{error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

				<div className="mt-5 space-y-4">
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

					<button
						type="button"
						onClick={login}
						disabled={loading}
						className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{loading ? "Logging in..." : "Login"}
					</button>

					<div className="flex flex-col gap-2 pt-1">
						<button
							type="button"
							onClick={() => navigate("/signup")}
							className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
						>
							Create New Account
						</button>
						<button
							type="button"
							onClick={() => navigate("/admin-login")}
							className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
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