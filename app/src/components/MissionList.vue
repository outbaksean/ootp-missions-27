<template>
  <div class="mission-list">
    <template v-for="group in groups" :key="group.label || '__none__'">
      <div
        v-if="group.label"
        class="group-header"
        @click="toggleGroup(group.label)"
      >
        <span class="group-chevron">{{
          collapsed.has(group.label) ? "▶" : "▼"
        }}</span>
        <span class="group-label">{{ group.label }}</span>
        <span class="group-meta">{{ group.missions.length }} missions</span>
        <div v-if="!groupHasUncalculated(group.missions)" class="group-stats">
          <div
            v-if="groupRemainingTotal(group.missions)"
            class="group-stat-row"
          >
            <span class="group-stat-label">Cost</span>
            <span class="group-stat-value">{{
              groupRemainingTotal(group.missions)
            }}</span>
          </div>
          <div v-if="groupUnlockedTotal(group.missions)" class="group-stat-row">
            <span class="group-stat-label">Unlocked</span>
            <span class="group-stat-value">{{
              groupUnlockedTotal(group.missions)
            }}</span>
          </div>
          <div v-if="groupRewardText(group.missions)" class="group-stat-row">
            <span class="group-stat-label">Reward</span>
            <span class="group-stat-value">{{
              groupRewardText(group.missions)
            }}</span>
          </div>
          <div v-if="groupValueText(group.missions)" class="group-stat-row">
            <span class="group-stat-label">Net</span>
            <span
              class="group-stat-value"
              :class="
                groupValueIsPositive(group.missions)
                  ? 'group-value--pos'
                  : 'group-value--neg'
              "
              >{{ groupValueText(group.missions) }}</span
            >
          </div>
        </div>
        <button
          v-if="groupHasUncalculated(group.missions)"
          class="group-calculate-btn"
          @click.stop="
            $emit(
              'calculateGroup',
              group.missions
                .filter(
                  (m) => !m.completed && m.progressText === 'Not Calculated',
                )
                .map((m) => m.id),
            )
          "
        >
          Calculate
        </button>
        <div
          v-if="
            groupRemainingRewardItems(group.missions).length ||
            groupCompletedRewardItems(group.missions).length
          "
          class="group-rewards-bar"
        >
          <template v-if="groupRemainingRewardItems(group.missions).length">
            <span
              v-if="groupCompletedRewardItems(group.missions).length"
              class="group-rewards-section-label"
              >Remaining</span
            >
            <span
              v-for="item in groupRemainingRewardItems(group.missions)"
              :key="'remaining-' + item.label"
              class="group-reward-chip"
              :class="chipClass(item)"
              >{{ item.count > 1 ? item.count + "x " : "" }}{{ item.label }}</span
            >
          </template>
          <template v-if="groupCompletedRewardItems(group.missions).length">
            <span class="group-rewards-section-label">Done</span>
            <span
              v-for="item in groupCompletedRewardItems(group.missions)"
              :key="'done-' + item.label"
              class="group-reward-chip group-reward-chip--done"
              :class="chipClass(item)"
              >{{ item.count > 1 ? item.count + "x " : "" }}{{ item.label }}</span
            >
          </template>
        </div>
      </div>

      <template v-if="!group.label || !collapsed.has(group.label)">
        <div
          v-for="mission in group.missions"
          :key="mission.id"
          :ref="(el) => setMissionRef(mission.id, el)"
          class="mission-card"
          :class="{
            'mission-card--complete': isMissionComplete(mission),
            'mission-card--selected':
              selectedMission && selectedMission.id === mission.id,
          }"
        >
          <!-- Name + status badge -->
          <div class="card-header">
            <strong class="card-name">{{ mission.rawMission.name }}</strong>
            <span v-if="isMissionComplete(mission)" class="badge badge-done"
              >✓ Done</span
            >
            <span
              v-else-if="mission.progressText === 'Not Calculated'"
              class="badge badge-pending"
            >
              —
            </span>
          </div>

          <!-- Reward -->
          <div class="card-reward">
            <span
              v-for="item in collectRewardItems([mission])"
              :key="item.label"
              class="group-reward-chip"
              :class="chipClass(item)"
              >{{ item.count > 1 ? item.count + "x " : "" }}{{ item.label }}</span
            >
          </div>

          <!-- Progress -->
          <div class="card-progress">
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: progressPercent(mission) + '%' }"
              ></div>
            </div>
            <span
              class="progress-label"
              :class="{
                'label-unknown': mission.progressText === 'Not Calculated',
              }"
            >
              {{ progressLabel(mission) }}
            </span>
          </div>

          <!-- Footer: cost + unlocked + value + action -->
          <div class="card-footer">
            <div class="card-footer-stats">
              <template v-if="!mission.completed">
                <div v-if="remainingPriceText(mission)" class="card-stat-cell">
                  <span class="card-stat-label">Cost</span>
                  <span class="card-price">{{
                    remainingPriceText(mission)
                  }}</span>
                </div>
                <div
                  v-if="mission.unlockedCardsPrice > 0"
                  class="card-stat-cell"
                >
                  <span class="card-stat-label">Unlocked</span>
                  <span class="card-price"
                    >{{
                      mission.unlockedCardsPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })
                    }}
                    PP</span
                  >
                </div>
                <div
                  v-if="mission.rewardValue !== undefined"
                  class="card-stat-cell"
                >
                  <span class="card-stat-label">Reward</span>
                  <span class="card-price"
                    >{{
                      mission.rewardValue.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })
                    }}
                    PP</span
                  >
                </div>
                <div
                  v-if="
                    mission.rawMission.type === 'missions' &&
                    mission.combinedRewardValue !== undefined
                  "
                  class="card-stat-cell"
                >
                  <span class="card-stat-label">Full Rewards</span>
                  <span class="card-price"
                    >{{
                      mission.combinedRewardValue.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })
                    }}
                    PP</span
                  >
                </div>
                <div
                  v-if="
                    mission.missionValue !== undefined && !mission.completed
                  "
                  class="card-stat-cell"
                >
                  <span class="card-stat-label">Net</span>
                  <span
                    class="card-value"
                    :class="
                      mission.missionValue >= 0
                        ? 'card-value--pos'
                        : 'card-value--neg'
                    "
                    >{{ mission.missionValue >= 0 ? "+" : ""
                    }}{{
                      mission.missionValue.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })
                    }}
                    PP</span
                  >
                </div>
              </template>
            </div>
            <div class="card-footer-actions">
              <button
                v-if="mission.progressText === 'Not Calculated'"
                class="btn-action btn-calculate"
                @click="$emit('calculateMission', mission.id)"
              >
                Calculate
              </button>
              <button
                v-else
                class="btn-action btn-select"
                @click="selectMission(mission)"
              >
                Select
              </button>
              <button
                v-if="
                  missionStore.manualCompleteOverrides.has(mission.id) ||
                  missionStore.missionCanMarkComplete(mission)
                "
                class="btn-mark-done"
                :class="{
                  'btn-mark-done--active':
                    missionStore.manualCompleteOverrides.has(mission.id),
                }"
                @click="missionStore.toggleMissionComplete(mission.id)"
              >
                {{
                  missionStore.manualCompleteOverrides.has(mission.id)
                    ? "Set Not Completed"
                    : "Set Completed"
                }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { PropType } from "vue";
import type { UserMission } from "../models/UserMission";
import { useMissionStore } from "@/stores/useMissionStore";
import { useSettingsStore, PACK_TYPE_LABELS } from "@/stores/useSettingsStore";
import { useCardStore } from "@/stores/useCardStore";

const props = defineProps({
  groups: {
    type: Array as PropType<Array<{ label: string; missions: UserMission[] }>>,
    required: true,
  },
  isMissionComplete: {
    type: Function as PropType<(mission: UserMission) => boolean>,
    required: true,
  },
  remainingPriceText: {
    type: Function as PropType<(mission: UserMission) => string>,
    required: true,
  },
  selectMission: {
    type: Function as PropType<(mission: UserMission) => void>,
    required: true,
  },
  selectedMission: {
    type: Object as PropType<UserMission | null>,
    default: null,
  },
});

defineEmits<{
  (e: "calculateMission", id: number): void;
  (e: "calculateGroup", ids: number[]): void;
}>();

const missionStore = useMissionStore();
const settingsStore = useSettingsStore();
const cardStore = useCardStore();

// Strips everything before the position code and prepends the card value.
// e.g. cardValue=100, "Hall of Fame RF Vladimir Guerrero MON 2002" → "100 - RF Vladimir Guerrero MON 2002"
function cardTitleShort(title: string, cardValue: number): string {
  const match = title.match(/\b(SP|RP|CL|1B|2B|3B|SS|LF|CF|RF|DH|C)\b/);
  const fromPosition = match?.index !== undefined ? title.slice(match.index) : title;
  return `${cardValue} - ${fromPosition}`;
}

function packChipClass(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("rainbow"))  return "chip--rainbow";
  if (l.includes("perfect"))  return "chip--perfect";
  if (l.includes("diamond"))  return "chip--diamond";
  if (l.includes("gold"))     return "chip--gold";
  if (l.includes("silver"))   return "chip--silver";
  if (l.includes("standard")) return "chip--standard";
  return "";
}

