import { useState } from "react";
import { useAdminAuth } from "../../lib/adminAuth";
import { useAdminTestimonials, useUpdateTestimonial } from "../../lib/queries";

export function AdminTestimonialsPage() {
  const { csrfToken } = useAdminAuth();
  const { data: testimonials = [], isLoading, refetch } = useAdminTestimonials();
  const updateMutation = useUpdateTestimonial(csrfToken!);

  const [processingId, setProcessingId] = useState<number | null>(null);

  const handleUpdate = async (id: number, payload: { status?: string; featured?: boolean }) => {
    setProcessingId(id);
    try {
      await updateMutation.mutateAsync({ id, payload });
      await refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl mb-2" style={{ color: "var(--color-ice)" }}>Testimonials</h1>
        <p className="font-sans text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          Review, approve, and feature testimonials. Featured ones appear on the homepage carousel.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
        <table className="w-full text-left font-sans text-sm" style={{ minWidth: 800 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)" }}>
              <th className="px-5 py-4 font-medium border-b border-white/10">Date</th>
              <th className="px-5 py-4 font-medium border-b border-white/10 w-1/3">Body</th>
              <th className="px-5 py-4 font-medium border-b border-white/10">Name / Mode</th>
              <th className="px-5 py-4 font-medium border-b border-white/10">Status</th>
              <th className="px-5 py-4 font-medium border-b border-white/10">Actions</th>
            </tr>
          </thead>
          <tbody style={{ color: "rgba(255,255,255,0.8)" }}>
            {testimonials.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
                  No testimonials found.
                </td>
              </tr>
            ) : (
              testimonials.map((t) => (
                <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-4 align-top whitespace-nowrap text-xs text-white/50">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <p className="line-clamp-3 text-sm leading-relaxed" title={t.body}>{t.body}</p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col gap-1">
                      {t.privacy_mode === "public" ? (
                        <span className="text-white">{t.display_name}</span>
                      ) : t.privacy_mode === "anonymous_name_private" ? (
                        <>
                          <span className="text-white">Private: {t.private_name}</span>
                          <span className="text-xs text-white/40">Alias: {t.alias_name}</span>
                        </>
                      ) : (
                        <span className="text-white/40">Alias: {t.alias_name}</span>
                      )}
                      <span className="text-[10px] uppercase tracking-wider text-white/30">{t.privacy_mode.replace(/_/g, " ")}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col gap-2 items-start">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        t.status === 'approved' ? 'bg-green-500/10 text-green-400' :
                        t.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                      {t.featured && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400">
                          FEATURED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      {t.status !== 'approved' && (
                        <button
                          onClick={() => handleUpdate(t.id, { status: "approved" })}
                          disabled={processingId === t.id}
                          className="px-3 py-1.5 rounded text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {t.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdate(t.id, { status: "rejected" })}
                          disabled={processingId === t.id}
                          className="px-3 py-1.5 rounded text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                      {t.status === 'approved' && (
                        <button
                          onClick={() => handleUpdate(t.id, { featured: !t.featured })}
                          disabled={processingId === t.id}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                            t.featured
                              ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                              : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          {t.featured ? "Unfeature" : "Feature"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
