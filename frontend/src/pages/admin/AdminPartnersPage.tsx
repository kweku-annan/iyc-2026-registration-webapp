import { useState } from "react";
import { useAdminAuth } from "../../lib/adminAuth";
import { useAdminPartners, useCreatePartner, useUpdatePartner, useDeletePartner, type PartnerCreate } from "../../lib/queries";

export function AdminPartnersPage() {
  const { csrfToken } = useAdminAuth();
  const { data: partners, isLoading } = useAdminPartners();
  
  const createMutation = useCreatePartner(csrfToken);
  const updateMutation = useUpdatePartner(csrfToken);
  const deleteMutation = useDeletePartner(csrfToken);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<PartnerCreate>({
    name: "",
    logo_url: "",
    website_url: "",
    location: "",
    sort_order: 0,
    is_active: true,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, payload: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setFormData({ name: "", logo_url: "", website_url: "", location: "", sort_order: 0, is_active: true });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (p: any) => {
    setFormData({
      name: p.name,
      logo_url: p.logo_url,
      website_url: p.website_url ?? "",
      location: p.location ?? "",
      sort_order: p.sort_order,
      is_active: p.is_active,
    });
    setEditingId(p.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this partner?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  if (isLoading) return <div className="p-8 text-white/50">Loading partners...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto text-white">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-serif text-ice">Partners</h1>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-ice text-primary font-bold rounded-lg hover:scale-105 transition-transform"
          >
            + Add Partner
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="bg-white/5 border border-ice/20 p-6 rounded-2xl mb-8 space-y-4">
          <h2 className="text-xl font-bold mb-4">{editingId ? "Edit Partner" : "Add Partner"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Name</label>
              <input 
                required
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Logo URL (external link)</label>
              <input 
                required
                type="text" 
                value={formData.logo_url} 
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Website URL (optional)</label>
              <input 
                type="text" 
                value={formData.website_url ?? ""} 
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Location (optional)</label>
              <input 
                type="text" 
                value={formData.location ?? ""} 
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Sort Order</label>
              <input 
                type="number" 
                value={formData.sort_order} 
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2"
              />
            </div>
            <div className="flex items-center mt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 accent-ice"
                />
                <span>Active (visible on site)</span>
              </label>
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <button type="submit" className="px-6 py-2 bg-ice text-primary font-bold rounded-lg" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
                setFormData({ name: "", logo_url: "", website_url: "", location: "", sort_order: 0, is_active: true });
              }}
              className="px-6 py-2 border border-white/30 rounded-lg hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/10">
            <tr>
              <th className="p-4 font-semibold text-white/70">Logo</th>
              <th className="p-4 font-semibold text-white/70">Name</th>
              <th className="p-4 font-semibold text-white/70">Location</th>
              <th className="p-4 font-semibold text-white/70">Sort</th>
              <th className="p-4 font-semibold text-white/70">Status</th>
              <th className="p-4 font-semibold text-white/70">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {partners?.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-white/50">No partners found.</td>
              </tr>
            )}
            {partners?.map((p) => (
              <tr key={p.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4">
                  {p.logo_url && (
                    <img src={p.logo_url} alt={p.name} className="h-10 w-auto object-contain bg-white/10 rounded p-1" />
                  )}
                </td>
                <td className="p-4">
                  <div className="font-bold">{p.name}</div>
                  {p.website_url && <a href={p.website_url} target="_blank" rel="noreferrer" className="text-xs text-ice hover:underline">{p.website_url}</a>}
                </td>
                <td className="p-4 text-white/70">{p.location || "-"}</td>
                <td className="p-4">{p.sort_order}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${p.is_active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                    {p.is_active ? "Active" : "Hidden"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-3">
                    <button onClick={() => handleEdit(p)} className="text-sm text-ice hover:underline">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-sm text-red-400 hover:underline">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