const collapsed = ref<Set<string>>(new Set());
const missionRefs = ref<Map<number, HTMLElement>>(new Map());

function toggleGroup(label: string) {
  const next = new Set(collapsed.value);
  if (next.has(label)) {
    next.delete(label);
  } else {
    next.add(label);
  }
  collapsed.value = next;
}

function setMissionRef(missionId: number, el: any) {
  if (el) {
    missionRefs.value.set(missionId, el as HTMLElement);
  } else {
    missionRefs.value.delete(missionId);
  }
}

function scrollToMission(missionId: number) {
  // Find the group containing this mission and expand it if collapsed
  for (const group of props.groups) {
    if (group.label && group.missions.some((m) => m.id === missionId)) {
      if (collapsed.value.has(group.label)) {
        const next = new Set(collapsed.value);
        next.delete(group.label);
        collapsed.value = next;
      }
      break;
    }
  }

  // Scroll to the mission after a short delay to allow for group expansion
  setTimeout(() => {
    const element = missionRefs.value.get(missionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, 100);
}

function groupHasUncalculated(missions: UserMission[]): boolean {
  return missions.some(
    (m) => !m.completed && m.progressText === "Not Calculated",
  );
}

/**
 * Returns the set of rawMission IDs that are children of a missions-type
 * mission also present in this group. These should be excluded from group
 * cost totals to avoid double-counting (the parent already aggregates its
 * children's costs into its own remainingPrice).
 */
function getChildMissionIds(missions: UserMission[]): Set<number> {
  const groupIds = new Set(missions.map((m) => m.rawMission.id));
  const childIds = new Set<number>();
  for (const m of missions) {
    if (m.rawMission.type === "missions" && m.rawMission.missionIds) {
      for (const id of m.rawMission.missionIds) {
        if (groupIds.has(id)) childIds.add(id);
      }
    }
  }
  return childIds;
}

function groupRemainingTotal(missions: UserMission[]): string {
  // Only show total when all missions have been calculated.
  // Exclude child missions whose parent is also in the group — the parent's
  // remainingPrice already aggregates the cheapest-N child costs.
  if (groupHasUncalculated(missions)) return "";
  const childIds = getChildMissionIds(missions);
  const total = missions
    .filter((m) => !m.completed && !childIds.has(m.rawMission.id))
    .reduce((sum, m) => sum + m.remainingPrice, 0);
  if (total <= 0) return "";
  return (
    total.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + " PP"
  );
}

function groupUnlockedTotal(missions: UserMission[]): string {
  if (groupHasUncalculated(missions)) return "";
  const childIds = getChildMissionIds(missions);
  const total = missions
    .filter((m) => !m.completed && !childIds.has(m.rawMission.id))
    .reduce((sum, m) => sum + m.unlockedCardsPrice, 0);
  if (total <= 0) return "";
  return (
    total.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + " PP"
  );
}

function groupRewardText(missions: UserMission[]): string {
  if (groupHasUncalculated(missions)) return "";
  const withReward = missions.filter(
    (m) => !m.completed && m.rewardValue !== undefined,
  );
  if (withReward.length === 0) return "";
  const total = withReward.reduce((sum, m) => sum + m.rewardValue!, 0);
  if (total <= 0) return "";
  return (
    total.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + " PP"
  );
}

function groupValueText(missions: UserMission[]): string {
  if (groupHasUncalculated(missions)) return "";
  // Use only top-level missions (not children of a missions-type parent in
  // this group) so costs aren't double-counted. missions-type missionValue
  // already incorporates child rewards via combinedRewardValue, so top-level
  // alone gives the correct group net.
  const childIds = getChildMissionIds(missions);
  const topLevel = missions.filter(
    (m) => !m.completed && !childIds.has(m.rawMission.id),
  );
  const withValue = topLevel.filter((m) => m.missionValue !== undefined);
  if (withValue.length === 0) return "";
  const total = withValue.reduce((sum, m) => sum + m.missionValue!, 0);
  const sign = total >= 0 ? "+" : "";
  return (
    sign +
    total.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) +
    " PP"
  );
}

function groupValueIsPositive(missions: UserMission[]): boolean {
  const childIds = getChildMissionIds(missions);
  const topLevel = missions.filter(
    (m) => !m.completed && !childIds.has(m.rawMission.id),
  );
  return (
    topLevel.reduce((sum, m) => sum + (m.missionValue ?? 0), 0) >= 0
  );
}

type RewardItem = { label: string; count: number; type: "pack" | "card" | "park" };

function collectRewardItems(missions: UserMission[]): RewardItem[] {
  const packCounts = new Map<string, number>();
  const cardCounts = new Map<string, { count: number; value: number }>();
  const parkCounts = new Map<string, number>();
  for (const mission of missions) {
    for (const reward of mission.rawMission.rewards ?? []) {
      const type = (reward.type as string).toLowerCase();
      if (type === "pack") {
        const r = reward as { packType: string; count: number };
        packCounts.set(r.packType, (packCounts.get(r.packType) ?? 0) + r.count);
      } else if (type === "card") {
        const r = reward as { cardId: number; count?: number };
        if (r.cardId === 0) continue;
        const shopCard = cardStore.shopCardsById.get(r.cardId);
        const title = shopCard
          ? cardTitleShort(shopCard.cardTitle, shopCard.cardValue)
          : `Card #${r.cardId}`;
        const prev = cardCounts.get(title);
        cardCounts.set(title, {
          count: (prev?.count ?? 0) + (r.count ?? 1),
          value: shopCard?.cardValue ?? prev?.value ?? 0,
        });
      } else if (type === "park") {
        const r = reward as { park: string };
        parkCounts.set(r.park, (parkCounts.get(r.park) ?? 0) + 1);
      }
    }
  }
  const packsRaw: { key: string; count: number }[] = [];
  for (const [packType, count] of packCounts) {
    packsRaw.push({ key: packType, count });
  }
  packsRaw.sort((a, b) => {
    const aVal = settingsStore.packPrices.get(a.key) ?? 0;
    const bVal = settingsStore.packPrices.get(b.key) ?? 0;
    return bVal - aVal;
  });
  const packs: RewardItem[] = packsRaw.map(({ key, count }) => ({
    label: PACK_TYPE_LABELS[key] ?? key,
    count,
    type: "pack",
  }));
  const cards: RewardItem[] = Array.from(cardCounts.entries())
    .sort((a, b) => b[1].value - a[1].value)
    .map(([title, { count }]) => ({ label: title, count, type: "card" as const }));
  const parks: RewardItem[] = [];
  for (const [park, count] of parkCounts) {
    parks.push({ label: park, count, type: "park" });
  }
  return [...cards, ...packs, ...parks];
}

function chipClass(item: RewardItem): string {
  if (item.type === "park") return "chip--park";
  if (item.type === "card") return "chip--card";
  return packChipClass(item.label);
}

function groupRemainingRewardItems(missions: UserMission[]): RewardItem[] {
  return collectRewardItems(missions.filter((m) => !m.completed));
}

function groupCompletedRewardItems(missions: UserMission[]): RewardItem[] {
  return collectRewardItems(missions.filter((m) => m.completed));
}

function progressPercent(mission: UserMission): number {
  if (mission.completed) return 100;
  if (mission.progressText === "Not Calculated") return 0;

  const required = mission.rawMission.requiredCount;
  if (!required) return 0;

  if (mission.rawMission.type === "count") {
    const owned = mission.missionCards.filter((c) => c.owned).length;
    return Math.min(100, Math.round((owned / required) * 100));
  }

  // points / missions: parse leading number from progressText
  const match = mission.progressText.match(/^([\d,]+)/);
  if (match) {
    const value = parseInt(match[1].replace(/,/g, ""), 10);
    return Math.min(100, Math.round((value / required) * 100));
  }

  return 0;
}

function progressLabel(mission: UserMission): string {
  if (mission.completed) return "Completed";
  if (mission.progressText === "Not Calculated") return "Not calculated";
  return mission.progressText;
}

defineExpose({
  scrollToMission,
});
</script>

<style scoped>
.mission-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ─── GROUP HEADER ─── */
.group-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
  background: #e2e8f0;
  border-radius: 6px;
  padding: 0.45rem 0.75rem;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 0.25rem;
  user-select: none;
}

