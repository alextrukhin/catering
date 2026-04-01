import { z } from "zod";

export const signUpSchema = z.object({
	first_name: z.string().min(1),
	last_name: z.string().min(1),
	email: z.email(),
	password: z.string().min(8),
	remember_me: z.boolean().optional(),
});

export const signInSchema = z.object({
	email: z.email(),
	password: z.string(),
	remember_me: z.boolean().optional(),
});
