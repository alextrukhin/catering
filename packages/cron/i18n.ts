import IntlMessageFormat from "intl-messageformat";

type Locale = "uk" | "en";

const messages: Record<Locale, Record<string, string>> = {
	uk: {
		greeting: "Привіт, {name}! 🍽️",
		diner_header: "Ваш вибір на сьогодні:",
		guardian_header: "Вибір страв для ваших дітей на сьогодні:",
		no_selection: "Ще не обрано",
		course_line: "• {course}: {dish}",
		child_name: "{firstName} {lastName}:",
		btn_diner: "Обрати / змінити страви",
		btn_guardian: "Переглянути",
	},
	en: {
		greeting: "Hi, {name}! 🍽️",
		diner_header: "Your selection for today:",
		guardian_header: "Dish selection for your children today:",
		no_selection: "Not selected yet",
		course_line: "• {course}: {dish}",
		child_name: "{firstName} {lastName}:",
		btn_diner: "Select / change dishes",
		btn_guardian: "View",
	},
};

function resolveLocale(lang: string | null | undefined): Locale {
	return lang === "uk" ? "uk" : "en";
}

export function t(
	lang: string | null | undefined,
	key: string,
	values?: Record<string, string>
): string {
	const locale = resolveLocale(lang);
	const template = messages[locale][key] ?? messages.en[key] ?? key;
	if (!values) return template;
	return new IntlMessageFormat(template, locale).format(values) as string;
}
