import type { MissionReward } from './MissionReward'

export interface Mission {
  id: number
  name: string
  type: 'count' | 'points' | 'missions'
  requiredCount: number
  totalPoints?: number
  cards: Array<{ cardId: number; points?: number }>
  missionIds?: Array<number>
  reward: string
  rewards?: MissionReward[]
  category: string
}
