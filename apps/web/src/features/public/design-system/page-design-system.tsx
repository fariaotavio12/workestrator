import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	AppSheet,
	Avatar,
	AvatarFallback,
	AvatarImage,
	Backdrop,
	Badge,
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Button,
	Calendar,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardForm,
	CardHeader,
	CardTitle,
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
	Checkbox,
	ClipBoard,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	Combobox,
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	ConfirmDialog,
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
	CustomLink,
	DatePicker,
	DateRangePicker,
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
	EmptyState,
	ErrorState,
	Faq,
	FieldWrapper,
	FileUI,
	FooterButton,
	FooterLanding,
	HeaderDashboardDesktop,
	Input,
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
	Kbd,
	KbdGroup,
	Label,
	LoadingSpinner,
	MdxImage,
	MotionEffect,
	MotionHighlight,
	MotionHighlightItem,
	MultiCombobox,
	NavBarLanding,
	PageHeader,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Progress,
	ResponsiveTableCustom,
	ScrollArea,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Separator,
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	Skeleton,
	SmartOverlay,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Tabs,
	TabsContent,
	TabsContents,
	TabsList,
	TabsTrigger,
	Tag,
	Textarea,
	ThemeSwitcher,
	Toggle,
	ToggleGroup,
	ToggleGroupItem,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	notify,
} from "@/components";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/chart/chart";
import { CommandDialog, CommandShortcut } from "@/components/command/command";
import { BlockEditor } from "@/components/editor";
import { Typography } from "@/components/typography";
import { AppBrandIcon, appBrand } from "@/app/config/branding";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import type { DateRange } from "react-day-picker";
import type { ChartConfig } from "@/components/chart/chart";
import type { ColumnDef } from "@tanstack/react-table";
import {
	Bell,
	Check,
	ClipboardList,
	Download,
	Eye,
	Filter,
	Info,
	Italic,
	LayoutDashboard,
	LayoutGrid,
	LineChart,
	MoreHorizontal,
	PanelBottom,
	RefreshCw,
	Search,
	Settings,
	Type,
	User,
	Users,
} from "lucide-react";

type DemoOption = { label: string; value: string; description?: string };

const demoOptions: DemoOption[] = [
	{ label: "Dashboard", value: "dashboard", description: "Visão geral operacional" },
	{ label: "Relatórios", value: "reports", description: "Listagens e análises" },
	{ label: "Configurações", value: "settings", description: "Preferências do produto" },
];

// ─── Section index (used by the jump-to-section command palette) ─────────────

type SectionLink = { id: string; index: string; label: string };

const sectionLinks: SectionLink[] = [
	{ id: "cores", index: "01", label: "Color palette" },
	{ id: "tipografia", index: "02", label: "Typography scale" },
	{ id: "acoes", index: "03", label: "Actions" },
	{ id: "formularios", index: "04", label: "Forms" },
	{ id: "datas", index: "05", label: "Dates & codes" },
	{ id: "navegacao", index: "06", label: "Navigation & content" },
	{ id: "overlays", index: "07", label: "Overlays" },
	{ id: "feedback", index: "08", label: "Feedback" },
	{ id: "layout", index: "09", label: "Layout" },
	{ id: "charts", index: "10", label: "Charts" },
	{ id: "dados", index: "11", label: "Data" },
	{ id: "shell", index: "12", label: "App shell (sidebar & header)" },
	{ id: "navbar-landing", index: "13", label: "Navbar landing" },
	{ id: "footer", index: "14", label: "Footer" },
	{ id: "card-form", index: "15", label: "Card form" },
	{ id: "imagem", index: "16", label: "Image & motion" },
	{ id: "estados", index: "17", label: "Empty & error state" },
	{ id: "loading", index: "18", label: "Loading & backdrop" },
	{ id: "tag", index: "19", label: "Tag" },
	{ id: "page-header", index: "20", label: "Page header" },
	{ id: "editor", index: "21", label: "Editor (markdown)" },
];

// ─── Color palette ────────────────────────────────────────────────────────────

type ColorToken = { name: string; hex: string; description: string; dark?: boolean };
type ColorGroup = { group: string; colors: ColorToken[] };

const colorPalette: ColorGroup[] = [
	{
		group: "Brand",
		colors: [
			{ name: "primary / ink", hex: "#111111", description: "Primary CTA, h1/h2 type.", dark: true },
			{ name: "primary-active", hex: "#242424", description: "Press state on primary buttons.", dark: true },
			{ name: "brand-accent", hex: "#3b82f6", description: "Inline links e highlights.", dark: true },
		],
	},
	{
		group: "Surface",
		colors: [
			{ name: "canvas", hex: "#ffffff", description: "Superfície padrão da página." },
			{ name: "surface-soft", hex: "#f8f9fa", description: "Fundo de grupos de nav." },
			{ name: "surface-card", hex: "#f5f5f5", description: "Cards de feature, badges." },
			{
				name: "surface-dark",
				hex: "#101010",
				description: "Superfície escura para blocos de ênfase forte.",
				dark: true,
			},
			{ name: "hairline", hex: "#e5e7eb", description: "Bordas de 1px em inputs e cards." },
		],
	},
	{
		group: "Text",
		colors: [
			{ name: "ink", hex: "#111111", description: "Headlines e texto primário.", dark: true },
			{ name: "body", hex: "#374151", description: "Texto corrido padrão.", dark: true },
			{ name: "muted", hex: "#565d6d", description: "Sub-títulos, breadcrumbs, texto secundário.", dark: true },
			{ name: "on-dark-soft", hex: "#a1a1aa", description: "Texto sobre superfícies escuras.", dark: true },
		],
	},
	{
		group: "Semantic",
		colors: [
			{ name: "success", hex: "#10b981", description: "Estados de confirmação.", dark: true },
			{ name: "warning", hex: "#f59e0b", description: "Alertas.", dark: true },
			{ name: "error", hex: "#b91c1c", description: "Erros de validação.", dark: true },
		],
	},
	{
		group: "Badge Pastels",
		colors: [
			{ name: "badge-orange", hex: "#fb923c", description: "Avatar fills e tag pills.", dark: true },
			{ name: "badge-pink", hex: "#ec4899", description: "Avatar fills e tag pills.", dark: true },
			{ name: "badge-violet", hex: "#8b5cf6", description: "Avatar fills e tag pills.", dark: true },
			{ name: "badge-emerald", hex: "#34d399", description: "Avatar fills e tag pills.", dark: true },
		],
	},
];

// ─── Typography scale ─────────────────────────────────────────────────────────

type TypographyToken = {
	name: string;
	size: string;
	weight: string;
	lineHeight: string;
	letterSpacing: string;
	note?: string;
	sample: string;
};

const typographyScale: TypographyToken[] = [
	{
		name: "display-xl",
		size: "64px",
		weight: "600",
		lineHeight: "1.05",
		letterSpacing: "-2px",
		sample: "Hero único acima da dobra",
	},
	{
		name: "display-lg",
		size: "48px",
		weight: "600",
		lineHeight: "1.1",
		letterSpacing: "-1.5px",
		sample: "Título de seção principal",
	},
	{
		name: "display-md",
		size: "36px",
		weight: "600",
		lineHeight: "1.15",
		letterSpacing: "-1px",
		sample: "Título de página interna",
	},
	{
		name: "display-sm",
		size: "28px",
		weight: "600",
		lineHeight: "1.2",
		letterSpacing: "-0.5px",
		sample: "Sub-seção ou card destaque",
	},
	{
		name: "title-lg",
		size: "22px",
		weight: "600",
		lineHeight: "1.3",
		letterSpacing: "-0.3px",
		sample: "Nome de plano, modal title",
	},
	{
		name: "title-md",
		size: "18px",
		weight: "600",
		lineHeight: "1.4",
		letterSpacing: "0",
		sample: "Card title, intro de seção",
	},
	{
		name: "title-sm",
		size: "16px",
		weight: "600",
		lineHeight: "1.4",
		letterSpacing: "0",
		sample: "Card title pequeno, label de lista",
	},
	{
		name: "body-md",
		size: "16px",
		weight: "400",
		lineHeight: "1.5",
		letterSpacing: "0",
		sample: "Texto corrido dentro de parágrafos",
	},
	{
		name: "body-sm",
		size: "14px",
		weight: "400",
		lineHeight: "1.5",
		letterSpacing: "0",
		sample: "Texto secundário, rodapé de seção",
	},
	{
		name: "caption",
		size: "13px",
		weight: "500",
		lineHeight: "1.4",
		letterSpacing: "0",
		sample: "Badge label, legenda",
	},
	{
		name: "button",
		size: "14px",
		weight: "600",
		lineHeight: "1.0",
		letterSpacing: "0",
		sample: "Standard button labels",
	},
	{
		name: "nav-link",
		size: "14px",
		weight: "500",
		lineHeight: "1.4",
		letterSpacing: "0",
		sample: "Top-nav menu items",
	},
	{
		name: "section-label",
		size: "12px",
		weight: "600",
		lineHeight: "1.25",
		letterSpacing: "1.5px",
		sample: "01 — COLOR PALETTE",
	},
];

// ─── Chart data ───────────────────────────────────────────────────────────────

const chartData = [
	{ month: "Jan", receita: 186, custos: 80 },
	{ month: "Fev", receita: 305, custos: 200 },
	{ month: "Mar", receita: 237, custos: 120 },
	{ month: "Abr", receita: 273, custos: 190 },
	{ month: "Mai", receita: 209, custos: 130 },
	{ month: "Jun", receita: 214, custos: 140 },
];

