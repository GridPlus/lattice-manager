import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useState } from "react";
import { NameEditor } from "../NameEditor";

const oldTestName = "TestName";
const newTestName = "NewTestName";

const TestNameEditor = () => {
  const [testName, setTestName] = useState(oldTestName);
  return <NameEditor name={testName} setName={setTestName} />;
};

describe("NameEditor", () => {
  it("renders", () => {
    render(<NameEditor name={""} setName={() => {}} />);
  });

  it("updates name", async () => {
    render(<TestNameEditor />);

    const editButton = screen.getByTestId("TestName-edit");
    fireEvent.click(editButton);

    const nameInput = screen.getByTestId("TestName-input");
    fireEvent.change(nameInput, { target: { value: newTestName } });

    const saveButton = screen.getByTestId("TestName-save");
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(screen.getByText(newTestName)).toBeInTheDocument()
    );
  });

  it("cancels update of name", async () => {
    render(<TestNameEditor />);

    const editButton = screen.getByTestId("TestName-edit");
    fireEvent.click(editButton);

    const nameInput = screen.getByTestId("TestName-input");
    fireEvent.change(nameInput, { target: { value: newTestName } });

    const cancelButton = screen.getByTestId("TestName-cancel");
    fireEvent.click(cancelButton);

    await waitFor(() =>
      expect(screen.getByText(oldTestName)).toBeInTheDocument()
    );
  });
});
