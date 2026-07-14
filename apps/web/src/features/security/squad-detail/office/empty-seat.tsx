import { Workstation } from "./workstation";

type Props = {
	position: { x: number; y: number };
	onClick?: () => void;
	disabled?: boolean;
};

/** Assento livre usando a mesma bancada visual dos agents ocupados. */
export const EmptySeat = ({ position, onClick, disabled }: Props) => (
	<Workstation
		position={position}
		personKey={null}
		status="idle"
		accentColor="var(--muted-foreground)"
		onClick={onClick}
		disabled={disabled}
	/>
);
