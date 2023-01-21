import {
  ContractDefinition,
  ContractRecord,
  LatticeContract,
} from "./../../types/contracts";
import {
  transformContractDefinitionToContractRecord,
  transformLatticeContractToContractRecord,
} from "../contracts";

describe("contract utilities", () => {
  test("transforms ContractDefinition to ContractRecord", () => {
    const mockDef: ContractDefinition = { name: "a", sig: "a", params: [] };

    const expected: ContractRecord = {
      category: "",
      header: { name: "a", numParam: 0, sig: "a" },
      id: "a",
      name: "a",
      params: [],
      sig: "a",
    };

    expect(transformContractDefinitionToContractRecord(mockDef)).toStrictEqual(
      expected
    );
  });

  test("transforms LatticeContract to ContractRecord", () => {
    const mockDef: LatticeContract = {
      category: "",
      header: { name: "a", sig: "a", numParam: 0 },
      params: [],
    };

    const expected: ContractRecord = {
      category: "",
      header: { name: "a", numParam: 0, sig: "a" },
      id: "a",
      name: "a",
      params: [],
      sig: "a",
    };

    expect(transformLatticeContractToContractRecord(mockDef)).toStrictEqual(
      expected
    );
  });
});
