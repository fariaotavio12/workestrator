export type FaqItem = {
	q: string;
	a: string;
};

type FaqProps = {
	items: FaqItem[];
};

export const Faq = ({ items }: FaqProps) => {
	if (!items.length) return null;

	return (
		<div className="divide-border rounded-lg border">
			{items.map((item) => (
				<div key={item.q} className="space-y-1 p-4">
					<h3 className="text-sm font-semibold">{item.q}</h3>
					<p className="text-muted-foreground text-sm leading-6">{item.a}</p>
				</div>
			))}
		</div>
	);
};
