import { fireEvent, screen } from "@testing-library/react";
import React from "react";
import { renderMockProvider } from "../../testUtils/MockProvider";
import localStorage from "../../util/localStorage";
import Settings from "../settings";

const testName = "TestKeyRing";
const testKeyring = () => ({
  TestKeyRing: { name: testName },
  TestKeyRing2: { name: "TestKeyRing2" },
});

const renderSettings = () => renderMockProvider({ children: <Settings /> });

describe("Settings", () => {
  it("renders", () => {
    renderSettings();
  });

  it("opens keyrings collapsible", () => {
    renderSettings();

    const openButton = screen.getByRole("button", { expanded: false });
    fireEvent.click(openButton);

    // closes collapsible
    const closeButton = screen.getByRole("button", { expanded: true });
    fireEvent.click(closeButton);
  });

  it("shows keyrings", () => {
    localStorage.setKeyring(testKeyring());
    renderSettings();

    const openButton = screen.getByRole("button", { expanded: false });
    fireEvent.click(openButton);

    expect(screen.getByText(testName)).toBeInTheDocument();
  });
});
