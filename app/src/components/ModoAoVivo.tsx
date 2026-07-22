import { useEffect, useRef, useState } from "react";
import { DAYS } from "../data";

const COORDS: Record<string, { lat: number; lng: number; emoji: string; duracaoMin: number }> = {
  "Copacabana Blue Hotel":   { lat: -22.9665, lng: -43.1844, emoji: "🏨", duracaoMin: 30 },
  "Pizzaria Oggi":           { lat: -22.9862, lng: -43.2176, emoji: "🍕", duracaoMin: 60 },
  "Caminhada em Copacabana": { lat: -22.9711, lng: -43.1823, emoji: "🏖️", duracaoMin: 90 },
  "Mureta da Urca":          { lat: -22.9503, lng: -43.1664, emoji: "🍺", duracaoMin: 90 },
  "Parque Lage":             { lat: -22.9625, lng: -43.2108, emoji: "🌿", duracaoMin: 60 },
  "Jardim Botânico":         { lat: -22.9667, lng: -43.2228, emoji: "🌺", duracaoMin: 90 },
  "Ipanema e Leblon":        { lat: -22.9868, lng: -43.2029, emoji: "🏄", duracaoMin: 120 },
  "Pôr do sol no Arpoador":  { lat: -22.9888, lng: -43.1916, emoji: "🌅", duracaoMin: 60 },
  "Baixo Botafogo":          { lat: -22.9448, lng: -43.1861, emoji: "🍻", duracaoMin: 120 },
  "SAARA":                   { lat: -22.9048, lng: -43.1817, emoji: "🛍️", duracaoMin: 90 },
  "Escadaria Selarón":       { lat: -22.9143, lng: -43.1795, emoji: "🎨", duracaoMin: 30 },
  "Arcos da Lapa":           { lat: -22.9123, lng: -43.1797, emoji: "🏛️", duracaoMin: 30 },
  "Museu do Amanhã":         { lat: -22.8944, lng: -43.1803, emoji: "🔭", duracaoMin: 90 },
  "AquaRio":                 { lat: -22.8958, lng: -43.1872, emoji: "🐠", duracaoMin: 120 },
  "Bosque Bar":              { lat: -22.9741, lng: -43.2303, emoji: "🌳", duracaoMin: 120 },
  "Stand Up Paddle":         { lat: -22.9669, lng: -43.1778, emoji: "🏄", duracaoMin: 90 },
  "Forte Duque de Caxias":   { lat: -22.9591, lng: -43.1710, emoji: "🏰", duracaoMin: 60 },
  "Sunset Morro da Urca":    { lat: -22.9487, lng: -43.1614, emoji: "🌄", duracaoMin: 90 },
  "Bar Urca":                { lat: -22.9472, lng: -43.1659, emoji: "🍹", duracaoMin: 90 },
  "Rio Scenarium":           { lat: -22.9082, lng: -43.1804, emoji: "🎶", duracaoMin: 180 },
  "Feira da Glória":         { lat: -22.9261, lng: -43.1767, emoji: "🎪", duracaoMin: 120 },
  "Aterro do Flamengo":      { lat: -22.9342, lng: -43.1726, emoji: "🚴", duracaoMin: 90 },
};

// Trip dates (day index 0 = Sábado 16/02/2026)
const TRIP_START = new Date("2026-02-16T00:00:00-03:00");

function getTripDay(): number {
  const diffMs = Date.now() - TRIP_START.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  return diffDays; // 0=Sáb, 1=Ter(dia1), 2=Qua, 3=Qui, 4=Sex, 5=Sáb, 6=Dom
}

async function fetchTravelMin(
  fromLat: number, fromLng: number,
  toLat: number,   toLng: number
): Promise<number> {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const secs = data?.routes?.[0]?.duration ?? 0;
    return Math.ceil(secs / 60);
  } catch {
    // Fallback: estimate by straight-line ~30km/h urban
    const R = 6371;
    const dLat = ((toLat - fromLat) * Math.PI) / 180;
    const dLng = ((toLng - fromLng) * Math.PI) / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(fromLat*Math.PI/180)*Math.cos(toLat*Math.PI/180)*Math.sin(dLng/2)**2;
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.ceil((km / 30) * 60);
  }
}

