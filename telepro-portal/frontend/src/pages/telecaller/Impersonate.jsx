import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

const Impersonate = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (token) {
      // Save impersonation token to sessionStorage
      sessionStorage.setItem("impersonationToken", token);

      // We might also want to set a "role" and "user" in sessionStorage if Dashboard relies on them
      // But standard login uses localStorage. If components strictly use localStorage, they might fail.
      // Wait! DashboardLayout reads localStorage.getItem('role') and localStorage.getItem('user').
      // Let's decode the JWT to set user info in sessionStorage.
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);

        sessionStorage.setItem("impersonationRole", payload.role);
        sessionStorage.setItem("impersonationUser", JSON.stringify({
          id: payload.telecaller_id,
          username: payload.telecaller_name,
          role: payload.role,
          impersonated: payload.impersonated,
          impersonated_by_admin_name: payload.impersonated_by_admin_username
        }));
      } catch (e) {
        console.error("Failed to parse impersonation token", e);
      }

      // Remove token from URL and navigate
      navigate("/telecaller", { replace: true });
    } else {
      // If no token, fallback to standard route or error
      navigate("/", { replace: true });
    }
  }, [location, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0f172a]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Initializing Telecaller Session...</h2>
      </div>
    </div>
  );
};

export default Impersonate;
