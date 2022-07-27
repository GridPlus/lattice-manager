import { fireEvent, screen, waitFor } from "@testing-library/react";
import { getMockClient, mockKvResponse } from "../../testUtils/getMockClient";
import { renderMockAppProvider } from "../../testUtils/MockProvider";
import store from "../../store/persistanceStore";
import AddressTagsPage from "../AddressTagsPage";

const renderAddressTagsPage = (overrides?) =>
  renderMockAppProvider({ children: <AddressTagsPage />, ...overrides });

describe("AddressTagsPage", () => {
  beforeEach(() => {
    store.removeAddresses();
  });

  it("renders", async () => {
    waitFor(() => renderAddressTagsPage());
  });

  it("fetches addresses on load", async () => {
    const client = getMockClient();
    renderAddressTagsPage({ addresses: [], client });
    waitFor(() => expect(client.getKvRecords).toHaveBeenCalledTimes(1));
  });

  it("fetches many addresses on load", async () => {
    const client = getMockClient();
    client.getKvRecords = jest.fn(() =>
      Promise.resolve({
        ...mockKvResponse,
        total: 50,
      })
    );
    renderAddressTagsPage({ client });
    await waitFor(() => expect(client.getKvRecords).toHaveBeenCalledTimes(10));
  });

  it("removes addresses", () => {
    const client = getMockClient();
    renderAddressTagsPage({ client });
    const checkboxes = screen.getAllByRole("checkbox");
    const removeButton = screen.getByRole("button", {
      name: "Remove Selected",
    });
    expect(removeButton).toBeDisabled();
    const selectAll = checkboxes[0];

    fireEvent.click(selectAll);
    fireEvent.click(removeButton);

    waitFor(() => expect(client.removeKvRecords).toHaveBeenCalledTimes(1));
  });
});
