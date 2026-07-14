import { notify, type PreviewModalItem } from "@/components";
import type { AssistantArtifacts } from "@/features/security/orchestrator-shared/model";
import {
	buildPreviewUrl,
	listWorkspaceFiles,
	previewAvailable,
	registerPreviewRoot,
} from "@/features/security/orchestrator-shared/runtime/model-client";
import { parsePatch } from "diff";
import { useState } from "react";
import { fileNameFromPatch } from "./utils";

type Params = {
	workingDir: string | null;
	artifacts: AssistantArtifacts;
};

export const useConfigAssistantPreview = ({ workingDir, artifacts }: Params) => {
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewItems, setPreviewItems] = useState<PreviewModalItem[]>([]);
	const canShowDesign = previewAvailable() && Boolean(workingDir);

	const toItem = (rootId: string, relPath: string, index: number, changed: boolean): PreviewModalItem => {
		const ext = relPath.slice(relPath.lastIndexOf(".")).toLowerCase();
		const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext);
		return { id: `${index}-${relPath}`, name: relPath, ext, isImage, url: buildPreviewUrl(rootId, relPath), changed };
	};

	const openDesignPreview = async () => {
		if (!workingDir) return;
		const rootId = await registerPreviewRoot(workingDir);
		if (!rootId) {
			notify.error("Preview disponível apenas no app desktop.");
			return;
		}

		let items: PreviewModalItem[] = [];
		if (artifacts.diff) {
			const files = parsePatch(artifacts.diff)
				.map((file) => fileNameFromPatch(file.newFileName || file.oldFileName || ""))
				.filter(Boolean);
			items = [...new Set(files)].map((path, index) => toItem(rootId, path, index, true));
		}
		if (items.length === 0) {
			const all = await listWorkspaceFiles(workingDir, false);
			items = all.map((file, index) => toItem(rootId, file.path, index, false));
		}
		if (items.length === 0) {
			notify.info("Nenhum arquivo para pre-visualizar.");
			return;
		}
		setPreviewItems(items);
		setPreviewOpen(true);
	};

	const openHtmlPreview = (html: string) => {
		setPreviewItems([{ id: "inline", name: "preview.html", ext: ".html", srcDoc: html }]);
		setPreviewOpen(true);
	};

	return {
		previewOpen,
		previewItems,
		canShowDesign,
		setPreviewOpen,
		openDesignPreview,
		openHtmlPreview,
	};
};
