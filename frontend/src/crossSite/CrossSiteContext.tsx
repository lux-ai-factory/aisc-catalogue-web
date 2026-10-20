import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  startCrossSiteSession,
  getHandshake,
  getBackUrl,
  disconnectTargetEnv,
  type HandshakePayload,
} from "./connect";

interface CrossSiteState {
  targetUrl: string | null;
  /** The project page the catalogue was opened from, when it was. */
  backUrl: string | null;
  /** The whole handshake, including where the controls app lives. */
  handshake: HandshakePayload | null;
  disconnect: () => void;
}

const CrossSiteContext = createContext<CrossSiteState | undefined>(undefined);

export const CrossSiteProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [handshake, setHandshake] = useState<HandshakePayload | null>(null);

  // On mount, consume a `#env=` handshake (or restore a persisted one).
  useEffect(() => {
    setTargetUrl(startCrossSiteSession());
    setBackUrl(getBackUrl());
    setHandshake(getHandshake());
  }, []);

  const value = useMemo<CrossSiteState>(
    () => ({
      targetUrl,
      backUrl,
      handshake,
      // the whole handshake goes at once: the target, the Back link and the project it gave
      disconnect: () => {
        disconnectTargetEnv();
        setTargetUrl(null);
        setBackUrl(null);
        setHandshake(null);
      },
    }),
    [targetUrl, backUrl, handshake]
  );

  return (
    <CrossSiteContext.Provider value={value}>
      {children}
    </CrossSiteContext.Provider>
  );
};

export function useCrossSite(): CrossSiteState {
  const ctx = useContext(CrossSiteContext);
  if (!ctx) {
    throw new Error("useCrossSite must be used within a CrossSiteProvider");
  }
  return ctx;
}
