import { Button } from "@/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export type TablePagination = {
	page: number;
	size: number;
	totalElements: number;
	totalPages: number;
};

export type TablePaginationProps = {
	pagination?: TablePagination;
	onPageChange?: (page: number) => void;
	onSizeChange?: (size: number) => void;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const TableFooter = ({ pagination, onPageChange, onSizeChange }: TablePaginationProps) => {
	if (!pagination) {
		return null;
	}

	const totalPages = Math.max(pagination.totalPages ?? 1, 1);
	const currentPage = (pagination.page ?? 0) + 1;
	const pageSize = pagination.size ?? 10;
	const totalElements = pagination.totalElements ?? 0;

	const canGoPrev = (pagination.page ?? 0) > 0;
	const canGoNext = (pagination.page ?? 0) < totalPages - 1;
	const showPaginationControls = totalPages > 1 && Boolean(onPageChange);

	return (
		<div className="bg-muted/20 w-full border-t px-4 py-3">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<span className="text-muted-foreground text-sm">
					Página {currentPage} de {totalPages}
					{totalElements > 0 ? ` • ${totalElements} registros` : ""}
				</span>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
					<div className="flex items-center justify-between gap-2 sm:justify-start">
						<span className="text-muted-foreground text-sm whitespace-nowrap">Linhas por página</span>

						<Select value={`${pageSize}`} onValueChange={(value) => onSizeChange?.(Number(value))}>
							<SelectTrigger className="h-8 w-20" aria-label="Linhas por página">
								<SelectValue placeholder={`${pageSize}`} />
							</SelectTrigger>

							<SelectContent side="top">
								{PAGE_SIZE_OPTIONS.map((size) => (
									<SelectItem key={size} value={`${size}`} className="hover:cursor-pointer">
										{size}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{showPaginationControls ? (
						<div className="flex items-center justify-end gap-1">
							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								className="hidden sm:inline-flex"
								onClick={() => onPageChange?.(0)}
								disabled={!canGoPrev}
								aria-label="Primeira página"
								title="Primeira página"
							>
								<ChevronsLeft className="h-4 w-4" />
							</Button>

							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								onClick={() => onPageChange?.((pagination.page ?? 0) - 1)}
								disabled={!canGoPrev}
								aria-label="Página anterior"
								title="Página anterior"
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>

							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								onClick={() => onPageChange?.((pagination.page ?? 0) + 1)}
								disabled={!canGoNext}
								aria-label="Próxima página"
								title="Próxima página"
							>
								<ChevronRight className="h-4 w-4" />
							</Button>

							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								className="hidden sm:inline-flex"
								onClick={() => onPageChange?.(totalPages - 1)}
								disabled={!canGoNext}
								aria-label="Última página"
								title="Última página"
							>
								<ChevronsRight className="h-4 w-4" />
							</Button>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
};

