import type { UserMission } from "@/models/UserMission";

export interface ReportConfig {
  budget: number | null;
  objectives: string[];
  chainId: number | null;
}

export interface ObjectiveResult {
  key: string;
  label: string;
  description: string;
  missions: UserMission[];
  totalCost: number;
  totalReward: number;
  netGain: number;
  budgetSufficient: boolean;
  eligibleCount: number; // total eligible pool before budget filtering
}

function greedySelect(
  missions: UserMission[],
  budget: number | null,
): UserMission[] {
  if (budget === null) return missions;
  let running = 0;
  const selected: UserMission[] = [];
  for (const m of missions) {
    if (running + m.remainingPrice <= budget) {
      running += m.remainingPrice;
      selected.push(m);
    }
  }
  return selected;
}

function totalRewardOf(missions: UserMission[]): number {
  return missions.reduce((sum, m) => sum + (m.rewardValue ?? 0), 0);
}

function runNetValue(
  eligible: UserMission[],
  budget: number | null,
): ObjectiveResult {
  const pool = eligible
    .filter((m) => m.missionValue !== undefined)
    .sort((a, b) => (b.missionValue ?? 0) - (a.missionValue ?? 0));
  const selected = greedySelect(pool, budget);
  const totalCost = selected.reduce((s, m) => s + m.remainingPrice, 0);
  const totalReward = totalRewardOf(selected);
  return {
    key: "net-value",
    label: "Best Net Value",
    description: "Maximize PP gained after costs",
    missions: selected,
    totalCost,
    totalReward,
    netGain: totalReward - totalCost,
    budgetSufficient: budget === null || totalCost <= budget,
    eligibleCount: pool.length,
  };
}

function runMostMissions(
  eligible: UserMission[],
  budget: number | null,
): ObjectiveResult {
  const pool = [...eligible].sort(
    (a, b) => a.remainingPrice - b.remainingPrice,
  );
  const selected = greedySelect(pool, budget);
  const totalCost = selected.reduce((s, m) => s + m.remainingPrice, 0);
  const totalReward = totalRewardOf(selected);
  return {
    key: "most-missions",
    label: "Most Missions",
    description: "Complete as many missions as possible within budget",
    missions: selected,
    totalCost,
    totalReward,
    netGain: totalReward - totalCost,
    budgetSufficient: budget === null || totalCost <= budget,
    eligibleCount: pool.length,
  };
}

function runBestRoi(
  eligible: UserMission[],
  budget: number | null,
): ObjectiveResult {
  const pool = eligible
    .filter((m) => m.rewardValue !== undefined && m.remainingPrice > 0)
    .sort((a, b) => {
      const roiA = (a.rewardValue ?? 0) / a.remainingPrice;
      const roiB = (b.rewardValue ?? 0) / b.remainingPrice;
      return roiB - roiA;
    });
  const selected = greedySelect(pool, budget);
  const totalCost = selected.reduce((s, m) => s + m.remainingPrice, 0);
  const totalReward = totalRewardOf(selected);
  return {
    key: "best-roi",
    label: "Best ROI",
    description: "Best reward-to-cost ratio",
    missions: selected,
    totalCost,
    totalReward,
    netGain: totalReward - totalCost,
    budgetSufficient: budget === null || totalCost <= budget,
    eligibleCount: pool.length,
  };
}

function runCompleteChain(
  budget: number | null,
  chainId: number,
  allUserMissions: UserMission[],
): ObjectiveResult {
  const parent = allUserMissions.find((m) => m.id === chainId);
  if (!parent || parent.rawMission.type !== "missions") {
    return {
      key: "complete-chain",
      label: "Complete a Chain",
      description: "Finish all remaining missions in a specific chain",
      missions: [],
      totalCost: 0,
      totalReward: 0,
      netGain: 0,
      budgetSufficient: true,
      eligibleCount: 0,
    };
  }
  const subIds = new Set(parent.rawMission.missionIds ?? []);
  const incomplete = allUserMissions.filter(
    (m) => subIds.has(m.id) && !m.completed,
  );
  const totalCost = incomplete.reduce((s, m) => s + m.remainingPrice, 0);
  const totalReward = totalRewardOf(incomplete);
  return {
    key: "complete-chain",
    label: "Complete a Chain",
    description: `Finish all remaining missions in ${parent.rawMission.name}`,
    missions: incomplete,
    totalCost,
    totalReward,
    netGain: totalReward - totalCost,
    budgetSufficient: budget === null || totalCost <= budget,
    eligibleCount: incomplete.length,
  };
}

function runAffordableWins(
  eligible: UserMission[],
  budget: number | null,
): ObjectiveResult {
  const pool = eligible
    .filter((m) => m.missionValue !== undefined && m.missionValue > 0)
    .sort((a, b) => (b.missionValue ?? 0) - (a.missionValue ?? 0));
  const selected = greedySelect(pool, budget);
  const totalCost = selected.reduce((s, m) => s + m.remainingPrice, 0);
  const totalReward = totalRewardOf(selected);
  return {
    key: "affordable-wins",
    label: "All Affordable Wins",
    description: "Every positive-net mission in budget",
    missions: selected,
    totalCost,
    totalReward,
    netGain: totalReward - totalCost,
    budgetSufficient: budget === null || totalCost <= budget,
    eligibleCount: pool.length,
  };
}

export function runObjective(
  key: string,
  eligible: UserMission[],
  budget: number | null,
  chainId: number | null,
  allUserMissions: UserMission[],
): ObjectiveResult {
  switch (key) {
    case "net-value":
      return runNetValue(eligible, budget);
    case "most-missions":
      return runMostMissions(eligible, budget);
    case "best-roi":
      return runBestRoi(eligible, budget);
    case "complete-chain":
      return runCompleteChain(budget, chainId ?? 0, allUserMissions);
    case "affordable-wins":
      return runAffordableWins(eligible, budget);
    default:
      throw new Error(`Unknown objective: ${key}`);
  }
}
