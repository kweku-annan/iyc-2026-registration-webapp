import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../lib/adminAuth";
import { useCheckinLookup, useCheckinSearch, useCheckinConfirm, useWalkInRegistration } from "../lib/queries";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

export function CheckinPage() {
  const { user, csrfToken } = useAdminAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialCode = searchParams.get("code") || "";
  const [searchQuery, setSearchQuery] = useState(initialCode);
  const [debouncedQuery, setDebouncedQuery] = useState(initialCode);
  
  const [activeTab, setActiveTab] = useState<"search" | "walkin">("search");

  // Authentication check
  useEffect(() => {
    if (!user) {
      navigate(`/admin/login?next=/check-in${initialCode ? `?code=${initialCode}` : ""}`);
    }
  }, [user, navigate, initialCode]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Is it a ticket code? (Typically 8 chars alphanumeric)
  const isCode = debouncedQuery.length === 8 && /^[A-Z0-9]+$/i.test(debouncedQuery);

  const { data: lookupData, isLoading: isLookupLoading } = useCheckinLookup(csrfToken, isCode ? debouncedQuery.toUpperCase() : "");
  const { data: searchData, isLoading: isSearchLoading } = useCheckinSearch(csrfToken, !isCode && debouncedQuery.length >= 3 ? debouncedQuery : "");

  const confirmMutation = useCheckinConfirm(csrfToken || "");
  const walkInMutation = useWalkInRegistration(csrfToken || "");

  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinChurch, setWalkinChurch] = useState("");
  const [walkinAttended, setWalkinAttended] = useState(false);
  const [walkinError, setWalkinError] = useState("");

  const handleConfirm = async (code: string) => {
    try {
      await confirmMutation.mutateAsync(code);
      // Instead of invalidating everywhere, let's just update local state or re-fetch lookup by clearing/re-setting code
      alert("Check-in Confirmed!");
      setSearchParams({ code: "" });
      setSearchQuery("");
      setDebouncedQuery("");
    } catch (err: any) {
      alert(err.body?.detail || "Failed to confirm check-in.");
    }
  };

  const handleWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalkinError("");
    if (!walkinName || !walkinPhone || !walkinChurch) return;

    try {
      const res = await walkInMutation.mutateAsync({
        full_name: walkinName,
        phone: walkinPhone,
        church: walkinChurch,
        attended_before: walkinAttended
      });
      alert(`Walk-in registered and checked in successfully! Ticket: ${res.ticket_code}`);
      
      // Reset form
      setWalkinName("");
      setWalkinPhone("");
      setWalkinChurch("");
      setWalkinAttended(false);
      setActiveTab("search");
    } catch (err: any) {
      setWalkinError(err.body?.detail || "Failed to register walk-in.");
    }
  };

  if (!user) return null; // Wait for redirect

  const results = isCode && lookupData ? [lookupData] : searchData || [];

  return (
    <div className="min-h-screen bg-deep p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-serif text-ice mb-6 text-center">Event Door Management</h1>
        
        <div className="flex bg-white/5 p-1 rounded-xl mb-6">
          <button 
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${activeTab === 'search' ? 'bg-ice text-primary' : 'text-white hover:bg-white/10'}`}
            onClick={() => setActiveTab('search')}
          >
            Search & Scan
          </button>
          <button 
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${activeTab === 'walkin' ? 'bg-ice text-primary' : 'text-white hover:bg-white/10'}`}
            onClick={() => setActiveTab('walkin')}
          >
            Walk-in Registration
          </button>
        </div>

        {activeTab === 'search' && (
          <div className="space-y-6">
            <div>
              <input
                type="text"
                placeholder="Scan QR or type Name, Phone, Code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-4 text-white outline-none focus:border-ice text-lg placeholder:text-white/30"
                autoFocus
              />
              {debouncedQuery.length > 0 && debouncedQuery.length < 3 && !isCode && (
                <p className="text-white/50 text-sm mt-2">Type at least 3 characters...</p>
              )}
            </div>

            {(isLookupLoading || isSearchLoading) && (
              <div className="text-white/50 text-center py-8">Searching...</div>
            )}

            {!isLookupLoading && !isSearchLoading && debouncedQuery.length >= 3 && results.length === 0 && (
              <div className="text-center py-8 text-white/50 bg-white/5 rounded-xl border border-white/10">
                No attendee found for "{debouncedQuery}"
              </div>
            )}

            <div className="space-y-4">
              {results.map(reg => (
                <div key={reg.id} className="bg-white/10 border border-white/20 rounded-xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="text-white text-center md:text-left">
                    <h3 className="text-xl font-semibold text-ice">{reg.full_name}</h3>
                    <p className="text-white/70">{reg.church}</p>
                    <p className="text-white/50 text-sm">{reg.phone_e164} • Code: {reg.ticket_code}</p>
                    {reg.source === 'walk_in' && <span className="inline-block px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs mt-2">Walk-in</span>}
                  </div>
                  
                  <div>
                    {reg.checked_in_at ? (
                      <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg text-center">
                        <div className="font-bold">Already Checked In</div>
                        <div className="text-xs opacity-80">{new Date(reg.checked_in_at).toLocaleTimeString()}</div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConfirm(reg.ticket_code)}
                        disabled={confirmMutation.isPending}
                        className="w-full md:w-auto bg-ice text-primary font-bold px-8 py-3 rounded-lg hover:bg-ice/90 transition-transform active:scale-95 disabled:opacity-50"
                      >
                        {confirmMutation.isPending ? "Confirming..." : "Confirm Check-in"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'walkin' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
            <h2 className="text-2xl font-serif text-ice mb-6">Register Walk-in</h2>
            <form onSubmit={handleWalkIn} className="space-y-5 text-white">
              {walkinError && (
                <div className="p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg">
                  {walkinError}
                </div>
              )}
              
              <div>
                <label className="block text-white/70 text-sm mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={walkinName}
                  onChange={e => setWalkinName(e.target.value)}
                  className="w-full bg-deep border border-white/20 rounded-lg px-4 py-3 outline-none focus:border-ice"
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-1">Phone Number</label>
                <PhoneInput
                  international
                  defaultCountry="GH"
                  value={walkinPhone}
                  onChange={(val) => setWalkinPhone(val || "")}
                  className="w-full bg-deep border border-white/20 rounded-lg px-4 py-3 outline-none focus-within:border-ice"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-1">Church / Branch</label>
                <input
                  type="text"
                  required
                  value={walkinChurch}
                  onChange={e => setWalkinChurch(e.target.value)}
                  className="w-full bg-deep border border-white/20 rounded-lg px-4 py-3 outline-none focus:border-ice"
                  placeholder="e.g. Grace Temple"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="attended"
                  checked={walkinAttended}
                  onChange={e => setWalkinAttended(e.target.checked)}
                  className="w-5 h-5 accent-ice"
                />
                <label htmlFor="attended" className="text-white/80">Has attended IYC before?</label>
              </div>

              <button
                type="submit"
                disabled={walkInMutation.isPending}
                className="w-full bg-ice text-primary py-4 rounded-lg font-bold text-lg hover:bg-ice/90 transition-transform active:scale-95 disabled:opacity-50 mt-4"
              >
                {walkInMutation.isPending ? "Processing..." : "Register & Check In"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
