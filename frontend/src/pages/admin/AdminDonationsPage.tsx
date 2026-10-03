import { useAdminAuth } from "../../lib/adminAuth";
import { useAdminDonations } from "../../lib/queries";

export function AdminDonationsPage() {
  const { csrfToken } = useAdminAuth();
  const { data: donations, isLoading } = useAdminDonations(csrfToken);

  if (isLoading) return <div className="p-8 text-white/50">Loading donations...</div>;

  const totalRaised = donations
    ?.filter((d) => d.status === "success")
    .reduce((sum, d) => sum + d.amount_minor, 0) || 0;

  return (
    <div className="p-8 max-w-5xl mx-auto text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h1 className="text-3xl font-serif text-ice">Donations</h1>
        
        <div className="bg-white/5 border border-ice/30 px-6 py-4 rounded-xl flex items-center gap-4">
          <div className="text-white/60">Total Raised:</div>
          <div className="text-3xl font-bold text-ice">
            ₵{(totalRaised / 100).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/10">
            <tr>
              <th className="p-4 font-semibold text-white/70">Date</th>
              <th className="p-4 font-semibold text-white/70">Reference</th>
              <th className="p-4 font-semibold text-white/70">Donor</th>
              <th className="p-4 font-semibold text-white/70">Amount</th>
              <th className="p-4 font-semibold text-white/70">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-sm">
            {donations?.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-white/50">No donations yet.</td>
              </tr>
            )}
            {donations?.map((d) => (
              <tr key={d.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 text-white/70">
                  {new Date(d.created_at).toLocaleDateString()} <br/>
                  <span className="text-xs">{new Date(d.created_at).toLocaleTimeString()}</span>
                </td>
                <td className="p-4 font-mono text-xs text-white/50">{d.reference}</td>
                <td className="p-4">
                  {d.is_anonymous ? (
                    <span className="italic text-white/50">Anonymous</span>
                  ) : (
                    <div>
                      <div className="font-bold">{d.donor_name || "Unknown"}</div>
                      <div className="text-xs text-white/50">{d.donor_email}</div>
                    </div>
                  )}
                </td>
                <td className="p-4 font-bold">₵{(d.amount_minor / 100).toFixed(2)}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    d.status === "success" ? "bg-green-500/20 text-green-300" :
                    d.status === "pending" ? "bg-yellow-500/20 text-yellow-300" :
                    "bg-red-500/20 text-red-300"
                  }`}>
                    {d.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
