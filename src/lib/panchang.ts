// Real Panchang calculation using the offline mhah-panchang library.
import { MhahPanchang } from "mhah-panchang";

export type City = { name: string; lat: number; lon: number; tz: number };

export const CITIES: City[] = [
  { name: "Delhi", lat: 28.6139, lon: 77.209, tz: 5.5 },
  { name: "Mumbai", lat: 19.076, lon: 72.8777, tz: 5.5 },
  { name: "Kolkata", lat: 22.5726, lon: 88.3639, tz: 5.5 },
  { name: "Chennai", lat: 13.0827, lon: 80.2707, tz: 5.5 },
  { name: "Bengaluru", lat: 12.9716, lon: 77.5946, tz: 5.5 },
  { name: "Hyderabad", lat: 17.385, lon: 78.4867, tz: 5.5 },
  { name: "Ahmedabad", lat: 23.0225, lon: 72.5714, tz: 5.5 },
  { name: "Pune", lat: 18.5204, lon: 73.8567, tz: 5.5 },
  { name: "Jaipur", lat: 26.9124, lon: 75.7873, tz: 5.5 },
  { name: "Lucknow", lat: 26.8467, lon: 80.9462, tz: 5.5 },
  { name: "Varanasi", lat: 25.3176, lon: 82.9739, tz: 5.5 },
  { name: "Haridwar", lat: 29.9457, lon: 78.1642, tz: 5.5 },
  { name: "Ujjain", lat: 23.1765, lon: 75.7885, tz: 5.5 },
  { name: "Tirupati", lat: 13.6288, lon: 79.4192, tz: 5.5 },
];

export type Panchang = {
  tithi: string; paksha: string; nakshatra: string; yoga: string; karana: string;
  sunrise: string; sunset: string; ritu: string;
  vikram: number; shaka: number;
};

const fmt = (d: Date | undefined) =>
  d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

export function computePanchang(date: Date, city: City): Panchang {
  const m = new MhahPanchang();
  // calendar() returns tithi/nakshatra/yoga/karana/masa/ritu/aadhmas
  const cal: any = m.calendar(date, city.lat, city.lon);
  // calculate() returns sun/moon timing details
  const calc: any = m.calculate(date, city.lat, city.lon);

  const tithiName = cal?.Tithi?.name_en_IN ?? cal?.Tithi?.name ?? "—";
  const tithiIno = Number(cal?.Tithi?.ino ?? 0);
  const paksha = tithiIno < 15 ? "Shukla Paksha" : "Krishna Paksha";

  return {
    tithi: tithiName,
    paksha,
    nakshatra: cal?.Nakshatra?.name_en_IN ?? cal?.Nakshatra?.name ?? "—",
    yoga: cal?.Yoga?.name_en_IN ?? cal?.Yoga?.name ?? "—",
    karana: cal?.Karna?.name_en_IN ?? cal?.Karna?.name ?? "—",
    sunrise: fmt(calc?.sunRise),
    sunset: fmt(calc?.sunSet),
    ritu: cal?.Ritu?.name_en_IN ?? cal?.Ritu?.name ?? "—",
    vikram: date.getFullYear() + 57,
    shaka: date.getFullYear() - 78,
  };
}
