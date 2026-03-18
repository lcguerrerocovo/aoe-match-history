declare module 'steam-user' {
  interface SteamID {
    getSteamID64(): string;
  }

  interface LogOnDetails {
    accountName: string;
    password: string;
  }

  class SteamUser {
    steamID: SteamID;
    accountInfo: { name: string } | null;
    logOn(details: LogOnDetails): void;
    logOff(): void;
    getEncryptedAppTicket(
      appId: number,
      key: Buffer,
      callback: (err: Error | null, ticket: Buffer) => void
    ): void;
    on(event: 'loggedOn', callback: () => void): void;
    on(event: 'webSession', callback: () => void): void;
    on(event: 'steamGuard', callback: (domain: string, callback: (code: string) => void, lastCodeWrong: boolean) => void): void;
    on(event: 'error', callback: (err: Error) => void): void;
  }

  export = SteamUser;
}
