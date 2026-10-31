import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

function Harness({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <ConfirmDialog
        open={open}
        tone="danger"
        title="Deactivate Milk?"
        description="It will be hidden."
        confirmLabel="Deactivate"
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

describe("ConfirmDialog", () => {
  it("renders nothing while closed", () => {
    render(<Harness />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("is labelled by its title and description and focuses the safe action", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText("Open"));
    const dialog = screen.getByRole("alertdialog", { name: "Deactivate Milk?" });
    expect(dialog).toHaveAccessibleDescription("It will be hidden.");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("confirms via the confirm button", async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByText("Open"));
    await userEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    render(<Harness />);
    const trigger = screen.getByText("Open");
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("traps Tab focus inside the dialog", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText("Open"));
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Deactivate" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Deactivate" })).toHaveFocus();
  });
});
