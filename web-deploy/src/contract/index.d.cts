import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<T> = {
}

export type ImpureCircuits<T> = {
  recordAuthorship(context: __compactRuntime.CircuitContext<T>,
                   author_0: string,
                   time_0: string,
                   hash_0: Uint8Array,
                   msg_0: string): __compactRuntime.CircuitResults<T, []>;
}

export type PureCircuits = {
}

export type Circuits<T> = {
  recordAuthorship(context: __compactRuntime.CircuitContext<T>,
                   author_0: string,
                   time_0: string,
                   hash_0: Uint8Array,
                   msg_0: string): __compactRuntime.CircuitResults<T, []>;
}

export type Ledger = {
  readonly authorName: string;
  readonly timestamp: string;
  readonly contractHash: Uint8Array;
  readonly statement: string;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<T, W extends Witnesses<T> = Witnesses<T>> {
  witnesses: W;
  circuits: Circuits<T>;
  impureCircuits: ImpureCircuits<T>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<T>): __compactRuntime.ConstructorResult<T>;
}

export declare function ledger(state: __compactRuntime.StateValue): Ledger;
export declare const pureCircuits: PureCircuits;
