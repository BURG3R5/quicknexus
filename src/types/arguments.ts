export default interface Arguments {
  port: number;
  secure: boolean;
  allowDelete: boolean;
  lowerPortLimit: number;
  upperPortLimit: number;
  domain: string | undefined;
  address: string;
  maxSockets: number;
  _: string[];
  $0: string;
  [x: string]: unknown;
}
