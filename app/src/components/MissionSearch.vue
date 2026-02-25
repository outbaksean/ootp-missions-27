<template>
  <input
    type="text"
    class="sidebar-search"
    placeholder="Search missions..."
    :value="modelValue"
    @input="
      $emit('update:modelValue', ($event.target as HTMLInputElement).value)
    "
  />
</template>

<script setup lang="ts">
  defineProps<{ modelValue: string }>();
  defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<style scoped>
  .sidebar-search {
    width: 100%;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    color: var(--sidebar-text);
    padding: 6px 10px;
    font-size: 0.82rem;
    outline: none;
    transition: border-color 0.15s;
  }

  .sidebar-search::placeholder {
    color: var(--sidebar-muted);
  }

  .sidebar-search:focus {
    border-color: rgba(34, 197, 94, 0.5);
  }
</style>
