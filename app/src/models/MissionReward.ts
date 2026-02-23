export type MissionReward =
  | { type: 'pack'; packType: string; count: number }
  | { type: 'card'; cardId: number; count?: number }
  | { type: 'other' }
