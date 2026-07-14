import { api } from "@/app/api/clients";
import { useMutation } from "@tanstack/react-query";
import type { UploadFileRequest, UploadStorageResponse } from "./types";

const uploadFile = async ({ file, companyId, referenceId, module }: UploadFileRequest) => {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("companyId", companyId);
	formData.append("referenceId", referenceId);
	if (module) formData.append("module", module);

	const { data } = await api.post<UploadStorageResponse>("/storage/upload", formData, {
		headers: { "Content-Type": "multipart/form-data" },
	});
	return data;
};

export const useUploadFile = () => useMutation({ mutationFn: uploadFile });

const deleteFile = async (path: string) => {
	await api.delete("/storage", { params: { path } });
};

export const useDeleteFile = () => useMutation({ mutationFn: deleteFile });
