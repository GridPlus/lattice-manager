import { act, render } from "@testing-library/react";
import React, { ReactNode } from "react";
import { AppContextProvider } from "../store/AppContext";
import { getMockSession } from "./getMockSession";

/**
 * Component that wraps children components with the `AppContextProvider` and
 * accepts an override object that can be used to mock any properties in the `AppContext`.
 *
 * @param children The children of the component.
 */
export const MockProvider = ({
  children,
  overrides,
}: {
  children: ReactNode;
  overrides?;
}) => (
  <AppContextProvider overrides={{ ...overrides }}>
    {children}
  </AppContextProvider>
);

/**
 * Renders a React component wrapped by the `AppContext` with the given overrides
 * and a `Session` object that is pre-populated.
 *
 * @param children The React component(s) to render.
 */
export const renderMockProvider = ({
  children,
  ...overrides
}: {
  children: ReactNode;
  overrides?;
}) => {
  const session = getMockSession();
   act(() => {
    render(
      <MockProvider overrides={{ session, ...overrides }}>
        {children}
      </MockProvider>
    );
  });
};
