import { LatticeRecord } from "./records";

type ContractParam = {
  isArray: boolean;
  type: number;
  arraySz: number;
  name: string;
  latticeTypeIdx: number;
};

export interface ContractDefinition {
  name: string;
  sig: string;
  params: ContractParam[];
}

export interface LatticeContract {
  category: string;
  header: {
    name: string;
    sig: string;
    numParam: number;
  };
  params: ContractParam[];
}

export interface ContractRecord
  extends LatticeRecord,
    LatticeContract,
    ContractDefinition {
  id: string;
}
