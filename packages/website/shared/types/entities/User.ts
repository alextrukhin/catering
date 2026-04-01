import { z } from "zod";
import {
	preferredMessengerSchema,
	areaUnitSchema,
	userTypeSchema,
	mapEngineSchema,
	dateTimeSchema,
} from "~~/shared/types";

export const userSchema = z.object({
	email: z.string(),
	first_name: z.string(),
	last_name: z.string(),
	mobile_number: z.string().nullable(),
	preferred_messenger: preferredMessengerSchema.nullable(),
	preferred_area_unit: areaUnitSchema,
	show_map_engine_select: z.boolean(),
	default_map_map_engine: mapEngineSchema,
	default_field_map_engine: mapEngineSchema,
	default_trial_map_engine: mapEngineSchema,
	trial_title_genai_enabled: z.boolean(),
	trial_variants_genai_enabled: z.boolean(),
	agrirouter_endpoint: z.string().nullable(),
	agrirouter_public_key: z.string().nullable(),
	agrirouter_password: z.string().nullable(),
	type: userTypeSchema,
	photo_file_id: z.number().nullable(),
	experimental_advanced_trial_planning: z.boolean(),
	// createdAt: dateTimeSchema,
	// updatedAt: dateTimeSchema.nullable(),
});
