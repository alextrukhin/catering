<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";

definePageMeta({ layout: "catering" });

const UBtn = resolveComponent("UButton");
const { $client } = useNuxtApp();
const toast = useToast();
const { t, locale } = useI18n();

const { data: dishes, refresh } = $client.catering.dishes.list.useQuery();

type Dish = NonNullable<typeof dishes.value>[number];
type DishPrice = Dish["Prices"][number];

const slideOpen = ref(false);
const editing = ref<Dish | null>(null);
const form = reactive({
	name_uk: "",
	name_en: "",
	weight: "",
	ingredients: "",
	notes: "",
	valid_from: "",
	valid_to: "",
});
const photoFile = ref<File | null>(null);
const removePhotoFlag = ref(false);
const saving = ref(false);
const deleting = ref<number | null>(null);

const photoPreview = computed(() => {
	if (photoFile.value) return URL.createObjectURL(photoFile.value);
	if (editing.value?.Photo && !removePhotoFlag.value)
		return `/api/dishes/${editing.value.id}/photo`;
	return null;
});

function openCreate() {
	editing.value = null;
	Object.assign(form, {
		name_uk: "",
		name_en: "",
		weight: "",
		ingredients: "",
		notes: "",
		valid_from: "",
		valid_to: "",
	});
	photoFile.value = null;
	removePhotoFlag.value = false;
	slideOpen.value = true;
}

function openEdit(d: Dish) {
	editing.value = d;
	form.name_uk = d.name_uk;
	form.name_en = d.name_en;
	form.weight = d.weight ? String(d.weight) : "";
	form.ingredients = (d.ingredients ?? []).join("\n");
	form.notes = d.notes ?? "";
	form.valid_from = new Date(d.valid_from).toISOString().slice(0, 10);
	form.valid_to = d.valid_to
		? new Date(d.valid_to).toISOString().slice(0, 10)
		: "";
	photoFile.value = null;
	removePhotoFlag.value = false;
	Object.assign(priceForm, { price: "", valid_from: "", valid_to: "" });
	slideOpen.value = true;
}

function syncEditing() {
	if (editing.value)
		editing.value =
			dishes.value?.find((d) => d.id === editing.value!.id) ?? null;
}

function onFileChange(e: Event) {
	photoFile.value = (e.target as HTMLInputElement).files?.[0] ?? null;
	removePhotoFlag.value = false;
}

async function save() {
	if (!form.name_uk.trim() || !form.name_en.trim()) {
		toast.add({ title: t("ct.dish_name_req"), color: "error" });
		return;
	}
	if (!form.valid_from) {
		toast.add({ title: t("ct.dish_date_req"), color: "error" });
		return;
	}
	saving.value = true;
	try {
		const fd = new FormData();
		fd.append("name_uk", form.name_uk.trim());
		fd.append("name_en", form.name_en.trim());
		if (form.weight) fd.append("weight", form.weight);
		fd.append("ingredients", form.ingredients);
		fd.append("notes", form.notes);
		fd.append("valid_from", form.valid_from);
		if (form.valid_to) fd.append("valid_to", form.valid_to);
		if (editing.value) {
			fd.append("id", String(editing.value.id));
			if (photoFile.value) fd.append("new_photo", photoFile.value);
			else if (removePhotoFlag.value) fd.append("remove_photo", "true");
			await $client.catering.dishes.update.mutate(fd as any);
			toast.add({ title: t("ct.dish_updated") });
		} else {
			if (photoFile.value) fd.append("new_photo", photoFile.value);
			await $client.catering.dishes.create.mutate(fd as any);
			toast.add({ title: t("ct.dish_created") });
		}
		slideOpen.value = false;
		photoFile.value = null;
		removePhotoFlag.value = false;
		await refresh();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		saving.value = false;
	}
}

async function deleteDish(id: number) {
	deleting.value = id;
	try {
		await $client.catering.dishes.delete.mutate({ id });
		toast.add({ title: t("ct.dish_deleted") });
		await refresh();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		deleting.value = null;
	}
}

const priceForm = reactive({ price: "", valid_from: "", valid_to: "" });
const priceAdding = ref(false);
const priceRemoving = ref<number | null>(null);

