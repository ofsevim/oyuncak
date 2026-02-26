import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Eski cihazlarda loading spinner'ı kaldır
const loader = document.getElementById("app-loader");
if (loader) loader.remove();

createRoot(document.getElementById("root")!).render(<App />);
