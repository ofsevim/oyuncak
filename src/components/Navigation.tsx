import { BookOpen, Gamepad2, Moon, Pencil, Sparkles, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { playNavSound } from "@/utils/soundEffects";
import { useTheme } from "@/contexts/ThemeContext";
type Tab = "home" | "draw" | "games" | "story";
const tabs = [
  { id: "home" as Tab, icon: Sparkles, label: "Keşfet" },
  { id: "games" as Tab, icon: Gamepad2, label: "Oyunlar" },
  { id: "draw" as Tab, icon: Pencil, label: "Çizim" },
  { id: "story" as Tab, icon: BookOpen, label: "Hikâyeler" },
];
export default function Navigation({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="garden-header">
      <Link to="/" className="garden-wordmark" aria-label="Oyuncak ana sayfa">
        oyuncak<span>✳</span>
      </Link>
      <nav className="garden-navigation" aria-label="Ana gezinme">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => {
              playNavSound();
              onTabChange(id);
            }}
            aria-current={activeTab === id ? "page" : undefined}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <button
        className="garden-theme"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}
