import { useState } from "react";
import { useNavigate } from "react-router-dom";

function LoginPassword(){

	const [email, setEmail] = useState(localStorage.getItem("email") || "");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate();

	const login = async () => {
		try {
			const normalizedEmail = email.trim().toLowerCase();

			if (!normalizedEmail || !password) {
				setError("Email and password are required");
				return;
			}

			setLoading(true);
			setError("");

			const response = await fetch("http://localhost:5000/api/auth/login-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: normalizedEmail,
					password,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.message || "Wrong email or password");
			}

			localStorage.setItem("email", data?.user?.email || normalizedEmail);
			navigate("/dashboard");
		} catch (loginError) {
			setError(loginError.message || "Wrong email or password");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-100 via-amber-50 to-slate-200 px-4 py-10">
			<div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
				<h1 className="text-2xl font-bold text-slate-900">Password Login</h1>
				<p className="mt-2 text-sm text-slate-600">Enter the password shared to your email.</p>

				{error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

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
						placeholder="Password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
					/>

					<button
						type="button"
						onClick={login}
						disabled={loading}
						className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{loading ? "Logging in..." : "Login"}
					</button>
				</div>
			</div>
		</div>
	);

}

export default LoginPassword;