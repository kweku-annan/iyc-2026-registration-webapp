import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../lib/adminAuth";

export function CheckinRedirectPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAdminAuth();

  useEffect(() => {
    if (!user) {
      navigate(`/admin/login?next=/c/${code}`);
    } else {
      navigate(`/check-in?code=${code}`);
    }
  }, [user, navigate, code]);

  return (
    <div className="min-h-screen bg-deep flex items-center justify-center">
      <div className="text-white/50 text-lg">Redirecting...</div>
    </div>
  );
}
