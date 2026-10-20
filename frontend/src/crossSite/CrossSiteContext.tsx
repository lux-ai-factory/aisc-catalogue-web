import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  startCrossSiteSession,
  getHandshake,
  getBackUrl,
  handshakeExpired,
  type HandshakePayload,
} from "./connect";

interface CrossSiteState {
  /** The project page the catalogue was opened from, when it was. */
  backUrl: string | null;
  /** The whole handshake, including where the controls app lives. */
  handshake: HandshakePayload | null;
  /** The handshake ran out of time: the catalogue must be opened again from the project page. */
  expired: boolean;
}

const CrossSiteContext = createContext<CrossSiteState | undefined>(undefined);

export const CrossSiteProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [backUrl, setBackUrl] = useState<string | null>(null);
  const [handshake, setHandshake] = useState<HandshakePayload | null>(null);
  const [expired, setExpired] = useState(false);

  // On mount, consume a `#env=` handshake (or restore the one kept for this tab),
  // and read it again when its time runs out, so the page stops using it then.
  useEffect(() => {
    let timer: number | undefined;
    const read = () => {
      const current = getHandshake();
      setBackUrl(getBackUrl());
      setHandshake(current);
      setExpired(handshakeExpired());
      if (current) timer = window.setTimeout(read, Math.max(0, current.expires - Date.now()) + 1);
    };
    startCrossSiteSession();
    read();
    return () => window.clearTimeout(timer);
  }, []);

  const value = useMemo<CrossSiteState>(
    () => ({ backUrl, handshake, expired }),
    [backUrl, handshake, expired]
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
