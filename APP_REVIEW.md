# OOTP Missions 27 - Application Review

**Date:** February 25, 2026  
**Reviewer:** AI Code Analysis  
**Scope:** Comprehensive bug detection and feature enhancement review

---

## Executive Summary

The OOTP Missions 27 application is a well-architected Vue 3 SPA that effectively tracks card missions and calculates optimal completion strategies using dynamic programming. The codebase demonstrates good separation of concerns, proper state management with Pinia, and efficient client-side computation. This review identifies potential bugs, edge cases, and enhancement opportunities to improve reliability, user experience, and maintainability.

---

## 🐛 Bugs and Issues

### Critical

#### 1. Race Condition in Store Initialization
**Location:** `app/src/main.ts`  
**Issue:** The app mounts before data initialization completes, potentially causing undefined state access.

```typescript
// Current:
app.mount("#app");
const cardStore = useCardStore();
await cardStore.loadFromCache();

// Problem: Component may try to access stores before data loads
```

**Impact:** Could cause flickering or temporary errors on initial load.

**Recommendation:** Show a loading state until initialization completes, or ensure components handle undefined store states gracefully.

---

#### 2. Missing Error Handling in CSV Upload
**Location:** `app/src/stores/useCardStore.ts:uploadShopFile()`  
**Issue:** No try-catch blocks or user-facing error messages for failed uploads.

```typescript
async function uploadShopFile(file: File) {
  const text = await file.text(); // No error handling
  await new Promise<void>((resolve) => {
    Papa.parse(text, { ... }); // Parsing errors not surfaced to user
```

**Impact:** Users see no feedback when CSV parsing fails or format is incorrect.

**Recommendation:** Add error handling and display user-friendly error messages.

---

#### 3. IndexedDB Schema Migration Issues
**Location:** `app/src/data/indexedDB.ts`  
**Issue:** Schema versioning doesn't handle existing data migration properly. The typo fix from "lock" to "locked" in v3 doesn't migrate existing data.

```typescript
// Version 2 adds missionsCache
this.version(2).stores({ missionsCache: "id" });

// Version 3 fixes typo but doesn't migrate data
this.version(3).stores({
  shopCards: "++cardId, cardTitle, cardValue, sellOrderLow, lastPrice, owned, locked"
});
```

**Impact:** Users upgrading from v2 may have inconsistent index behavior.

**Recommendation:** Add proper migration logic using Dexie's `.upgrade()` method.

---

### High Priority

#### 4. Memory Leak in Event Listeners
**Location:** `app/src/components/Missions.vue`  
**Issue:** Window resize listener is added in `onMounted` and removed in `onUnmounted`, but if the component is unmounted before mounting completes, the listener could persist.

**Recommendation:** Use clean event listener patterns and ensure proper cleanup.

---

#### 5. DP Algorithm Edge Case with Zero-Point Cards
**Location:** `app/src/helpers/MissionHelper.ts:calculatePriceDetailsPointsTypeDP()`  
**Issue:** Cards with 0 points are filtered out, but the algorithm doesn't validate that sufficient points exist before running DP.

```typescript
const unownedWithPoints = sortedCards
  .map((card) => ({
    ...card,
    points: mission.cards.find((mc) => mc.cardId == card.cardId)?.points || 0,
  }))
  .filter((c) => c.points > 0); // Could result in empty array

return this.calculatePriceDetailsPointsTypeDP(unownedWithPoints, requiredPoints);
```

**Impact:** If all unowned cards have 0 points, the mission becomes impossible to calculate correctly.

**Recommendation:** Add validation and return appropriate "not possible" state.

---

#### 6. Type Coercion Bug with Mission ID Comparison
**Location:** `app/src/stores/useMissionStore.ts:260`  
**Issue:** Uses loose equality `==` instead of strict equality `===`:

```typescript
mission.missionIds.some((id) => id == um.rawMission.id)
```

**Impact:** Could cause incorrect mission matching if IDs are strings vs numbers.

**Recommendation:** Use strict equality throughout.

---

#### 7. Division by Zero in Upload Discount Calculation
**Location:** `app/src/helpers/MissionHelper.ts`  
**Issue:** Discount validation allows 100% (value 1.0), which results in 0 prices:

```typescript
const price = rawPrice * (1 - discount); // If discount = 1, price = 0
```

**Impact:** Unlocked cards with 100% discount become free, potentially breaking calculations.

**Recommendation:** Cap discount at 99% or handle zero-price edge case.

---

### Medium Priority

#### 8. localStorage Quota Exceeded Not Handled
**Location:** Multiple stores  
**Issue:** All localStorage writes lack quota exceeded error handling.

```typescript
localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(prices)));
// No try-catch
```

**Impact:** Silent failure on storage quota exceeded, user preferences lost.

**Recommendation:** Wrap in try-catch and notify user if storage fails.

---

#### 9. Infinite Loop Potential in Recursive Mission Calculation
**Location:** `app/src/stores/useMissionStore.ts:calculateMissionDetails()`  
**Issue:** Circular mission dependencies aren't explicitly prevented.

```typescript
await Promise.all(
  mission.missionIds.map((id) => calculateMissionDetails(id, true))
);
```

**Impact:** If mission data has circular references (Mission A → Mission B → Mission A), causes stack overflow.

**Recommendation:** Add circular dependency detection.

---

#### 10. Price Override Persistence Race Condition
**Location:** `app/src/components/MissionDetails.vue`  
**Issue:** Price changes set `hasUnappliedChanges` but user can navigate away before recalculating, losing their changes.

**Recommendation:** Auto-save on blur or warn user about unsaved changes.

---

#### 11. Card Title Fallback Inconsistency
**Location:** `app/src/helpers/MissionHelper.ts` vs `app/src/stores/useMissionStore.ts`  
**Issue:** Different fallback patterns for missing cards:
- Some use `Card #${cardId}`
- Some use `Unknown`
- Some skip the card entirely

**Recommendation:** Standardize card title fallback behavior.

---

#### 12. Fetch Failures Not Surfaced to User
**Location:** `app/src/stores/useCardStore.ts:fetchDefaultCards()`  
**Issue:** Network failures are logged but user isn't notified:

```typescript
try {
  const response = await fetch("/ootp-missions-27/data/shop_cards.csv");
  // ...
} catch (e) {
  console.error("Failed to load default shop cards", e);
  // No user notification
}
```

**Recommendation:** Display error banner when critical data fails to load.

---

### Low Priority

#### 13. Inefficient Array Copy in Card Storage
**Location:** `app/src/stores/useCardStore.ts:addShopCards()`  
**Comment already exists acknowledging this:

```typescript
// Always called on an empty array — assign directly to avoid spread call-stack limits
shopCards.value = data;
```

**Recommendation:** This is already optimized; document the rationale more clearly.

---

#### 14. Missing Input Validation
**Location:** Multiple price input fields  
**Issue:** Number inputs accept negative values and decimals despite `min="0"` attribute.

**Recommendation:** Add programmatic validation on input/blur events.

---

#### 15. Inconsistent Loading States
**Location:** Various components  
**Issue:** Some operations show loading states, others don't (e.g., CSV upload vs. mission calculation).

**Recommendation:** Standardize loading indicators across all async operations.

---

## 🚀 Feature Enhancements

### High Value

#### 1. Bulk Card Operations
**Description:** Allow users to mark multiple cards as locked/owned at once.

**Use Case:** User wants to lock all cards needed for a mission with one click.

**Implementation:**
- Add checkbox selection mode to card lists
- "Lock Selected" / "Mark Owned Selected" bulk actions
- Keyboard shortcuts (Ctrl+A, Shift+Click for range selection)

---

#### 2. Mission Comparison Mode
**Description:** Side-by-side comparison of multiple missions to see shared cards and decide which to complete first.

**Benefits:**
- Visualize card overlap between missions
- Identify high-value cards that complete multiple missions
- Better strategic planning

**Implementation:**
- Multi-select missions (checkbox in mission list)
- "Compare" button opens comparison view
- Show Venn diagram or list of unique/shared cards

---

#### 3. Export Mission Plan
**Description:** Export calculation results as CSV or printable report.

**Use Case:** User wants to reference their completion plan in-game or share with others.

