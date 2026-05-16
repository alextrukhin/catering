import type { z, ZodError, ZodType } from "zod";
import type { Nullable } from "~~/shared/types";
import { zodErrorsFlatten } from "~/utils";

export const createValidationComposable = <T, Schema extends ZodType<T>>(
	_schema: Schema
) => {
	type FormType = Nullable<T>;
	type ErrorRecord = Record<string, z.core.$ZodIssue[]>;

	const formRef = ref<FormType>();
	const triedToSubmit = ref(false);
	const interractedFields = ref<string[]>([]);
	const schema = ref<Schema | null>(_schema);

	const setForm = (form: FormType) => {
		formRef.value = form;
	};

	const errors = computed<ErrorRecord>(() => {
		if (!schema.value) return {};
		return (
			zodErrorsFlatten(
				schema.value.safeParse(formRef.value).error as ZodError
			) ?? {}
		);
	});

	const isValid = computed(() => !Object.keys(errors.value ?? {}).length);
	const isInvalid = computed(() => !isValid.value);

	const getMessageOfFieldByKey = (key: string): z.core.$ZodIssue | null => {
		if (!triedToSubmit.value && !interractedFields.value.includes(key))
			return null;
		return errors.value[key]?.[0] ?? null;
	};

	const interract = (field: string) => {
		if (!interractedFields.value.includes(field))
			interractedFields.value.push(field);
	};

	const ignore = (field: string) => {
		interractedFields.value = interractedFields.value.filter(
			(f) => f !== field
		);
	};

	const reset = () => {
		triedToSubmit.value = false;
		interractedFields.value = [];
	};

	const getValidatedForm = (): T => {
		if (!schema.value) throw new Error("Schema is not defined");
		return schema.value.parse(formRef.value);
	};

	const setSchema = (newSchema: Schema) => {
		schema.value = newSchema;
	};

	return {
		getMessageOfFieldByKey,
		setForm,
		interract,
		ignore,
		setSchema,
		getValidatedForm,
		reset,
		triedToSubmit,
		interractedFields,
		isValid,
		isInvalid,
		errors,
	};
};
