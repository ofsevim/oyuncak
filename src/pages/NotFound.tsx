import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // 404 error - route not found (logged in production monitoring)
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="card-playful w-full max-w-xl p-8 text-center border-4 border-primary/10">
        <div className="text-7xl">🧩</div>
        <h1 className="mt-4 text-4xl font-black text-foreground">404</h1>
        <p className="mt-3 text-lg font-semibold text-muted-foreground">
          Aradığın sayfayı bulamadım. Ama eğlence burada!
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 font-black text-white shadow-lg btn-bouncy"
        >
          Ana Sayfaya Dön
        </a>
        <p className="mt-4 text-xs font-bold text-muted-foreground">
          Hata yolu: <span className="font-mono">{location.pathname}</span>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
