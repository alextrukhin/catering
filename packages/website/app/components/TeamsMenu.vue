<script setup lang="ts">
defineProps<{
	collapsed?: boolean;
	name?: string | null;
}>();
</script>

<template>
	<UButton
		:label="collapsed ? undefined : (name ?? '')"
		color="neutral"
		variant="ghost"
		block
		:square="collapsed"
		class="data-[state=open]:bg-elevated"
		:class="[!collapsed && 'py-2']"
		icon="i-lucide-utensils-crossed"
	/>
</template>
