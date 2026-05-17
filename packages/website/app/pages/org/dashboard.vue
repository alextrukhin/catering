<script setup lang="ts">
definePageMeta({ layout: "org" });

const { $client } = useNuxtApp();
const { t, locale } = useI18n();

const { data: diners } = $client.org.diners.list.useQuery();
const { data: guardians } = $client.org.guardians.list.useQuery();
const { data: contracts } = $client.org.contracts.list.useQuery();

const now = new Date();
const activeContracts = computed(() =>
	(contracts.value ?? []).filter(
		(c) =>
			new Date(c.valid_from) <= now &&
			(!c.valid_to || new Date(c.valid_to) >= now)
	)
);
</script>

<template>
	<UDashboardPanel id="home">
		<template #header>
			<UDashboardNavbar :title="t('nav.dashboard')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<UCard>
					<div class="flex items-center gap-4">
						<UIcon name="i-lucide-users" class="size-8 text-primary" />
						<div>
							<div class="text-2xl font-bold">{{ diners?.length ?? 0 }}</div>
							<div class="text-sm text-muted">{{ t("nav.diners") }}</div>
						</div>
					</div>
				</UCard>

				<UCard>
					<div class="flex items-center gap-4">
						<UIcon name="i-lucide-shield-user" class="size-8 text-primary" />
						<div>
							<div class="text-2xl font-bold">{{ guardians?.length ?? 0 }}</div>
							<div class="text-sm text-muted">{{ t("nav.guardians") }}</div>
						</div>
					</div>
				</UCard>

				<UCard>
					<div class="flex items-center gap-4">
						<UIcon name="i-lucide-file-text" class="size-8 text-primary" />
						<div>
							<div class="text-2xl font-bold">{{ contracts?.length ?? 0 }}</div>
							<div class="text-sm text-muted">{{ t("nav.contracts") }}</div>
						</div>
					</div>
				</UCard>

				<UCard>
					<div class="flex items-center gap-4">
						<UIcon name="i-lucide-check-circle" class="size-8 text-success" />
						<div>
							<div class="text-2xl font-bold">{{ activeContracts.length }}</div>
							<div class="text-sm text-muted">
								{{ t("op.active_contracts") }}
							</div>
						</div>
					</div>
				</UCard>
			</div>

			<div class="px-6 pb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<UCard>
					<template #header>
						<div class="flex items-center justify-between">
							<span class="font-semibold">{{ t("op.recent_contracts") }}</span>
							<UButton variant="ghost" size="sm" to="/org/contracts">
								{{ t("common.view_all") }}
							</UButton>
						</div>
					</template>
					<div
						v-if="!contracts?.length"
						class="text-muted text-sm py-4 text-center"
					>
						{{ t("op.no_contracts") }}
					</div>
					<div v-else class="divide-y divide-default">
						<div
							v-for="c in contracts?.slice(0, 5)"
							:key="c.id"
							class="py-3 flex items-center justify-between"
						>
							<div>
								<div class="font-medium">
									{{ c.Caterer[`name_${locale}`] || c.Caterer.name_uk }}
								</div>
								<div class="text-sm text-muted">
									{{ t("op.contract_from") }}
									{{ new Date(c.valid_from).toLocaleDateString() }}
								</div>
							</div>
							<UBadge
								:color="
									!c.valid_to || new Date(c.valid_to) >= now
										? 'success'
										: 'neutral'
								"
								variant="subtle"
							>
								{{
									!c.valid_to || new Date(c.valid_to) >= now
										? t("common.status_active")
										: t("common.status_expired")
								}}
							</UBadge>
						</div>
					</div>
				</UCard>

				<UCard>
					<template #header>
						<div class="flex items-center justify-between">
							<span class="font-semibold">{{ t("op.recent_diners") }}</span>
							<UButton variant="ghost" size="sm" to="/org/diners">
								{{ t("common.view_all") }}
							</UButton>
						</div>
					</template>
					<div
						v-if="!diners?.length"
						class="text-muted text-sm py-4 text-center"
					>
						{{ t("op.no_diners") }}
					</div>
					<div v-else class="divide-y divide-default">
						<div
							v-for="d in diners?.slice(0, 5)"
							:key="d.id"
							class="py-3 flex items-center gap-3"
						>
							<UAvatar :alt="`${d.first_name} ${d.last_name}`" size="sm" />
							<div>
								<div class="font-medium">
									{{ d.first_name }} {{ d.last_name }}
								</div>
								<div class="text-sm text-muted">{{ d.phone }}</div>
							</div>
						</div>
					</div>
				</UCard>
			</div>
		</template>
	</UDashboardPanel>
</template>
