import { fireEvent, screen } from "@testing-library/react";
import React from "react";
import { renderMockAppProvider } from "../../testUtils/MockProvider";
import store from "../../store/persistanceStore";
import Settings from "../../pages/SettingsPage";

const testName = "TestKeyRing";
const testKeyring = () => ({
  TestKeyRing: { name: testName },
  TestKeyRing2: { name: "TestKeyRing2" },
});

const renderSettings = () => renderMockAppProvider({ children: <Settings /> });

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
    store.setKeyring(testKeyring());
    renderSettings();

    const openButton = screen.getByRole("button", { expanded: false });
    fireEvent.click(openButton);

    expect(screen.getByText(testName)).toBeInTheDocument();
  });
});
