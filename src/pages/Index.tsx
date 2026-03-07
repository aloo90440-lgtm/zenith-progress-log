import { Navigate } from "react-router-dom";
import { loadJourney } from "@/lib/store";

export default function Index() {
  const journey = loadJourney();
  if (journey.goal) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/" replace />;
}
