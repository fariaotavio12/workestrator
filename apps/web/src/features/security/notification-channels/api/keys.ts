export const notificationChannelsKeys = {
	all: ["notification-channels"] as const,
	list: () => [...notificationChannelsKeys.all, "list"] as const,
};