.group-header:first-child {
  margin-top: 0;
}

.group-header:hover {
  background: #cbd5e1;
}

.group-calculate-btn {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 2px 10px;
  font-size: 0.7rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
  margin-left: auto;
}

.group-calculate-btn:hover {
  background: var(--accent-hover);
}

.group-chevron {
  font-size: 0.6rem;
  color: #64748b;
  flex-shrink: 0;
  width: 0.75rem;
}

.group-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #334155;
  flex: 1;
}

.group-meta {
  font-size: 0.7rem;
  color: #64748b;
  flex-shrink: 0;
}

.group-stats {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex-shrink: 0;
  text-align: right;
}

.group-stat-row {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  justify-content: flex-end;
}

.group-stat-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  font-weight: 600;
}

.group-stat-value {
  font-size: 0.7rem;
  color: #475569;
  font-weight: 500;
}

.group-value--pos {
  color: #16a34a;
}

.group-value--neg {
  color: #dc2626;
}

.group-rewards-bar {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding-top: 0.3rem;
  border-top: 1px solid #cbd5e1;
}

.group-rewards-section-label {
  width: 100%;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  font-weight: 600;
  margin-top: 0.15rem;
}

.group-rewards-section-label:first-child {
  margin-top: 0;
}

.group-reward-chip {
  font-size: 0.65rem;
  padding: 1px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-weight: 500;
  border: 1px solid #cbd5e1;
  white-space: nowrap;
}

