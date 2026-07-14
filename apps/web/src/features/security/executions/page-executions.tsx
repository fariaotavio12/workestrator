import { usePaginatedData } from "@/app/hooks/usePaginatedData";
import { Rotas } from "@/app/routing/variables";
import {
	Badge,
	Card,
	CardContent,
	CardHeader,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	EmptyState,
	ErrorState,
	PageHeader,
	ResponsiveTableCustom,
	Typography,
	type ChartConfig,
} from "@/components";
import { renderSquadIcon } from "@/components/orchestrator/icon-picker/render-squad-icon";
import { useRecentRunsQuery } from "@/features/security/executions/api";
import { useSquadHistoryDialogStore } from "@/features/security/orchestrator-shared/model";
import type { RunRecord } from "@/features/security/orchestrator-shared/types";
import { useSquadsQuery } from "@/features/security/squads/api";
import type { ColumnDef } from "@tanstack/react-table";
import { Activity, Ban, CheckCircle2, Clock3, History, Play, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

const runStatus: Record<RunRecord["status"], { label: string; variant: "default" | "success" | "destructive" | "secondary" }> = {
	running: { label: "Rodando", variant: "default" },
	done: { label: "Concluído", variant: "success" },
	failed: { label: "Falhou", variant: "destructive" },
	aborted: { label: "Abortado", variant: "secondary" },
};

const metricTone: Record<RunRecord["status"], string> = {
	running: "var(--primary)",
	done: "var(--success)",
	failed: "var(--destructive)",
	aborted: "var(--muted-foreground)",
};

const formatDateTime = (iso: string): string =>
	new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(iso));

const formatNumber = (value: number): string => new Intl.NumberFormat("pt-BR").format(value);

const formatPercent = (value: number): string =>
	new Intl.NumberFormat("pt-BR", {
		maximumFractionDigits: 0,
		style: "percent",
	}).format(value);

const duration = (startedAt: string, endedAt: string | null, now: number): string => {
	const end = endedAt ? new Date(endedAt).getTime() : now;
	const secs = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000));
	if (secs < 60) return `${secs}s`;
	const minutes = Math.floor(secs / 60);
	if (minutes < 60) return `${minutes}m ${String(secs % 60).padStart(2, "0")}s`;
	const hours = Math.floor(minutes / 60);
	return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
};

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dayKey = (date: Date): string =>
	new Intl.DateTimeFormat("en-CA", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);

const dayLabel = (date: Date): string =>
	new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "2-digit",
	}).format(date);

const getJsonArrayLength = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

type MetricCardProps = {
	helper: string;
	icon: ReactNode;
	label: string;
	value: string;
};

const MetricCard = ({ helper, icon, label, value }: MetricCardProps) => (
	<Card size="sm" className="min-h-32">
		<CardContent className="flex h-full flex-col justify-between gap-4">
			<div className="flex items-center justify-between gap-3">
				<Typography variant="caption" className="text-muted-foreground">
					{label}
				</Typography>
				<div className="border-border bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg border">
					{icon}
				</div>
			</div>
			<div className="space-y-1">
				<Typography variant="title-lg" className="font-mono tabular-nums">
					{value}
				</Typography>
				<Typography variant="caption" className="text-muted-foreground">
					{helper}
				</Typography>
			</div>
		</CardContent>
	</Card>
);

