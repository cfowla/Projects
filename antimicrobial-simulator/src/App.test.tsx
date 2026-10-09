// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import App from "./App";
import { cloneElement } from "react";
import type { ReactElement } from "react";
// jsdom has no layout; supply a fixed chart size while retaining real Recharts rendering.
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: unknown }) => (
      <div data-testid="chart" aria-label="Concentration chart">
        {cloneElement(
          children as ReactElement<{ width: number; height: number }>,
          { width: 640, height: 300 },
        )}
      </div>
    ),
  };
});
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
});
afterEach(cleanup);
const input = (name: string) =>
  screen.getByLabelText(
    new RegExp("^" + name + "(?:\\s|$)"),
  ) as HTMLInputElement;
describe("simulator workflows", () => {
  it("renders real concentration curves and toggles visibility without changing metrics", () => {
    render(<App />);
    const curves = () => document.querySelectorAll(".recharts-line-curve");
    expect(curves().length).toBe(4);
    for (const curve of curves()) {
      expect(curve.getAttribute("d")).toMatch(/^M/);
      expect(curve.getAttribute("d")).not.toContain("NaN");
    }
    const before = screen.getByRole("table").textContent;
    fireEvent.click(screen.getByRole("checkbox", { name: "Total" }));
    expect(curves().length).toBe(2);
    expect(screen.getByRole("table").textContent).toBe(before);
    fireEvent.click(screen.getByRole("checkbox", { name: "Free" }));
    expect(curves().length).toBe(0);
    expect(
      screen.getByText("Select Free or Total to display concentration curves."),
    ).toBeDefined();
  });

  it("renders default steady-state comparison and independent regimen controls", () => {
    render(<App />);
    expect(screen.getAllByText("Within target").length).toBe(2);
    expect(input("Infusion duration").value).toBe("0.5");
    fireEvent.click(screen.getByRole("button", { name: "Regimen B" }));
    expect(input("Infusion duration").value).toBe("3");
    fireEvent.change(input("Dose"), { target: { value: "1500" } });
    fireEvent.click(screen.getByRole("button", { name: "Regimen A" }));
    expect(input("Dose").value).toBe("1000");
    fireEvent.click(screen.getByRole("button", { name: "Regimen B" }));
    expect(input("Dose").value).toBe("1500");
  });
  it("changes from steady state to first-dose exposure and preserves inputs", () => {
    render(<App />);
    const summary = screen.getByRole("table");
    const before = within(summary)
      .getAllByRole("cell")
      .map((c) => c.textContent)
      .join("|");
    fireEvent.click(screen.getByRole("button", { name: "First dose" }));
    const after = within(summary)
      .getAllByRole("cell")
      .map((c) => c.textContent)
      .join("|");
    expect(after).not.toBe(before);
    expect(input("Dose").value).toBe("1000");
    expect(screen.getByText(/First-dose mode: interval metrics/)).toBeDefined();
  });
  it("prevents invalid regimens from showing a misleading simulation", () => {
    render(<App />);
    fireEvent.change(input("Clearance"), { target: { value: "0" } });
    expect(screen.getByText("Check your parameters")).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Export CSV" })
        .hasAttribute("disabled"),
    ).toBe(true);
    fireEvent.change(input("Clearance"), { target: { value: "10" } });
    expect(screen.getByRole("table")).toBeDefined();
  });
  it("validates non-overlapping infusion duration", () => {
    render(<App />);
    fireEvent.change(input("Infusion duration"), { target: { value: "9" } });
    expect(
      screen.getByText("Infusion must not exceed the dosing interval."),
    ).toBeDefined();
    expect(screen.queryByTestId("chart")).toBeNull();
  });
  it("loads vancomycin preset with total AUC range and evaluates both bounds", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^Vancomycin:/ }));
    expect(input("Minimum target threshold").value).toBe("400");
    expect(input("Maximum target threshold").value).toBe("600");
    expect(
      (screen.getByLabelText("Target concentration basis") as HTMLSelectElement)
        .value,
    ).toBe("total");
    fireEvent.change(input("Dose"), { target: { value: "2000" } });
    expect(screen.getAllByText("Above target").length).toBe(2);
  });
  it("validates target ranges and resumes results after correction", () => {
    render(<App />);
    fireEvent.change(input("Minimum target threshold"), {
      target: { value: "110" },
    });
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText(/time targets must be/)).toBeDefined();
    fireEvent.change(input("Minimum target threshold"), {
      target: { value: "40" },
    });
    expect(screen.getByRole("table")).toBeDefined();
  });
  it("supports single regimen mode, copy, and reset without shared state", () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "Copy A parameters to B" }),
    );
    expect(input("Infusion duration").value).toBe("0.5");
    fireEvent.change(input("Dose"), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Regimen A" }));
    expect(input("Dose").value).toBe("1000");
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.queryByRole("button", { name: "Regimen B" })).toBeNull();
    expect(
      within(screen.getByRole("table")).getAllByRole("columnheader").length,
    ).toBe(2);
    fireEvent.click(
      screen.getByRole("button", { name: "Reset all simulation settings" }),
    );
    expect(screen.getByRole("button", { name: "Regimen B" })).toBeDefined();
  });
  it("exports inputs, metrics, target, and curves in a labeled CSV", async () => {
    render(<App />);
    const create = vi.fn((_blob: Blob) => "blob:simulation");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: create,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe("exposure-lab-simulation.csv");
      });
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    const blob = create.mock.calls[0][0] as Blob;
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(text).toContain("educational use only");
    expect(text).toContain("dose (mg)");
    expect(text).toContain("auc24 (mg·h/L)");
    expect(text).toContain("Free B (mg/L)");
    expect(text).toContain("Concentration basis");
    click.mockRestore();
  });
  it("opens learning notes with a persistent educational disclaimer", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Model & equations" }));
    expect(
      screen.getByRole("dialog", { name: "The model behind the curves" }),
    ).toBeDefined();
    expect(
      screen.getByText(/Do not use to prescribe or adjust treatment/),
    ).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", { name: "Close learning notes" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
