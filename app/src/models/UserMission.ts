import type { Mission } from "./Mission";
import type { MissionCard } from "./MissionCard";

export interface UserMission {
  id: number;
  rawMission: Mission;
  progressText: string;
  completed: boolean;
  isCompletable: boolean;
  missionCards: Array<MissionCard>;
  remainingPrice: number;
  unlockedCardsPrice: number;
  rewardValue?: number;
  combinedRewardValue?: number;
  missionValue?: number;
  sharedMissionCards?: Array<{ cardId: number; title: string; price: number }>;
  cardSharedSavings?: number;
}
