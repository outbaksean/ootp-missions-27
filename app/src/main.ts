import "./assets/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { useCardStore } from "./stores/useCardStore";
import { useMissionStore } from "./stores/useMissionStore";

const app = createApp(App);

app.use(createPinia());

// Initialize stores before mounting to prevent race conditions
const cardStore = useCardStore();
await cardStore.loadFromCache();

const missionStore = useMissionStore();
await missionStore.initialize();

// If no cached cards exist, fetch the default CSV in the background.
// This happens after the UI is mounted so the app is already interactive.
if (!cardStore.hasShopCards) {
  cardStore.fetchDefaultCards().then(() => missionStore.buildUserMissions());
}

// Mount app after stores are initialized
app.mount("#app");
