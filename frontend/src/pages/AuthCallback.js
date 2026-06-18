import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function AuthCallback() {
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const sid = params.get("session_id");
    if (!sid) { navigate("/login", { replace: true }); return; }
    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sid });
        window.history.replaceState({}, "", "/dashboard");
        navigate("/dashboard", { replace: true, state: { user: data.user } });
      } catch (e) {
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center text-slate-500">
      Menyelesaikan login...
    </div>
  );
}
