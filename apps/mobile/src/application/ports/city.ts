export type Coordinates = { readonly latitude: number; readonly longitude: number };

export type City = {
  readonly id: string;
  readonly name: string;
  readonly admin1: string | null;
  readonly country: string;
  readonly countryCode: string; // ISO-3166-1 alpha-2
  readonly latitude: number;
  readonly longitude: number;
  readonly timezone: string; // IANA
};
