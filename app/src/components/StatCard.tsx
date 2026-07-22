import { useCounter } from "../hooks/useCounter";

interface Props {
  icon: string;
  target: number;
  prefix?: string;
  label: string;
}

export function StatCard({ icon, target, prefix = "", label }: Props) {
  const { value, ref } = useCounter(target);

  return (
    <div className="stat-card" ref={ref}>
      <div className="stat-icon">
        <img src={icon} alt="" aria-hidden="true" className="stat-icon-img" />
      </div>
      <div className="stat-num">
        {prefix && <span>{prefix} </span>}
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
