import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

			const response = await fetch("http://localhost:5000/api/auth/complete-profile", {
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
		<div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-100 via-amber-50 to-slate-200 px-4 py-10">
			<div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
				<h1 className="text-2xl font-bold text-slate-900">Complete Profile</h1>
				<p className="mt-2 text-sm text-slate-600">Add your details to activate your account.</p>

				{error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
				{successMessage ? (
					<p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>
				) : null}

				<div className="mt-5 space-y-4">
					<input
						placeholder="Full Name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
					/>

					<input
						placeholder="Phone (10 digits)"
						value={phone}
						maxLength="10"
						onChange={(event) => setPhone(event.target.value.replace(/[^0-9]/g, ""))}
						className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
					/>

					<textarea
						placeholder="Address"
						value={address}
						onChange={(event) => setAddress(event.target.value)}
						className="min-h-28 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
					/>

					<button
						type="button"
						onClick={saveProfile}
						disabled={loading}
						className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{loading ? "Saving..." : "Save Profile"}
					</button>
				</div>
			</div>
		</div>
	);

}

export default CompleteProfile;