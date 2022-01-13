import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import Settings from "../settings";
import localStorage from "../../util/localStorage";

const testName = "TestKeyRing";
const testKeyring = () => ({
  TestKeyRing: { name: testName },
  TestKeyRing2: { name: "TestKeyRing2" },
});

describe("Settings", () => {
  it("renders", () => {
    render(<Settings isMobile={false} />);
  });

  it("opens keyrings collapsible", () => {
    render(<Settings isMobile={false} />);

    const openButton = screen.getByRole("button", { expanded: false });
    fireEvent.click(openButton);

    // closes collapsible
    const closeButton = screen.getByRole("button", { expanded: true });
    fireEvent.click(closeButton);
  });

  it("shows keyrings", () => {
    localStorage.setKeyring(testKeyring());
    render(<Settings isMobile={false} />);

    const openButton = screen.getByRole("button", { expanded: false });
    fireEvent.click(openButton);

    expect(screen.getByText(testName)).toBeInTheDocument();
  });

  it("updates keyring", () => {
    localStorage.setKeyring(testKeyring());
    const newName = "NewTestName";
    render(<Settings isMobile={false} />);

    const openButton = screen.getByRole("button", { expanded: false });
    fireEvent.click(openButton);

    const editButton = screen.getByTestId("TestKeyRing-edit");
    fireEvent.click(editButton);

    const nameInput = screen.getByTestId("TestKeyRing-input");
    fireEvent.change(nameInput, { target: { value: newName } });

    const saveButton = screen.getByTestId("TestKeyRing-save");
    fireEvent.click(saveButton);

    waitFor(() => {
      expect(screen.getByText("NewTestName")).toBeInTheDocument();
    });
  });

  it("cancels update of keyring", () => {
    localStorage.setKeyring(testKeyring());
    const newName = "NewTestName";
    render(<Settings isMobile={false} />);

    const openButton = screen.getByRole("button", { expanded: false });
    fireEvent.click(openButton);

    const editButton = screen.getByTestId("TestKeyRing-edit");
    fireEvent.click(editButton);

    const nameInput = screen.getByTestId("TestKeyRing-input");
    fireEvent.change(nameInput, { target: { value: newName } });

    const cancelButton = screen.getByTestId("TestKeyRing-cancel");
    fireEvent.click(cancelButton);

    waitFor(() => {
      expect(screen.getByText(testName)).toBeInTheDocument();
    });
  });
});
