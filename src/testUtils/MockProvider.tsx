import { act, render } from "@testing-library/react";
import React, { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppContextProvider } from "../store/AppContext";
import { getMockClient } from "./getMockClient";

/**
 * Component that wraps children components with the `AppContextProvider` and accepts an override
 * object that can be used to mock any properties in the `AppContext`.
 *
 * @param children The React component(s) to render.
 */
export const MockAppProvider = ({
  children,
  overrides,
}: {
  children: ReactNode;
  overrides?;
}) => (
  <BrowserRouter>
    <AppContextProvider overrides={{ ...overrides }}>
      {children}
    </AppContextProvider>
  </BrowserRouter>
);

/**
 * Renders a React component wrapped by the `AppContext` with the given overrides and a `Session`
 * object that is pre-populated.
 *
 * @param children The React component(s) to render.
 */
export const renderMockAppProvider = ({
  children,
  ...overrides
}: {
  children: ReactNode;
  overrides?;
}) => {
  const client = getMockClient();
  act(() => {
    render(
      <MockAppProvider overrides={{ client, ...overrides }}>
        {children}
      </MockAppProvider>
    );
  });
};
