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

  it("shows the modal", () => {
    render(
      <AddAddressesButton
        records={mockRecords}
        session={mockSession}
        addToRecordsInState={() => {}}
      />
    );
    const addButton = screen.getByRole("button");
    fireEvent.click(addButton);
    expect(screen.getByText("Add Address Tags")).toBeInTheDocument();
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

    fireEvent.change(addressInput, { target: { value: newAddress } });
    fireEvent.change(nameInput, { target: { value: newName } });
    fireEvent.click(addAddressesButton);

    await waitFor(() => expect(mockAddRecordFunc).toHaveBeenCalledTimes(1));
  });

  it("adds multiple input field groups", async () => {
    render(
      <AddAddressesButton
        records={mockRecords}
        session={mockSession}
        addToRecordsInState={() => {}}
      />
    );
    const addButton = screen.getByRole("button");
    fireEvent.click(addButton);

    const addAddressButton = screen.getByRole("button", {
      name: "plus Add Another Address Tag",
    });
    fireEvent.click(addAddressButton);

    const addressInput = screen.getByTestId("1-address-input");
    const nameInput = screen.getByTestId("1-name-input");

    expect(addressInput).toBeInTheDocument();
    expect(nameInput).toBeInTheDocument();
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

    // Address Exists
    fireEvent.click(addAddressesButton);
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));
    expect(mockAddRecordFunc).toHaveBeenCalledTimes(1);

    // Address is in a viable address format
    fireEvent.change(addressInput, { target: { value: "test" } });
    fireEvent.click(addAddressesButton);
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));

    // Address matches an address that already exists in the system
    fireEvent.change(addressInput, { target: { value: existingAddress } });
    fireEvent.click(addAddressesButton);
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));

    // Address is valid
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

    // Validate repeated names
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