export const PageExecutions = () => {
	const navigate = useNavigate();
	const openHistoryDialog = useSquadHistoryDialogStore((s) => s.openHistoryDialog);
	const { data: squads = [], isError: isSquadsError, refetch: refetchSquads } = useSquadsQuery();
	const {
		data: summaryPage,
		isLoading: isSummaryLoading,
		isError: isSummaryError,
		refetch: refetchSummary,
	} = useRecentRunsQuery({ page: 0, size: 100 }, { staleTime: 15_000 });
	const { data, isLoading, isError, refetch, pagination, updatePagination } = usePaginatedData<RunRecord>({
		query: useRecentRunsQuery,
		storageKey: "executionsPagination",
	});
	const [now, setNow] = useState(() => Date.now());

	const hasRunningExecution = useMemo(() => data.some((run) => run.status === "running"), [data]);

	useEffect(() => {
		if (!hasRunningExecution) return;
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, [hasRunningExecution]);

	const squadById = useMemo(() => new Map(squads.map((squad) => [squad.id, squad])), [squads]);
	const summaryRuns = summaryPage?.data ?? data;

	const dashboardSummary = useMemo(() => {
		const today = startOfLocalDay(new Date());
		const sevenDays = Array.from({ length: 7 }, (_, index) => {
			const date = new Date(today);
			date.setDate(today.getDate() - (6 - index));
			return {
				count: 0,
				key: dayKey(date),
				label: dayLabel(date),
			};
		});
		const dailyByKey = new Map(sevenDays.map((item) => [item.key, item]));
		const statusCounts = new Map<RunRecord["status"], number>([
			["running", 0],
			["done", 0],
			["failed", 0],
			["aborted", 0],
		]);
		const squadCounts = new Map<string, number>();
		let todayCount = 0;
		let completedForRate = 0;
		let successCount = 0;
		let totalDurationSeconds = 0;
		let totalDurationRuns = 0;

		for (const run of summaryRuns) {
			const startedAt = new Date(run.startedAt);
			statusCounts.set(run.status, (statusCounts.get(run.status) ?? 0) + 1);
			squadCounts.set(run.squadId, (squadCounts.get(run.squadId) ?? 0) + 1);

			if (startedAt >= today) todayCount += 1;

			const daily = dailyByKey.get(dayKey(startedAt));
			if (daily) daily.count += 1;

			if (run.status !== "running") {
				completedForRate += 1;
				if (run.status === "done") successCount += 1;
			}

			if (run.endedAt) {
				totalDurationSeconds += Math.max(0, Math.round((new Date(run.endedAt).getTime() - startedAt.getTime()) / 1000));
				totalDurationRuns += 1;
			}
		}

		const statusChart = Array.from(statusCounts.entries())
			.map(([status, count]) => ({
				count,
				fill: metricTone[status],
				label: runStatus[status].label,
				status,
			}))
			.filter((item) => item.count > 0);

		const topSquads = Array.from(squadCounts.entries())
			.map(([squadId, count]) => ({
				count,
				name: squadById.get(squadId)?.name ?? "Squad removido",
				squadId,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 3);

		return {
			avgDurationSeconds: totalDurationRuns > 0 ? Math.round(totalDurationSeconds / totalDurationRuns) : 0,
			dailyCounts: sevenDays,
			running: statusCounts.get("running") ?? 0,
			statusChart,
			successRate: completedForRate > 0 ? successCount / completedForRate : 0,
			todayCount,
			topSquads,
		};
	}, [squadById, summaryRuns]);

	const activityChartConfig = {
		count: {
			color: "var(--primary)",
			label: "Execuções",
		},
	} satisfies ChartConfig;

	const statusChartConfig = {
		aborted: { color: "var(--muted-foreground)", label: "Abortado" },
		done: { color: "var(--success)", label: "Concluído" },
		failed: { color: "var(--destructive)", label: "Falhou" },
		running: { color: "var(--primary)", label: "Rodando" },
	} satisfies ChartConfig;

	const columns = useMemo<ColumnDef<RunRecord>[]>(
		() => [
			{
				id: "squad",
				header: "Squad",
				cell: ({ row }) => {
					const squad = squadById.get(row.original.squadId);
					return (
						<div className="flex min-w-0 items-center gap-3">
							<div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
								{squad ? renderSquadIcon(squad.icon, "size-4") : <Ban className="size-4" />}
							</div>
							<div className="flex min-w-0 flex-col">
								<Typography variant="body-sm" className="truncate font-medium">
									{squad?.name ?? "Squad removido"}
								</Typography>
								<Typography variant="caption" className="text-muted-foreground font-mono">
									{row.original.id.slice(0, 8)}
								</Typography>
							</div>
						</div>
					);
				},
				meta: { mobileHeader: true, mobileOrder: 1 },
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => {
					const status = runStatus[row.original.status];
					return <Badge variant={status.variant}>{status.label}</Badge>;
				},
				meta: { mobileStatus: true, mobileOrder: 2 },
			},
			{
				accessorKey: "input",
				header: "Briefing",
				cell: ({ row }) => (
					<Typography variant="body-sm" className="text-muted-foreground line-clamp-2 max-w-xl">
						{row.original.input}
					</Typography>
				),
				meta: { mobileLabel: "Briefing", mobileOrder: 3 },
			},
			{
				id: "steps",
				header: "Passos",
				cell: ({ row }) => (
					<Typography variant="body-sm" className="text-muted-foreground tabular-nums">
						{getJsonArrayLength(row.original.steps)}
					</Typography>
				),
				meta: { mobileLabel: "Passos", mobileOrder: 4 },
			},
			{
				id: "duration",
				header: "Duração",
				cell: ({ row }) => (
					<Typography variant="body-sm" className="text-muted-foreground font-mono tabular-nums">
						{duration(row.original.startedAt, row.original.endedAt, now)}
					</Typography>
				),
				meta: { mobileLabel: "Duração", mobileOrder: 5 },
			},
			{
				accessorKey: "startedAt",
				header: "Iniciada em",
				cell: ({ row }) => (
					<Typography variant="body-sm" className="text-muted-foreground tabular-nums">
						{formatDateTime(row.original.startedAt)}
					</Typography>
				),
				meta: { mobileLabel: "Iniciada em", mobileOrder: 6 },
			},
		],
		[now, squadById],
	);

	const isPageError = isError || isSquadsError || isSummaryError;
	const refetchAll = () => {
		void refetch();
		void refetchSquads();
		void refetchSummary();
	};

	const openRun = (run: RunRecord) => {
		if (!squadById.has(run.squadId)) return;
		openHistoryDialog(run.squadId, { initialRunId: run.id });
	};

	return (
		<div className="flex w-full flex-col gap-6">
			<PageHeader
				className="pb-0"
				title="Execuções"
				description="Histórico recente dos runs dos seus squads, ordenado do mais novo para o mais antigo."
			/>

			{isPageError ? (
				<div className="px-4">
					<ErrorState message="Não foi possível carregar as execuções." onRetry={refetchAll} />
				</div>
			) : !isLoading && data.length === 0 ? (
				<div className="px-4">
					<EmptyState
						icon={History}
						title="Nenhuma execução ainda"
						message="Quando você rodar um squad no app desktop, o histórico aparece aqui."
						onAction={() => navigate(Rotas.protegidas.orchestrator.squads)}
						actionLabel="Ver squads"
						actionIcon={<Play />}
					/>
				</div>
			) : (
				<section className="flex flex-col gap-6 px-4">
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						<MetricCard
							icon={<Activity className="size-4" />}
							label="Execuções hoje"
							value={isSummaryLoading ? "--" : formatNumber(dashboardSummary.todayCount)}
							helper="Runs iniciados desde 00:00."
						/>
						<MetricCard
							icon={<TimerReset className="size-4" />}
							label="Em andamento"
							value={isSummaryLoading ? "--" : formatNumber(dashboardSummary.running)}
							helper="Execuções ainda sem encerramento."
						/>
						<MetricCard
							icon={<CheckCircle2 className="size-4" />}
							label="Taxa de sucesso"
							value={isSummaryLoading ? "--" : formatPercent(dashboardSummary.successRate)}
							helper="Baseada nas últimas 100 execuções."
						/>
						<MetricCard
							icon={<Clock3 className="size-4" />}
							label="Tempo médio"
							value={
								isSummaryLoading
									? "--"
									: duration(
											new Date(0).toISOString(),
											new Date(dashboardSummary.avgDurationSeconds * 1000).toISOString(),
											now,
										)
							}
							helper="Runs finalizados na amostra recente."
						/>
					</div>

					<div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
						<Card size="sm">
							<CardHeader className="pb-0">
								<div>
									<Typography variant="title-sm">Atividade recente</Typography>
									<Typography variant="body-sm" className="text-muted-foreground">
										Execuções iniciadas nos últimos 7 dias.
									</Typography>
								</div>
							</CardHeader>
							<CardContent>
								<ChartContainer config={activityChartConfig} className="h-64 aspect-auto">
									<BarChart
										accessibilityLayer
										data={dashboardSummary.dailyCounts}
										margin={{ left: -18, right: 8, top: 12 }}
									>
										<CartesianGrid vertical={false} />
										<XAxis dataKey="label" tickLine={false} axisLine={false} />
										<YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
										<ChartTooltip content={<ChartTooltipContent hideLabel />} />
										<Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
									</BarChart>
								</ChartContainer>
							</CardContent>
						</Card>

						<Card size="sm">
							<CardHeader className="pb-0">
								<div>
								<Typography variant="title-sm">Saúde dos runs</Typography>
									<Typography variant="body-sm" className="text-muted-foreground">
										Status e squads mais acionados.
									</Typography>
								</div>
							</CardHeader>
							<CardContent className="grid gap-5 md:grid-cols-[220px_1fr] xl:grid-cols-1">
								<ChartContainer config={statusChartConfig} className="mx-auto h-52 max-w-56 aspect-square">
									<PieChart accessibilityLayer>
										<ChartTooltip content={<ChartTooltipContent hideLabel nameKey="status" />} />
										<Pie
											data={dashboardSummary.statusChart}
											dataKey="count"
											nameKey="status"
											innerRadius={52}
											outerRadius={82}
											paddingAngle={2}
										>
											{dashboardSummary.statusChart.map((entry) => (
												<Cell key={entry.status} fill={entry.fill} />
											))}
										</Pie>
									</PieChart>
								</ChartContainer>

								<div className="flex flex-col gap-3">
									{dashboardSummary.statusChart.map((item) => (
										<div key={item.status} className="flex items-center justify-between gap-3">
											<div className="flex min-w-0 items-center gap-2">
												<div className="size-2 rounded-full" style={{ backgroundColor: item.fill }} />
												<Typography variant="body-sm" className="truncate">
													{item.label}
												</Typography>
											</div>
											<Typography variant="body-sm" className="text-muted-foreground font-mono tabular-nums">
												{item.count}
											</Typography>
										</div>
									))}

									<div className="border-border mt-1 border-t pt-3">
										<Typography variant="caption" className="text-muted-foreground">
											Top squads
										</Typography>
										<div className="mt-3 flex flex-col gap-2">
											{dashboardSummary.topSquads.length > 0 ? (
												dashboardSummary.topSquads.map((squad) => (
													<div key={squad.squadId} className="flex items-center justify-between gap-3">
														<Typography variant="body-sm" className="truncate">
															{squad.name}
														</Typography>
														<Typography variant="caption" className="text-muted-foreground font-mono tabular-nums">
															{squad.count}
														</Typography>
													</div>
												))
											) : (
												<Typography variant="body-sm" className="text-muted-foreground">
													Sem dados suficientes ainda.
												</Typography>
											)}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="flex flex-wrap items-center justify-between gap-3">
						<Typography variant="body-sm" className="text-muted-foreground">
							{pagination.totalElements} execução(ões) encontradas
						</Typography>
						<Typography variant="caption" className="text-muted-foreground">
							Clique em uma linha para abrir o histórico do squad.
						</Typography>
					</div>
					<ResponsiveTableCustom
						columns={columns}
						data={data}
						isPending={isLoading}
						pagination={pagination}
						onPageChange={(page) => updatePagination({ page })}
						onSizeChange={(size) => updatePagination({ size, page: 0 })}
						onRowClick={openRun}
					/>
				</section>
			)}
		</div>
	);
};
