import { User } from "./User";

export interface Company {
  name: string;
  taxID: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  owner: User;
}