**Formats:**
- CSV: Mission name, cards to buy, total cost, reward
- PDF/Print: Formatted mission checklist
- JSON: Full state export for backup/restore

---

#### 4. Card Collection Progress Tracking
**Description:** Track overall card collection completion over time.

**Features:**
- Collection percentage by card type (live, historical, etc.)
- Value gained/spent tracking
- Historical graphs of collection growth

---

#### 5. Smart Filters
**Description:** Advanced filtering beyond current options.

**Filters:**
- Missions completable with current cards
- Missions within budget (user sets PP limit)
- Missions by card type requirement
- Missions by time-to-complete estimate
- Recently added missions (needs mission metadata)

---

#### 6. Mission Recommendations
**Description:** AI/algorithm suggests which missions to tackle next based on various strategies.

**Strategies:**
- Maximum PP profit
- Fastest to complete
- Best use of current card inventory
- Highest reward value

**Implementation:**
- Scoring algorithm considering multiple factors
- User can weight factors (prefer speed vs. profit)
- "Recommended" badge on mission cards

---

#### 7. Dark Mode
**Description:** Full dark theme support (currently has dark modals but not main UI).

**Implementation:**
- CSS custom properties for all colors
- Toggle in settings
- Persist preference
- Respect system preference (`prefers-color-scheme`)

---

#### 8. Card Price History
**Description:** Track price changes over time for cards.

**Benefits:**
- Identify price trends
- Wait for better prices
- See market volatility

**Implementation:**
- Store price snapshots on each CSV upload
- Chart showing price over time
- Price alerts (notify when card drops below threshold)

---

#### 9. Offline Mode with Service Worker
**Description:** Full offline functionality using service workers.

**Benefits:**
- Works without internet after first load
- Faster subsequent loads
- Better mobile experience

---

#### 10. Import/Export User Data
**Description:** Backup and restore all user data (preferences, price overrides, locked cards, manual completions).

**Use Case:**
- Switching devices
- Sharing setups with others
- Backup before clearing cache

**Format:** JSON file with all localStorage + IndexedDB data

---

### Medium Value

#### 11. Keyboard Shortcuts
**Description:** Power user keyboard navigation.

**Shortcuts:**
- `Ctrl+F` or `/`: Focus search
- `Esc`: Close detail panel
- `N/P`: Next/Previous mission
- `C`: Calculate selected mission
- `M`: Mark as complete
- Arrow keys for navigation

---

#### 12. Mission Notes
**Description:** Allow users to add personal notes to missions.

**Use Case:** Reminders, strategies, links to relevant information.

**Implementation:**
- Textarea in detail panel
- Stored in localStorage by mission ID
- Searchable from mission search

---

#### 13. Card Scarcity Indicators
**Description:** Show when cards are rare or price is volatile based on historical trends.

**Visual:** Badge or icon next to card price

---

#### 14. Undo/Redo for Card State Changes
**Description:** Undo accidental lock/unlock or ownership changes.

**Implementation:** Command pattern with history stack

---

#### 15. Mission Dependency Visualization
**Description:** Graph showing mission chains and dependencies.

**Implementation:** 
- D3.js or similar for interactive graph
- Click nodes to navigate
- Color-code by completion status

---

#### 16. Share Mission Calculation
**Description:** Generate shareable link with specific mission calculation.

**Implementation:**
- Encode mission ID + card states in URL hash
- Anyone with link sees same calculation
- Read-only view of someone else's setup

---

#### 17. Pack Opening Simulator
**Description:** Simulate pack openings to see potential value.

**Use Case:** Decide if pack rewards are worth the mission cost.

**Features:**
- Set number of simulations
- Show probability distributions
- Expected value calculation

---

#### 18. Mobile App (PWA)
**Description:** Progressive Web App with install prompt and mobile-optimized experience.

**Features:**
- Install to home screen
- Native-feeling navigation
- Push notifications for price alerts (if implemented)

---

#### 19. Multi-Language Support
**Description:** Internationalization for non-English users.

**Priority:** Depends on user base demographics

---

#### 20. Tutorial/Onboarding
**Description:** Interactive tutorial for first-time users.

**Steps:**
1. Explain card upload process
2. Walk through mission calculation
3. Explain optimize mode
4. Show filtering and sorting

