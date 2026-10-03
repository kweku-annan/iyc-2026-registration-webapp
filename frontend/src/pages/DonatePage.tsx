import { useState } from "react";
import { Link } from "react-router-dom";
import { useInitializeDonation } from "../lib/queries";
import { Layout } from "../components";

export function DonatePage() {
  const initMutation = useInitializeDonation();
  const [amount, setAmount] = useState<string>("50");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg("Please enter a valid amount.");
      return;
    }

    try {
      const res = await initMutation.mutateAsync({
        amount_minor: Math.round(amountNum * 100), // convert to pesewas
        is_anonymous: isAnonymous,
        donor_name: isAnonymous ? null : name,
        donor_email: isAnonymous ? null : email,
      });

      if (res.authorization_url) {
        window.location.href = res.authorization_url;
      } else {
        setErrorMsg("Failed to initialize payment gateway.");
      }
    } catch (err: any) {
      setErrorMsg(err.body?.detail || "An error occurred while setting up your donation.");
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex flex-col bg-deep font-sans text-white">
        <main className="flex-1 flex items-center justify-center p-6 mt-16">
          <div className="w-full max-w-lg">
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-sans text-sm mb-8 transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              ← Back to home
            </Link>

            <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-serif text-ice mb-4">Support the Camp</h1>
            <p className="text-white/70">
              Your freewill donations help us keep IYC 2026 free for everyone.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white/5 border border-ice/20 p-8 rounded-2xl shadow-xl backdrop-blur-sm space-y-6">
            {errorMsg && (
              <div className="p-4 rounded-lg bg-red-500/20 text-red-200 border border-red-500/30 text-sm">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Amount (GHS)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">₵</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-ice focus:ring-1 focus:ring-ice transition-all"
                  placeholder="50.00"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative flex cursor-pointer items-center rounded-full">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-white/30 checked:border-ice checked:bg-ice transition-all"
                />
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-deep opacity-0 peer-checked:opacity-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </label>
              <span className="text-sm text-white/80">Donate anonymously</span>
            </div>

            {!isAnonymous && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isAnonymous}
                    className="w-full bg-white/5 border border-white/20 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-ice focus:ring-1 focus:ring-ice transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={!isAnonymous}
                    className="w-full bg-white/5 border border-white/20 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-ice focus:ring-1 focus:ring-ice transition-all"
                    placeholder="john@example.com"
                  />
                  <p className="text-xs text-white/50 mt-1">We need your email to send you a receipt.</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={initMutation.isPending}
              className="w-full py-4 rounded-xl bg-ice text-primary font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none"
            >
              {initMutation.isPending ? "Initializing..." : "Proceed to Pay"}
            </button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            Payments are securely processed by Paystack.
          </p>
        </div>
        </main>
      </div>
    </Layout>
  );
}
