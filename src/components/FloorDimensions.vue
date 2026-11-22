<script>
export default {
  props: {
    width: { type: [Number, String], required: true },
    height: { type: [Number, String], required: true },
    minFloorSize: { type: Number, required: true },
    maxFloorSize: { type: Number, required: true },
    errorMessage: { type: String, default: '' },
    isReady: { type: Boolean, required: true },
    isSaving: { type: Boolean, required: true },
    isLoading: { type: Boolean, required: true },
  },
  emits: ['update:width', 'update:height', 'create-floor', 'retry'],
  methods: {
    updateWidth(event) {
      const value = event.target.value
      this.$emit('update:width', value === '' ? '' : Number(value))
    },
    updateHeight(event) {
      const value = event.target.value
      this.$emit('update:height', value === '' ? '' : Number(value))
    },
  },
}
</script>

<template>
  <section class="panel" aria-labelledby="dimensions-heading">
    <h2 id="dimensions-heading">Floor dimensions</h2>
    <form class="dimension-form" @submit.prevent="$emit('create-floor')">
      <label class="dimension-field">
        <span>Width</span>
        <input
          :value="width"
          type="number"
          :min="minFloorSize"
          :max="maxFloorSize"
          step="1"
          required
          :disabled="!isReady || isSaving"
          @input="updateWidth"
        />
      </label>

      <label class="dimension-field">
        <span>Height</span>
        <input
          :value="height"
          type="number"
          :min="minFloorSize"
          :max="maxFloorSize"
          step="1"
          required
          :disabled="!isReady || isSaving"
          @input="updateHeight"
        />
      </label>

      <button type="submit" :disabled="!isReady || isSaving">
        Create floor
      </button>
    </form>

    <p v-if="errorMessage" class="error-message" role="alert">
      {{ errorMessage }}
    </p>
    <button
      v-if="!isReady && !isLoading"
      type="button"
      @click="$emit('retry')"
    >
      Retry connection
    </button>
  </section>
</template>

<style scoped>
.dimension-form {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 1rem;
  margin-top: 1rem;
}

.dimension-field {
  display: grid;
  gap: 0.4rem;
  color: #465166;
  font-size: 0.9rem;
  font-weight: 600;
}

.dimension-field input {
  width: 7rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid #cbd3df;
  border-radius: 0.4rem;
  color: #172033;
}

.dimension-field input:focus-visible {
  outline: 3px solid #9ca9f0;
  outline-offset: 2px;
}

.error-message {
  margin: 0.9rem 0 0;
  color: #b42318;
}
</style>
