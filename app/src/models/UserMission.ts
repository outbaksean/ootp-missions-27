import type { Mission } from './Mission'
import type { MissionCard } from './MissionCard'

export interface UserMission {
  id: number
  rawMission: Mission
  progressText: string
  completed: boolean
  missionCards: Array<MissionCard>
  remainingPrice: number
  unlockedCardsPrice: number
  rewardValue?: number
  missionValue?: number
}
