import { Check, MessageSquare, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/app/utils/cn";
import { Button } from "@/components/button";
import { Textarea } from "@/components/textarea";

export type ApprovalBarProps = {
	onApprove: () => void;
	onRequestChanges: (feedback: string) => void;
	className?: string;
};

/** Barra de aprovação: "Aprovar" ou "Pedir ajuste" (com campo de feedback) — fecha o loop com o agente. */
export const ApprovalBar = ({ onApprove, onRequestChanges, className }: ApprovalBarProps) => {
	const [asking, setAsking] = useState(false);
	const [feedback, setFeedback] = useState("");

	const submit = () => {
		const text = feedback.trim();
		if (!text) return;
		onRequestChanges(text);
		setFeedback("");
		setAsking(false);
	};

	if (asking) {
		return (
			<div className={cn("border-border flex flex-col gap-2 rounded-lg border p-3", className)}>
				<Textarea
					placeholder="Descreva o ajuste que o agente deve fazer…"
					rows={2}
					value={feedback}
					onChange={(e) => setFeedback(e.target.value)}
					autoFocus
				/>
				<div className="flex justify-end gap-2">
					<Button variant="ghost" size="sm" onClick={() => setAsking(false)}>
						<X />
						Cancelar
					</Button>
					<Button size="sm" onClick={submit} disabled={!feedback.trim()}>
						<MessageSquare />
						Enviar ajuste
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("flex items-center justify-end gap-2", className)}>
			<Button variant="outline" size="sm" onClick={() => setAsking(true)}>
				<MessageSquare />
				Pedir ajuste
			</Button>
			<Button size="sm" onClick={onApprove}>
				<Check />
				Aprovar
			</Button>
		</div>
	);
};
