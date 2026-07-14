export const MdxImage = ({ src, alt, caption }: { src: string; alt: string; caption?: string }) => {
	return (
		<figure className="my-6">
			<img src={src} alt={alt} className="rounded-lg border border-zinc-200" />
			{caption ? <figcaption className="text-muted-foreground mt-2 text-sm">{caption}</figcaption> : null}
		</figure>
	);
}
