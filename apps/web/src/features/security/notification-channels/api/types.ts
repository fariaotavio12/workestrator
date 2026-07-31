export type CreateNotificationChannelPayload = {
	label: string;
	url: string;
	authSecretId?: string | null;
	authHeaderName?: string | null;
};

export type UpdateNotificationChannelPayload = Partial<CreateNotificationChannelPayload> & {
	status?: "active" | "error" | "disabled";
};

export type NotificationChannelTestResult = {
	success: boolean;
	error?: string | null;
};
