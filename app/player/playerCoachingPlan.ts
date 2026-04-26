import type { ReportRow } from "@/app/rugby-tagging/types";

export type PlayerCoachingPlan = {
  whatWentWell: string[];
  mainFocus: string;
  nextWeekTargets: string[];
};

function strongestArea(row: ReportRow) {
  const areas = [
    {
      label: "defensive accuracy",
      value: row.tacklePct,
      text: `Your tackle accuracy was ${row.tacklePct.toFixed(0)}%, which gives you a clear defensive base to build from.`,
    },
    {
      label: "carry output",
      value: row.carriesPerMin * 100,
      text: `You found ${row.carries} carries, so keep looking for chances to offer yourself in attack.`,
    },
    {
      label: "work rate",
      value: row.involvementsPerMin * 100,
      text: `You were involved ${row.involvements} times, which shows where your work rate is starting to show up.`,
    },
    {
      label: "breakdown impact",
      value: row.turnovers * 20,
      text: row.turnovers > 0
        ? `You won ${row.turnovers} turnover${row.turnovers === 1 ? "" : "s"}, which is valuable pressure for the team.`
        : "You stayed involved across the game and have room to add more breakdown impact next.",
    },
  ];

  return [...areas].sort((a, b) => b.value - a.value)[0];
}

export function buildPlayerCoachingPlan(row: ReportRow): PlayerCoachingPlan {
  const positives = [strongestArea(row).text];
  const targets: string[] = [];
  let mainFocus = "Keep building repeat involvement and make your next action quickly after each phase.";

  if (row.tacklePct < 80 || row.missed >= 3) {
    mainFocus = "Tackle accuracy is the priority. Aim to arrive balanced, close space early, and finish the contact.";
    targets.push(`Keep missed tackles to ${Math.max(row.missed - 1, 0)} or fewer next match.`);
    targets.push("Complete 10 minutes of tackle-footwork reps before team contact work.");
  } else {
    positives.push("Your tackle completion was in a useful range, so the next step is repeating that under fatigue.");
    targets.push("Hold tackle accuracy above 80% again next match.");
  }

  if (row.carriesPerMin < 0.12 || row.carries < 3) {
    if (mainFocus.includes("Tackle accuracy")) {
      targets.push("Add at least two purposeful support lines so you are available for more carries.");
    } else {
      mainFocus = "Add more attacking presence. Work earlier into support lines so the ball carrier has a clear option.";
      targets.push(`Target ${Math.max(row.carries + 2, 4)} carries next match.`);
      targets.push("Call for the ball once per attacking set when you are in shape.");
    }
  } else {
    positives.push("Your carry volume gives the attack something to work with.");
  }

  if (row.involvementsPerMin < 0.22) {
    targets.push("Lift your work-rate target to at least 0.22 involvements per minute.");
    if (!mainFocus.includes("Tackle accuracy") && !mainFocus.includes("attacking presence")) {
      mainFocus = "Increase repeat involvements. After each action, reload quickly and get back into the next phase.";
    }
  } else {
    positives.push("Your repeat involvement rate was competitive for your minutes.");
  }

  if (row.turnovers === 0) {
    targets.push("Look for one clear breakdown pressure moment: first support player, strong body shape, then contest or clean.");
  }

  return {
    whatWentWell: positives.slice(0, 3),
    mainFocus,
    nextWeekTargets: targets.slice(0, 4),
  };
}
