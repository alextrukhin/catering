<script setup lang="ts">
definePageMeta({ layout: false });
const { $catererStaff } = useNuxtApp();
onMounted(async () => {
	await $catererStaff.logout();
	await navigateTo("/catering");
});
</script>

<template>
	<div class="flex items-center justify-center min-h-screen">
		<UIcon name="i-lucide-loader-2" class="animate-spin size-8 text-primary" />
	</div>
</template>
