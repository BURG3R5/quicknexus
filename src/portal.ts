export default class Portal {
  connectedSockets: number;

  constructor(
    readonly port: number,
    readonly subdomain: string,
  ) {
    this.connectedSockets = 0;
  }
}
