import { useContext } from "react";
import { TripContext, type TripContextValue } from "../lib/trip-context";

export function useTrip(): TripContextValue {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip precisa estar dentro de TripProvider");
  return ctx;
}
