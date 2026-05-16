<script setup lang="ts">
definePageMeta({ layout: "org" });

const { $client } = useNuxtApp();
const { t } = useI18n();
const toast = useToast();

const { data: settings, refresh } = await $client.org.settings.get.useQuery(
	undefined,
	{ lazy: true }
);

const botToken = ref("");
const notificationTime = ref("");
const botBusy = ref(false);
const removeConfirmOpen = ref(false);

async function saveBot() {
	if (!botToken.value) return;
	botBusy.value = true;
	try {
		await $client.org.settings.setupBot.mutate({
			bot_token: botToken.value,
			notification_time: notificationTime.value || undefined,
		});
		toast.add({ title: t("settings.bot_saved"), color: "success" });
		botToken.value = "";
		await refresh();
	} catch (e: any) {
		toast.add({ title: e?.message ?? t("settings.error"), color: "error" });
	} finally {
		botBusy.value = false;
	}
}

async function removeBot() {
	botBusy.value = true;
	try {
		await $client.org.settings.removeBot.mutate();
		toast.add({ title: t("settings.bot_removed"), color: "success" });
		removeConfirmOpen.value = false;
		await refresh();
	} catch {
		toast.add({ title: t("settings.error"), color: "error" });
	} finally {
		botBusy.value = false;
	}
}

async function saveNotificationTime() {
	botBusy.value = true;
	try {
		await $client.org.settings.updateNotificationTime.mutate({
			notification_time: notificationTime.value || null,
		});
		toast.add({ title: t("settings.saved"), color: "success" });
		await refresh();
	} catch {
		toast.add({ title: t("settings.error"), color: "error" });
	} finally {
		botBusy.value = false;
	}
}

watch(settings, (val) => {
	if (val?.notification_time) notificationTime.value = val.notification_time;
});
</script>

<template>
	<div class="max-w-2xl mx-auto px-4 py-8 space-y-8">
		<h1 class="text-xl font-bold text-highlighted">
			{{ $t("settings.title") }}
		</h1>

		<UCard>
			<template #header>
				<div class="flex items-center gap-2 font-semibold">
					<UIcon name="i-lucide-bot" class="size-4 text-primary" />
					{{ $t("settings.telegram_bot") }}
				</div>
			</template>

			<div class="space-y-4 p-1">
				<template v-if="settings?.bot_configured">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2 text-sm">
							<UIcon
								name="i-lucide-check-circle"
								class="size-4 text-green-500"
							/>
							<span>
								{{ $t("settings.bot_active") }}
								<span class="text-muted">(bot id: {{ settings.bot_id }})</span>
							</span>
						</div>
						<UButton
							size="xs"
							color="error"
							variant="soft"
							:label="$t('settings.bot_remove')"
							@click="removeConfirmOpen = true"
						/>
					</div>

					<USeparator />

					<div class="space-y-2">
						<p class="text-sm font-medium">
							{{ $t("settings.notification_time") }}
						</p>
						<p class="text-xs text-muted">
							{{ $t("settings.notification_time_desc") }}
						</p>
						<div class="flex items-center gap-2">
							<UInput v-model="notificationTime" type="time" class="w-32" />
							<UButton
								size="sm"
								:label="$t('settings.save')"
								:loading="botBusy"
								@click="saveNotificationTime"
							/>
						</div>
					</div>
				</template>

				<template v-else>
					<p class="text-sm text-muted">{{ $t("settings.bot_setup_desc") }}</p>
					<div class="space-y-3">
						<UFormField :label="$t('settings.bot_token')">
							<UInput
								v-model="botToken"
								placeholder="123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxx"
								class="w-full font-mono text-sm"
								type="password"
							/>
						</UFormField>
						<UFormField :label="$t('settings.notification_time')">
							<UInput v-model="notificationTime" type="time" class="w-32" />
						</UFormField>
						<UButton
							:label="$t('settings.bot_save')"
							:loading="botBusy"
							:disabled="!botToken"
							@click="saveBot"
						/>
					</div>
				</template>
			</div>
		</UCard>
	</div>

	<UModal
		v-model:open="removeConfirmOpen"
		:title="$t('settings.bot_remove_confirm_title')"
	>
		<template #body>
			<div class="p-4">
				<p class="text-sm text-muted">
					{{ $t("settings.bot_remove_confirm_desc") }}
				</p>
			</div>
		</template>
		<template #footer>
			<div class="flex justify-end gap-2">
				<UButton
					variant="ghost"
					:label="$t('settings.cancel')"
					@click="removeConfirmOpen = false"
				/>
				<UButton
					color="error"
					:label="$t('settings.bot_remove')"
					:loading="botBusy"
					@click="removeBot"
				/>
			</div>
		</template>
	</UModal>
</template>
