import { useState } from "react";
import { useAdminAuth } from "../../lib/adminAuth";
import { useAdminUsers, useCreateUser, useUpdateUser, useDeleteUser } from "../../lib/queries";
import { useQueryClient } from "@tanstack/react-query";

export function AdminUsersPage() {
  const { csrfToken } = useAdminAuth();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useAdminUsers(csrfToken);
  
  const createMutation = useCreateUser(csrfToken || "");
  const updateMutation = useUpdateUser(csrfToken || "");
  const deleteMutation = useDeleteUser(csrfToken || "");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("volunteer");
  const [errorMsg, setErrorMsg] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email || !password) return;

    try {
      await createMutation.mutateAsync({ email, password, role });
      setEmail("");
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      setErrorMsg(err.body?.detail || "Failed to create user.");
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, payload: { is_active: !currentStatus } });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      alert(err.body?.detail || "Failed to update status.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user? If they have checked in attendees, you should deactivate them instead.")) return;
    try {
      await deleteMutation.mutateAsync(id);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      alert(err.body?.detail || "Failed to delete user.");
    }
  };

  if (isLoading) return <div className="p-8 text-white/50">Loading users...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto text-white">
      <h1 className="text-3xl font-serif text-ice mb-8">Staff Users</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-ice">Add User</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {errorMsg && <div className="p-3 text-sm text-red-200 bg-red-500/20 rounded-lg">{errorMsg}</div>}
              <div>
                <label className="block text-sm text-white/70 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-deep border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-ice"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-deep border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-ice"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-deep border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-ice"
                >
                  <option value="volunteer">Volunteer (Check-in only)</option>
                  <option value="organizer">Organizer (Full access)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full bg-ice text-primary py-2 rounded-lg font-semibold hover:bg-ice/90 disabled:opacity-50"
              >
                {createMutation.isPending ? "Adding..." : "Add User"}
              </button>
            </form>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/10">
                <tr>
                  <th className="p-4 font-semibold text-white/70">Email</th>
                  <th className="p-4 font-semibold text-white/70">Role</th>
                  <th className="p-4 font-semibold text-white/70">Status</th>
                  <th className="p-4 font-semibold text-white/70">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {users?.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5">
                    <td className="p-4 font-medium">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${u.role === 'organizer' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${u.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="p-4 flex gap-2">
                      <button
                        onClick={() => handleToggleActive(u.id, u.is_active)}
                        className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded text-xs transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
