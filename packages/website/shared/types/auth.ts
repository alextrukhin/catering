import { z } from "zod";

export const signUpSchema = z.object({
	org_name: z.string().min(1),
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

export const catererSignUpSchema = z.object({
	caterer_name: z.string().min(1),
	first_name: z.string().min(1),
	last_name: z.string().min(1),
	email: z.email(),
	password: z.string().min(8),
	remember_me: z.boolean().optional(),
});

export const phoneSchema = z.object({
	phone: z.string().min(7),
});

export const otpSchema = z.object({
	phone: z.string().min(7),
	otp: z.string().length(6),
});