const chartConfig: ChartConfig = {
	receita: { label: "Receita", color: "var(--primary)" },
	custos: { label: "Custos", color: "var(--muted-foreground)" },
};

const placeholderImage =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='640' height='360' fill='%23e5e7eb'/%3E%3C/svg%3E";

// ─── ResponsiveTableCustom demo data ───────────────────────────────────────────

type CustomerRow = {
	id: string;
	name: string;
	email: string;
	plan: "Starter" | "Pro" | "Enterprise";
	status: "Ativo" | "Pendente" | "Cancelado";
	createdAt: string;
};

const allCustomers: CustomerRow[] = [
	{ id: "1", name: "Ana Ferreira", email: "ana@empresa.com", plan: "Pro", status: "Ativo", createdAt: "12/01/2026" },
	{
		id: "2",
		name: "Bruno Costa",
		email: "bruno@empresa.com",
		plan: "Starter",
		status: "Pendente",
		createdAt: "15/01/2026",
	},
	{
		id: "3",
		name: "Carla Dias",
		email: "carla@empresa.com",
		plan: "Enterprise",
		status: "Ativo",
		createdAt: "18/01/2026",
	},
	{
		id: "4",
		name: "Diego Alves",
		email: "diego@empresa.com",
		plan: "Pro",
		status: "Cancelado",
		createdAt: "22/01/2026",
	},
	{
		id: "5",
		name: "Elisa Rocha",
		email: "elisa@empresa.com",
		plan: "Starter",
		status: "Ativo",
		createdAt: "25/01/2026",
	},
	{ id: "6", name: "Fábio Nunes", email: "fabio@empresa.com", plan: "Pro", status: "Ativo", createdAt: "28/01/2026" },
	{
		id: "7",
		name: "Giulia Prado",
		email: "giulia@empresa.com",
		plan: "Enterprise",
		status: "Pendente",
		createdAt: "02/02/2026",
	},
	{
		id: "8",
		name: "Hugo Martins",
		email: "hugo@empresa.com",
		plan: "Starter",
		status: "Ativo",
		createdAt: "05/02/2026",
	},
	{ id: "9", name: "Isis Barbosa", email: "isis@empresa.com", plan: "Pro", status: "Ativo", createdAt: "09/02/2026" },
	{
		id: "10",
		name: "João Pereira",
		email: "joao@empresa.com",
		plan: "Enterprise",
		status: "Cancelado",
		createdAt: "11/02/2026",
	},
	{
		id: "11",
		name: "Karen Souza",
		email: "karen@empresa.com",
		plan: "Starter",
		status: "Ativo",
		createdAt: "14/02/2026",
	},
	{
		id: "12",
		name: "Lucas Melo",
		email: "lucas@empresa.com",
		plan: "Pro",
		status: "Pendente",
		createdAt: "17/02/2026",
	},
	{
		id: "13",
		name: "Marina Reis",
		email: "marina@empresa.com",
		plan: "Enterprise",
		status: "Ativo",
		createdAt: "20/02/2026",
	},
];

const statusVariant: Record<CustomerRow["status"], "success" | "warning" | "destructive"> = {
	Ativo: "success",
	Pendente: "warning",
	Cancelado: "destructive",
};

const customerColumns: ColumnDef<CustomerRow>[] = [
	{
		accessorKey: "name",
		header: "Cliente",
		cell: ({ row }) => (
			<div className="flex min-w-0 flex-col gap-0.5">
				<Typography variant="body-sm" className="font-medium">
					{row.original.name}
				</Typography>
				<Typography variant="caption" className="text-muted-foreground">
					{row.original.email}
				</Typography>
			</div>
		),
		meta: { mobileHeader: true, mobileOrder: 1 },
	},
	{
		accessorKey: "plan",
		header: "Plano",
		cell: ({ row }) => (
			<Typography variant="body-sm" className="text-muted-foreground">
				{row.original.plan}
			</Typography>
		),
		meta: { mobileLabel: "Plano", mobileOrder: 2 },
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => <Badge variant={statusVariant[row.original.status]}>{row.original.status}</Badge>,
		meta: { mobileStatus: true, mobileOrder: 3 },
	},
	{
		accessorKey: "createdAt",
		header: "Criado em",
		cell: ({ row }) => (
			<Typography variant="body-sm" className="text-muted-foreground md:text-right">
				{row.original.createdAt}
			</Typography>
		),
		meta: { mobileLabel: "Criado em", mobileOrder: 4 },
	},
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const ColorSwatch = ({ name, hex, description, dark }: ColorToken) => (
	<div className="overflow-hidden rounded-xl border">
		<div className="h-20 w-full" style={{ background: hex }} />
		<div className="p-3">
			<Typography variant="title-sm" as="div">
				{name}
			</Typography>
			<code className="text-muted-foreground mt-0.5 block font-mono text-xs">{hex}</code>
			{description && (
				<Typography
					variant="body-sm"
					as="p"
					className={`mt-1 ${dark ? "text-muted-foreground" : "text-muted-foreground"}`}
				>
					{description}
				</Typography>
			)}
		</div>
	</div>
);

const TypographyRow = ({ name, size, weight, lineHeight, letterSpacing, note, sample }: TypographyToken) => (
	<div className="flex flex-col gap-3 border-b py-6 md:flex-row md:items-baseline md:gap-10">
		<div className="w-48 shrink-0">
			<Typography variant="body-sm" as="div" className="text-foreground font-semibold">
				{name}
			</Typography>
			<Typography variant="caption" as="div" className="text-muted-foreground mt-1">
				{size} / {weight} / {lineHeight} / {letterSpacing}
			</Typography>
			{note && (
				<Typography variant="caption" as="div" className="text-muted-foreground/70">
					{note}
				</Typography>
			)}
		</div>
		<div className={`${name} text-foreground min-w-0 flex-1`}>{sample}</div>
	</div>
);

const Section = ({
	index,
	id,
	label,
	title,
	description,
	children,
}: {
	index: string;
	id: string;
	label: string;
	title: string;
	description: string;
	children: ReactNode;
}) => (
	<section id={id} className="scroll-mt-8 space-y-10">
		<div className="space-y-3">
			<Typography variant="section-label" className="text-muted-foreground">
				{index} — {label}
			</Typography>
			<Typography variant="display-sm" as="h3" className="text-foreground">
				{title}
			</Typography>
			<Typography variant="body-md" className="text-muted-foreground max-w-2xl">
				{description}
			</Typography>
		</div>
		{children}
	</section>
);

const UsageCard = ({
	title,
	method,
	code,
	children,
}: {
	title: string;
	method: string;
	code?: string;
	children: ReactNode;
}) => (
	<Card className="overflow-hidden">
		<CardHeader className="gap-1 border-b">
			<CardTitle className="text-base">{title}</CardTitle>
			<CardDescription>{method}</CardDescription>
		</CardHeader>
		<CardContent className="flex flex-col gap-4 pt-5">
			<div className="min-w-0">{children}</div>
			{code && (
				<pre className="bg-muted text-muted-foreground overflow-x-auto rounded-md p-3 text-xs">
					<code>{code}</code>
				</pre>
			)}
		</CardContent>
	</Card>
);

// ─── Editor demo upload (mock — converte para data URL, sem backend) ──────────

const mockUploadFile = (file: File): Promise<{ url: string; name: string }> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve({ url: reader.result as string, name: file.name });
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});

// ─── Page ─────────────────────────────────────────────────────────────────────