.group-reward-chip--done {
  opacity: 0.55;
}

.chip--standard {
  background: #3b82f6;
  color: #fff;
  border-color: #2563eb;
}

.chip--silver {
  background: #cbd5e1;
  color: #1e293b;
  border-color: #94a3b8;
}

.chip--gold {
  background: #fbbf24;
  color: #78350f;
  border-color: #f59e0b;
}

.chip--diamond {
  background: #bae6fd;
  color: #0c4a6e;
  border-color: #7dd3fc;
}

.chip--perfect {
  background: #0f172a;
  color: #f8fafc;
  border-color: #334155;
}

.chip--rainbow {
  background: linear-gradient(90deg, #f87171, #fb923c, #fbbf24, #4ade80, #60a5fa, #a78bfa, #f472b6);
  color: #fff;
  border-color: transparent;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.55);
}

.chip--park {
  background: #d1fae5;
  color: #065f46;
  border-color: #6ee7b7;
}

.chip--card {
  background: #ede9fe;
  color: #4c1d95;
  border-color: #c4b5fd;
}

/* ─── MISSION CARD ─── */
.mission-card {
  background: #fff;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  box-shadow: var(--card-shadow);
  transition:
    box-shadow 0.15s,
    border-color 0.15s;
}

.mission-card:hover {
  box-shadow: var(--card-hover-shadow);
}

