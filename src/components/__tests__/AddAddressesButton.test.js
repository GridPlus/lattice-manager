import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AddAddressesButton } from "../AddAddressesButton";

const mockRecords = [{ key: "", val: "" }];
const mockSession = { client: { addKvRecords: jest.fn() } };
const mockAddRecordFunc = mockSession.client.addKvRecords;

const existingAddress = "0xc0c8f96C2fE011cc96770D2e37CfbfeAFB585F0a";
const newAddress = "0xc0c8f96C2fE011cc96770D2e37CfbfeAFB585F0e";
const existingName = "testName";
const newName = "testName2";

describe("AddAddressesButton", () => {
  it("renders", () => {
    render(
      <AddAddressesButton
        records={mockRecords}
        session={mockSession}
        addToRecordsInState={() => {}}
      />
    );
  });

  it("shows and hides the modal", () => {
    render(
      <AddAddressesButton
        records={mockRecords}
        session={mockSession}
        addToRecordsInState={() => {}}
      />
    );
    // shows modal
    const addButton = screen.getByRole("button");
    fireEvent.click(addButton);
    expect(screen.getByText("Add Address Tags")).toBeInTheDocument();

    // hides modal
    const closeButton = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeButton);
    expect(screen.queryByText("Add Address Tags")).not.toBeVisible();
  });

  it("adds an address", async () => {
    render(
      <AddAddressesButton
        records={mockRecords}
        session={mockSession}
        addToRecordsInState={() => {}}
      />
    );
    const addButton = screen.getByRole("button");
    fireEvent.click(addButton);

    const addressInput = screen.getByTestId("0-address-input");
    const addAddressesButton = screen.getByRole("button", { name: "Add" });
    const nameInput = screen.getByTestId("0-name-input");

    // updates form fields
    fireEvent.change(addressInput, { target: { value: newAddress } });
    fireEvent.change(nameInput, { target: { value: newName } });
    fireEvent.click(addAddressesButton);

    await waitFor(() => expect(mockAddRecordFunc).toHaveBeenCalledTimes(1));
  });

  it("cancels adding an address", async () => {
    render(
      <AddAddressesButton
        records={mockRecords}
        session={mockSession}
        addToRecordsInState={() => {}}
      />
    );
    const addButton = screen.getByRole("button");
    fireEvent.click(addButton);

    const addressInput = screen.getByTestId("0-address-input");
    const nameInput = screen.getByTestId("0-name-input");
    const cancelButton = screen.getByRole("button", {
      name: "Cancel",
    });

    fireEvent.change(addressInput, { target: { value: newAddress } });
    fireEvent.change(nameInput, { target: { value: newName } });

    // Modal should be cancelled and disappear
    fireEvent.click(cancelButton);
    expect(screen.queryByText("Add Address Tags")).not.toBeVisible();

    // Input fields should be empty after closing modal
    fireEvent.click(addButton);
    const addressAfter = screen.getByTestId("0-address-input");
    const nameInputAfter = screen.getByTestId("0-address-input");
    expect(addressAfter).toHaveValue("");
    expect(nameInputAfter).toHaveValue("");
  });

  it("adds and removes multiple input field groups", async () => {
    render(
      <AddAddressesButton
        records={mockRecords}
        session={mockSession}
        addToRecordsInState={() => {}}
      />
    );
    const addButton = screen.getByRole("button");
    fireEvent.click(addButton);

    // Adds a new input field group
    const addAddressButton = screen.getByRole("button", {
      name: "plus Add Another Address Tag",
    });
    fireEvent.click(addAddressButton);

    const oneAddressInput = screen.getByTestId("1-address-input");
    const oneNameInput = screen.getByTestId("1-name-input");

    expect(oneAddressInput).toBeInTheDocument();
    expect(oneNameInput).toBeInTheDocument();

    // Removes an input field group and removes input fields from DOM
    const removeAddressButton = screen.getByRole("button", {
      name: "minus-square",
    });
    fireEvent.click(removeAddressButton);
    expect(screen.queryByTestId("1-address-input")).not.toBeInTheDocument();
    expect(screen.queryByTestId("1-name-input")).not.toBeInTheDocument();
  });

  it("validates addresses", async () => {
    const records = [{ key: existingAddress, val: existingName }];
    render(
      <AddAddressesButton
        records={records}
        session={mockSession}
        addToRecordsInState={() => {}}
      />
    );
    const addButton = screen.getByRole("button");
    fireEvent.click(addButton);

    const addressInput = screen.getByTestId("0-address-input");
    const addAddressesButton = screen.getByRole("button", { name: "Add" });
    const nameInput = screen.getByTestId("0-name-input");
    fireEvent.change(nameInput, { target: { value: "test" } });

    // Address exists at all
    fireEvent.click(addAddressesButton);
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));

    // Address is in a viable address format
    fireEvent.change(addressInput, { target: { value: "test" } });
    fireEvent.click(addAddressesButton);
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));

    // Address matches an address that already exists in the system
    fireEvent.change(addressInput, { target: { value: existingAddress } });
    fireEvent.click(addAddressesButton);
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));

    // Address has no errors
    fireEvent.change(addressInput, { target: { value: newAddress } });
    fireEvent.click(addAddressesButton);
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    );
  });

  it("validates names", async () => {
    const records = [{ key: existingAddress, val: existingName }];
    render(
      <AddAddressesButton
        records={records}
        session={mockSession}
        addToRecordsInState={() => {}}
      />
    );
    const addButton = screen.getByRole("button");
    fireEvent.click(addButton);

    const addressInput = screen.getByTestId("0-address-input");
    const addAddressesButton = screen.getByRole("button", { name: "Add" });
    const nameInput = screen.getByTestId("0-name-input");
    fireEvent.change(addressInput, { target: { value: newAddress } });

    // Name matches an name that already exists in the system
    fireEvent.change(nameInput, { target: { value: existingName } });
    fireEvent.click(addAddressesButton);
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1));

    // Validate name exists
    fireEvent.change(nameInput, { target: { value: newName } });
    fireEvent.click(addAddressesButton);
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    );
  });
});
