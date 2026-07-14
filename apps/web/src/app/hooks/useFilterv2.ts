import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type QueryPrimitive = string | number | boolean;
type FormatResult = QueryPrimitive | QueryPrimitive[];

type FormatterMap<T extends object = Record<string, unknown>> = {
	[K in keyof T]?: (value: T[K]) => FormatResult;
};

type UseFilterOptions<T extends object = Record<string, unknown>> = {
	formatters?: FormatterMap<T>;
	storageKey?: string;
	autoApply?: boolean;
	initialFilter?: Partial<T>;
	loadFromStorage?: boolean;
};

const buildQueryFromValues = <T extends object>(values: Partial<T>, formatters?: FormatterMap<T>): string => {
	return Object.keys(values)
		.map((k) => {
			const key = k as keyof T;
			const rawValue = values[key];
			if (rawValue === undefined || rawValue === null || rawValue === "") return "";

			const applyFormatter = (value: unknown): QueryPrimitive | QueryPrimitive[] => {
				const formatter = formatters?.[key];
				if (!formatter) return value as QueryPrimitive;
				return formatter(value as T[keyof T]);
			};

			if (Array.isArray(rawValue)) {
				const formatted = rawValue.map((v) => applyFormatter(v));
				return `${String(key)}=${encodeURIComponent(formatted.join(","))}`;
			}

			const formatted = applyFormatter(rawValue);
			if (formatted === undefined || formatted === null || formatted === "") return "";

			if (Array.isArray(formatted)) {
				return `${String(key)}=${encodeURIComponent(formatted.join(","))}`;
			}

			return `${String(key)}=${encodeURIComponent(String(formatted))}`;
		})
		.filter(Boolean)
		.join("&");
}

const storageManager = {
	get: <T>(key: string): Partial<T> | null => {
		try {
			const saved = localStorage.getItem(key);
			return saved ? JSON.parse(saved) : null;
		} catch {
			localStorage.removeItem(key);
			return null;
		}
	},

	set: <T>(key: string, value: Partial<T>): void => {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			return;
		}
	},

	remove: (key: string): void => {
		try {
			localStorage.removeItem(key);
		} catch {
			return;
		}
	},
};

