import {
  ContractDefinition,
  ContractRecord,
  LatticeContract,
} from "./../types/contracts";

export const transformContractDefinitionToContractRecord = (
  def: ContractDefinition
): ContractRecord => {
  return {
    id: def.name,
    category: "",
    header: { name: def.name, sig: def.sig, numParam: def.params.length },
    ...def,
  };
};

export const transformLatticeContractToContractRecord = (
  lc: LatticeContract
): ContractRecord => {
  return {
    id: lc.header.name,
    name: lc.header.name,
    sig: lc.header.sig,
    ...lc,
  };
};