async function addPrice() {
	if (!priceForm.price || !priceForm.valid_from || !editing.value) {
		toast.add({ title: t("ct.dish_price_req"), color: "error" });
		return;
	}
	priceAdding.value = true;
	try {
		await $client.catering.dishes.addPrice.mutate({
			dish_id: editing.value.id,
			price: Number(priceForm.price),
			valid_from: new Date(priceForm.valid_from),
			valid_to: priceForm.valid_to ? new Date(priceForm.valid_to) : null,
		});
		toast.add({ title: t("ct.dish_price_added") });
		Object.assign(priceForm, { price: "", valid_from: "", valid_to: "" });
		await refresh();
		syncEditing();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		priceAdding.value = false;
	}
}

async function removePrice(id: number) {
	priceRemoving.value = id;
	try {
		await $client.catering.dishes.removePrice.mutate({ id });
		toast.add({ title: t("ct.dish_price_removed") });
		await refresh();
		syncEditing();
	} catch (e: any) {
		toast.add({
			title: t("common.error"),
			description: e.message,
			color: "error",
		});
	} finally {
		priceRemoving.value = null;
	}
}

function formatPrice(p: DishPrice) {
	const from = new Date(p.valid_from).toLocaleDateString();
	const to = p.valid_to ? new Date(p.valid_to).toLocaleDateString() : "open";
	return `${p.price.toFixed(2)} · ${from} — ${to}`;
}

const columns = computed((): TableColumn<Dish>[] => [
	{
		id: "photo",
		header: "",
		cell: ({ row }) =>
			row.original.Photo
				? h("img", {
						src: `/api/dishes/${row.original.id}/photo`,
						class: "w-10 h-10 rounded object-cover",
					})
				: h(
						"div",
						{
							class:
								"w-10 h-10 rounded bg-accented flex items-center justify-center text-muted text-xs",
						},
						"—"
					),
	},
	{ accessorKey: `name_${locale.value}`, header: t("common.name") },
	{
		id: "valid_from",
		header: t("ct.dish_available_from"),
		cell: ({ row }) =>
			h("span", {}, new Date(row.original.valid_from).toLocaleDateString()),
	},
	{
		id: "valid_to",
		header: t("ct.dish_available_to"),
		cell: ({ row }) =>
			h(
				"span",
				{},
				row.original.valid_to
					? new Date(row.original.valid_to).toLocaleDateString()
					: "—"
			),
	},
	{
		id: "prices",
		header: t("ct.dish_prices"),
		cell: ({ row }) => h("span", {}, String(row.original.Prices.length)),
	},
	{
		id: "actions",
		cell: ({ row }) =>
			h("div", { class: "flex items-center gap-2 justify-end" }, [
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					icon: "i-lucide-pencil",
					class: "cursor-pointer",
					onClick: () => openEdit(row.original),
				}),
				h(UBtn, {
					size: "xs",
					variant: "ghost",
					color: "error",
					icon: "i-lucide-trash-2",
					loading: deleting.value === row.original.id,
					class: "cursor-pointer",
					onClick: () => deleteDish(row.original.id),
				}),
			]),
	},
]);
</script>

