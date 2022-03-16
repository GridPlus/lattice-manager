import { fireEvent, screen, within } from "@testing-library/react";
import React from "react";
import { renderMockProvider } from "../../testUtils/MockProvider";
import { AddressTable } from "../AddressTable";

const addresses = [
  { key: "a", val: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
  { key: "b", val: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
];
const removeAddresses = jest.fn();
const loading = false;

const renderAddressTable = (overrides?) =>
  renderMockProvider({
    children: (
      <AddressTable
        {...{
          addresses,
          loading,
          removeAddresses,
          ...overrides,
        }}
      />
    ),
  });

describe("AddressTable", () => {
  it("renders", () => {
    renderAddressTable();
  });

  it("shows loading", () => {
    renderAddressTable({ loading: true });
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("selects and unselects addresses", () => {
    renderAddressTable();
    const checkboxes = screen.getAllByRole("checkbox");
    const removeButton = screen.getByRole("button", {
      name: "Remove Selected",
    });
    expect(removeButton).toBeDisabled();
    const selectAll = checkboxes[0];
    fireEvent.click(selectAll);
    expect(selectAll).toBeChecked();
    const selectA = checkboxes[1];
    fireEvent.click(selectA);
    expect(selectA).not.toBeChecked();
  });

  it("handles removing addresses", () => {
    renderAddressTable();
    const checkboxes = screen.getAllByRole("checkbox");
    const removeButton = screen.getByRole("button", {
      name: "Remove Selected",
    });
    expect(removeButton).toBeDisabled();
    const selectAll = checkboxes[0];
    fireEvent.click(selectAll);
    expect(removeButton).not.toBeDisabled();
    fireEvent.click(removeButton);
    expect(removeAddresses).toHaveBeenCalled();
  });

  it("filters addresses", () => {
    renderAddressTable();
    expect(screen.getByText("a")).toBeInTheDocument();
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "b" } });
    expect(screen.queryByText("a")).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.queryByText("a")).toBeInTheDocument();
  });

  it("sorts addresses", () => {
    renderAddressTable();
    expect(screen.getByText("a")).toBeInTheDocument();
    const sortByName = screen.getByText("Name");
    const sortByAddress = screen.getByText("Address");
    const rowOne = () => screen.queryAllByRole("row")[1];
    fireEvent.click(sortByName);
    expect(within(rowOne()).getByText("b")).toBeInTheDocument();
    fireEvent.click(sortByName);
    expect(within(rowOne()).getByText("a")).toBeInTheDocument();
    fireEvent.click(sortByAddress);
    expect(within(rowOne()).getByText("a")).toBeInTheDocument();
    fireEvent.click(sortByAddress);
    expect(within(rowOne()).getByText("b")).toBeInTheDocument();
  });
});
