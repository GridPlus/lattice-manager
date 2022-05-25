import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import React from "react";
import { getMockSession } from "../../testUtils/getMockSession";
import { renderMockProvider } from "../../testUtils/MockProvider";
import localStorage from "../../util/localStorage";
import {
  AddAddressesButton,
  valIsDuplicatedErrorMessage,
} from "../AddAddressesButton";

const existingAddress = "0xc0c8f96C2fE011cc96770D2e37CfbfeAFB585F0a";
const newAddress = "0xc0c8f96C2fE011cc96770D2e37CfbfeAFB585F0e";
const existingName = "testName";
const newName = "testName2";

const renderAddAddressesButton = (overrides?) =>
  renderMockProvider({ children: <AddAddressesButton />, ...overrides });

describe("AddAddressesButton", () => {
    beforeEach(() => {
      localStorage.removeAddresses();
    });
  
  it("renders", () => {
    renderAddAddressesButton();
  });

  it("shows and hides the modal", async () => {
    renderAddAddressesButton();

    // shows modal
    const addButton = screen.getByRole("button");
    act(() => {
      fireEvent.click(addButton);
    });
    await waitFor(() =>
      expect(screen.queryByText("Add Address Tags")).toBeInTheDocument()
    );

    // hides modal
    const closeButton = screen.getByRole("button", { name: "Close" });
    act(() => {
      fireEvent.click(closeButton);
    });
    await waitFor(() =>
      expect(screen.queryByText("Add Address Tags")).not.toBeInTheDocument()
    );
  });

  it("adds an address", async () => {
    const session = getMockSession();
    renderAddAddressesButton({ session });
    const addButton = screen.getByRole("button");

    act(() => {
      fireEvent.click(addButton);
    });

    const addressInput = screen.getByTestId("0-address-input");
    act(() => {
      fireEvent.change(addressInput, { target: { value: newAddress } });
    });

    const nameInput = screen.getByTestId("0-name-input");
    act(() => {
      fireEvent.change(nameInput, { target: { value: newName } });
    });

    const addAddressesButton = screen.getByRole("button", { name: "Add" });
    act(() => {
      fireEvent.click(addAddressesButton);
    });

    await waitFor(() =>
      expect(session.client.addKvRecords).toHaveBeenCalledTimes(1)
    );
  });

  it("cancels adding an address", async () => {
    renderAddAddressesButton();
    const addButton = screen.getByRole("button");
    act(() => {
      fireEvent.click(addButton);
    });

    await waitFor(() =>
      expect(screen.getByTestId("0-address-input")).toBeInTheDocument()
    );

    const addressInput = screen.getByTestId("0-address-input");
    act(() => {
      fireEvent.change(addressInput, { target: { value: newAddress } });
    });

    const nameInput = screen.getByTestId("0-name-input");
    act(() => {
      fireEvent.change(nameInput, { target: { value: newName } });
    });

    const cancelButton = screen.getByRole("button", {
      name: "Cancel",
    });
    act(() => {
      fireEvent.click(cancelButton);
    });
    // Modal should be cancelled and disappear
    waitFor(() =>
      expect(screen.queryByText("Add Address Tags")).not.toBeInTheDocument()
    );
  });

  it("adds and removes multiple input field groups", async () => {
    renderAddAddressesButton();
    const addButton = screen.getByRole("button");
    act(() => {
      fireEvent.click(addButton);
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "plus Add Another Address Tag",
        })
      ).toBeInTheDocument()
    );

    // Adds a new input field group
    const addAddressButton = screen.getByRole("button", {
      name: "plus Add Another Address Tag",
    });
    act(() => {
      fireEvent.click(addAddressButton);
    });

    const oneAddressInput = screen.getByTestId("1-address-input");
    expect(oneAddressInput).toBeInTheDocument();

    const oneNameInput = screen.getByTestId("1-name-input");
    expect(oneNameInput).toBeInTheDocument();

    // Removes an input field group and removes input fields from DOM
    const removeAddressButton = screen.getByRole("button", {
      name: "minus-square",
    });
    act(() => {
      fireEvent.click(removeAddressButton);
    });

    expect(screen.queryByTestId("1-address-input")).not.toBeInTheDocument();
    expect(screen.queryByTestId("1-name-input")).not.toBeInTheDocument();
  });

  describe("validation", () => {
    const addresses = [{ key: existingAddress, val: existingName }];
    
    beforeEach(() => {
    localStorage.setLogin({ deviceID: "id", password: "pass" });
    localStorage.setAddresses(addresses);
    });

    it("validates addresses", async () => {
      renderAddAddressesButton();
      const addButton = screen.getByRole("button");
      act(() => {
        fireEvent.click(addButton);
      });

      await waitFor(() =>
        expect(screen.getByTestId("0-address-input")).toBeInTheDocument()
      );

      const nameInput = screen.getByTestId("0-name-input");
      act(() => {
        fireEvent.change(nameInput, { target: { value: "test" } });
      });

      // Address exists at all
      const addAddressesButton = screen.getByRole("button", { name: "Add" });
      act(() => {
        fireEvent.click(addAddressesButton);
      });
      await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1));

      // Address matches an address that already exists in the system
      const addressInput = screen.getByTestId("0-address-input");
      act(() => {
        fireEvent.change(addressInput, { target: { value: existingAddress } });
      });

      act(() => {
        fireEvent.click(addAddressesButton);
      });

      await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1));

      // Address has no errors
      act(() => {
        fireEvent.change(addressInput, { target: { value: newAddress } });
      });
      act(() => {
        fireEvent.click(addAddressesButton);
      });
      await waitFor(() =>
        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
      );
    });

    it("validates names", async () => {
      renderAddAddressesButton();
      const addButton = screen.getByRole("button");
      act(() => {
        fireEvent.click(addButton);
      });
      await waitFor(() =>
        expect(screen.getByTestId("0-address-input")).toBeInTheDocument()
      );

      const addressInput = screen.getByTestId("0-address-input");
      act(() => {
        fireEvent.change(addressInput, { target: { value: newAddress } });
      });

      // Name matches an name that already exists in the system
      const nameInput = screen.getByTestId("0-name-input");
      act(() => {
        fireEvent.change(nameInput, { target: { value: existingName } });
      });

      const addAddressesButton = screen.getByRole("button", { name: "Add" });
      act(() => {
        fireEvent.click(addAddressesButton);
      });

      await waitFor(() =>
        expect(
          screen.getByText(valIsDuplicatedErrorMessage)
        ).toBeInTheDocument()
      );

      // Validate name exists
      act(() => {
        fireEvent.change(nameInput, { target: { value: newName } });
      });
      act(() => {
        fireEvent.click(addAddressesButton);
      });
      await waitFor(() =>
        expect(screen.queryByRole("alert")).not.toBeInTheDocument()
      );
    });
  })

  
});
