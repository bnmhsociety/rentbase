import { dayKey } from "../lib/helpers";

function monthDays(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const days = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), d));
  return days;
}

function statusForDay(date, blocks) {
  if (!date) return "";
  const key = dayKey(date);
  let start = false;
  let end = false;
  let full = false;

  for (const block of blocks || []) {
    const s = dayKey(block.start_date);
    const e = dayKey(block.end_date);
    if (key === s && key === e) {
      full = true;
    } else if (key === s) {
      start = true;
    } else if (key === e) {
      end = true;
    } else if (key > s && key < e) {
      full = true;
    }
  }

  if (full) return "busy-full";
  if (start && end) return "busy-both";
  if (start) return "busy-start";
  if (end) return "busy-end";
  return "";
}

export default function AvailabilityCalendar({ blocks = [] }) {
  const now = new Date();
  const months = [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1)];
  const labels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="calendar">
      {months.map((month) => (
        <div key={month.toISOString()} className="card" style={{ boxShadow: "none" }}>
          <h3>
            {month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </h3>
          <div className="calendar-head">{labels.map((l) => <div key={l}>{l}</div>)}</div>
          <div className="calendar-grid">
            {monthDays(month).map((d, i) => (
              <div key={i} className={`day ${d ? statusForDay(d, blocks) : "empty"}`}>
                <span>{d ? d.getDate() : ""}</span>
              </div>
            ))}
          </div>
          <div className="legend">
            <span><i />Disponible</span>
            <span><i className="red" />Non disponible</span>
            <span>Les demi-cases indiquent un départ ou retour ce jour-là.</span>
          </div>
        </div>
      ))}
    </div>
  );
}
