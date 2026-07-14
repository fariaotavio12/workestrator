import type { ReactNode } from "react";

type BackdropProps = {
	open: boolean;
	children?: ReactNode;
};

export const Backdrop = ({ open, children }: BackdropProps) => {
	if (!open) return null;

	return <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[1px]">{children}</div>;
};
