export const assistantSessionGroupsKeys = {
	all: ["assistant-session-groups"] as const,
	list: () => [...assistantSessionGroupsKeys.all, "list"] as const,
};
