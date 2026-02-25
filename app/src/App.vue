<script setup lang="ts">
import Missions from "./components/Missions.vue";

const moonSvgUrl = import.meta.env.BASE_URL + "moon.svg";
</script>

<template>
  <nav class="app-nav">
    <a href="https://cratervar.com" class="home-link">
      <img :src="moonSvgUrl" alt="cratervar" class="home-icon" />
      cratervar.com
    </a>
  </nav>
  <div class="wip-banner">
    Work in progress — currently using OOTP 26 data with only a partial mission
    list.
  </div>
  <Missions />
  <footer>
    Open source:
    <a href="https://github.com/outbaksean/ootp-missions-27" target="_blank"
      >github.com/outbaksean/ootp-missions-27</a
    >
  </footer>
</template>

<style scoped>
.app-nav {
  display: flex;
  align-items: center;
  padding: 0.55rem 1.25rem;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  flex-shrink: 0;
}

.wip-banner {
  background: #fff3cd;
  color: #856404;
  border-bottom: 1px solid #ffc107;
  padding: 7px 20px;
  text-align: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}

footer {
  flex-shrink: 0;
  padding: 9px 20px;
  text-align: center;
  font-size: 0.82rem;
  color: #64748b;
  border-top: 1px solid #e2e8f0;
  background: #fff;
}

footer a {
  color: #22c55e;
  text-decoration: none;
}

footer a:hover {
  text-decoration: underline;
}

.home-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #1e293b;
  font-weight: 500;
  text-decoration: none;
}

.home-icon {
  width: 16px;
  height: 16px;
}
</style>
