// src/hooks/useMDXLoader.ts
import { useEffect, useState } from "react";

type UseMDXLoaderResult = {
	Module: React.ComponentType | null;
	isLoading: boolean;
	error: Error | null;
};

export const useMDXLoader = (content: string): UseMDXLoaderResult => {
	const [Module, setModule] = useState<React.ComponentType | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		const loadMDX = async () => {
			try {
				setIsLoading(true);

				// Implementação do carregamento MDX
				const { default: mdx } = await import(
					/* @vite-ignore */
					`data:text/javascript;charset=utf-8,${encodeURIComponent(`
            import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
            export default function Content() {
              ${content}
            }
          `)}`
				);

				setModule(() => mdx);
			} catch (err) {
				setError(err as Error);
			} finally {
				setIsLoading(false);
			}
		};

		loadMDX();
	}, [content]);

	return { Module, isLoading, error };
}
