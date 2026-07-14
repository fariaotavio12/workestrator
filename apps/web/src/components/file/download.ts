export async function urlToFile(url: string, fileName?: string): Promise<File> {
	let res: Response;

	try {
		res = await fetch(url, {
			method: "GET",
			mode: "cors",
			credentials: "omit",
			redirect: "follow",
			cache: "no-store",
		});
	} catch (e) {
		// Usually occurs due to CORS / mixed content / DNS / browser blocking
		console.error("Fetch failed before getting a response (likely CORS/mixed content). URL:", url, e);
		throw e;
	}

	if (!res.ok) {
		throw new Error(`HTTP ${res.status} ${res.statusText}`);
	}

	const blob = await res.blob();
	const type = blob.type || res.headers.get("content-type") || "application/octet-stream";
	const name = fileName ?? decodeURIComponent(url.split("/").pop() || "arquivo");

	return new File([blob], name, { type, lastModified: Date.now() });
}