.mission-card--complete {
  border-left: 3px solid var(--accent);
  opacity: 0.72;
}

.mission-card--selected {
  border-color: #94a3b8;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.18);
}

/* Header */
.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
}

.card-name {
  font-size: 0.92rem;
  color: var(--text-primary);
  flex: 1;
  font-weight: 600;
}

.badge {
  font-size: 0.68rem;
  padding: 2px 7px;
  border-radius: 999px;
  font-weight: 600;
  flex-shrink: 0;
}

.badge-done {
  background: #dcfce7;
  color: #166534;
}

.badge-pending {
  background: #f1f5f9;
  color: #94a3b8;
}

/* Reward */
.card-reward {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.76rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

/* Progress */
.card-progress {
  margin-bottom: 0.5rem;
}

.progress-track {
  height: 5px;
  background: var(--progress-bg);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 0.3rem;
}

.progress-fill {
  height: 100%;
  background: var(--progress-fill);
  border-radius: 999px;
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.label-unknown {
  color: #94a3b8;
  font-style: italic;
}

/* Footer */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-footer-stats {
  display: flex;
  flex-direction: row;
  gap: 0.9rem;
  flex-wrap: wrap;
}

.card-stat-cell {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.card-stat-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  font-weight: 600;
}

.card-price {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 500;
}

.card-value {
  font-size: 0.72rem;
  font-weight: 600;
}

.card-value--pos {
  color: #16a34a;
}

.card-value--neg {
  color: #dc2626;
}

.card-footer-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  flex-shrink: 0;
}

.btn-action {
  border: none;
  border-radius: 5px;
  padding: 4px 14px;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-mark-done {
  padding: 2px 8px;
  font-size: 0.68rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  color: #64748b;
  border: 1px solid #cbd5e1;
  transition:
    background 0.15s,
    color 0.15s;
  white-space: nowrap;
}

.btn-mark-done:hover {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #86efac;
}

.btn-mark-done--active {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #86efac;
}

.btn-mark-done--active:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}

.btn-calculate {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-calculate:hover {
  background: #e2e8f0;
}

.btn-select {
  background: var(--accent);
  color: #fff;
}

.btn-select:hover {
  background: var(--accent-hover);
}
</style>
