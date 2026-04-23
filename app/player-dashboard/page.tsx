import { redirect } from "next/navigation";

export default function PlayerDashboardRedirect() {
  redirect("/coach/players");
}
