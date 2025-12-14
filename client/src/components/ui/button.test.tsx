import React from "react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button component", () => {
  it("renders children and applies semantic role", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("applies variant specific styles", () => {
    render(
      <Button variant="outline" data-testid="outline-button">
        Outline CTA
      </Button>,
    );

    const outline = screen.getByTestId("outline-button");
    expect(outline.className).toMatch(/border/);
    expect(outline.className).toMatch(/outline/);
  });
});
