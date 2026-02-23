import './assets/main.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useCardStore } from './stores/useCardStore'
import { useMissionStore } from './stores/useMissionStore'

const app = createApp(App)

app.use(createPinia())

app.mount('#app')

const cardStore = useCardStore()
await cardStore.initialize()

// missions.json is already being fetched via <link rel="preload"> in index.html,
// so sequencing here doesn't add latency — it just guarantees cards are in memory
// before buildUserMissions() runs, eliminating the first-load race condition.
const missionStore = useMissionStore()
await missionStore.initialize()
