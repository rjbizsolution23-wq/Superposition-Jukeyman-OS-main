declare module 'coinbase' {
  export class Coinbase {
    constructor(config: { apiKeyName: string; privateKey: string });
    createWallet(config: any): Promise<any>;
    listWallets(): Promise<any>;
    getWallet(id: string): Promise<any>;
  }
  export class Wallet {
    getId(): string;
    getName(): string;
    getNetworkId(): string;
    getDefaultAddress(): string;
    getBalance(): Promise<any>;
    createTransfer(config: any): Promise<any>;
  }
}