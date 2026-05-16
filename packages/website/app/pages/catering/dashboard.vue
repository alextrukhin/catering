<script setup lang="ts">
definePageMeta({ layout: "catering" });

const { $client } = useNuxtApp();
const { t, locale } = useI18n();

const { data: contracts } = $client.catering.contracts.list.useQuery();
const { data: meals } = $client.catering.meals.list.useQuery();
const { data: inviteCodes } = $client.catering.inviteCodes.list.useQuery();

const now = new Date();

const activeContracts = computed(() =>
	(contracts.value ?? []).filter(
		(c) =>
			new Date(c.valid_from) <= now &&
			(!c.valid_to || new Date(c.valid_to) >= now)
	)
);

const activeInviteCodes = computed(() =>
	(inviteCodes.value ?? []).filter(
		(c) =>
			new Date(c.valid_from) <= now &&
			(!c.valid_to || new Date(c.valid_to) >= now)
	)
);

const recentContracts = computed(() => (contracts.value ?? []).slice(0, 5));
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
								{{ t("ct.active_contracts") }}
							</div>
						</div>
					</div>
				</UCard>

				<UCard>
					<div class="flex items-center gap-4">
						<UIcon name="i-lucide-utensils" class="size-8 text-primary" />
						<div>
							<div class="text-2xl font-bold">{{ meals?.length ?? 0 }}</div>
							<div class="text-sm text-muted">{{ t("nav.meals") }}</div>
						</div>
					</div>
				</UCard>

				<UCard>
					<div class="flex items-center gap-4">
						<UIcon name="i-lucide-ticket" class="size-8 text-primary" />
						<div>
							<div class="text-2xl font-bold">
								{{ activeInviteCodes.length }}
							</div>
							<div class="text-sm text-muted">
								{{ t("ct.active_invite_codes") }}
							</div>
						</div>
					</div>
				</UCard>
			</div>

			<div class="px-6 pb-6">
				<UCard>
					<template #header>
						<div class="flex items-center justify-between">
							<span class="font-semibold">Recent Contracts</span>
							<UButton variant="ghost" size="sm" to="/catering/contracts">
								View all
							</UButton>
						</div>
					</template>
					<div
						v-if="!recentContracts.length"
						class="text-sm text-muted py-4 text-center"
					>
						{{ t("ct.no_contracts") }}
					</div>
					<ul v-else class="divide-y divide-default">
						<li
							v-for="c in recentContracts"
							:key="c.id"
							class="flex items-center justify-between py-3"
						>
							<div>
								<div class="font-medium">
									{{ c.Organization[`name_${locale}`] ?? "" }}
								</div>
								<div class="text-sm text-muted">
									{{ new Date(c.valid_from).toLocaleDateString() }}
									<template v-if="c.valid_to">
										– {{ new Date(c.valid_to).toLocaleDateString() }}
									</template>
								</div>
							</div>
							<UBadge
								:color="
									new Date(c.valid_from) <= now &&
									(!c.valid_to || new Date(c.valid_to) >= now)
										? 'success'
										: new Date(c.valid_from) > now
											? 'warning'
											: 'neutral'
								"
								variant="subtle"
							>
								{{
									new Date(c.valid_from) <= now &&
									(!c.valid_to || new Date(c.valid_to) >= now)
										? t("common.status_active")
										: new Date(c.valid_from) > now
											? t("common.status_upcoming")
											: t("common.status_expired")
								}}
							</UBadge>
						</li>
					</ul>
				</UCard>
			</div>
		</template>
	</UDashboardPanel>
</template>
