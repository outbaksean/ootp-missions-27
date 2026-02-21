<script setup lang="ts">
import CardUploader from './components/CardUploader.vue'
import Missions from './components/Missions.vue'
</script>

<template>
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
</style>