function addMinutes(date: Date, min: number): Date {
  return new Date(date.getTime() + min * 60_000);
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

interface PlaceSchedule {
  name: string;
  emoji: string;
  chegada: Date;
  saida: Date;
  travelMin: number;
  duracaoMin: number;
}

const KEY_ACTIVE = "rj2025-live-mode";
const KEY_START  = "rj2025-live-start";

export function ModoAoVivo() {
  const [active, setActive]       = useState(() => localStorage.getItem(KEY_ACTIVE) === "1");
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState<string | null>(null);
  const [schedule, setSchedule]   = useState<PlaceSchedule[]>([]);
  const [startTime, setStartTime] = useState<string>(() => localStorage.getItem(KEY_START) ?? "09:00");
  const [demoDay, setDemoDay]     = useState(1); // usado fora da viagem
  const calcRef = useRef(false);

  const durantViagem = (() => {
    const d = getTripDay();
    return d >= 0 && d <= 6;
  })();

  const dayIndex = durantViagem ? getTripDay() : demoDay;
  // map trip day index → DAYS index
  // DAYS: 0=dia0(sáb16), 1=dia1(ter17)...
  const dayData = DAYS[dayIndex] ?? DAYS[1];
  const places = dayData.places.filter(p => COORDS[p]);

  async function calcular(lat: number, lng: number) {
    if (calcRef.current) return;
    calcRef.current = true;
    setLoading(true);
    setErro(null);

    try {
      const [h, m] = startTime.split(":").map(Number);
      const base = new Date();
      base.setHours(h, m, 0, 0);

      const result: PlaceSchedule[] = [];
      let curLat = lat, curLng = lng;
      let curTime = base;

      for (const name of places) {
        const info = COORDS[name];
        const travelMin = await fetchTravelMin(curLat, curLng, info.lat, info.lng);
        const chegada = addMinutes(curTime, travelMin);
        const saida   = addMinutes(chegada, info.duracaoMin);

        result.push({ name, emoji: info.emoji, chegada, saida, travelMin, duracaoMin: info.duracaoMin });
        curLat  = info.lat;
        curLng  = info.lng;
        curTime = saida;
      }

      setSchedule(result);
    } catch {
      setErro("Erro ao calcular rotas. Tente novamente.");
    } finally {
      setLoading(false);
      calcRef.current = false;
    }
  }

  function ativar() {
    localStorage.setItem(KEY_ACTIVE, "1");
    localStorage.setItem(KEY_START, startTime);
    setActive(true);
    setSchedule([]);
    setErro(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => calcular(pos.coords.latitude, pos.coords.longitude),
      () => setErro("Não foi possível obter sua localização. Verifique as permissões do navegador.")
    );
  }

  function desativar() {
    localStorage.removeItem(KEY_ACTIVE);
    setActive(false);
    setSchedule([]);
    setErro(null);
  }

  // Se já estava ativo e recarregou a página, recalcular
  useEffect(() => {
    if (active && schedule.length === 0 && !loading) {
      navigator.geolocation.getCurrentPosition(
        (pos) => calcular(pos.coords.latitude, pos.coords.longitude),
        () => setErro("Localização indisponível.")
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const terminoEstimado = schedule.length > 0 ? schedule[schedule.length - 1].saida : null;
  const agora = new Date();
  const proximoIdx = schedule.findIndex(p => p.chegada > agora);
  const currentIdx = schedule.findIndex(p => p.chegada <= agora && p.saida > agora);

  return (
    <section className="live-section">
      <div className="live-header">
        <div>
          <h2 className="live-title">Modo ao Vivo</h2>
          <p className="live-desc">Calcula seu roteiro do dia com base na sua localização atual</p>
        </div>
      </div>

      {!active ? (
        <div className="live-setup">
          {!durantViagem && (
            <div className="live-demo-bar">
              <span>Modo demonstração — Dia:</span>
              <select
                className="live-day-select"
                value={demoDay}
                onChange={e => { setDemoDay(+e.target.value); setSchedule([]); }}
              >
                {DAYS.filter(d => d.places.length > 0).map(d => (
                  <option key={d.num} value={+d.num}>{d.weekday} {d.date} — {d.title}</option>
                ))}
              </select>
            </div>
          )}

          <label className="live-label">
            Que horas você vai sair?
            <input
              type="time"
              className="live-time-input"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
            />
          </label>

          <button className="live-btn-ativar" onClick={ativar}>
            Ativar Modo ao Vivo
          </button>
          <p className="live-hint">Vai pedir permissão de localização</p>
        </div>
      ) : (
        <div className="live-active">
          <div className="live-status-bar">
            <span className="live-dot" />
            <span>{durantViagem ? `${dayData.weekday} ${dayData.date} — ${dayData.title}` : `Demo: ${dayData.weekday} ${dayData.date}`}</span>
            <button className="live-btn-off" onClick={desativar}>✕ Desativar</button>
          </div>

          {loading && (
            <div className="live-loading">
              <span className="live-spinner" />
              Calculando rotas...
            </div>
          )}

          {erro && <p className="live-erro">{erro}</p>}

          {schedule.length > 0 && (
            <>
              <div className="live-timeline">
                {schedule.map((p, i) => {
                  const isCurrent = i === currentIdx;
                  const isNext    = i === proximoIdx;
                  const passou    = p.saida < agora;
                  return (
                    <div
                      key={p.name}
                      className={`live-item ${isCurrent ? "live-item--current" : ""} ${isNext ? "live-item--next" : ""} ${passou ? "live-item--past" : ""}`}
                    >
                      <div className="live-item-time">
                        <span className="live-chegada">{fmtTime(p.chegada)}</span>
                        <span className="live-saida">{fmtTime(p.saida)}</span>
                      </div>
                      <div className="live-item-dot-col">
                        <div className="live-item-dot">{p.emoji}</div>
                        {i < schedule.length - 1 && <div className="live-item-line" />}
                      </div>
                      <div className="live-item-info">
                        <span className="live-item-name">{p.name}</span>
                        <span className="live-item-meta">
                          {p.travelMin}min de deslocamento · {p.duracaoMin}min no local
                        </span>
                        {isCurrent && <span className="live-badge-now">Você está aqui agora!</span>}
                        {isNext    && <span className="live-badge-next">Próximo destino</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {terminoEstimado && (
                <div className="live-fim">
                  🏁 Previsão de término do dia: <strong>{fmtTime(terminoEstimado)}</strong>
                </div>
              )}

              <button
                className="live-btn-recalc"
                onClick={() => {
                  setSchedule([]);
                  calcRef.current = false;
                  navigator.geolocation.getCurrentPosition(
                    pos => calcular(pos.coords.latitude, pos.coords.longitude),
                    () => setErro("Localização indisponível.")
                  );
                }}
              >
                🔄 Recalcular com localização atual
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
