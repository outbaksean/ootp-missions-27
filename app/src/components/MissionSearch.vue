<template>
  <div class="mission-search">
    <input
      type="text"
      class="form-control"
      placeholder="Search missions..."
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<style scoped>
.mission-search {
  min-width: 200px;
  flex: 1 1 auto;
}
</style>