//
export const useFilterV2 = <T extends object = Record<string, unknown>>({
	formatters,
	storageKey,
	autoApply = false,
	initialFilter = {},
	loadFromStorage,
}: UseFilterOptions<T> = {}) => {
	const [initialFilterSnapshot] = useState<Partial<T>>(initialFilter);
	const [initialValuesSnapshot] = useState<Partial<T>>(() => {
		let initialValues: Partial<T> = { ...initialFilterSnapshot };

		if (storageKey && loadFromStorage) {
			const saved = storageManager.get<T>(storageKey);
			if (saved) {
				initialValues = { ...saved, ...initialFilterSnapshot };
			}
		}

		return initialValues;
	});
	const [filterValues, setFilterValues] = useState<Partial<T>>(initialValuesSnapshot);
	const [filterQuery, setFilterQuery] = useState<string>(() =>
		autoApply ? buildQueryFromValues(initialValuesSnapshot, formatters) : "",
	);
	const isInitialized = true;

	const formattersRef = useRef<FormatterMap<T> | undefined>(formatters);
	const storageKeyRef = useRef<string | undefined>(storageKey);

	useEffect(() => {
		formattersRef.current = formatters;
		storageKeyRef.current = storageKey;
	}, [formatters, storageKey]);

	const isValidFilterValue = useCallback((value: unknown) => {
		if (value === undefined || value === null || value === "") return false;
		if (Array.isArray(value)) return value.length > 0;
		return true;
	}, []);

	const areEqual = useCallback((a: unknown, b: unknown) => {
		if (Array.isArray(a) && Array.isArray(b)) {
			if (a.length !== b.length) return false;
			return a.every((v, i) => v === b[i]);
		}
		return a === b;
	}, []);

	const formatFilterValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
		const fmts = formattersRef.current;

		const applyFormatter = (v: unknown): QueryPrimitive => {
			if (fmts?.[key]) {
				const out = fmts[key]!(v as T[K]);
				if (Array.isArray(out)) {
					return out as unknown as QueryPrimitive;
				}
				return out as QueryPrimitive;
			}
			return v as QueryPrimitive;
		};

		if (Array.isArray(value)) {
			const formatted = value.map((v) => applyFormatter(v));
			return `${String(key)}=${encodeURIComponent(formatted.join(","))}`;
		}

		const formatted = applyFormatter(value);
		if (formatted === undefined || formatted === null || formatted === "") {
			return "";
		}

		if (Array.isArray(formatted)) {
			return `${String(key)}=${encodeURIComponent(formatted.join(","))}`;
		}

		return `${String(key)}=${encodeURIComponent(String(formatted))}`;
	}, []);

	const buildFilterQuery = useCallback(
		(values: Partial<T>) => {
			return Object.keys(values)
				.map((k) => {
					const key = k as keyof T;
					const v = values[key];
					if (v === undefined || v === null || v === "") return "";
					return formatFilterValue(key, v as T[keyof T]);
				})
				.filter(Boolean)
				.join("&");
		},
		[formatFilterValue],
	);

	useEffect(() => {
		if (!storageKeyRef.current) return;

		const hasValidValues = Object.keys(filterValues).some((key) => {
			const value = filterValues[key as keyof T];
			return value !== undefined && value !== null && value !== "";
		});

		if (hasValidValues) {
			storageManager.set(storageKeyRef.current, filterValues);
		} else {
			storageManager.remove(storageKeyRef.current);
		}
	}, [filterValues, isInitialized]);

	const handleFilterChange = useCallback(
		<K extends keyof T>(name: K, value: T[K] | null | undefined) => {
			setFilterValues((prev) => {
				const next: Partial<T> = { ...prev };

				const shouldRemove =
					value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

				if (!shouldRemove) {
					next[name] = value as T[K];
				} else {
					delete next[name];
				}

				if (autoApply) {
					setFilterQuery(buildFilterQuery(next));
				}

				return next;
			});
		},
		[autoApply, buildFilterQuery],
	);

	const applyFilters = useCallback(() => {
		setFilterQuery(buildFilterQuery(filterValues));
	}, [buildFilterQuery, filterValues]);

	const clearFilters = useCallback(() => {
		const base = initialFilterSnapshot;
		setFilterValues(base);
		if (autoApply) {
			setFilterQuery(buildFilterQuery(base));
		}
	}, [autoApply, buildFilterQuery, initialFilterSnapshot]);

	const resetToInitial = useCallback(() => {
		const base = initialFilterSnapshot;
		setFilterValues(base);
		if (autoApply) setFilterQuery(buildFilterQuery(base));
	}, [autoApply, buildFilterQuery, initialFilterSnapshot]);

	const activeFiltersCount = useMemo(() => {
		return Object.keys(filterValues).reduce((acc, k) => {
			const key = k as keyof T;
			const v = filterValues[key];
			return acc + (isValidFilterValue(v) ? 1 : 0);
		}, 0);
	}, [filterValues, isValidFilterValue]);

	const appliedFiltersCount = useMemo(() => {
		const base = initialFilterSnapshot;

		return Object.keys(filterValues).reduce((acc, k) => {
			const key = k as keyof T;
			const v = filterValues[key];
			if (!isValidFilterValue(v)) return acc;

			const baseValue = base[key];
			return acc + (!areEqual(v, baseValue) ? 1 : 0);
		}, 0);
	}, [filterValues, isValidFilterValue, areEqual, initialFilterSnapshot]);

	return {
		filterValues,
		filterQuery,
		handleFilterChange,
		applyFilters,
		clearFilters,
		resetToInitial,
		setFilterValues,
		isInitialized,
		activeFiltersCount,
		appliedFiltersCount,
	};
}
