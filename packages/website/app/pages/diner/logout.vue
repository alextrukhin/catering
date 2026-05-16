<script setup lang="ts">
definePageMeta({ layout: false });
const { $diner } = useNuxtApp();
onMounted(async () => {
	await $diner.logout();
	await navigateTo("/diner");
});
</script>

<template>
	<div class="flex items-center justify-center min-h-screen">
		<UIcon name="i-lucide-loader-2" class="animate-spin size-8 text-primary" />
	</div>
</template>
