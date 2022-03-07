import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import React from "react";
import { ContractTable } from "../ContractTable";

const mockContracts = {
  records: [
    {
      id: "a",
      header: {
        sig: "0xe8e33700",
        name: "a",
        numParam: 8,
      },
      category: "",
      params: [
        {
          name: "tokenA",
          type: 1,
          typeName: "address",
          isArray: 0,
          arraySz: 0,
        },
        {
          name: "tokenB",
          type: 1,
          typeName: "address",
          isArray: 0,
          arraySz: 0,
        },
        {
          name: "amountADesired",
          type: 34,
          typeName: "uint256",
          isArray: 0,
          arraySz: 0,
        },
        {
          name: "amountBDesired",
          type: 34,
          typeName: "uint256",
          isArray: 0,
          arraySz: 0,
        },
        {
          name: "amountAMin",
          type: 34,
          typeName: "uint256",
          isArray: 0,
          arraySz: 0,
        },
        {
          name: "amountBMin",
          type: 34,
          typeName: "uint256",
          isArray: 0,
          arraySz: 0,
        },
        {
          name: "to",
          type: 1,
          typeName: "address",
          isArray: 0,
          arraySz: 0,
        },
        {
          name: "deadline",
          type: 34,
          typeName: "uint256",
          isArray: 0,
          arraySz: 0,
        },
      ],
    },
    {
      id: "b",
      header: {
        sig: "0x054d50d4",
        name: "b",
        numParam: 3,
      },
      category: "",
      params: [
        {
          name: "amountIn",
          type: 34,
          typeName: "uint256",
          isArray: 0,
          arraySz: 0,
        },
        {
          name: "reserveIn",
          type: 34,
          typeName: "uint256",
          isArray: 0,
          arraySz: 0,
        },
        {
          name: "reserveOut",
          type: 34,
          typeName: "uint256",
          isArray: 0,
          arraySz: 0,
        },
      ],
    },
  ],
};
const session = {
  client: {
    getAbiRecords: jest.fn(async () => mockContracts),
    removeAbiRecords: jest.fn(),
  },
};
const mockContractTable = (overwrites?) => (
  <ContractTable
    {...{
      session,
      ...overwrites,
    }}
  />
);

describe("ContractTable", () => {
  it("renders", () => {
    render(mockContractTable());
  });

  it("shows loading", () => {
    render(mockContractTable());
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("selects and unselects contracts", async () => {
    render(mockContractTable());
    await waitFor(() =>
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    );
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

  it("handles removing contracts", async () => {
    render(mockContractTable());
    await waitFor(() =>
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    );
    const checkboxes = screen.getAllByRole("checkbox");
    const removeButton = screen.getByRole("button", {
      name: "Remove Selected",
    });
    expect(removeButton).toBeDisabled();
    const selectAll = checkboxes[0];
    fireEvent.click(selectAll);
    expect(removeButton).not.toBeDisabled();
    fireEvent.click(removeButton);
    expect(session.client.removeAbiRecords).toHaveBeenCalled();
  });

  it("filters contracts", async () => {
    render(mockContractTable());
    await waitFor(() =>
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    );
    expect(screen.getByText("a")).toBeInTheDocument();
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "b" } });
    expect(screen.queryByText("a")).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.queryByText("a")).toBeInTheDocument();
  });

  it("sorts contracts", async () => {
    render(mockContractTable());
    await waitFor(() =>
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    );
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
    const sortByName = screen.getByText("Name");
    const sortBySig = screen.getByText("Sig");
    const rowOne = () => screen.queryAllByRole("row")[1];
    const rowTwo = () => screen.queryAllByRole("row")[2];
    fireEvent.click(sortByName);
    expect(within(rowOne()).getByText("a")).toBeInTheDocument();
    fireEvent.click(sortByName);
    expect(within(rowTwo()).getByText("b")).toBeInTheDocument();
    fireEvent.click(sortBySig);
    expect(within(rowOne()).getByText("b")).toBeInTheDocument();
    fireEvent.click(sortBySig);
    expect(within(rowOne()).getByText("a")).toBeInTheDocument();
  });
});
