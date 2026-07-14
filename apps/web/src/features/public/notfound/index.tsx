import { Button } from "@/components/button";
import { Card, CardContent } from "@/components/card";
import { ArrowLeft, ArrowRight, HelpCircle, Home, Link as LinkIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { notFoundContent } from "./notFoundContent";
import { Rotas } from "@/app/routing/variables";

export const PageNotFound = () => {
	const navigate = useNavigate();

	const SuggestionCard = ({
		icon: Icon,
		title,
		description,
	}: {
		icon: React.ComponentType<{ className?: string }>;
		title: string;
		description: string;
	}) => (
		<Card className="hover:border-primary/50 border shadow-sm transition-colors">
			<CardContent className="p-6">
				<div className="flex items-start gap-4">
					<div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
						<Icon className="h-5 w-5" />
					</div>
					<div className="flex-1">
						<h3 className="text-foreground font-semibold">{title}</h3>
						<p className="text-muted-foreground mt-1 text-sm">{description}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);

	const getIcon = (iconName: string) => {
		switch (iconName) {
			case "link":
				return LinkIcon;
			case "home":
				return Home;
			case "support":
				return HelpCircle;
			default:
				return LinkIcon;
		}
	};

	return (
		<div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-2 md:px-4">
			{/* Background gradient decoration */}
			<div className="from-primary/5 via-background to-background pointer-events-none absolute inset-0 -z-10 bg-linear-to-br" />

			<div className="w-full max-w-2xl space-y-10">
				{/* Main content */}
				<div className="relative space-y-6 text-center">
					{/* Animated error code */}
					<div className="relative inline-block">
						<div className="bg-primary/20 absolute inset-0 rounded-full blur-3xl"></div>
						<div className="border-primary/20 bg-background/80 relative mx-auto flex h-32 w-32 items-center justify-center rounded-3xl border shadow-sm backdrop-blur">
							<span className="text-primary/80 text-6xl font-black">{notFoundContent.error.code}</span>
						</div>
					</div>

					{/* Error title */}
					<div className="space-y-3">
						<h1 className="text-foreground text-4xl font-bold tracking-tight md:text-5xl">
							{notFoundContent.error.title}
						</h1>
						<p className="text-muted-foreground mx-auto max-w-md text-lg">{notFoundContent.error.description}</p>
					</div>

					{/* CTA Buttons */}
					<div className="flex flex-col justify-center gap-3 pt-4 sm:flex-row">
						<Button onClick={() => navigate(-1)} variant="outline" size="lg" className="w-full gap-2 sm:w-auto">
							<ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
							{notFoundContent.cta.backButton.label}
						</Button>

						<Button
							onClick={() => navigate(Rotas.desprotegidas.landingPages.home)}
							size="lg"
							className="w-full gap-2 sm:w-auto"
						>
							{notFoundContent.cta.homeButton.label}
							<ArrowRight className="h-4 w-4" strokeWidth={1.5} />
						</Button>
					</div>
				</div>

				{/* Suggestions */}
				<div className="space-y-4">
					<h2 className="text-muted-foreground text-center text-sm font-semibold tracking-wide uppercase">
						O que você pode fazer
					</h2>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{notFoundContent.suggestions.map((suggestion) => (
							<SuggestionCard
								key={suggestion.title}
								icon={getIcon(suggestion.icon)}
								title={suggestion.title}
								description={suggestion.description}
							/>
						))}
					</div>
				</div>

				{/* Hint */}
				<div className="pt-4 text-center">
					<p className="text-muted-foreground text-xs">{notFoundContent.hint}</p>
				</div>
			</div>
		</div>
	);
};
