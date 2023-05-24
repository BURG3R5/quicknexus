import { stream } from "../dependencies.ts";

type ConnectionCallback = (
  error: Error | null,
  portalSocket: stream.Duplex | null,
) => void;

export default ConnectionCallback;