---

## 🔧 Code Quality Improvements

### 1. Type Safety

**Current Issues:**
- Some `any` types could be more specific
- Type assertions (`as`) used instead of type guards in CSV parsing
- Optional chaining overused when types could be refined

**Recommendations:**
- Add runtime type validation with Zod or similar
- Create ParsedCSVRow type with proper validation
- Use discriminated unions for Mission types

---

### 2. Error Boundaries
**Issue:** No Vue error boundaries to catch component errors gracefully.

**Recommendation:** Add error boundary component to display friendly error messages instead of blank screen.

---

### 3. Code Duplication

**Areas:**
- Price calculation logic appears in multiple places
- Similar card filtering patterns repeated
- localStorage operations not abstracted

**Recommendation:**
- Extract `StorageManager` utility class
- Create `CardFilter` helper class
- Centralize price calculation utilities

---

### 4. Magic Numbers

**Examples:**
```typescript
max-height: calc(100vh - 200px); // Why 200?
const needed = Math.max(0, mission.requiredCount - freeCount); // Implicit logic
```

**Recommendation:** Extract as named constants with comments.

---

### 5. Component Size

**Issue:** `Missions.vue` (1147 lines) and `MissionDetails.vue` (818 lines) are large.

**Recommendation:** Break into smaller components:
- `MissionFilters.vue`
- `MissionSortOptions.vue`
- `MissionCard.vue` (extract from `MissionList.vue`)
- `CardListItem.vue` (extract from `MissionDetails.vue`)

---

### 6. Testing

**Current State:** Only one Playwright baseline test.

**Recommendations:**
- Unit tests for MissionHelper algorithms (critical business logic)
- Unit tests for store actions
- Component tests for key user interactions
- E2E tests for complete user flows:
  - Upload CSV → Calculate mission → Mark complete
  - Clear data → Re-import defaults
  - Apply filters → Select mission → Modify card

---

### 7. Documentation

**Missing:**
- JSDoc comments on public APIs
- Algorithm complexity analysis for DP functions
- Component prop documentation
- Store action documentation

**Recommendation:** Add comprehensive inline documentation, especially for:
- `calculatePriceDetailsPointsTypeDP()` algorithm explanation
- Store initialization sequence
- CSV format requirements

---

### 8. Accessibility

**Issues:**
- Some interactive elements missing ARIA labels
- Keyboard navigation incomplete
- Color contrast issues in some UI states
- Screen reader support untested

**Recommendations:**
- Add ARIA labels to all interactive elements
- Ensure full keyboard navigation
- Run automated accessibility audit (Lighthouse, axe)
- Test with screen reader

---

### 9. Performance Monitoring

**Missing:**
- No performance metrics tracking
- No error tracking (Sentry, etc.)
- No analytics to understand user behavior

**Recommendation:** Add:
- Performance mark/measure for DP algorithm
- Error boundary with error reporting
- Basic analytics (privacy-friendly)

---

## ⚡ Performance Considerations

### 1. Large Dataset Handling

**Concern:** App may slow down with large card collections (8190+ cards mentioned in docs).

**Current:** All cards kept in memory simultaneously.

**Recommendations:**
- Virtual scrolling for long card lists
- Pagination or lazy loading
- IndexedDB cursor-based iteration instead of `toArray()`

---

### 2. Expensive Computations on Main Thread

**Issue:** DP algorithm blocks UI during calculation.

**Symptoms:**
- "Calculate All" can take a moment (noted in UI)
- No progress indication during calculation

**Recommendations:**
- Web Worker for expensive calculations
- Progress bar with step-by-step updates
- Batch processing with `requestIdleCallback`

---

### 3. Unnecessary Re-renders

**Potential Issues:**
- Large reactive arrays may cause frequent re-renders
- Computed properties recalculate unnecessarily

**Recommendations:**
- Use `shallowRef` for large arrays where deep reactivity isn't needed
- Memoize expensive computed properties
- `v-once` for static content

---

### 4. Bundle Size

**Current:** Bootstrap (~200KB) imported for just modals and basic components.

**Recommendation:** Consider lighter alternatives:
- Custom modals with `<dialog>` element
- Headless UI for accessible components
- Replace Bootstrap with minimal CSS framework

