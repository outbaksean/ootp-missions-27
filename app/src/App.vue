<script setup lang="ts">
import CardUploader from './components/CardUploader.vue'
import Missions from './components/Missions.vue'

const moonSvgUrl = import.meta.env.BASE_URL + 'moon.svg'
</script>

<template>
  <nav>
    <a href="https://cratervar.com" class="home-link">
      <img :src="moonSvgUrl" alt="cratervar" class="home-icon" />
      cratervar.com
    </a>
  </nav>
  <div class="wip-banner">
    Work in progress — currently using OOTP 26 data with only a partial mission list.
  </div>
  <CardUploader />
  <Missions />

  <footer>
    Open source code available here:
    <a href="https://github.com/outbaksean/ootp-missions-27" target="_blank"
      >https://github.com/outbaksean/ootp-missions-27</a
    >
  </footer>
</template>

<style scoped>
nav {
  display: flex;
  align-items: center;
  padding: 0.6rem 1.5rem;
  border-bottom: 1px solid #e5e5e5;
}

.wip-banner {
  background: #fff3cd;
  color: #856404;
  border-bottom: 1px solid #ffc107;
  padding: 10px 20px;
  text-align: center;
  font-size: 0.9rem;
}

footer {
  margin-top: 20px;
  text-align: center;
  font-size: 0.9rem;
  color: #6c757d;
}

footer a {
  color: #007bff;
  text-decoration: none;
}

footer a:hover {
  text-decoration: underline;
}

.home-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.home-icon {
  width: 16px;
  height: 16px;
}
</style>
