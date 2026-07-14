import { cn } from "@/app/utils/cn";
import { MotionHighlight, MotionHighlightItem } from "@/components/image/effects/motion-highlight";
import { motion, type HTMLMotionProps, type Transition } from "motion/react";
import * as React from "react";

type TabsVariant = "pill" | "underline";

type TabsContextType<T extends string> = {
	activeValue: T;
	handleValueChange: (value: T) => void;
	registerTrigger: (value: T, node: HTMLElement | null) => void;
};

const TabsContext = React.createContext<TabsContextType<any> | undefined>(undefined);

function useTabs<T extends string = string>(): TabsContextType<T> {
	const context = React.useContext(TabsContext);
	if (!context) {
		throw new Error("useTabs must be used within a TabsProvider");
	}
	return context;
}

// NEW: variant context (TabsList -> TabsTrigger)
type TabsStyleContextType = {
	variant: TabsVariant;
};
const TabsStyleContext = React.createContext<TabsStyleContextType | undefined>(undefined);

function useTabsStyle(): TabsStyleContextType {
	const context = React.useContext(TabsStyleContext);
	return context ?? { variant: "pill" };
}

type BaseTabsProps = React.ComponentProps<"div"> & {
	children: React.ReactNode;
};

type UnControlledTabsProps<T extends string = string> = BaseTabsProps & {
	defaultValue?: T;
	value?: never;
	onValueChange?: never;
};

type ControlledTabsProps<T extends string = string> = BaseTabsProps & {
	value: T;
	onValueChange?: (value: T) => void;
	defaultValue?: never;
};

type TabsProps<T extends string = string> = UnControlledTabsProps<T> | ControlledTabsProps<T>;

function Tabs<T extends string = string>({
	defaultValue,
	value,
	onValueChange,
	children,
	className,
	...props
}: TabsProps<T>) {
	const [activeValue, setActiveValue] = React.useState<T | undefined>(defaultValue ?? undefined);
	const triggersRef = React.useRef(new Map<string, HTMLElement>());
	const initialSet = React.useRef(false);
	const isControlled = value !== undefined;

	React.useEffect(() => {
		if (!isControlled && activeValue === undefined && triggersRef.current.size > 0 && !initialSet.current) {
			const firstTab = Array.from(triggersRef.current.keys())[0];
			setActiveValue(firstTab as T);
			initialSet.current = true;
		}
	}, [activeValue, isControlled]);

	const registerTrigger = (value: string, node: HTMLElement | null) => {
		if (node) {
			triggersRef.current.set(value, node);
			if (!isControlled && activeValue === undefined && !initialSet.current) {
				setActiveValue(value as T);
				initialSet.current = true;
			}
		} else {
			triggersRef.current.delete(value);
		}
	};

	const handleValueChange = (val: T) => {
		if (!isControlled) setActiveValue(val);
		else onValueChange?.(val);
	};

	return (
		<TabsContext.Provider
			value={{
				activeValue: (value ?? activeValue)!,
				handleValueChange,
				registerTrigger,
			}}
		>
			<div data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props}>
				{children}
			</div>
		</TabsContext.Provider>
	);
}

type TabsListProps = React.ComponentProps<"div"> & {
	children: React.ReactNode;
	activeClassName?: string;
	transition?: Transition;
	variant?: TabsVariant;
};

function TabsList({
	children,
	className,
	activeClassName,
	transition = {
		type: "spring",
		stiffness: 200,
		damping: 25,
	},
	variant = "pill",
	...props
}: TabsListProps) {
	const { activeValue } = useTabs();

	// underline: sem MotionHighlight (normalmente highlight de fundo não combina com underline)
	if (variant === "underline") {
		return (
			<TabsStyleContext.Provider value={{ variant }}>
				<div
					role="tablist"
					data-slot="tabs-list"
					data-variant="underline"
					className={cn(
						"inline-flex w-fit items-center justify-center",
						// aparência underline
						"text-muted-foreground bg-transparent",
						// dá um “trilho” discreto opcional
						"border-border border-b",
						// espaçamento
						"gap-4",
						className,
					)}
					{...props}
				>
					{children}
				</div>
			</TabsStyleContext.Provider>
		);
	}

	// pill: mantém comportamento atual com MotionHighlight
	return (
		<TabsStyleContext.Provider value={{ variant }}>
			<MotionHighlight
				controlledItems
				className={cn("bg-background rounded shadow-sm", activeClassName)}
				value={activeValue}
				transition={transition}
			>
				<div
					role="tablist"
					data-slot="tabs-list"
					data-variant="pill"
					className={cn(
						"bg-muted text-muted-foreground inline-flex h-10 w-fit items-center justify-center rounded p-1",
						className,
					)}
					{...props}
				>
					{children}
				</div>
			</MotionHighlight>
		</TabsStyleContext.Provider>
	);
}

