import type { Meta, StoryObj } from "@storybook/react-vite";

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./carousel";

const meta = {
	title: "Components/Carousel",
	component: Carousel,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Carousel>;

export default meta;

type Story = StoryObj<typeof meta>;

const SLIDES = ["Resumo", "Indicadores", "Atividades"];

export const Default: Story = {
	render: () => (
		<Carousel opts={{ align: "start" }} className="w-72">
			<CarouselContent>
				{SLIDES.map((slide, index) => (
					<CarouselItem key={slide}>
						<div className="bg-card text-card-foreground flex aspect-video items-center justify-center rounded-lg border p-6">
							<div className="text-center">
								<p className="text-sm font-semibold">{slide}</p>
								<p className="text-muted-foreground mt-1 text-xs">Slide {index + 1}</p>
							</div>
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious />
			<CarouselNext />
		</Carousel>
	),
};

export const Vertical: Story = {
	render: () => (
		<Carousel orientation="vertical" opts={{ align: "start" }} className="h-72 w-64">
			<CarouselContent className="h-72">
				{SLIDES.map((slide, index) => (
					<CarouselItem key={slide} className="basis-1/2">
						<div className="bg-card text-card-foreground flex h-full items-center justify-center rounded-lg border p-4">
							<div className="text-center">
								<p className="text-sm font-semibold">{slide}</p>
								<p className="text-muted-foreground mt-1 text-xs">Item {index + 1}</p>
							</div>
						</div>
					</CarouselItem>
				))}
			</CarouselContent>
			<CarouselPrevious />
			<CarouselNext />
		</Carousel>
	),
};
