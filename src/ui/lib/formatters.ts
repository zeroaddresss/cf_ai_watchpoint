export function formatDateTime(value: string | null): string {
	if (value === null) {
		return "Not scheduled";
	}

	return new Date(value).toLocaleString();
}

export function uppercaseRunKind(kind: "baseline" | "rescan"): string {
	return kind.toUpperCase();
}
