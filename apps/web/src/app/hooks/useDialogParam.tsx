import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type UseQueryModalOptions = {
	paramName?: string;
	paramValue: string;
	removeParamAfterOpen?: boolean;
};

type UseQueryModalReturn = {
	isOpen: boolean;
	open: () => void;
	close: () => void;
	queryValue: string | null;
};

export const useQueryModal = (options: UseQueryModalOptions): UseQueryModalReturn => {
	const { paramName = "modal", paramValue, removeParamAfterOpen = true } = options;

	const location = useLocation();
	const navigate = useNavigate();
	const [isOpen, setIsOpen] = useState(false);

	const searchParams = useMemo(() => {
		return new URLSearchParams(location.search);
	}, [location.search]);

	const queryValue = searchParams.get(paramName);

	useEffect(() => {
		if (queryValue !== paramValue) {
			return;
		}

		const timeoutId = setTimeout(() => {
			setIsOpen(true);
		}, 0);

		if (!removeParamAfterOpen) {
			return () => {
				clearTimeout(timeoutId);
			};
		}

		const newSearchParams = new URLSearchParams(location.search);
		newSearchParams.delete(paramName);

		const newSearch = newSearchParams.toString();

		navigate(
			{
				pathname: location.pathname,
				search: newSearch ? `?${newSearch}` : "",
			},
			{ replace: true },
		);

		return () => {
			clearTimeout(timeoutId);
		};
	}, [queryValue, paramValue, paramName, removeParamAfterOpen, navigate, location.pathname, location.search]);

	const open = (): void => {
		setIsOpen(true);
	};

	const close = (): void => {
		setIsOpen(false);
	};

	return {
		isOpen,
		open,
		close,
		queryValue,
	};
}
