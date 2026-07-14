import { useMemo } from "react";
import { useLocation } from "react-router-dom";

export type Breadcrumb = {
	name: string;
	link?: string;
};

export type UseBreadcrumbsOptions = {
	customNames?: Record<string, string>;
	removePath?: string[];
	removeNumericSegments?: boolean;
	formatLabel?: (segment: string) => string;
};

const defaultFormatLabel = (segment: string) => decodeURIComponent(segment).replace(/-/g, " ");

const isNumericSegment = (segment: string) => /^\d+$/.test(segment);

export const useBreadcrumbs = ({
	customNames = {},
	removePath = [],
	removeNumericSegments = true,
	formatLabel = defaultFormatLabel,
}: UseBreadcrumbsOptions = {}): Breadcrumb[] => {
	const { pathname } = useLocation();

	return useMemo(() => {
		const segments = pathname.split("/").filter(Boolean);

		return segments.reduce<Breadcrumb[]>((acc, segment, index) => {
			if (removePath.includes(segment)) return acc;
			if (removeNumericSegments && isNumericSegment(segment)) return acc;

			const link = `/${segments.slice(0, index + 1).join("/")}`;
			const rawLabel = customNames[segment] ?? segment;
			const name = formatLabel(rawLabel);

			acc.push({ name, link });
			return acc;
		}, []);
	}, [pathname, customNames, removePath, removeNumericSegments, formatLabel]);
};

