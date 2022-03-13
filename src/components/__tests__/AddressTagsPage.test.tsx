import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import React from "react";
import { AddressTagsPage } from "..";
import { getMockSession, mockKvResponse } from "../../testUtils/getMockSession";
import { renderMockProvider } from "../../testUtils/MockProvider";

const renderAddressTagsPage = (overrides?) =>
  renderMockProvider({ children: <AddressTagsPage />, ...overrides });

describe("AddressTagsPage", () => {
  it("renders", async () => {
     waitFor(() => renderAddressTagsPage());
  });

  it("fetches addresses on load", async () => {
    const session = getMockSession();
    waitFor(() => renderAddressTagsPage({ addresses: [], session }));
     waitFor(() => expect(session.client.getKvRecords).toHaveBeenCalledTimes(1));
  });

  it("fetches many addresses on load",async () => {
    const session = getMockSession();
    session.client.getKvRecords = jest.fn(() =>
      Promise.resolve({
        ...mockKvResponse,
        total: 50,
      })
    );
    waitFor(()=> renderAddressTagsPage({ session }))
    await waitFor(() =>
      expect(session.client.getKvRecords).toHaveBeenCalledTimes(10)
    );
  });

  it("retries to fetch", () => {
    const session = getMockSession();
    let retries = 2;
    session.client.getKvRecords = jest.fn(
      () =>
        new Promise((resolve, reject) => {
          if (!retries) return resolve(mockKvResponse);
          reject("Error");
          --retries;
        })
    );
     waitFor(()=>renderAddressTagsPage({ session }))
     waitFor(() =>
      expect(session.client.getKvRecords).toHaveBeenCalledTimes(4)
    );
  });

  it("removes addresses", () => {
    const session = getMockSession();
    waitFor(()=> renderAddressTagsPage({ session }))
    const checkboxes = screen.getAllByRole("checkbox");
    const removeButton = screen.getByRole("button", {
      name: "Remove Selected",
    });
    expect(removeButton).toBeDisabled();
    const selectAll = checkboxes[0];

    act(()=>{fireEvent.click(selectAll)})

    act(()=>{fireEvent.click(removeButton)})

     waitFor(() =>
      expect(session.client.removeKvRecords).toHaveBeenCalledTimes(1)
    );
  });
});
