import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfrastructureDiagram } from "../src/ui/components/infrastructure-diagram";

describe("InfrastructureDiagram", () => {
	it("opens node detail in a popup dialog", () => {
		render(<InfrastructureDiagram />);

		expect(screen.getByText("Watchpoint")).toBeInTheDocument();
		expect(screen.queryByText("Component detail")).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Open Cloudflare Workers AI details" }));

		expect(screen.getByText("Component detail")).toBeInTheDocument();
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText(/inference layer/i)).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /Close/i }));

		expect(screen.queryByText("Component detail")).not.toBeInTheDocument();
	});

	it("switches to the lifecycle timeline view", () => {
		render(<InfrastructureDiagram />);

		fireEvent.click(screen.getAllByRole("button", { name: "Run cycle" })[0]);

		expect(screen.getByText("Run lifecycle")).toBeInTheDocument();
		expect(screen.getByText("Memory persists state")).toBeInTheDocument();
		expect(screen.getByText(/manual or scheduled rescan re-enters step 02/i)).toBeInTheDocument();
	});
});