type TabsTriggerProps = HTMLMotionProps<"button"> & {
	value: string;
	children: React.ReactNode;
};

function TabsTrigger({ ref, value, children, className, ...props }: TabsTriggerProps) {
	const { activeValue, handleValueChange, registerTrigger } = useTabs();
	const { variant } = useTabsStyle();

	const localRef = React.useRef<HTMLButtonElement | null>(null);
	React.useImperativeHandle(ref as any, () => localRef.current as HTMLButtonElement);

	React.useEffect(() => {
		registerTrigger(value, localRef.current);
		return () => registerTrigger(value, null);
	}, [value, registerTrigger]);

	const isActive = activeValue === value;

	const base = cn(
		"font-semibold relative inline-flex items-center justify-center text-sm transition-colors",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
		"disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
	);

	const pillClasses = cn(
		// aqui o highlight de fundo vem do MotionHighlightItem
		"h-8 px-2 rounded-sm",
		"text-muted-foreground hover:text-foreground",
		"data-[state=active]:text-foreground",
	);

	const underlineClasses = cn(
		// espaçamento/posicionamento para underline
		"pb-2",
		"text-muted-foreground hover:text-foreground",
		"data-[state=active]:text-foreground",
		// linha
		"after:absolute after:left-0 after:right-0 after:-bottom-[1px] after:h-[2px] after:rounded-full after:content-['']",
		"after:bg-transparent data-[state=active]:after:bg-primary",
	);

	const triggerClasses = cn(base, variant === "underline" ? underlineClasses : pillClasses, className);

	// pill: precisa do MotionHighlightItem
	if (variant === "pill") {
		return (
			<MotionHighlightItem value={value} className="size-full">
				<motion.button
					ref={localRef}
					type="button"
					data-slot="tabs-trigger"
					role="tab"
					whileTap={{ scale: 0.98 }}
					onClick={() => handleValueChange(value as any)}
					data-state={isActive ? "active" : "inactive"}
					className={triggerClasses}
					{...props}
				>
					{children}
				</motion.button>
			</MotionHighlightItem>
		);
	}

	// underline: sem MotionHighlightItem (só underline via CSS)
	return (
		<motion.button
			ref={localRef}
			data-slot="tabs-trigger"
			role="tab"
			whileTap={{ scale: 0.98 }}
			onClick={() => handleValueChange(value as any)}
			data-state={isActive ? "active" : "inactive"}
			className={triggerClasses}
			{...props}
		>
			{children}
		</motion.button>
	);
}

type TabsContentsProps = React.ComponentProps<"div"> & {
	children: React.ReactNode;
	transition?: Transition;
};

function TabsContents({
	children,
	className,
	transition = {
		type: "spring",
		stiffness: 300,
		damping: 30,
		bounce: 0,
		restDelta: 0.01,
	},
	...props
}: TabsContentsProps) {
	const { activeValue } = useTabs();
	const childrenArray = React.Children.toArray(children);
	const activeIndex = childrenArray.findIndex(
		(child): child is React.ReactElement<{ value: string }> =>
			React.isValidElement(child) &&
			typeof child.props === "object" &&
			child.props !== null &&
			"value" in child.props &&
			child.props.value === activeValue,
	);

	return (
		<div data-slot="tabs-contents" className={cn("overflow-hidden", className)} {...props}>
			<motion.div className="-mx-2 flex" animate={{ x: activeIndex * -100 + "%" }} transition={transition}>
				{childrenArray.map((child, index) => (
					<div key={index} className="w-full shrink-0 px-2">
						{child}
					</div>
				))}
			</motion.div>
		</div>
	);
}

type TabsContentProps = HTMLMotionProps<"div"> & {
	value: string;
	children: React.ReactNode;
};

function TabsContent({ children, value, className, ...props }: TabsContentProps) {
	const { activeValue } = useTabs();
	const isActive = activeValue === value;

	return (
		<motion.div
			role="tabpanel"
			data-slot="tabs-content"
			className={cn("overflow-hidden", className)}
			inert={!isActive}
			initial={{ filter: "blur(0px)" }}
			animate={{ filter: isActive ? "blur(0px)" : "blur(4px)" }}
			exit={{ filter: "blur(0px)" }}
			transition={{ type: "spring", stiffness: 200, damping: 25 }}
			{...props}
		>
			{children}
		</motion.div>
	);
}

export {
	Tabs,
	TabsContent,
	TabsContents,
	TabsList,
	TabsTrigger,
	useTabs,
	type TabsContentProps,
	type TabsContentsProps,
	type TabsContextType,
	type TabsListProps,
	type TabsProps,
	type TabsTriggerProps,
};
