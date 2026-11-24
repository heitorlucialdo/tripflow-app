import { useTheme } from "../hooks/useTheme";
import { Icon } from "./Icon";

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
    >
      <span className="theme-toggle-icon" key={dark ? "sun" : "moon"}>
        <Icon name={dark ? "sun" : "moon"} size={19} />
      </span>
    </button>
  );
}