---

### 5. Image Optimization

**Issue:** Help images loaded without lazy loading or optimization.

**Recommendation:**
- Lazy load help modal images
- Serve WebP with fallbacks
- Add proper width/height to prevent layout shift

---

## 🎨 UX/UI Improvements

### 1. Empty States

**Current:** No specific empty state designs.

**Needed:**
- Empty mission list (all filtered out)
- No results from search
- Default data failed to load
- Mission with no cards

---

### 2. Optimistic UI Updates

**Issue:** Some actions wait for async completion before showing feedback.

**Recommendation:** Show immediate UI change, revert if operation fails.

---

### 3. Contextual Help

**Enhancement:** Tooltips on hover for complex features (already has some with `title` attribute, could be enhanced).

**Recommendation:**
- Rich tooltips with better formatting
- "Learn more" links to detailed help
- Inline help toggles for each section

---

### 4. Mission Status Visualization

**Enhancement:** More visual mission progress indicators.

**Ideas:**
- Color-coded progress bars
- Icons for mission types
- Visual card collection meter

---

### 5. Sticky Headers

**Enhancement:** Keep group headers and column headers visible while scrolling.

**Implementation:** CSS `position: sticky`

---

### 6. Better Mobile Experience

**Current:** Responsive but could be better optimized.

**Improvements:**
- Swipe gestures for navigation
- Bottom sheet for detail panel
- Larger touch targets
- Simplified mobile-only view

---

### 7. Animations and Transitions

**Current:** Few animations, mostly static.

**Enhancements:**
- Smooth transitions between views
- Animate card list reordering
- Loading skeletons instead of spinners
- Micro-interactions on buttons

---

### 8. Confirmation Dialogs

**Missing:** No confirmations for destructive actions.

**Needed:**
- Confirm before clearing shop data
- Confirm before unmarking completed missions
- Confirm bulk operations

---

### 9. Success Feedback

**Enhancement:** More positive feedback on successful actions.

**Implementation:**
- Toast notifications
- Success checkmarks
- Brief highlights on changed items

---

### 10. Search Improvements

**Current:** Basic text search.

**Enhancements:**
- Search suggestions/autocomplete
- Search history
- Search by card name (not just mission name)
- Fuzzy search for typos

---

## 🧪 Testing Recommendations

### Unit Tests

```
[ ] MissionHelper.calculatePriceDetailsPointsTypeDP()
  [ ] Normal cases with various card counts
  [ ] Edge case: requiredPoints = 0
  [ ] Edge case: no cards available
  [ ] Edge case: can't reach target points
  [ ] Edge case: all cards have same price
  [ ] Edge case: cards with 0 points

[ ] MissionHelper.calculateTotalPriceOfNonOwnedCards()
  [ ] Count missions
  [ ] Points missions
  [ ] With price overrides
  [ ] With all cards owned
  [ ] With no cards available

[ ] useCardStore
  [ ] CSV parsing happy path
  [ ] CSV parsing with malformed data
  [ ] Clear and re-import flow
  [ ] Price override persistence
  [ ] Owned override toggling

[ ] useMissionStore
  [ ] Mission calculation
  [ ] Circular dependency prevention
  [ ] Manual completion toggling
  [ ] Cache management
```

### Integration Tests

```
[ ] Upload flow
  [ ] User uploads valid CSV
  [ ] User uploads invalid CSV
  [ ] User clears and re-uploads
  [ ] Upload preserves locked state

[ ] Calculation flow
  [ ] Calculate single mission
  [ ] Calculate all missions
  [ ] Calculation with optimize mode on/off
  [ ] Calculation after changing prices

[ ] Filtering and sorting
  [ ] Apply multiple filters
  [ ] Sort by different criteria
  [ ] Search with filters active
```

### E2E Tests

```
[ ] Complete user journey
  [ ] First visit → See prompt → Upload CSV → Calculate → Complete mission
  [ ] Return visit → Data persists → Continue work

[ ] Mobile user flow
  [ ] Open on mobile → Navigate → Upload → Calculate

[ ] Error scenarios
  [ ] Network failure on data load
  [ ] localStorage quota exceeded
  [ ] IndexedDB blocked
```

