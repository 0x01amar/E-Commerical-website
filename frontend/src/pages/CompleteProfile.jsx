import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";

function CompleteProfile(){

	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [address, setAddress] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [successMessage, setSuccessMessage] = useState("");

	const navigate = useNavigate();

	const email = localStorage.getItem("email");

	useEffect(() => {
		if (!email) {
			navigate("/login");
		}
	}, [email, navigate]);

	const saveProfile = async () => {
		try {
			if (!name.trim() || !phone.trim() || !address.trim()) {
				setError("All fields are required");
				return;
			}

			if (!/^\d{10}$/.test(phone.trim())) {
				setError("Phone must be exactly 10 digits");
				return;
			}

			setLoading(true);
			setError("");
			setSuccessMessage("");

			const response = await fetch(apiUrl("/auth/complete-profile"), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email,
					name: name.trim(),
					phone: phone.trim(),
					address: address.trim(),
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.message || "Failed to complete profile");
			}

			setSuccessMessage(
				data?.passwordSent
					? "Profile saved. Password has been sent to your email."
					: "Profile saved successfully."
			);

			setTimeout(() => {
				navigate("/login-password");
			}, 1200);
		} catch (saveError) {
			setError(saveError.message || "Failed to complete profile");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center px-4 py-10" style={{ background: "radial-gradient(circle at top, rgba(124,58,237,0.08), transparent 35%), radial-gradient(circle at bottom right, rgba(2,132,199,0.10), transparent 30%), #e8f0f9" }}>
			<div className="w-full max-w-lg rounded-3xl p-8 shadow-xl" style={{ background: "rgba(255,255,255,0.88)", border: "1px solid rgba(100,160,220,0.24)" }}>
				<h1 className="text-2xl font-bold" style={{ color: "#1a2f48" }}>Complete Profile</h1>
				<p className="mt-2 text-sm" style={{ color: "#3a5470" }}>Add your details to activate your account.</p>

				{error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
				{successMessage ? (
					<p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>
				) : null}

				<div className="mt-5 space-y-4">
					<input
						placeholder="Full Name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
						style={{ borderColor: "rgba(100,160,220,0.28)", background: "rgba(255,255,255,0.84)", color: "#1a2f48" }}
					/>

					<input
						placeholder="Phone (10 digits)"
						value={phone}
						maxLength="10"
						onChange={(event) => setPhone(event.target.value.replace(/[^0-9]/g, ""))}
						className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
						style={{ borderColor: "rgba(100,160,220,0.28)", background: "rgba(255,255,255,0.84)", color: "#1a2f48" }}
					/>

					<textarea
						placeholder="Address"
						value={address}
						onChange={(event) => setAddress(event.target.value)}
						className="min-h-28 w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition"
						style={{ borderColor: "rgba(100,160,220,0.28)", background: "rgba(255,255,255,0.84)", color: "#1a2f48" }}
					/>

					<button
						type="button"
						onClick={saveProfile}
						disabled={loading}
						className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
						style={{ background: "linear-gradient(135deg, #0284c7, #7c3aed)", boxShadow: "0 12px 24px rgba(2,132,199,0.18)" }}
					>
						{loading ? "Saving..." : "Save Profile"}
					</button>
				</div>
			</div>
		</div>
	);

}

export default CompleteProfile;