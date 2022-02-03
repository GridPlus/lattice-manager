import { act,waitFor, screen, render,fireEvent } from "@testing-library/react";
import React from "react";
import { AddressTagsPage } from "..";
import SDKSession from "../../sdk/sdkSession";
import { Record } from "../../types/records"

const isMobile = jest.fn();
const addresses: Record[] = [
  { id: "a", key: "a", val: "a" },
  { id: "b", key: "b", val: "b" },
];
const response = {
  records: addresses,
  fetched: 5,
  total: 5,
};
const session = new SDKSession("", jest.fn(), "", {});
session.getKvRecords = jest.fn(() => Promise.resolve(response));
session.removeKvRecords = jest.fn(() => Promise.resolve(true));

const renderAddressTagsPage = async () =>
  await act(async () => {
    await render(
      <AddressTagsPage
        {...{
          isMobile,
          session,
        }}
      />
    );
  });

describe("AddressTagsPage", () => {
  it("renders", async () => {
    await renderAddressTagsPage();
  });

  it("fetches addresses on load", async () => {
    session.getKvRecords = jest.fn(() => Promise.resolve(response));
    await renderAddressTagsPage();
    expect(session.getKvRecords).toHaveBeenCalledTimes(1);
  });

  it("fetches many addresses on load", async () => {
    session.getKvRecords = jest.fn(() =>
      Promise.resolve({
        ...response,
        total: 50,
      })
    );
    await renderAddressTagsPage();
    expect(session.getKvRecords).toHaveBeenCalledTimes(10);
  });

  it("retries to fetch", async () => {
    let retries = 2;
    session.getKvRecords = jest.fn(
      () =>
        new Promise((resolve, reject) => {
          if (!retries) return resolve(response);
          reject("Error");
          --retries;
        })
    );
    await renderAddressTagsPage();
    expect(session.getKvRecords).toHaveBeenCalledTimes(4);
  });
  it("removes addresses", async () => {
    await renderAddressTagsPage();
    const checkboxes = screen.getAllByRole("checkbox");
    const removeButton = screen.getByRole("button", {
      name: "Remove Selected",
    });
    expect(removeButton).toBeDisabled();
    const selectAll = checkboxes[0];
    fireEvent.click(selectAll);
    fireEvent.click(removeButton);
    await waitFor(() => expect(session.removeKvRecords).toHaveBeenCalledTimes(1));
  });
});