<template>
	<UDashboardPanel id="dishes">
		<template #header>
			<UDashboardNavbar :title="t('nav.dishes')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton icon="i-lucide-plus" @click="openCreate">
						{{ t("ct.new_dish") }}
					</UButton>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="p-6">
				<UTable :data="dishes ?? []" :columns="columns" />
			</div>
		</template>
	</UDashboardPanel>

	<!-- Create / edit slideover -->
	<USlideover
		v-model:open="slideOpen"
		:title="editing ? t('ct.edit_dish') : t('ct.new_dish')"
	>
		<template #body>
			<div class="flex flex-col gap-4 p-4">
				<UFormField :label="t('ct.dish_name_uk')" required>
					<UInput v-model="form.name_uk" placeholder="e.g. Борщ" />
				</UFormField>
				<UFormField :label="t('ct.dish_name_en')" required>
					<UInput v-model="form.name_en" placeholder="e.g. Borscht" />
				</UFormField>
				<UFormField :label="t('ct.dish_weight')">
					<UInput v-model="form.weight" type="number" placeholder="e.g. 300" />
				</UFormField>
				<UFormField :label="t('ct.dish_ingredients')">
					<UTextarea
						v-model="form.ingredients"
						:rows="3"
						placeholder="Beetroot&#10;Cabbage&#10;..."
					/>
				</UFormField>
				<UFormField :label="t('ct.dish_notes')">
					<UTextarea
						v-model="form.notes"
						:rows="2"
						placeholder="Allergens, preparation notes..."
					/>
				</UFormField>

				<div class="flex gap-3">
					<UFormField
						:label="t('ct.dish_available_from')"
						required
						class="flex-1"
					>
						<UInput v-model="form.valid_from" type="date" />
					</UFormField>
					<UFormField :label="t('ct.dish_available_to')" class="flex-1">
						<UInput v-model="form.valid_to" type="date" />
					</UFormField>
				</div>

				<UFormField :label="t('ct.dish_photo')">
					<div class="flex flex-col gap-2">
						<input
							type="file"
							accept="image/*"
							class="text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-accented file:cursor-pointer cursor-pointer"
							@change="onFileChange"
						/>
						<img
							v-if="photoPreview"
							:src="photoPreview"
							class="w-32 h-32 object-cover rounded border border-default"
						/>
						<div
							v-if="editing?.Photo && !removePhotoFlag && !photoFile"
							class="flex items-center gap-1"
						>
							<UButton
								size="xs"
								variant="ghost"
								color="error"
								icon="i-lucide-trash-2"
								@click="removePhotoFlag = true"
							>
								{{ t("ct.dish_remove_photo") }}
							</UButton>
						</div>
						<div v-if="removePhotoFlag" class="text-sm text-red-500">
							{{ t("ct.dish_photo_pending") }}
							<span
								class="underline cursor-pointer"
								@click="removePhotoFlag = false"
							>
								{{ t("ct.dish_undo") }}
							</span>
						</div>
					</div>
				</UFormField>

				<!-- Prices (edit only) -->
				<div
					v-if="editing"
					class="border-t border-default pt-4 flex flex-col gap-3"
				>
					<div class="font-medium text-sm">{{ t("ct.dish_prices") }}</div>

					<div v-if="editing.Prices.length" class="flex flex-col gap-2">
						<div
							v-for="p in editing.Prices"
							:key="p.id"
							class="flex items-center justify-between rounded-lg border border-default px-3 py-2"
						>
							<div class="text-sm">
								<span class="font-medium tabular-nums">
									{{ p.price.toFixed(2) }}
								</span>
								<span class="text-muted ml-2">
									{{ new Date(p.valid_from).toLocaleDateString() }}
									—
									{{
										p.valid_to
											? new Date(p.valid_to).toLocaleDateString()
											: t("ct.dish_open")
									}}
								</span>
							</div>
							<UButton
								size="xs"
								variant="ghost"
								color="error"
								icon="i-lucide-x"
								:loading="priceRemoving === p.id"
								class="cursor-pointer"
								@click="removePrice(p.id)"
							/>
						</div>
					</div>
					<p v-else class="text-muted text-sm">{{ t("ct.dish_no_prices") }}</p>

					<!-- Add price -->
					<div class="flex gap-2 items-end">
						<UFormField :label="t('ct.dish_price_label')" class="w-24">
							<UInput
								v-model="priceForm.price"
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
							/>
						</UFormField>
						<UFormField :label="t('common.from')" class="flex-1">
							<UInput v-model="priceForm.valid_from" type="date" />
						</UFormField>
						<UFormField :label="t('common.to')" class="flex-1">
							<UInput v-model="priceForm.valid_to" type="date" />
						</UFormField>
					</div>
					<UButton
						:loading="priceAdding"
						:disabled="!priceForm.price || !priceForm.valid_from"
						@click="addPrice"
					>
						{{ t("ct.dish_add_price") }}
					</UButton>
				</div>
				<p v-else class="text-muted text-xs border-t border-default pt-3">
					{{ t("ct.dish_save_first") }}
				</p>
			</div>
		</template>
		<template #footer>
			<div class="flex gap-3 p-4">
				<UButton variant="ghost" class="flex-1" @click="slideOpen = false">
					{{ t("common.cancel") }}
				</UButton>
				<UButton class="flex-1" :loading="saving" @click="save">
					{{ editing ? t("common.save_changes") : t("common.create") }}
				</UButton>
			</div>
		</template>
	</USlideover>
</template>
