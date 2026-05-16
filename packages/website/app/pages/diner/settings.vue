<script setup lang="ts">
import { useWebApp } from "vue-tg";

definePageMeta({ layout: "diner" });

const { $client } = useNuxtApp();
const { t } = useI18n();
const toast = useToast();

const webApp = useWebApp();
const isInTelegram = computed(() => !!webApp.initData);

// Sessions
const { data: sessions, refresh: refreshSessions } =
	await $client.diner.user.listSessions.useQuery(undefined, { lazy: true });

async function removeSession(id: number) {
	try {
		await $client.diner.user.deleteSession.mutate({ id });
		toast.add({ title: t("settings.session_removed"), color: "success" });
		await refreshSessions();
	} catch {
		toast.add({ title: t("settings.error"), color: "error" });
	}
}

// Passkeys
const { data: passkeys, refresh: refreshPasskeys } =
	await $client.diner.user.listPasskeys.useQuery(undefined, { lazy: true });

async function removePasskey(id: number) {
	try {
		await $client.diner.user.deletePasskey.mutate({ id });
		toast.add({ title: t("settings.passkey_removed"), color: "success" });
		await refreshPasskeys();
	} catch {
		toast.add({ title: t("settings.error"), color: "error" });
	}
}

// Telegram
const { data: tgStatus, refresh: refreshTgStatus } =
	await $client.diner.user.telegramStatus.useQuery(undefined, { lazy: true });

const tgBusy = ref(false);

async function linkTelegram() {
	if (!webApp.initData) return;
	tgBusy.value = true;
	try {
		await $client.diner.user.linkTelegram.mutate({
			init_data_raw: webApp.initData,
		});
		toast.add({ title: t("settings.tg_linked"), color: "success" });
		await refreshTgStatus();
	} catch (e: any) {
		toast.add({
			title: e?.message ?? t("settings.error"),
			color: "error",
		});
	} finally {
		tgBusy.value = false;
	}
}

async function unlinkTelegram() {
	tgBusy.value = true;
	try {
		await $client.diner.user.unlinkTelegram.mutate();
		toast.add({ title: t("settings.tg_unlinked"), color: "success" });
		await refreshTgStatus();
	} catch {
		toast.add({ title: t("settings.error"), color: "error" });
	} finally {
		tgBusy.value = false;
	}
}

function formatDate(d: string | Date) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(d as string));
}
</script>

<template>
	<div class="max-w-2xl mx-auto px-4 py-8 space-y-8">
		<div class="flex items-center gap-3">
			<UButton
				to="/diner/dashboard"
				variant="ghost"
				size="sm"
				icon="i-lucide-arrow-left"
			/>
			<h1 class="text-xl font-bold text-highlighted">
				{{ $t("settings.title") }}
			</h1>
		</div>

		<!-- Telegram -->
		<UCard>
			<template #header>
				<div class="flex items-center gap-2 font-semibold">
					<UIcon name="i-lucide-message-circle" class="size-4 text-primary" />
					{{ $t("settings.telegram") }}
				</div>
			</template>
			<div class="space-y-3 p-1">
				<div v-if="tgStatus?.linked" class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-sm">
						<UIcon name="i-lucide-check-circle" class="size-4 text-green-500" />
						<span>{{ $t("settings.tg_account_linked") }}</span>
					</div>
					<UButton
						size="xs"
						color="error"
						variant="soft"
						:label="$t('settings.tg_unlink')"
						:loading="tgBusy"
						@click="unlinkTelegram"
					/>
				</div>
				<div v-else class="space-y-2">
					<p class="text-sm text-muted">{{ $t("settings.tg_not_linked") }}</p>
					<UButton
						v-if="isInTelegram"
						size="sm"
						icon="i-lucide-link"
						:label="$t('settings.tg_link')"
						:loading="tgBusy"
						@click="linkTelegram"
					/>
					<p v-else class="text-xs text-muted/70">
						{{ $t("settings.tg_open_from_bot") }}
					</p>
				</div>
			</div>
		</UCard>

		<!-- Passkeys -->
		<UCard>
			<template #header>
				<div class="flex items-center gap-2 font-semibold">
					<UIcon name="i-lucide-fingerprint" class="size-4 text-primary" />
					{{ $t("settings.passkeys") }}
				</div>
			</template>
			<div class="p-1">
				<div
					v-if="!passkeys?.length"
					class="text-sm text-muted text-center py-4"
				>
					{{ $t("settings.no_passkeys") }}
				</div>
				<ul v-else class="divide-y divide-default">
					<li
						v-for="pk in passkeys"
						:key="pk.id"
						class="flex items-center justify-between py-2.5"
					>
						<div>
							<p class="text-sm font-medium">{{ pk.name }}</p>
							<p class="text-xs text-muted">
								{{ formatDate(pk.created_at) }}
							</p>
						</div>
						<UButton
							size="xs"
							color="error"
							variant="ghost"
							icon="i-lucide-trash-2"
							@click="removePasskey(pk.id)"
						/>
					</li>
				</ul>
			</div>
		</UCard>

		<!-- Sessions -->
		<UCard>
			<template #header>
				<div class="flex items-center gap-2 font-semibold">
					<UIcon name="i-lucide-monitor" class="size-4 text-primary" />
					{{ $t("settings.active_sessions") }}
				</div>
			</template>
			<div class="p-1">
				<div
					v-if="!sessions?.length"
					class="text-sm text-muted text-center py-4"
				>
					{{ $t("settings.no_sessions") }}
				</div>
				<ul v-else class="divide-y divide-default">
					<li
						v-for="s in sessions"
						:key="s.id"
						class="flex items-center justify-between py-2.5"
					>
						<div>
							<p class="text-sm font-medium">
								{{ s.device ?? $t("settings.unknown_device") }}
							</p>
							<p class="text-xs text-muted">
								{{ s.ip ?? "—" }} · {{ formatDate(s.started_at) }}
							</p>
						</div>
						<UButton
							size="xs"
							color="error"
							variant="ghost"
							icon="i-lucide-x"
							@click="removeSession(s.id)"
						/>
					</li>
				</ul>
			</div>
		</UCard>
	</div>
</template>
