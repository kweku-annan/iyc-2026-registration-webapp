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

  const [walkinFirstName, setWalkinFirstName] = useState("");
  const [walkinLastName, setWalkinLastName] = useState("");
  const [walkinOtherNames, setWalkinOtherNames] = useState("");
  const [walkinDob, setWalkinDob] = useState("");
  const [walkinProfession, setWalkinProfession] = useState("");
  const [walkinStudent, setWalkinStudent] = useState(false);
  const [walkinSchool, setWalkinSchool] = useState("");
  const [walkinInvited, setWalkinInvited] = useState(false);
  const [walkinInvitedBy, setWalkinInvitedBy] = useState("");
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
    if (!walkinFirstName || !walkinLastName || !walkinDob || !walkinProfession || !walkinPhone || !walkinChurch) return;

    try {
      const res = await walkInMutation.mutateAsync({
        first_name: walkinFirstName,
        last_name: walkinLastName,
        other_names: walkinOtherNames || null,
        date_of_birth: walkinDob,
        profession: walkinProfession,
        student_status: walkinStudent,
        school_name: walkinSchool || null,
        invitation_by_someone: walkinInvited,
        invitation_by_who: walkinInvitedBy || null,
        phone: walkinPhone,
        church: walkinChurch,
        attended_before: walkinAttended
      });
      alert(`Walk-in registered and checked in successfully! Ticket: ${res.ticket_code}`);
      
      // Reset form
      setWalkinFirstName("");
      setWalkinLastName("");
      setWalkinOtherNames("");
      setWalkinDob("");
      setWalkinProfession("");
      setWalkinStudent(false);
      setWalkinSchool("");
      setWalkinInvited(false);
      setWalkinInvitedBy("");
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
                    <h3 className="text-xl font-semibold text-ice">{[reg.first_name, reg.other_names, reg.last_name].filter(Boolean).join(" ")}</h3>
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
                <label className="block text-white/70 text-sm mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={walkinFirstName}
                  onChange={e => setWalkinFirstName(e.target.value)}
                  className="w-full bg-deep border border-white/20 rounded-lg px-4 py-3 outline-none focus:border-ice"
                  placeholder="Jane"
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-1">Last Name</label>
                <input type="text" required value={walkinLastName} onChange={e => setWalkinLastName(e.target.value)} className="w-full bg-deep border border-white/20 rounded-lg px-4 py-3 outline-none focus:border-ice" placeholder="Doe" />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-1">Other Names</label>
                <input type="text" value={walkinOtherNames} onChange={e => setWalkinOtherNames(e.target.value)} className="w-full bg-deep border border-white/20 rounded-lg px-4 py-3 outline-none focus:border-ice" />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-1">Date of Birth</label>
                <input type="date" required value={walkinDob} onChange={e => setWalkinDob(e.target.value)} className="w-full bg-deep border border-white/20 rounded-lg px-4 py-3 outline-none focus:border-ice" />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-1">Profession</label>
                <input type="text" required value={walkinProfession} onChange={e => setWalkinProfession(e.target.value)} className="w-full bg-deep border border-white/20 rounded-lg px-4 py-3 outline-none focus:border-ice" />
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

              <div className="flex items-center gap-3">
                <input type="checkbox" checked={walkinStudent} onChange={e => setWalkinStudent(e.target.checked)} className="w-5 h-5 accent-ice" />
                <label className="text-white/80">Is a student?</label>
              </div>
              {walkinStudent && <input type="text" value={walkinSchool} onChange={e => setWalkinSchool(e.target.value)} placeholder="School name" className="w-full bg-deep border border-white/20 rounded-lg px-4 py-3 outline-none focus:border-ice" />}
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={walkinInvited} onChange={e => setWalkinInvited(e.target.checked)} className="w-5 h-5 accent-ice" />
                <label className="text-white/80">Was invited by someone?</label>
              </div>
              {walkinInvited && <input type="text" value={walkinInvitedBy} onChange={e => setWalkinInvitedBy(e.target.value)} placeholder="Invited by (name)" className="w-full bg-deep border border-white/20 rounded-lg px-4 py-3 outline-none focus:border-ice" />}

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
