import "@tanstack/react-table";
import type { RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface ColumnMeta<TData extends RowData, TValue> {
		_types?: [TData, TValue];
		className?: string;
		mobileLabel?: string;
		mobileHidden?: boolean;
		mobileOrder?: number;
		mobileTitle?: boolean;
		mobileSubtitle?: boolean;
		mobileHeader?: boolean;
		mobileStatus?: boolean;
		mobileFooter?: boolean;
		mobileValueClassName?: string;
	}
}
