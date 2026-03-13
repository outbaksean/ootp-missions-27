export interface ShoppingScope {
  categories: string[];
  chainIds: number[];
  rewardCardIds: number[];
  missionIds: number[];
}

export interface ShoppingWizardConfig {
  scope: ShoppingScope;
  strategy: "completion" | "value" | "value-optimized";
  availablePP: number | null;
  completableOnly: boolean;
}

export function emptyScopeIsAll(scope: ShoppingScope): boolean {
  return (
    scope.categories.length === 0 &&
    scope.chainIds.length === 0 &&
    scope.rewardCardIds.length === 0 &&
    scope.missionIds.length === 0
  );
}

export function defaultWizardConfig(): ShoppingWizardConfig {
  return {
    scope: { categories: [], chainIds: [], rewardCardIds: [], missionIds: [] },
    strategy: "completion",
    availablePP: null,
    completableOnly: true,
  };
}
