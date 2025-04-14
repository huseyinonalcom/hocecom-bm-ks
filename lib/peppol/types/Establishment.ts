import { Address } from "./Address";
import { Company } from "./Company";

export interface Establishment {
  name: string;
  taxID: string;
  company: Company;
  address: Address;
}
