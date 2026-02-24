export interface MissionCard {
  cardId: number;
  title: string;
  owned: boolean;
  locked: boolean;
  price: number;
  points?: number;
  highlighted: boolean;
  shouldLock: boolean;
}
