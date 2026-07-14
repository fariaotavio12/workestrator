import { personForCharacter } from "./office-assets";
import { Workstation } from "./workstation";
import type { ActorScene } from "./use-office-choreography";
import type { OfficeSeatView } from "./office-types";

type Props = {
	scene: ActorScene & { agent: NonNullable<OfficeSeatView["agent"]> };
	onClick?: () => void;
	onAnswer?: (answer: string) => void;
	onApproveCheckpoint?: () => void;
	onRejectCheckpoint?: () => void;
	disabled?: boolean;
};

/** Agent sentado na bancada nova do escritorio. A coreografia fica no hook; aqui so escolhemos o sprite. */
export const AgentActor = ({ scene, onClick, onAnswer, onApproveCheckpoint, onRejectCheckpoint, disabled }: Props) => {
	const { agent, status, position, bubble } = scene;

	return (
		<Workstation
			position={position}
			personKey={personForCharacter(agent.character)}
			status={status}
			accentColor={agent.accentColor}
			name={agent.name}
			role={agent.role}
			model={agent.model}
			issue={agent.issue}
			bubble={bubble}
			onClick={onClick}
			onAnswer={onAnswer}
			onApproveCheckpoint={onApproveCheckpoint}
			onRejectCheckpoint={onRejectCheckpoint}
			disabled={disabled}
		/>
	);
};
