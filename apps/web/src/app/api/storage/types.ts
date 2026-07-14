export type UploadFileRequest = {
	file: File;
	companyId: string;
	referenceId: string;
	module?: string;
};

export type UploadStorageResponse = {
	path: string;
	publicUrl: string;
	contentType?: string;
	size?: number;
};
