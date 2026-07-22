import { useTheme } from "../hooks/useTheme";

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
    >
      <img
        src={dark ? "/icons_menu/sol.svg" : "/icons_menu/lua.svg"}
        alt=""
        className="theme-toggle-icon"
        aria-hidden="true"
      />
    </button>
  );
}