export const PageDesignSystem = () => {
	const [selectedOption, setSelectedOption] = useState<DemoOption | undefined>(demoOptions[0]);
	const [multiOptions, setMultiOptions] = useState<DemoOption[]>([demoOptions[0], demoOptions[1]]);
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
	const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
	const [otpValue, setOtpValue] = useState("123456");
	const [navOpen, setNavOpen] = useState(false);
	const [motionKey, setMotionKey] = useState(0);
	const [backdropOpen, setBackdropOpen] = useState(false);
	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
	const [editorMarkdown, setEditorMarkdown] = useState("");
	const [tablePage, setTablePage] = useState(0);
	const [tableSize, setTableSize] = useState(5);
	const [tableLoading, setTableLoading] = useState(false);

	const tableTotalPages = Math.max(Math.ceil(allCustomers.length / tableSize), 1);
	const tablePageData = allCustomers.slice(tablePage * tableSize, tablePage * tableSize + tableSize);

	const handleTableLoadingDemo = () => {
		setTableLoading(true);
		window.setTimeout(() => setTableLoading(false), 900);
	};

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				setNavOpen((open) => !open);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	const jumpToSection = (id: string) => {
		setNavOpen(false);
		document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	return (
		<main className="bg-background text-foreground min-h-screen w-full">
			<div className="mx-auto w-full max-w-5xl space-y-24 px-4 py-16 md:px-6">
				{/* Hero */}
				<div className="space-y-6 border-b pb-16">
					<div className="flex flex-col items-start gap-4 md:flex-row md:justify-between">
						<div className="space-y-4">
							<Typography variant="section-label" className="text-muted-foreground">
								Design System
							</Typography>
							<Typography variant="display-lg" className="text-foreground max-w-2xl">
								Visual tokens, components and usage patterns
							</Typography>
							<Typography variant="body-md" className="text-muted-foreground max-w-xl">
								Paleta inspirada no Cal.com. Inter para todo o texto — display e corpo. Primary preto, canvas branco,
								cards cinza claro.
							</Typography>
						</div>
						<div className="flex shrink-0 items-center gap-2 pt-1">
							<Button variant="outline" onClick={() => setNavOpen(true)}>
								<Search className="h-4 w-4" />
								Buscar seção
								<KbdGroup className="ml-2">
									<Kbd>Ctrl</Kbd>
									<Kbd>K</Kbd>
								</KbdGroup>
							</Button>
							<ThemeSwitcher />
						</div>
					</div>
				</div>

				<CommandDialog
					open={navOpen}
					onOpenChange={setNavOpen}
					title="Buscar seção"
					description="Pule direto para qualquer seção do design system."
				>
					<CommandInput placeholder="Buscar seção..." />
					<CommandList>
						<CommandEmpty>Nenhuma seção encontrada.</CommandEmpty>
						<CommandGroup heading="Seções">
							{sectionLinks.map((section) => (
								<CommandItem key={section.id} onSelect={() => jumpToSection(section.id)}>
									<span className="text-muted-foreground w-6 shrink-0 font-mono text-xs">{section.index}</span>
									{section.label}
									<CommandShortcut>Enter</CommandShortcut>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</CommandDialog>

				{/* 01 — Colors */}
				<Section
					index="01"
					id="cores"
					label="COLOR PALETTE"
					title="Monochrome with badge pastels"
					description="Primary preto + canvas branco + cards cinza claro. Badges pastéis adicionam cor em avatares e tags — nunca em CTAs principais."
				>
					<div className="space-y-10">
						{colorPalette.map((group) => (
							<div key={group.group} className="space-y-4">
								<Typography variant="title-sm" as="h4" className="text-foreground">
									{group.group}
								</Typography>
								<div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
									{group.colors.map((color) => (
										<ColorSwatch key={color.name} {...color} />
									))}
								</div>
							</div>
						))}
					</div>
				</Section>

				{/* 02 — Typography */}
				<Section
					index="02"
					id="tipografia"
					label="TYPOGRAPHY SCALE"
					title="Inter, do display ao corpo"
					description="Uma única família — Inter — cobre títulos (weight 600, letter-spacing negativo), corpo, botões e nav. Escala fixa em rem, sem pares de fonte: hierarquia vem de peso e tamanho."
				>
					<div className="divide-y">
						{typographyScale.map((token) => (
							<TypographyRow key={token.name} {...token} />
						))}
					</div>
				</Section>

				{/* 03 — Actions */}
				<Section
					index="03"
					id="acoes"
					label="COMPONENTS"
					title="Actions"
					description="Use botões para comandos, badges para estado e atalhos para ensinar ações recorrentes sem pesar a interface."
				>
					<div className="flex flex-col gap-4">
						<UsageCard
							title="Button"
							method="Um único botão primário por área de decisão. Outline/secondary para alternativas. Destructive só para ações irreversíveis."
							code={`<Button>Salvar</Button>\n<Button variant="secondary">Filtrar</Button>\n<Button variant="outline">Exportar</Button>\n<Button variant="ghost">Mais ações</Button>\n<Button variant="destructive">Remover</Button>\n<Button size="icon" variant="outline"><Search /></Button>`}
						>
							<div className="flex flex-wrap gap-2">
								<Button>
									<Check className="h-4 w-4" />
									Salvar
								</Button>
								<Button variant="secondary">
									<Filter className="h-4 w-4" />
									Filtrar
								</Button>
								<Button variant="outline">
									<Download className="h-4 w-4" />
									Exportar
								</Button>
								<Button variant="ghost">
									<MoreHorizontal className="h-4 w-4" />
									Mais ações
								</Button>
								<Button variant="destructive">Remover</Button>
								<Button size="icon" variant="outline">
									<Search className="h-4 w-4" />
								</Button>
								<Button size="icon-sm" variant="outline">
									<Settings className="h-4 w-4" />
								</Button>
							</div>
						</UsageCard>

						<UsageCard
							title="Badge, CustomLink, Kbd, Toggle"
							method="Badge apenas para estado ou classificação. Kbd para ensinar atalhos. Toggle para estados binários. CustomLink para navegação."
							code={`<Badge variant="secondary">Em análise</Badge>\n<CustomLink to="/path">Link interno</CustomLink>\n<KbdGroup><Kbd>Ctrl</Kbd><Kbd>S</Kbd></KbdGroup>\n<Toggle><Italic /></Toggle>`}
						>
							<div className="space-y-4">
								<div className="flex flex-wrap items-center gap-2">
									<Badge>Principal</Badge>
									<Badge variant="secondary">Em análise</Badge>
									<Badge variant="outline">Rascunho</Badge>
									<Badge variant="destructive">Falha</Badge>
									<Badge variant="success">Ativo</Badge>
									<Badge variant="warning">Atenção</Badge>
								</div>
								<div className="flex flex-wrap items-center gap-3">
									<CustomLink to="/design-system">Abrir referência</CustomLink>
									<KbdGroup>
										<Kbd>Ctrl</Kbd>
										<Kbd>S</Kbd>
									</KbdGroup>
									<Toggle aria-label="Alternar itálico">
										<Italic className="h-4 w-4" />
									</Toggle>
									<ToggleGroup type="single" defaultValue="grid">
										<ToggleGroupItem value="grid" aria-label="Grade">
											<LayoutGrid className="h-4 w-4" />
										</ToggleGroupItem>
										<ToggleGroupItem value="preview" aria-label="Prévia">
											<Eye className="h-4 w-4" />
										</ToggleGroupItem>
										<ToggleGroupItem value="type" aria-label="Texto">
											<Type className="h-4 w-4" />
										</ToggleGroupItem>
									</ToggleGroup>
								</div>
							</div>
						</UsageCard>
					</div>
				</Section>

				{/* 04 — Forms */}
				<Section
					index="04"
					id="formularios"
					label="COMPONENTS"
					title="Forms"
					description="Agrupe campos por intenção, mantenha labels próximos ao controle e reserve descriptions para decisões que precisam de contexto."
				>
					<div className="flex flex-col gap-4">
						<UsageCard
							title="FieldWrapper, Input, Textarea, Label"
							method="Envolva inputs com FieldWrapper para label + error + description padronizados. Use Label isolado quando precisar de mais controle."
							code={`<FieldWrapper label="Nome" htmlFor="name" description="Usado em relatórios." error={errors.name?.message}>\n  <Input id="name" placeholder="Ex: Projeto Alpha" />\n</FieldWrapper>`}
						>
							<div className="space-y-4">
								<FieldWrapper
									label="Nome do projeto"
									htmlFor="fw-name"
									description="Aparece nos relatórios e exportações."
								>
									<Input id="fw-name" placeholder="Ex: Projeto Alpha" />
								</FieldWrapper>
								<FieldWrapper
									label="Observações"
									htmlFor="fw-notes"
									error="Campo obrigatório."
									showCharCounter
									maxLength={200}
									length={0}
								>
									<Textarea id="fw-notes" placeholder="Descreva o contexto desta configuração" />
								</FieldWrapper>
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="standalone-input">Label standalone</Label>
									<Input id="standalone-input" placeholder="Campo com label direto" />
								</div>
							</div>
						</UsageCard>

						<UsageCard
							title="Select, Checkbox, Switch"
							method="Select para listas fechadas pequenas. Switch para preferências imediatas. Checkbox quando a decisão precisa ficar explícita."
							code={`<Select defaultValue="active">\n  <SelectTrigger><SelectValue /></SelectTrigger>\n  <SelectContent>\n    <SelectItem value="active">Ativo</SelectItem>\n  </SelectContent>\n</Select>\n<Switch defaultChecked />\n<Checkbox defaultChecked />`}
						>
							<div className="space-y-4">
								<Select defaultValue="active">
									<SelectTrigger>
										<SelectValue placeholder="Selecione" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="active">Ativo</SelectItem>
										<SelectItem value="draft">Rascunho</SelectItem>
										<SelectItem value="archived">Arquivado</SelectItem>
									</SelectContent>
								</Select>
								<div className="flex items-center justify-between gap-3 rounded-md border p-3">
									<div>
										<div className="text-sm font-medium">Receber alertas</div>
										<p className="text-muted-foreground text-xs">Notificações sobre mudanças importantes.</p>
									</div>
									<Switch defaultChecked />
								</div>
								<label className="flex items-start gap-3 rounded-md border p-3 text-sm">
									<Checkbox defaultChecked className="mt-0.5" />
									<span>
										<span className="block font-medium">Aceito salvar esta configuração</span>
										<span className="text-muted-foreground">
											Use checkbox quando a decisão precisa ficar explícita.
										</span>
									</span>
								</label>
							</div>
						</UsageCard>

						<UsageCard
							title="Combobox, MultiCombobox"
							method="Combobox quando a lista requer busca. MultiCombobox para seleção múltipla com chips visuais."
							code={`<Combobox\n  options={options}\n  value={selected}\n  onChange={setSelected}\n  getOptionKey={o => o.value}\n  getOptionLabel={o => o.label}\n  label="Área"\n/>\n<MultiCombobox ... showClearAllOption showSelectAllOption />`}
						>
							<div className="space-y-3">
								<Combobox
									options={demoOptions}
									value={selectedOption}
									onChange={setSelectedOption}
									onClear={() => setSelectedOption(undefined)}
									getOptionKey={(o) => o.value}
									getOptionLabel={(o) => o.label}
									label="Área"
									placeholder="Escolha uma área"
								/>
								<MultiCombobox
									options={demoOptions}
									values={multiOptions}
									onChange={setMultiOptions}
									onClear={() => setMultiOptions([])}
									getOptionKey={(o) => o.value}
									getOptionLabel={(o) => o.label}
									label="Módulos"
									placeholder="Selecione módulos"
									maxVisibleValues={2}
									showClearAllOption
									showSelectAllOption
								/>
							</div>
						</UsageCard>

						<UsageCard
							title="FileInput"
							method="Use para upload de arquivos com validação de tipo e quantidade. Suporta múltiplos arquivos com maxFiles."
							code={`<FileInput\n  label="Anexos"\n  placeholder="Adicionar arquivo"\n  helperText="PDF, PNG ou JPG até 5 MB."\n  acceptedFileTypes={[".pdf", ".png"]}\n  onAddFiles={handleFiles}\n/>`}
						>
							<FileUI.Input
								label="Documentos"
								placeholder="Adicionar arquivo"
								helperText="PDF, PNG ou JPG até 5 MB."
								acceptedFileTypes={[".pdf", ".png", ".jpg"]}
								onAddFiles={() => undefined}
							/>
						</UsageCard>

						<UsageCard
							title="FooterButton"
							method="Use como rodapé de formulários de criação/edição. Alterna label entre criar e atualizar via isCreateMode."
							code={`<FooterButton\n  isSubmitting={false}\n  isCreateMode={true}\n  createLabel="Salvar"\n  updateLabel="Atualizar"\n/>`}
						>
							<div className="overflow-hidden rounded-md border">
								<FooterButton isSubmitting={false} isCreateMode={true} onCancel={() => undefined} />
							</div>
						</UsageCard>
					</div>
				</Section>

				{/* 05 — Dates */}
				<Section
					index="05"
					id="datas"
					label="COMPONENTS"
					title="Dates & codes"
					description="Use componentes específicos para reduzir erros de digitação e tornar o input previsível em fluxos sensíveis."
				>
					<div className="flex flex-col gap-4">
						<UsageCard
							title="Calendar, DatePicker, DateRangePicker"
							method="Calendar em painéis completos. DatePicker em formulários. DateRangePicker para filtros por período com atalhos rápidos."
							code={`<DatePicker selectedDate={date} onDateChange={setDate} label="Vencimento" />\n<DateRangePicker selectedRange={range} onRangeChange={setRange} showQuickSelection />`}
						>
							<div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
								<div className="rounded-md border">
									<Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md" />
								</div>
								<div className="space-y-4">
									<DatePicker
										selectedDate={selectedDate}
										onDateChange={setSelectedDate}
										label="Vencimento"
										placeholder="Selecionar vencimento"
									/>
									<DateRangePicker
										label="Período"
										selectedRange={dateRange}
										onRangeChange={setDateRange}
										showQuickSelection
									/>
								</div>
							</div>
						</UsageCard>

						<UsageCard
							title="InputOTP"
							method="Use para códigos de confirmação curtos (4-6 dígitos). Foco automático entre slots."
							code={`<InputOTP maxLength={6} value={otp} onChange={setOtp}>\n  <InputOTPGroup>\n    {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}\n  </InputOTPGroup>\n</InputOTP>`}
						>
							<div className="rounded-md border p-4">
								<div className="mb-3 text-sm font-medium">Código de verificação</div>
								<InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
									<InputOTPGroup>
										{[0, 1, 2, 3, 4, 5].map((i) => (
											<InputOTPSlot key={i} index={i} />
										))}
									</InputOTPGroup>
								</InputOTP>
							</div>
						</UsageCard>
					</div>
				</Section>

				{/* 06 — Navigation */}
				<Section
					index="06"
					id="navegacao"
					label="COMPONENTS"
					title="Navigation & content"
					description="Organize telas complexas com navegação clara, disclosure progressivo e comandos pesquisáveis."
				>
					<div className="flex flex-col gap-4">
						<UsageCard
							title="Tabs"
							method="Use para alternar entre visões equivalentes dentro do mesmo contexto."
							code={`<Tabs defaultValue="overview">\n  <TabsList>\n    <TabsTrigger value="overview">Resumo</TabsTrigger>\n  </TabsList>\n  <TabsContents>\n    <TabsContent value="overview">...</TabsContent>\n  </TabsContents>\n</Tabs>`}
						>
							<Tabs defaultValue="overview">
								<TabsList>
									<TabsTrigger value="overview">Resumo</TabsTrigger>
									<TabsTrigger value="usage">Uso</TabsTrigger>
									<TabsTrigger value="state">Estados</TabsTrigger>
								</TabsList>
								<TabsContents>
									<TabsContent value="overview" className="rounded-md border p-4">
										Componentes prontos para montar telas com consistência.
									</TabsContent>
									<TabsContent value="usage" className="rounded-md border p-4">
										Combine exemplos, método de uso e tokens semânticos.
									</TabsContent>
									<TabsContent value="state" className="rounded-md border p-4">
										Inclua vazio, erro, carregando e sucesso quando fizer sentido.
									</TabsContent>
								</TabsContents>
							</Tabs>
						</UsageCard>

						<UsageCard
							title="Accordion, Collapsible"
							method="Accordion para áreas independentes. Collapsible para revelar detalhes de uma seção com um único botão."
							code={`<Accordion type="single" collapsible>\n  <AccordionItem value="one">\n    <AccordionTrigger>Pergunta</AccordionTrigger>\n    <AccordionContent>Resposta</AccordionContent>\n  </AccordionItem>\n</Accordion>`}
						>
							<div className="space-y-3">
								<Accordion type="single" collapsible>
									<AccordionItem value="one">
										<AccordionTrigger>Quando criar um novo componente?</AccordionTrigger>
										<AccordionContent>
											Quando a composição aparecer em mais de um fluxo ou carregar uma regra visual própria.
										</AccordionContent>
									</AccordionItem>
									<AccordionItem value="two">
										<AccordionTrigger>Quando usar composição local?</AccordionTrigger>
										<AccordionContent>
											Quando o layout é específico de uma página e não cria um contrato reutilizável.
										</AccordionContent>
									</AccordionItem>
								</Accordion>
								<Collapsible>
									<CollapsibleTrigger asChild>
										<Button variant="outline">Mostrar checklist</Button>
									</CollapsibleTrigger>
									<CollapsibleContent className="text-muted-foreground mt-3 rounded-md border p-3 text-sm">
										Verifique contraste, foco, loading, erro e responsividade.
									</CollapsibleContent>
								</Collapsible>
							</div>
						</UsageCard>

						<UsageCard
							title="Faq"
							method="Passe um array de items { q, a } para renderizar uma lista de perguntas e respostas com estilo consistente."
							code={`<Faq items={[\n  { q: "Pergunta?", a: "Resposta." }\n]} />`}
						>
							<Faq
								items={[
									{
										q: "Quando usar Faq vs Accordion?",
										a: "Faq é para conteúdo estático de dúvidas frequentes. Accordion é para disclosure interativo em fluxos de produto.",
									},
									{
										q: "Posso customizar o estilo do Faq?",
										a: "Sim, o componente aceita a estrutura de dados e renderiza com tokens do design system.",
									},
								]}
							/>
						</UsageCard>

						<UsageCard
							title="Breadcrumb"
							method="Use BreadCrumbComponent para geração automática via rota. Use os primitivos Breadcrumb, BreadcrumbList, etc. para montagem manual."
							code={`<Breadcrumb>\n  <BreadcrumbList>\n    <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>\n    <BreadcrumbSeparator />\n    <BreadcrumbItem><BreadcrumbPage>Atual</BreadcrumbPage></BreadcrumbItem>\n  </BreadcrumbList>\n</Breadcrumb>`}
						>
							<Breadcrumb>
								<BreadcrumbList>
									<BreadcrumbItem>
										<BreadcrumbLink href="/">Home</BreadcrumbLink>
									</BreadcrumbItem>
									<BreadcrumbSeparator />
									<BreadcrumbItem>
										<BreadcrumbLink href="/settings">Configurações</BreadcrumbLink>
									</BreadcrumbItem>
									<BreadcrumbSeparator />
									<BreadcrumbItem>
										<BreadcrumbPage>Perfil</BreadcrumbPage>
									</BreadcrumbItem>
								</BreadcrumbList>
							</Breadcrumb>
						</UsageCard>

						<UsageCard
							title="Command, ScrollArea, Carousel"
							method="Command para busca de ações. ScrollArea quando o conteúdo precisa rolar dentro de uma área controlada. Carousel para itens equivalentes."
							code={`<Command>\n  <CommandInput placeholder="Buscar..." />\n  <CommandList>\n    <CommandGroup heading="Itens">\n      <CommandItem>Opção</CommandItem>\n    </CommandGroup>\n  </CommandList>\n</Command>`}
						>
							<div className="space-y-4">
								<Command className="rounded-md border">
									<CommandInput placeholder="Buscar componente..." />
									<CommandList>
										<CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
										<CommandGroup heading="Componentes">
											<CommandItem>
												<Search className="mr-2 h-4 w-4" />
												Combobox
											</CommandItem>
											<CommandItem>
												<Bell className="mr-2 h-4 w-4" />
												Toast
											</CommandItem>
											<CommandItem>
												<PanelBottom className="mr-2 h-4 w-4" />
												Drawer
											</CommandItem>
										</CommandGroup>
									</CommandList>
								</Command>
								<ScrollArea className="h-28 rounded-md border p-3">
									{Array.from({ length: 10 }, (_, i) => (
										<div key={i} className="text-muted-foreground border-b py-1.5 text-sm last:border-0">
											Item {i + 1} — conteúdo que rola dentro da área controlada
										</div>
									))}
								</ScrollArea>
								<Carousel className="mx-auto w-full max-w-sm">
									<CarouselContent>
										{[1, 2, 3].map((item) => (
											<CarouselItem key={item}>
												<div className="bg-muted/40 rounded-md border p-6 text-center text-sm">Item {item}</div>
											</CarouselItem>
										))}
									</CarouselContent>
									<CarouselPrevious />
									<CarouselNext />
								</Carousel>
							</div>
						</UsageCard>
					</div>
				</Section>

				{/* 07 — Overlays */}
				<Section
					index="07"
					id="overlays"
					label="COMPONENTS"
					title="Overlays"
					description="Overlays aparecem por contexto: menu para ações, popover para configuração rápida, dialog para decisão bloqueante, drawer/AppSheet para fluxo lateral."
				>
					<div className="flex flex-col gap-4">
						<UsageCard
							title="DropdownMenu, ContextMenu"
							method="DropdownMenu para ações em trigger explícito. ContextMenu para ações em right-click sobre uma área."
							code={`<DropdownMenu>\n  <DropdownMenuTrigger asChild><Button>Menu</Button></DropdownMenuTrigger>\n  <DropdownMenuContent>\n    <DropdownMenuItem>Editar</DropdownMenuItem>\n  </DropdownMenuContent>\n</DropdownMenu>`}
						>
							<div className="flex flex-wrap items-center gap-3">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline">
											<MoreHorizontal className="h-4 w-4" />
											DropdownMenu
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start">
										<DropdownMenuLabel>Ações</DropdownMenuLabel>
										<DropdownMenuItem>
											Editar<DropdownMenuShortcut>Ctrl E</DropdownMenuShortcut>
										</DropdownMenuItem>
										<DropdownMenuItem>Duplicar</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem className="text-destructive">Remover</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>

								<ContextMenu>
									<ContextMenuTrigger asChild>
										<div className="text-muted-foreground flex h-10 cursor-context-menu items-center rounded-md border px-4 text-sm select-none">
											Clique com botão direito aqui
										</div>
									</ContextMenuTrigger>
									<ContextMenuContent>
										<ContextMenuLabel>ContextMenu</ContextMenuLabel>
										<ContextMenuItem>
											Copiar<ContextMenuShortcut>Ctrl C</ContextMenuShortcut>
										</ContextMenuItem>
										<ContextMenuItem>
											Colar<ContextMenuShortcut>Ctrl V</ContextMenuShortcut>
										</ContextMenuItem>
										<ContextMenuSeparator />
										<ContextMenuItem className="text-destructive">Excluir</ContextMenuItem>
									</ContextMenuContent>
								</ContextMenu>
							</div>
						</UsageCard>

						<UsageCard
							title="Popover, Tooltip"
							method="Popover para configuração rápida com interação. Tooltip apenas para rótulos informativos sem interação."
							code={`<Popover>\n  <PopoverTrigger asChild><Button>Preferências</Button></PopoverTrigger>\n  <PopoverContent>...</PopoverContent>\n</Popover>\n\n<TooltipProvider>\n  <Tooltip>\n    <TooltipTrigger asChild><Button size="icon"><Info /></Button></TooltipTrigger>\n    <TooltipContent>Texto</TooltipContent>\n  </Tooltip>\n</TooltipProvider>`}
						>
							<div className="flex flex-wrap items-center gap-3">
								<Popover>
									<PopoverTrigger asChild>
										<Button variant="outline">
											<Settings className="h-4 w-4" />
											Preferências
										</Button>
									</PopoverTrigger>
									<PopoverContent className="space-y-3">
										<div>
											<div className="text-sm font-medium">Densidade</div>
											<p className="text-muted-foreground text-xs">Ajuste rápido para a listagem atual.</p>
										</div>
										<Select defaultValue="comfortable">
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="compact">Compacta</SelectItem>
												<SelectItem value="comfortable">Confortável</SelectItem>
											</SelectContent>
										</Select>
									</PopoverContent>
								</Popover>

								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button size="icon" variant="outline">
												<Info className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Mostra contexto sem abrir fluxo.</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						</UsageCard>

						<UsageCard
							title="ConfirmDialog"
							method="Use para decisões que bloqueiam o fluxo principal. O componente usa SmartOverlay internamente e padroniza header, descrição e footer."
							code={`const [open, setOpen] = useState(false);\n\n<Button variant="outline" onClick={() => setOpen(true)}>\n  Abrir confirmação\n</Button>\n\n<ConfirmDialog\n  open={open}\n  onOpenChange={setOpen}\n  title="Confirmar ação"\n  description="Esta ação não pode ser desfeita."\n  confirmLabel="Confirmar"\n  destructive\n  onConfirm={() => notify.success("Ação confirmada.")}\n/>`}
						>
							<Button variant="outline" onClick={() => setConfirmDialogOpen(true)}>
								Abrir confirmação
							</Button>
							<ConfirmDialog
								open={confirmDialogOpen}
								onOpenChange={setConfirmDialogOpen}
								title="Confirmar ação"
								description="Esta ação removerá o registro permanentemente. Deseja continuar?"
								confirmLabel="Confirmar"
								destructive
								onConfirm={() => notify.success("Ação confirmada.")}
							/>
						</UsageCard>

						<UsageCard
							title="SmartOverlay"
							method="Overlay adaptativo que escolhe center ou lateral baseado no contexto. Use forcePlacement para forçar posição específica."
							code={`<SmartOverlay\n  trigger={<Button>Abrir</Button>}\n  title="Título"\n  description="Descrição"\n  forcePlacement="right"\n>\n  <p>Conteúdo</p>\n</SmartOverlay>`}
						>
							<div className="flex flex-wrap gap-3">
								<SmartOverlay
									trigger={
										<Button variant="outline">
											<Check className="h-4 w-4" />
											SmartOverlay (auto)
										</Button>
									}
									title="Confirmar padrão"
									description="Adapta o posicionamento ao contexto automaticamente."
								>
									<div className="space-y-3">
										<p className="text-muted-foreground text-sm">
											O conteúdo fica encapsulado com título, descrição e área de ação consistentes.
										</p>
										<Button className="w-full">Confirmar</Button>
									</div>
								</SmartOverlay>
								<SmartOverlay
									trigger={<Button variant="outline">Forçar lateral</Button>}
									title="Painel lateral"
									description="forcePlacement='right' sempre abre à direita."
									forcePlacement="right"
								>
									<p className="text-muted-foreground text-sm">Útil para formulários e detalhes sem sair da página.</p>
								</SmartOverlay>
							</div>
						</UsageCard>

						<UsageCard
							title="Drawer, AppSheet"
							method="Drawer sobe da base (mobile-friendly). AppSheet é um painel lateral com header, body scroll e footer padronizados."
							code={`<AppSheet\n  trigger={<Button>Abrir</Button>}\n  title="Painel lateral"\n  description="Descrição"\n  actionLabel="Confirmar"\n  onAction={handleAction}\n>\n  <Input placeholder="Nome" />\n</AppSheet>`}
						>
							<div className="flex flex-wrap items-center gap-3">
								<Drawer>
									<DrawerTrigger asChild>
										<Button>
											<PanelBottom className="h-4 w-4" />
											Abrir Drawer
										</Button>
									</DrawerTrigger>
									<DrawerContent>
										<DrawerHeader>
											<DrawerTitle>Editar configuração</DrawerTitle>
											<DrawerDescription>
												Drawers funcionam bem para fluxos laterais e ajustes rápidos.
											</DrawerDescription>
										</DrawerHeader>
										<div className="grid gap-3 px-4">
											<Input placeholder="Nome da configuração" />
											<Textarea placeholder="Descrição" />
										</div>
										<DrawerFooter>
											<Button>Salvar</Button>
										</DrawerFooter>
									</DrawerContent>
								</Drawer>

								<AppSheet
									trigger={<Button variant="outline">Abrir AppSheet</Button>}
									title="Painel lateral"
									description="Header, body scroll e footer padronizados."
									actionLabel="Confirmar"
									onAction={() => notify.success("Ação confirmada.")}
								>
									<div className="grid gap-3">
										<Input placeholder="Nome" />
										<Textarea placeholder="Notas" />
									</div>
								</AppSheet>
							</div>
						</UsageCard>
					</div>
				</Section>

				{/* 08 — Feedback */}
				<Section
					index="08"
					id="feedback"
					label="COMPONENTS"
					title="Feedback"
					description="Mostre o estado do sistema claramente. O usuário precisa saber se algo carregou, falhou, foi salvo ou precisa de ação."
				>
					<div className="flex flex-col gap-4">
						<UsageCard
							title="Toast (notify)"
							method="Use notify para confirmações temporárias. Prefira mensagens curtas e acionáveis."
							code={`notify.success("Registro salvo com sucesso.")\nnotify.error("Não foi possível carregar os dados.")\nnotify.warning("Alterações não salvas.")\nnotify.info("Sincronização em andamento.")`}
						>
							<div className="flex flex-wrap gap-2">
								<Button variant="outline" onClick={() => notify.success("Registro salvo com sucesso.")}>
									Toast sucesso
								</Button>
								<Button variant="outline" onClick={() => notify.error("Não foi possível carregar os dados.")}>
									Toast erro
								</Button>
								<Button variant="outline" onClick={() => notify.warning("Alterações não salvas.")}>
									Toast warning
								</Button>
								<Button variant="outline" onClick={() => notify.info("Sincronização em andamento.")}>
									Toast info
								</Button>
							</div>
						</UsageCard>

						<UsageCard
							title="Skeleton, Progress"
							method="Skeleton enquanto dados estruturais carregam. Progress para progresso mensurável."
							code={`<Skeleton className="h-4 w-3/4" />\n<Progress value={72} />`}
						>
							<div className="space-y-4">
								<div className="space-y-2 rounded-md border p-3">
									<Skeleton className="h-4 w-3/4" />
									<Skeleton className="h-4 w-1/2" />
									<Skeleton className="h-20 w-full" />
								</div>
								<Progress value={72} />
							</div>
						</UsageCard>

						<UsageCard
							title="Avatar, ClipBoard"
							method="Avatar para identidade visual compacta com fallback de iniciais. ClipBoard para copiar texto com feedback automático."
							code={`<Avatar>\n  <AvatarImage src="..." />\n  <AvatarFallback>DS</AvatarFallback>\n</Avatar>\n\n<ClipBoard texto="valor-a-copiar" />`}
						>
							<div className="space-y-4">
								<div className="flex items-center gap-3 rounded-md border p-3">
									<Avatar>
										<AvatarImage src="https://github.com/shadcn.png" />
										<AvatarFallback>DS</AvatarFallback>
									</Avatar>
									<Avatar>
										<AvatarFallback className="bg-violet-500 text-white">AB</AvatarFallback>
									</Avatar>
									<Avatar>
										<AvatarFallback className="bg-emerald-500 text-white">
											<User className="size-4" />
										</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<div className="text-sm font-medium">Design System</div>
										<p className="text-muted-foreground text-xs">Avatars com imagem, iniciais ou ícone.</p>
									</div>
									<Badge variant="secondary">72%</Badge>
								</div>
								<div className="flex items-center gap-3 rounded-md border p-3">
									<code className="text-muted-foreground flex-1 font-mono text-sm">npm install @template/ui</code>
									<ClipBoard texto="npm install @template/ui" aria-label="Copiar comando" />
								</div>
							</div>
						</UsageCard>
					</div>
				</Section>

				{/* 09 — Layout */}
				<Section
					index="09"
					id="layout"
					label="COMPONENTS"
					title="Layout"
					description="Primitivos de estrutura visual. Card organiza conteúdo em superfície. Separator divide seções. ScrollArea controla overflow."
				>
					<div className="flex flex-col gap-4">
						<UsageCard
							title="Card"
							method="Use Card para agrupar conteúdo relacionado. Componha com CardHeader, CardContent, CardFooter e CardDescription conforme necessário."
							code={`<Card>\n  <CardHeader>\n    <CardTitle>Título</CardTitle>\n    <CardDescription>Subtítulo</CardDescription>\n  </CardHeader>\n  <CardContent>Conteúdo</CardContent>\n  <CardFooter>Rodapé</CardFooter>\n</Card>`}
						>
							<div className="grid gap-3 sm:grid-cols-3">
								<Card>
									<CardContent className="p-5">
										<Typography variant="title-sm" as="h4">
											Card simples
										</Typography>
										<Typography variant="body-sm" className="text-muted-foreground mt-1">
											Apenas CardContent.
										</Typography>
									</CardContent>
								</Card>
								<Card>
									<CardHeader>
										<CardTitle>Com header</CardTitle>
										<CardDescription>Subtítulo opcional</CardDescription>
									</CardHeader>
									<CardContent>
										<Typography variant="body-sm" className="text-muted-foreground">
											Conteúdo principal do card.
										</Typography>
									</CardContent>
								</Card>
								<Card>
									<CardHeader>
										<CardTitle>Com footer</CardTitle>
									</CardHeader>
									<CardContent>
										<Typography variant="body-sm" className="text-muted-foreground">
											Corpo do card.
										</Typography>
									</CardContent>
									<CardFooter className="gap-2">
										<Button size="sm">Ação</Button>
										<Button size="sm" variant="outline">
											Cancelar
										</Button>
									</CardFooter>
								</Card>
							</div>
						</UsageCard>

						<UsageCard
							title="Separator"
							method="Divisor visual horizontal ou vertical. Use com orientation='vertical' para separar itens inline."
							code={`<Separator />\n<Separator orientation="vertical" className="h-6" />`}
						>
							<div className="space-y-4">
								<div className="space-y-3">
									<Typography variant="body-sm">Seção acima</Typography>
									<Separator />
									<Typography variant="body-sm" className="text-muted-foreground">
										Seção abaixo
									</Typography>
								</div>
								<div className="flex items-center gap-3">
									<span className="text-sm">Item A</span>
									<Separator orientation="vertical" className="h-5" />
									<span className="text-sm">Item B</span>
									<Separator orientation="vertical" className="h-5" />
									<span className="text-sm">Item C</span>
								</div>
							</div>
						</UsageCard>
					</div>
				</Section>

				{/* 10 — Charts */}
				<Section
					index="10"
					id="charts"
					label="COMPONENTS"
					title="Charts"
					description="Visualizações de dados com recharts + wrapper ChartContainer. Use ChartTooltip e ChartLegend para consistência visual."
				>
					<UsageCard
						title="ChartContainer, BarChart"
						method="Defina um chartConfig com label e color por série. Passe os dados para o gráfico recharts dentro do ChartContainer."
						code={`const config: ChartConfig = {\n  receita: { label: "Receita", color: "var(--primary)" },\n  custos:  { label: "Custos",  color: "var(--muted-foreground)" },\n}\n\n<ChartContainer config={config}>\n  <BarChart data={data}>\n    <CartesianGrid vertical={false} />\n    <XAxis dataKey="month" />\n    <ChartTooltip content={<ChartTooltipContent />} />\n    <ChartLegend content={<ChartLegendContent />} />\n    <Bar dataKey="receita" fill="var(--color-receita)" radius={4} />\n    <Bar dataKey="custos"  fill="var(--color-custos)"  radius={4} />\n  </BarChart>\n</ChartContainer>`}
					>
						<ChartContainer config={chartConfig}>
							<BarChart accessibilityLayer data={chartData}>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
								<ChartTooltip content={<ChartTooltipContent />} />
								<ChartLegend content={<ChartLegendContent />} />
								<Bar dataKey="receita" fill="var(--color-receita)" radius={4} />
								<Bar dataKey="custos" fill="var(--color-custos)" radius={4} />
							</BarChart>
						</ChartContainer>
					</UsageCard>
				</Section>

				{/* 11 — Data */}
				<Section
					index="11"
					id="dados"
					label="COMPONENTS"
					title="Data"
					description="ResponsiveTableCustom é o padrão recomendado: mesma fonte de dados, troca sozinho entre tabela (desktop) e lista de cards (< 768px). Table + primitivos ficam para quando você precisa de controle manual total sobre a marcação."
				>
					<div className="flex flex-col gap-4">
						<UsageCard
							title="ResponsiveTableCustom"
							method="columns usa ColumnDef do @tanstack/react-table. meta.mobileHeader/mobileStatus/mobileLabel/mobileOrder controlam como cada coluna aparece no card mobile — encolha a janela (< 768px) para ver a troca. pagination/onPageChange/onSizeChange vêm de usePaginatedData (skill de paginação) ou de estado local, como nesta demo."
							code={`type CustomerRow = { id: string; name: string; email: string; plan: string; status: "Ativo" | "Pendente" | "Cancelado"; createdAt: string };\n\nconst columns: ColumnDef<CustomerRow>[] = [\n  {\n    accessorKey: "name",\n    header: "Cliente",\n    cell: ({ row }) => (\n      <div className="flex flex-col gap-0.5">\n        <Typography variant="body-sm" className="font-medium">{row.original.name}</Typography>\n        <Typography variant="caption" className="text-muted-foreground">{row.original.email}</Typography>\n      </div>\n    ),\n    meta: { mobileHeader: true, mobileOrder: 1 }, // vira o título do card no mobile\n  },\n  {\n    accessorKey: "status",\n    header: "Status",\n    cell: ({ row }) => <Badge variant={statusVariant[row.original.status]}>{row.original.status}</Badge>,\n    meta: { mobileStatus: true, mobileOrder: 3 }, // fica no canto superior direito do card\n  },\n  // ...demais colunas com mobileLabel + mobileOrder\n];\n\nconst [page, setPage] = useState(0);\nconst [size, setSize] = useState(10);\nconst { data, isPending } = useCustomersQuery({ page, size }); // TanStack Query real\n\n<ResponsiveTableCustom\n  columns={columns}\n  data={data?.content ?? []}\n  isPending={isPending}\n  pagination={{ page, size, totalElements: data?.totalElements ?? 0, totalPages: data?.totalPages ?? 1 }}\n  onPageChange={setPage}\n  onSizeChange={(next) => { setSize(next); setPage(0); }}\n  onRowClick={(row) => navigate(\`/clientes/\${row.id}\`)}\n/>`}
						>
							<div className="space-y-3">
								<div className="flex items-center justify-between gap-3">
									<Typography variant="body-sm" className="text-muted-foreground">
										{allCustomers.length} clientes • redimensione a janela para ver a versão mobile
									</Typography>
									<Button variant="outline" size="sm" onClick={handleTableLoadingDemo}>
										Simular loading
									</Button>
								</div>
								<ResponsiveTableCustom
									columns={customerColumns}
									data={tablePageData}
									isPending={tableLoading}
									onRowClick={(row) => notify.info(`Abrir ${row.name}`)}
									pagination={{
										page: tablePage,
										size: tableSize,
										totalElements: allCustomers.length,
										totalPages: tableTotalPages,
									}}
									onPageChange={setTablePage}
									onSizeChange={(size) => {
										setTableSize(size);
										setTablePage(0);
									}}
								/>
							</div>
						</UsageCard>

						<UsageCard
							title="Table"
							method="Use os primitivos quando o layout foge do padrão do ResponsiveTableCustom (ex: tabela sem paginação, células mescladas). Ações na última coluna, badges para status de leitura rápida."
							code={`<Table>\n  <TableHeader>\n    <TableRow>\n      <TableHead>Nome</TableHead>\n      <TableHead>Status</TableHead>\n      <TableHead className="text-right">Ação</TableHead>\n    </TableRow>\n  </TableHeader>\n  <TableBody>\n    <TableRow>\n      <TableCell>Button</TableCell>\n      <TableCell><Badge variant="secondary">Pronto</Badge></TableCell>\n      <TableCell className="text-right"><Button size="sm" variant="ghost">Abrir</Button></TableCell>\n    </TableRow>\n  </TableBody>\n</Table>`}
						>
							<div className="overflow-hidden rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Componente</TableHead>
											<TableHead>Uso</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="text-right">Ação</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{[
											["Button", "Comandos primários", "Pronto"],
											["Combobox", "Busca em opções", "Pronto"],
											["Drawer", "Fluxo lateral", "Pronto"],
											["AppSheet", "Painel lateral estruturado", "Pronto"],
											["Chart", "Visualização de dados", "Pronto"],
										].map(([name, usage, status]) => (
											<TableRow key={name}>
												<TableCell className="font-medium">{name}</TableCell>
												<TableCell>{usage}</TableCell>
												<TableCell>
													<Badge variant="secondary">{status}</Badge>
												</TableCell>
												<TableCell className="text-right">
													<Button size="sm" variant="ghost">
														Abrir
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						</UsageCard>
					</div>
				</Section>

				{/* 12 — App shell */}
				<Section
					index="12"
					id="shell"
					label="APP SHELL"
					title="Sidebar & header"
					description="Sidebar colapsável + header com trigger e breadcrumb compõem o shell autenticado em src/app. AppSidebar (src/components/sidebar) já compõe as primitivas abaixo com dados de navegação e usuário reais."
				>
					<UsageCard
						title="Sidebar, SidebarProvider, SidebarInset, HeaderDashboardDesktop"
						method="No app real, Sidebar usa collapsible='icon' e fica fixa à viewport. Aqui, collapsible='none' contém a demo dentro do card — role o SidebarTrigger para colapsar apenas este bloco."
						code={`<SidebarProvider>\n  <Sidebar collapsible="icon">\n    <SidebarHeader>...</SidebarHeader>\n    <SidebarContent>\n      <SidebarGroup>\n        <SidebarGroupLabel>Gestão</SidebarGroupLabel>\n        <SidebarMenu>\n          <SidebarMenuItem>\n            <SidebarMenuButton isActive>\n              <LayoutDashboard />\n              <span>Dashboard</span>\n            </SidebarMenuButton>\n          </SidebarMenuItem>\n        </SidebarMenu>\n      </SidebarGroup>\n    </SidebarContent>\n    <SidebarFooter>...</SidebarFooter>\n  </Sidebar>\n  <SidebarInset>\n    <HeaderDashboardDesktop />\n  </SidebarInset>\n</SidebarProvider>`}
					>
						<div className="h-[380px] overflow-hidden rounded-md border">
							<SidebarProvider
								className="h-full items-start"
								style={{ "--sidebar-width": "16rem" } as React.CSSProperties}
							>
								<Sidebar collapsible="none" className="border-r">
									<SidebarHeader className="flex flex-row items-center gap-3 p-3">
										<AppBrandIcon className="aspect-square size-8" />
										<span className="truncate text-sm font-semibold">{appBrand.name}</span>
									</SidebarHeader>
									<SidebarContent>
										<SidebarGroup>
											<SidebarGroupLabel>Gestão</SidebarGroupLabel>
											<SidebarMenu>
												<SidebarMenuItem>
													<SidebarMenuButton isActive>
														<LayoutDashboard />
														<span>Dashboard</span>
													</SidebarMenuButton>
												</SidebarMenuItem>
												<SidebarMenuItem>
													<SidebarMenuButton>
														<LineChart />
														<span>Analytics</span>
													</SidebarMenuButton>
												</SidebarMenuItem>
												<SidebarMenuItem>
													<SidebarMenuButton>
														<ClipboardList />
														<span>Registros</span>
													</SidebarMenuButton>
												</SidebarMenuItem>
											</SidebarMenu>
										</SidebarGroup>
										<SidebarGroup>
											<SidebarGroupLabel>Cadastros</SidebarGroupLabel>
											<SidebarMenu>
												<SidebarMenuItem>
													<SidebarMenuButton>
														<Users />
														<span>Clientes</span>
													</SidebarMenuButton>
												</SidebarMenuItem>
											</SidebarMenu>
										</SidebarGroup>
									</SidebarContent>
									<SidebarFooter className="border-t p-3">
										<div className="flex items-center gap-2">
											<Avatar className="h-7 w-7">
												<AvatarFallback className="text-xs">DS</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<div className="truncate text-xs font-medium">Design System</div>
												<div className="text-muted-foreground truncate text-[11px]">{appBrand.demoEmail}</div>
											</div>
										</div>
									</SidebarFooter>
								</Sidebar>
								<SidebarInset className="flex-1">
									<HeaderDashboardDesktop />
									<div className="text-muted-foreground p-4 text-sm">Conteúdo da página fica aqui.</div>
								</SidebarInset>
							</SidebarProvider>
						</div>
					</UsageCard>
				</Section>

				{/* 13 — Navbar landing */}
				<Section
					index="13"
					id="navbar-landing"
					label="NAVIGATION"
					title="Navbar landing"
					description="Nav sticky com blur ao rolar, CTA de login/demo e menu mobile via Sheet. Usada no topo de páginas públicas."
				>
					<UsageCard
						title="NavBarLanding"
						method="Fica sticky no topo da página real. Aqui está contida numa área com scroll próprio para não grudar no topo da tela inteira — role dentro da caixa para ver o efeito de blur."
						code={`<NavBarLanding />`}
					>
						<div className="h-56 overflow-y-auto rounded-md border">
							<NavBarLanding />
							<div className="text-muted-foreground space-y-3 p-6 text-sm">
								<p>Role dentro desta área para ver a nav grudar no topo com blur.</p>
								{Array.from({ length: 8 }, (_, i) => (
									<p key={i}>Linha de conteúdo de exemplo {i + 1}.</p>
								))}
							</div>
						</div>
					</UsageCard>
				</Section>

				{/* 14 — Footer */}
				<Section
					index="14"
					id="footer"
					label="NAVIGATION"
					title="Footer"
					description="Rodapé de páginas públicas: wordmark, links de navegação e copyright. Um único rodapé por página pública."
				>
					<UsageCard
						title="FooterLanding"
						method="Sem props — os links são fixos, definidos dentro do próprio componente."
						code={`<FooterLanding />`}
					>
						<div className="overflow-hidden rounded-md border">
							<FooterLanding />
						</div>
					</UsageCard>
				</Section>

				{/* 15 — Card form */}
				<Section
					index="15"
					id="card-form"
					label="COMPONENTS"
					title="Card form"
					description="Agrupa um bloco de formulário com ícone, título, legenda e um rodapé opcional de ações. Use layout='side' (padrão) para configurações densas, 'below' quando o card for estreito."
				>
					<UsageCard
						title="CardForm"
						method="title, caption e icon montam o cabeçalho. buttons é opcional e renderiza um rodapé com borda superior."
						code={`<CardForm\n  title="Notificações"\n  caption="Escolha como você quer ser avisado."\n  icon={<Bell />}\n  buttons={<Button size="sm">Salvar</Button>}\n>\n  <Switch defaultChecked />\n</CardForm>`}
					>
						<CardForm
							title="Notificações"
							caption="Escolha como e quando você quer ser avisado sobre mudanças importantes."
							icon={<Bell className="h-4 w-4" />}
							buttons={<Button size="sm">Salvar alterações</Button>}
						>
							<div className="w-full rounded-md border p-3 sm:w-72">
								<div className="flex items-center justify-between gap-3">
									<div>
										<div className="text-sm font-medium">Email</div>
										<p className="text-muted-foreground text-xs">Resumo diário por email.</p>
									</div>
									<Switch defaultChecked />
								</div>
							</div>
						</CardForm>
					</UsageCard>
				</Section>

				{/* 16 — Image & motion */}
				<Section
					index="16"
					id="imagem"
					label="COMPONENTS"
					title="Image & motion"
					description="MdxImage padroniza imagens de conteúdo. MotionEffect anima a entrada de um elemento; MotionHighlight desliza um fundo ativo entre itens irmãos."
				>
					<div className="flex flex-col gap-4">
						<UsageCard
							title="MdxImage"
							method="Wrapper de imagem para conteúdo MDX: figure + legenda opcional, cantos arredondados e borda consistente."
							code={`<MdxImage src="/cover.png" alt="Descrição" caption="Legenda opcional abaixo da imagem." />`}
						>
							<MdxImage src={placeholderImage} alt="Exemplo de imagem" caption="Legenda opcional abaixo da imagem." />
						</UsageCard>

						<UsageCard
							title="MotionEffect, MotionHighlight"
							method="MotionEffect anima entrada (fade/slide/zoom/blur). MotionHighlight desliza um fundo ativo entre itens irmãos ao passar o mouse ou selecionar — útil para tabs e segmented controls animados."
							code={`<MotionEffect fade slide={{ direction: "up" }} blur="6px">\n  <Card>...</Card>\n</MotionEffect>\n\n<MotionHighlight mode="parent" hover className="rounded-md bg-muted">\n  <MotionHighlightItem value="a"><button>Semanal</button></MotionHighlightItem>\n  <MotionHighlightItem value="b"><button>Mensal</button></MotionHighlightItem>\n</MotionHighlight>`}
						>
							<div className="space-y-6">
								<div>
									<Button variant="outline" size="sm" onClick={() => setMotionKey((k) => k + 1)}>
										<RefreshCw className="h-4 w-4" />
										Replay
									</Button>
									<MotionEffect
										key={motionKey}
										fade
										slide={{ direction: "up", offset: 16 }}
										blur="6px"
										className="mt-3"
									>
										<div className="rounded-md border p-4 text-sm">Este card entra com fade + slide + blur.</div>
									</MotionEffect>
								</div>
								<MotionHighlight mode="parent" hover className="bg-muted inline-flex w-fit gap-1 rounded-md p-1">
									<MotionHighlightItem value="a">
										<button type="button" className="rounded-sm px-3 py-1.5 text-sm">
											Semanal
										</button>
									</MotionHighlightItem>
									<MotionHighlightItem value="b">
										<button type="button" className="rounded-sm px-3 py-1.5 text-sm">
											Mensal
										</button>
									</MotionHighlightItem>
									<MotionHighlightItem value="c">
										<button type="button" className="rounded-sm px-3 py-1.5 text-sm">
											Anual
										</button>
									</MotionHighlightItem>
								</MotionHighlight>
							</div>
						</UsageCard>
					</div>
				</Section>

				{/* 17 — Empty & error state */}
				<Section
					index="17"
					id="estados"
					label="FEEDBACK"
					title="Empty & error state"
					description="Placeholders centralizados para telas/seções inteiras sem dados ou com falha total de carregamento."
				>
					<div className="grid gap-4 md:grid-cols-2">
						<UsageCard
							title="EmptyState"
							method="Use quando a ausência de dados é o estado normal (lista/tabela ainda sem registros)."
							code={`<EmptyState\n  title="Nenhum registro"\n  message="Crie o primeiro registro para começar."\n  actionLabel="Adicionar"\n  onAction={handleCreate}\n/>`}
						>
							<EmptyState
								title="Nenhum registro"
								message="Crie o primeiro registro para começar."
								onAction={() => notify.info("Abrir formulário de criação.")}
							/>
						</UsageCard>

						<UsageCard
							title="ErrorState"
							method="Use quando a query/página falhou por completo, não apenas um bloco isolado."
							code={`<ErrorState\n  title="Algo deu errado"\n  message="Não foi possível carregar os dados."\n  onRetry={refetch}\n/>`}
						>
							<ErrorState onRetry={() => notify.info("Tentando novamente...")} />
						</UsageCard>
					</div>
				</Section>

				{/* 18 — Loading & backdrop */}
				<Section
					index="18"
					id="loading"
					label="FEEDBACK"
					title="Loading & backdrop"
					description="LoadingSpinner para carregamento de bloco/página. Backdrop para escurecer o fundo por trás de um overlay customizado (fora do Dialog/Sheet padrão)."
				>
					<div className="flex flex-col gap-4">
						<UsageCard
							title="LoadingSpinner"
							method="Tamanhos xs/sm/md/lg. containerClassName controla a altura do wrapper (padrão h-64)."
							code={`<LoadingSpinner size="md" />`}
						>
							<div className="rounded-md border">
								<LoadingSpinner size="md" containerClassName="h-32" />
							</div>
						</UsageCard>

						<UsageCard
							title="Backdrop"
							method="Overlay fixo com blur leve atrás de conteúdo customizado. Controlado via prop open — diferente do Dialog, não gerencia foco/escape sozinho."
							code={`<Backdrop open={open}>\n  <LoadingSpinner size="lg" className="border-white border-t-transparent" />\n</Backdrop>`}
						>
							<div className="flex items-center gap-3">
								<Button variant="outline" onClick={() => setBackdropOpen(true)}>
									Abrir Backdrop
								</Button>
								<Typography variant="body-sm" className="text-muted-foreground">
									Fecha sozinho em 1.5s (demo).
								</Typography>
							</div>
							<Backdrop open={backdropOpen}>
								<div
									className="bg-card flex flex-col items-center gap-3 rounded-lg border p-6 shadow-lg"
									ref={(node) => {
										if (!node || !backdropOpen) return;
										const timeout = window.setTimeout(() => setBackdropOpen(false), 1500);
										return () => window.clearTimeout(timeout);
									}}
								>
									<LoadingSpinner size="md" containerClassName="h-auto" />
									<Typography variant="body-sm">Carregando...</Typography>
								</div>
							</Backdrop>
						</UsageCard>
					</div>
				</Section>

				{/* 19 — Tag */}
				<Section
					index="19"
					id="tag"
					label="COMPONENTS"
					title="Tag"
					description="Chip compacto para categorização leve. Variantes de cor semânticas — use closable quando o usuário precisa remover a marcação."
				>
					<UsageCard
						title="Tag"
						method="color aceita rose/blue/primary/yellow/violet/muted (padrão). closable + onClose renderiza o botão de remover."
						code={`<Tag color="blue">Backend</Tag>\n<Tag color="violet" closable onClose={handleRemove}>Removível</Tag>`}
					>
						<div className="flex flex-wrap gap-2">
							<Tag>Padrão</Tag>
							<Tag color="blue">Backend</Tag>
							<Tag color="primary">Ativo</Tag>
							<Tag color="rose">Crítico</Tag>
							<Tag color="yellow">Atenção</Tag>
							<Tag color="violet" closable onClose={() => notify.info("Tag removida.")}>
								Removível
							</Tag>
						</div>
					</UsageCard>
				</Section>

				{/* 20 — Page header */}
				<Section
					index="20"
					id="page-header"
					label="LAYOUT"
					title="Page header"
					description="Cabeçalho reutilizável para o topo de páginas internas: eyebrow opcional, título, descrição e slot de ações à direita."
				>
					<UsageCard
						title="PageHeader"
						method="title aceita string (vira heading automaticamente) ou ReactNode customizado. actions alinha à direita em telas largas."
						code={`<PageHeader\n  eyebrow="Configurações"\n  title="Equipe"\n  description="Gerencie os membros e permissões do time."\n  actions={<Button>Convidar</Button>}\n/>`}
					>
						<div className="overflow-hidden rounded-md border">
							<PageHeader
								eyebrow="Configurações"
								title="Equipe"
								description="Gerencie os membros e permissões do time."
								actions={<Button size="sm">Convidar</Button>}
								maxWidthClassName="max-w-none"
							/>
						</div>
					</UsageCard>
				</Section>

				{/* 21 — Editor (markdown) */}
				<Section
					index="21"
					id="editor"
					label="COMPONENTS"
					title="Editor (markdown)"
					description="Editor de blocos completo (BlockNote): toolbar, atalhos (Ctrl+Alt+1/2/3 para títulos), tabelas, upload de imagem/anexo via drag, paste ou toolbar, e menu de contexto. Emite markdown (compat/busca) e JSON rico (fonte de verdade) a cada mudança."
				>
					<UsageCard
						title="BlockEditor"
						method="uploadFile é opcional — sem ele, os botões de imagem/anexo somem. Nesta demo, uploadFile converte o arquivo para data URL (sem backend real)."
						code={`<BlockEditor\n  onChange={setMarkdown}\n  onChangeRich={setRich}\n  uploadFile={async (file) => {\n    const url = await uploadToStorage(file);\n    return { url, name: file.name };\n  }}\n/>`}
					>
						<div className="rounded-md border p-3">
							<BlockEditor onChange={setEditorMarkdown} uploadFile={mockUploadFile} />
						</div>
						{editorMarkdown && (
							<div className="mt-3">
								<Typography variant="caption" className="text-muted-foreground mb-1 block">
									Markdown emitido (onChange)
								</Typography>
								<pre className="bg-muted text-muted-foreground max-h-40 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
									<code>{editorMarkdown}</code>
								</pre>
							</div>
						)}
					</UsageCard>
				</Section>
			</div>
		</main>
	);
};
