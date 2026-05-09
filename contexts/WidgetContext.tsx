import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { Platform } from "react-native";
import { ExtensionStorage } from "@bacons/apple-targets";

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

const reloadIfSupported = () => {
  if (Platform.OS !== "ios") return;
  try {
    ExtensionStorage.reloadWidget();
  } catch {
    // No-op on platforms without the iOS extension target.
  }
};

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    reloadIfSupported();
  }, []);

  const refreshWidget = useCallback(() => {
    reloadIfSupported();
  }, []);

  return (
    <WidgetContext.Provider value={{ refreshWidget }}>
      {children}
    </WidgetContext.Provider>
  );
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};