---

## 📋 Priority Matrix

| Priority | Category | Count | Examples |
|----------|----------|-------|----------|
| P0 (Critical) | Bugs | 3 | Race condition, CSV error handling, IndexedDB migration |
| P1 (High) | Bugs | 10 | Memory leaks, DP edge cases, type coercion |
| P1 (High) | Features | 10 | Bulk operations, mission comparison, export plans |
| P2 (Medium) | Bugs | 5 | localStorage errors, circular deps, fetch failures |
| P2 (Medium) | Features | 10 | Keyboard shortcuts, notes, undo/redo |
| P3 (Low) | Polish | 15 | Empty states, animations, confirmations |

---

## 🎯 Recommended Action Plan

### Phase 1: Critical Bugs (Sprint 1-2)
1. Fix race condition in initialization
2. Add error handling to CSV upload
3. Fix IndexedDB migration issue
4. Add type coercion fixes
5. Validate DP algorithm edge cases

### Phase 2: High-Value Features (Sprint 3-5)
1. Implement bulk card operations
2. Add mission comparison mode
3. Implement export functionality
4. Add smart filters
5. Create mission recommendations

### Phase 3: Code Quality (Sprint 6-7)
1. Add comprehensive test suite
2. Break down large components
3. Add proper documentation
4. Implement error boundaries
5. Improve type safety

### Phase 4: Polish (Sprint 8-10)
1. Add dark mode
2. Improve mobile experience
3. Add animations and transitions
4. Implement keyboard shortcuts
5. Add contextual help system

### Phase 5: Advanced Features (Sprint 11+)
1. Offline mode with service worker
2. Price history tracking
3. PWA implementation
4. Performance optimizations
5. Analytics and monitoring

---

## 💡 Architecture Recommendations

### Consider Adopting:

1. **Zod for Runtime Validation**: Type-safe schema validation for CSV parsing and API responses
2. **VueUse**: Composables for common patterns (localStorage, event listeners, etc.)
3. **Vitest**: Modern, fast unit test runner for Vite projects
4. **Vite PWA Plugin**: Easy PWA setup
5. **@vueuse/motion**: Declarative animations
6. **Error Tracking**: Sentry or similar for production error monitoring

### Architecture Patterns:

1. **Repository Pattern**: Abstract IndexedDB operations behind interface
2. **Command Pattern**: For undo/redo functionality
3. **Observer Pattern**: For cross-component communication (already using Pinia, could leverage more)
4. **Strategy Pattern**: For different mission calculation strategies

---

## 📊 Metrics to Track

### User Engagement
- Missions calculated per session
- Average session duration
- Feature usage (optimize mode, filters, etc.)
- Return user rate

### Performance
- Time to interactive (TTI)
- DP algorithm execution time
- CSV parse time
- Mission calculation time for "Calculate All"

### Reliability
- Error rate by type
- localStorage/IndexedDB operation success rate
- CSV upload success rate

### Business
- Active users
- Mission completion rate
- Feature adoption rates

---

## 🔒 Security Considerations

1. **XSS Prevention**: Already using Vue's automatic escaping, good
2. **CSV Injection**: Validate CSV content doesn't contain formula injection
3. **localStorage Poisoning**: Validate data from localStorage before use
4. **CSP Headers**: Ensure Content Security Policy is configured in production
5. **Dependency Audit**: Regular `npm audit` checks

---

## Conclusion

The OOTP Missions 27 application is well-architected with solid foundations. The main areas for improvement are:

1. **Reliability**: Add error handling and edge case validation
2. **Testing**: Comprehensive test coverage for business logic
3. **UX Polish**: Enhanced feedback, animations, and empty states
4. **Advanced Features**: Mission comparison, bulk operations, and recommendations

The application demonstrates good engineering practices overall, with room for enhancements that would significantly improve user experience and maintainability.

**Estimated Effort:**
- Critical bugs: 2-3 dev days
- High priority bugs: 5-7 dev days
- High-value features: 15-20 dev days
- Code quality improvements: 10-15 dev days
- Polish and UX: 10-15 dev days

**Total: ~8-12 weeks** for comprehensive improvements (depending on team size and priorities)
