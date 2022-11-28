import { OracleJob } from "@switchboard-xyz/common";
import Big from "big.js";
import BN from "bn.js";
import {
  Ed25519Keypair,
  JsonRpcProvider,
  RawSigner,
  Network,
} from "@mysten/sui.js";
import * as SHA3 from "js-sha3";
export { OracleJob, IOracleJob } from "@switchboard-xyz/common";
export const SWITCHBOARD_DEVNET_ADDRESS = ``;
export const SWITCHBOARD_TESTNET_ADDRESS = ``;
export const SWITCHBOARD_MAINNET_ADDRESS = ``;

export class AptosDecimal {
  constructor(
    readonly mantissa: string,
    readonly scale: number,
    readonly neg: boolean
  ) {}

  toBig(): Big {
    const oldDp = Big.DP;
    Big.DP = 18;
    let result = new Big(this.mantissa);
    if (this.neg === true) {
      result = result.mul(-1);
    }
    const TEN = new Big(10);
    result = safeDiv(result, TEN.pow(this.scale));
    Big.DP = oldDp;
    return result;
  }

  static fromBig(val: Big): AptosDecimal {
    const value = val.c.slice();
    let e = val.e + 1;
    while (value.length - e > 9) {
      value.pop();
    }

    // Aptos decimals cannot have a negative scale
    while (value.length - e < 0) {
      value.push(0);
    }

    return new AptosDecimal(value.join(""), value.length - e, val.s === -1);
  }

  static fromObj(obj: Object): AptosDecimal {
    const properties = ["mantissa", "scale", "neg"];
    properties.forEach((p) => {
      if (!(p in obj)) {
        throw new Error(`Object is missing property ${p}`);
      }
    });

    return new AptosDecimal(obj["mantissa"], obj["scale"], obj["neg"]);
  }
}

export enum SwitchboardPermission {
  PERMIT_ORACLE_HEARTBEAT,
  PERMIT_ORACLE_QUEUE_USAGE,
  PERMIT_VRF_REQUESTS,
}

export interface AggregatorAddJobParams {
  job: MaybeHexString;
  weight?: number;
}

export interface AggregatorInitParams {
  authority: MaybeHexString; // owner of aggregator
  name?: string;
  metadata?: string;
  queueAddress: MaybeHexString;
  crankAddress: MaybeHexString;
  coinType: MoveStructTag;
  batchSize: number;
  minOracleResults: number;
  minJobResults: number;
  minUpdateDelaySeconds: number;
  startAfter?: number;
  varianceThreshold?: Big;
  forceReportPeriod?: number;
  expiration?: number;
  disableCrank?: boolean;
  historySize?: number;
  readCharge?: number;
  rewardEscrow?: string;
  readWhitelist?: MaybeHexString[];
  limitReadsToWhitelist?: boolean;
  seed?: MaybeHexString;
}

export interface AggregatorSaveResultParams {
  oracleAddress: MaybeHexString;
  oracleIdx: number;
  error: boolean;
  // this should probably be automatically generated
  value: Big;
  jobsChecksum: string;
  minResponse: Big;
  maxResponse: Big;
}

export interface OracleSaveResultParams extends AggregatorSaveResultParams {
  aggregatorAddress: MaybeHexString;
}

export interface JobInitParams {
  name: string;
  metadata: string;
  authority: MaybeHexString;
  data: string;
  weight?: number;
}

export interface AggregatorRemoveJobParams {
  aggregatorAddress: string;
  job: string;
}

export interface AggregatorSetConfigParams {
  authority?: string;
  name?: string;
  metadata?: string;
  queueAddress?: MaybeHexString;
  crankAddress?: MaybeHexString;
  batchSize?: number;
  minOracleResults?: number;
  minJobResults?: number;
  minUpdateDelaySeconds?: number;
  startAfter?: number;
  varianceThreshold?: Big;
  forceReportPeriod?: number;
  expiration?: number;
  disableCrank?: boolean;
  historySize?: number;
  readCharge?: number;
  rewardEscrow?: MaybeHexString;
  readWhitelist?: MaybeHexString[];
  limitReadsToWhitelist?: boolean;
  coinType?: string;
}

export interface AggregatorSetFeedRelayParams {
  aggregator_addr: MaybeHexString;
  relay_authority: MaybeHexString; // user that has authority to oracle public keys
  oracle_keys: string[];
}

// set_feed_relay_oracle_keys
export interface AggregatorSetFeedRelayOracleKeys {
  aggregator_addr: MaybeHexString;
  oracle_keys: string[];
}

export interface CrankInitParams {
  queueAddress: MaybeHexString;
  coinType: MoveStructTag;
}

export interface CrankPopParams {
  crankAddress: string;
}

export interface CrankPushParams {
  aggregatorAddress: string;
}

export interface OracleInitParams {
  name: string;
  metadata: string;
  authority: MaybeHexString;
  queue: MaybeHexString;
  coinType: MoveStructTag;
  seed?: MaybeHexString;
}

export interface OracleQueueInitParams {
  authority: MaybeHexString;
  name: string;
  metadata: string;
  oracleTimeout: number;
  reward: number;
  minStake: number;
  slashingEnabled: boolean;
  varianceToleranceMultiplierValue: number;
  varianceToleranceMultiplierScale: number;
  feedProbationPeriod: number;
  consecutiveFeedFailureLimit: number;
  consecutiveOracleFailureLimit: number;
  unpermissionedFeedsEnabled: boolean;
  unpermissionedVrfEnabled: boolean;
  lockLeaseFunding: boolean;

  // this needs to be swapped with Coin or something later
  enableBufferRelayers: boolean;
  maxSize: number;
  save_confirmation_reward?: number;
  save_reward?: number;
  open_round_reward?: number;
  slashing_penalty?: number;
  coinType: MoveStructTag;
}

export interface OracleQueueSetConfigsParams {
  name: string;
  metadata: string;
  authority: MaybeHexString;
  oracleTimeout: number;
  reward: number;
  minStake: number;
  slashingEnabled: boolean;
  varianceToleranceMultiplierValue: number;
  varianceToleranceMultiplierScale: number;
  feedProbationPeriod: number;
  consecutiveFeedFailureLimit: number;
  consecutiveOracleFailureLimit: number;
  unpermissionedFeedsEnabled: boolean;
  unpermissionedVrfEnabled?: boolean;
  lockLeaseFunding: boolean;

  // this needs to be swapped with Coin or something later
  enableBufferRelayers: boolean;
  maxSize: number;
  save_confirmation_reward?: number;
  save_reward?: number;
  open_round_reward?: number;
  slashing_penalty?: number;
  coinType: MoveStructTag;
}

export interface LeaseInitParams {
  aggregatorAddress: MaybeHexString;
  queueAddress: MaybeHexString;
  withdrawAuthority: MaybeHexString;
  initialAmount: number;
  coinType: MoveStructTag;
}

export interface LeaseExtendParams {
  queueAddress: MaybeHexString;
  loadAmount: number;
}

export interface LeaseWithdrawParams {
  queueAddress: MaybeHexString;
  amount: number;
}

export interface LeaseSetAuthorityParams {
  queueAddress: MaybeHexString;
  authority: MaybeHexString;
}

export interface OracleWalletInitParams {
  oracleAddress: MaybeHexString;
  queueAddress: MaybeHexString;
  coinType: string;
}

export interface OracleWalletContributeParams {
  oracleAddress: MaybeHexString;
  queueAddress: MaybeHexString;
  loadAmount: number;
}

export interface OracleWalletWithdrawParams {
  oracleAddress: MaybeHexString;
  queueAddress: MaybeHexString;
  amount: number;
}

export interface PermissionInitParams {
  authority: MaybeHexString;
  granter: MaybeHexString;
  grantee: MaybeHexString;
}

export interface PermissionSetParams {
  authority: MaybeHexString;
  granter: MaybeHexString;
  grantee: MaybeHexString;
  permission: SwitchboardPermission;
  enable: boolean;
}

export type EventCallback = (
  e: any
) => Promise<void> /** | (() => Promise<void>) */;

/**
 * Sends and waits for an aptos tx to be confirmed
 * @param client
 * @param signer
 * @param method Aptos module method (ex: 0xSwitchboard::aggregator_add_job_action)
 * @param args Arguments for method (converts numbers to strings)
 * @returns
 */
export async function sendAptosTx(
  client: AptosClient,
  signer: AptosAccount,
  method: EntryFunctionId,
  args: Array<any>,
  type_args: Array<string> = [],
  maxGasPrice: number = 2000
): Promise<string> {
  const payload = {
    type: "entry_function_payload",
    function: method,
    type_arguments: type_args,
    arguments: args,
  };

  let txnRequest = await client.generateTransaction(signer.address(), payload);

  const simulation = (
    await client.simulateTransaction(signer, txnRequest, {
      estimateGasUnitPrice: true,
      estimateMaxGasAmount: true, // @ts-ignore
      estimatePrioritizedGasUnitPrice: true,
    })
  )[0];

  if (Number(simulation.gas_unit_price) > maxGasPrice) {
    throw Error(
      `Estimated gas price from simulation ${simulation.gas_unit_price} above maximum (${maxGasPrice}).`
    );
  }

  txnRequest = await client.generateTransaction(signer.address(), payload, {
    gas_unit_price: simulation.gas_unit_price,
  });

  if (simulation.success === false) {
    console.error(simulation);
    throw new Error(`TxFailure: ${simulation.vm_status}`);
  }

  const signedTxn = await client.signTransaction(signer, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes.hash;
}

/**
 * Generates an aptos tx for client
 * @param method Aptos module method (ex: 0xSwitchboard::aggregator_add_job_action)
 * @param args Arguments for method (converts numbers to strings)
 * @param type_args Arguments for type_args
 * @returns
 */
export function getAptosTx(
  method: EntryFunctionId,
  args: Array<any>,
  type_args: Array<string> = []
): Types.TransactionPayload {
  const payload: Types.TransactionPayload = {
    type: "entry_function_payload",
    function: method,
    type_arguments: type_args,
    arguments: args,
  };
  return payload;
}

export async function simulateAndRun(
  client: AptosClient,
  user: AptosAccount,
  txn: Types.TransactionPayload,
  maxGasPrice: number = 3000
) {
  let txnRequest = await client.generateTransaction(
    user.address(),
    txn as Types.EntryFunctionPayload
  );

  const simulation = (
    await client.simulateTransaction(user, txnRequest, {
      estimateGasUnitPrice: true,
      estimateMaxGasAmount: true, // @ts-ignore
      estimatePrioritizedGasUnitPrice: true,
    })
  )[0];

  if (Number(simulation.gas_unit_price) > maxGasPrice) {
    throw Error(
      `Estimated gas price from simulation ${simulation.gas_unit_price} above maximum (${maxGasPrice}).`
    );
  }

  txnRequest = await client.generateTransaction(
    user.address(),
    txn as Types.EntryFunctionPayload,
    { gas_unit_price: simulation.gas_unit_price }
  );

  if (simulation.success === false) {
    console.error(simulation);
    throw new Error(`TxFailure: ${simulation.vm_status}`);
  }

  const signedTxn = await client.signTransaction(user, txnRequest);
  const transactionRes = await client.submitTransaction(signedTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes.hash;
}

export async function sendRawAptosTx(
  client: AptosClient,
  signer: AptosAccount,
  method: EntryFunctionId,
  raw_args: Array<any>,
  raw_type_args: BCS.Seq<TxnBuilderTypes.TypeTag> = [],
  maxGasPrice: number = 2000
): Promise<string> {
  // We need to pass a token type to the `transfer` function.

  const methodInfo = method.split("::");
  const entryFunctionPayload =
    new TxnBuilderTypes.TransactionPayloadEntryFunction(
      TxnBuilderTypes.EntryFunction.natural(
        // Fully qualified module name, `AccountAddress::ModuleName`
        `${methodInfo[0]}::${methodInfo[1]}`,
        // Module function
        methodInfo[2],
        // The coin type to transfer
        raw_type_args,
        // Arguments for function `transfer`: receiver account address and amount to transfer
        raw_args
      )
    );

  let rawTxn = await client.generateRawTransaction(
    signer.address(),
    entryFunctionPayload
  );

  const simulation = (
    await client.simulateTransaction(signer, rawTxn, {
      estimateGasUnitPrice: true,
      estimateMaxGasAmount: true, // @ts-ignore
      estimatePrioritizedGasUnitPrice: true,
    })
  )[0];

  if (Number(simulation.gas_unit_price) > maxGasPrice) {
    throw Error(
      `Estimated gas price from simulation ${simulation.gas_unit_price} above maximum (${maxGasPrice}).`
    );
  }

  rawTxn = await client.generateRawTransaction(
    signer.address(),
    entryFunctionPayload,
    { gasUnitPrice: BigInt(simulation.gas_unit_price) }
  );

  const bcsTxn = AptosClient.generateBCSTransaction(signer, rawTxn);

  if (simulation.success === false) {
    console.error(simulation);
    throw new Error(`TxFailure: ${simulation.vm_status}`);
  }

  const transactionRes = await client.submitSignedBCSTransaction(bcsTxn);
  await client.waitForTransaction(transactionRes.hash);
  return transactionRes.hash;
}

/**
 * Poll Events on Aptos
 * @Note uncleared setTimeout calls will keep processes from ending organically (SIGTERM is needed)
 */
export class AptosEvent {
  intervalId?: ReturnType<typeof setInterval>;
  constructor(
    readonly client: AptosClient,
    readonly eventHandlerOwner: HexString,
    readonly eventOwnerStruct: MoveStructTag,
    readonly eventHandlerName: string,
    readonly pollIntervalMs: number = 1000
  ) {}

  async onTrigger(
    callback: EventCallback,
    errorHandler?: (error: unknown) => void
  ) {
    let lastSequenceNumber = "0";
    const ownerData = await this.client.getAccountResource(
      this.eventHandlerOwner.hex(),
      this.eventOwnerStruct
    );
    try {
      lastSequenceNumber = (
        Number(ownerData.data[this.eventHandlerName].counter) - 1
      ).toString();
    } catch (error) {
      console.error(JSON.stringify(ownerData, undefined, 2), error);
    }
    if (Number(ownerData.data[this.eventHandlerName].counter) === -1) {
      lastSequenceNumber = "0";
    }

    this.intervalId = setInterval(async () => {
      try {
        const events = await this.client.getEventsByEventHandle(
          this.eventHandlerOwner,
          this.eventOwnerStruct,
          this.eventHandlerName,
          {
            start: BigInt(Number(lastSequenceNumber) + 1),
            limit: 500,
          }
        );
        if (events.length !== 0) {
          // increment sequence number
          lastSequenceNumber = events.at(-1)!.sequence_number;
        }
        for (let event of events) {
          callback(event).catch((error) => {
            if (errorHandler) {
              errorHandler(error);
            } else {
              throw error;
            }
          });
        }
      } catch (error) {
        if (errorHandler) {
          errorHandler(error);
        }
      }
    }, this.pollIntervalMs);
    return this.intervalId;
  }

  stop() {
    clearInterval(this.intervalId);
  }
}

export class StateAccount {
  constructor(
    readonly client: AptosClient,
    readonly address: MaybeHexString,
    readonly payer: AptosAccount,
    readonly switchboardAddress: MaybeHexString
  ) {}

  static async init(
    client: AptosClient,
    account: AptosAccount,
    switchboardAddress: MaybeHexString
  ): Promise<[StateAccount, string]> {
    const tx = await sendAptosTx(
      client,
      account,
      `${switchboardAddress}::switchboard_init_action::run`,
      []
    );

    return [
      new StateAccount(client, account.address(), account, switchboardAddress),
      tx,
    ];
  }

  async loadData(): Promise<any> {
    return (
      await this.client.getAccountResource(
        this.address,
        `${this.switchboardAddress}::switchboard::State`
      )
    ).data;
  }
}

export class AggregatorAccount {
  constructor(
    readonly client: AptosClient,
    readonly address: MaybeHexString,
    readonly switchboardAddress: MaybeHexString,
    readonly coinType: MoveStructTag = "0x1::aptos_coin::AptosCoin"
  ) {}

  async loadData(): Promise<types.Aggregator> {
    const results = await this.client.getAccountResources(
      HexString.ensure(this.address).hex()
    );
    const agg = results.reduce((prev: any, current: any) => {
      return {
        ...prev,
        ...current.data,
      };
    }, {});
    const latestConfirmedRound = results
      .filter(
        (res) =>
          res.type ===
          `${this.switchboardAddress}::aggregator::AggregatorRound<${this.switchboardAddress}::aggregator::LatestConfirmedRound>`
      )
      .pop()!.data;
    const currentRound = results
      .filter(
        (res) =>
          res.type ===
          `${this.switchboardAddress}::aggregator::AggregatorRound<${this.switchboardAddress}::aggregator::CurrentRound>`
      )
      .pop()!.data;

    // removed field current_payout
    // @ts-ignore
    currentRound.current_payout = [];
    // @ts-ignore
    latestConfirmedRound.current_payout = [];

    // @ts-ignore
    agg.current_round = currentRound;
    // @ts-ignore
    agg.latest_confirmed_round = latestConfirmedRound;

    return types.Aggregator.fromMoveStruct(agg as any);
  }

  async loadJobs(): Promise<Array<OracleJob>> {
    const data = await this.loadData();
    const jobs = data.jobKeys.map(
      (key) =>
        new JobAccount(
          this.client,
          key,
          HexString.ensure(this.switchboardAddress).hex()
        )
    );
    const promises: Array<Promise<OracleJob>> = [];
    for (let job of jobs) {
      promises.push(job.loadJob());
    }
    return await Promise.all(promises);
  }

  /**
   * Initialize an Aggregator
   * @param client
   * @param account
   * @param params AggregatorInitParams initialization params
   */
  static async init(
    client: AptosClient,
    account: AptosAccount,
    params: AggregatorInitParams,
    switchboardAddress: MaybeHexString
  ): Promise<[AggregatorAccount, string]> {
    const { mantissa: vtMantissa, scale: vtScale } = AptosDecimal.fromBig(
      params.varianceThreshold ?? new Big(0)
    );

    const seed = params.seed
      ? HexString.ensure(HexString.ensure(params.seed))
      : new AptosAccount().address();
    const resource_address = generateResourceAccountAddress(
      HexString.ensure(account.address()),
      bcsAddressToBytes(HexString.ensure(seed))
    );

    const tx = await sendAptosTx(
      client,
      account,
      `${switchboardAddress}::aggregator_init_action::run`,
      [
        params.name ?? "",
        params.metadata ?? "",
        HexString.ensure(params.queueAddress).hex(),
        HexString.ensure(params.crankAddress).hex(),
        params.batchSize,
        params.minOracleResults,
        params.minJobResults,
        params.minUpdateDelaySeconds,
        params.startAfter ?? 0,
        Number(vtMantissa),
        Number(vtScale),
        params.forceReportPeriod ?? 0,
        params.expiration ?? 0,
        params.disableCrank ?? false,
        params.historySize ?? 0,
        params.readCharge ?? 0,
        params.rewardEscrow
          ? HexString.ensure(params.rewardEscrow).hex()
          : account.address().hex(),

        params.readWhitelist ?? [],
        params.limitReadsToWhitelist ?? false,

        HexString.ensure(params.authority).hex(),
        HexString.ensure(seed).hex(),
      ],
      [params.coinType ?? "0x1::aptos_coin::AptosCoin"]
    );

    return [
      new AggregatorAccount(
        client,
        resource_address,
        switchboardAddress,
        params.coinType ?? "0x1::aptos_coin::AptosCoin"
      ),
      tx,
    ];
  }

  async latestValue(): Promise<number> {
    const data = await this.loadData();
    return new AptosDecimal(
      data.latestConfirmedRound.result.value.toString(),
      data.latestConfirmedRound.result.dec,
      Boolean(data.latestConfirmedRound.result.neg)
    )
      .toBig()
      .toNumber();
  }

  async addJob(
    account: AptosAccount,
    params: AggregatorAddJobParams
  ): Promise<string> {
    return await sendAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::aggregator_add_job_action::run`,
      [
        HexString.ensure(this.address).hex(),
        HexString.ensure(params.job).hex(),
        params.weight || 1,
      ]
    );
  }

  addJobTx(params: AggregatorAddJobParams): Types.TransactionPayload {
    return getAptosTx(
      `${this.switchboardAddress}::aggregator_add_job_action::run`,
      [
        HexString.ensure(this.address).hex(),
        HexString.ensure(params.job).hex(),
        params.weight || 1,
      ]
    );
  }

  removeJobTx(params: AggregatorAddJobParams): Types.TransactionPayload {
    return getAptosTx(
      `${this.switchboardAddress}::aggregator_remove_job_action::run`,
      [HexString.ensure(this.address).hex(), HexString.ensure(params.job).hex()]
    );
  }

  async saveResult(
    account: AptosAccount,
    params: AggregatorSaveResultParams
  ): Promise<string> {
    const {
      mantissa: valueMantissa,
      scale: valueScale,
      neg: valueNeg,
    } = AptosDecimal.fromBig(params.value);
    const {
      mantissa: minResponseMantissa,
      scale: minResponseScale,
      neg: minResponseNeg,
    } = AptosDecimal.fromBig(params.minResponse);
    const {
      mantissa: maxResponseMantissa,
      scale: maxResponseScale,
      neg: maxResponseNeg,
    } = AptosDecimal.fromBig(params.maxResponse);

    return sendRawAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::aggregator_save_result_action::run`,
      [
        BCS.bcsToBytes(
          TxnBuilderTypes.AccountAddress.fromHex(params.oracleAddress)
        ),
        BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(this.address)),
        BCS.bcsSerializeUint64(params.oracleIdx),
        BCS.bcsSerializeBool(params.error),
        BCS.bcsSerializeU128(Number(valueMantissa)),
        BCS.bcsSerializeU8(valueScale),
        BCS.bcsSerializeBool(valueNeg),
        BCS.bcsSerializeBytes(
          HexString.ensure(params.jobsChecksum).toUint8Array()
        ),
        BCS.bcsSerializeU128(Number(minResponseMantissa)),
        BCS.bcsSerializeU8(minResponseScale),
        BCS.bcsSerializeBool(minResponseNeg),
        BCS.bcsSerializeU128(Number(maxResponseMantissa)),
        BCS.bcsSerializeU8(maxResponseScale),
        BCS.bcsSerializeBool(maxResponseNeg),
      ],
      [
        new TxnBuilderTypes.TypeTagStruct(
          TxnBuilderTypes.StructTag.fromString(
            this.coinType ?? "0x1::aptos_coin::AptosCoin"
          )
        ),
      ],
      200
    );
  }

  async openRound(account: AptosAccount, jitter?: number): Promise<string> {
    return await sendAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::aggregator_open_round_action::run`,
      [HexString.ensure(this.address).hex(), jitter ?? 1],
      [this.coinType],
      200
    );
  }

  static async openRoundN(
    client: AptosClient,
    account: AptosAccount,
    aggregatorAddresses: MaybeHexString[],
    switchboardAddress: MaybeHexString,
    jitter?: number,
    coinType?: string
  ) {
    return await sendAptosTx(
      client,
      account,
      `${switchboardAddress}::aggregator_open_round_action::run_many`,
      [
        aggregatorAddresses.map((addr) => HexString.ensure(addr).hex()),
        jitter ?? 1,
      ],
      [coinType ?? "0x1::aptos_coin::AptosCoin"],
      200
    );
  }

  openRoundTx(): Types.TransactionPayload {
    return getAptosTx(
      `${this.switchboardAddress}::aggregator_open_round_action::run`,
      [HexString.ensure(this.address).hex(), 1],
      [this.coinType ?? "0x1::aptos_coin::AptosCoin"]
    );
  }

  async setConfigTx(
    params: AggregatorSetConfigParams
  ): Promise<Types.TransactionPayload> {
    const aggregator = await this.loadData();
    // TODO
    const { mantissa: vtMantissa, scale: vtScale } = AptosDecimal.fromBig(
      params.varianceThreshold ?? new Big(0)
    );
    const tx = getAptosTx(
      `${this.switchboardAddress}::aggregator_set_configs_action::run`,
      [
        HexString.ensure(this.address).hex(),
        params.name ?? aggregator.name,
        params.metadata ?? aggregator.metadata,
        HexString.ensure(params.queueAddress ?? aggregator.queueAddr).hex(),
        HexString.ensure(params.crankAddress ?? aggregator.crankAddr).hex(),
        params.batchSize ?? aggregator.batchSize.toNumber(),
        params.minOracleResults ?? aggregator.minOracleResults.toNumber(),
        params.minJobResults ?? aggregator.minJobResults.toNumber(),
        params.minUpdateDelaySeconds ??
          aggregator.minUpdateDelaySeconds.toNumber(),
        params.startAfter ?? aggregator.startAfter.toNumber(),
        params.varianceThreshold
          ? Number(vtMantissa)
          : aggregator.varianceThreshold.value.toNumber(),
        params.varianceThreshold ? vtScale : aggregator.varianceThreshold.dec,
        params.forceReportPeriod ?? aggregator.forceReportPeriod.toNumber(),
        params.expiration ?? aggregator.expiration.toNumber(), // @ts-ignore
        params.disableCrank ?? false, // @ts-ignore
        params.historySize ?? 0, // @ts-ignore
        params.readCharge ?? aggregator.readCharge.toNumber(),
        params.rewardEscrow
          ? HexString.ensure(params.rewardEscrow).hex()
          : HexString.ensure(aggregator.rewardEscrow).hex(),
        params.readWhitelist ?? aggregator.readWhitelist,
        params.limitReadsToWhitelist ?? aggregator.limitReadsToWhitelist,
        params.authority ?? aggregator.authority,
      ],
      [params.coinType ?? "0x1::aptos_coin::AptosCoin"] // TODO
    );
    return tx;
  }

  async setConfig(
    account: AptosAccount,
    params: AggregatorSetConfigParams
  ): Promise<string> {
    const aggregator = await this.loadData();
    // TODO: this looks wrong
    const { mantissa: vtMantissa, scale: vtScale } = AptosDecimal.fromBig(
      params.varianceThreshold ?? new Big(0)
    );
    const paramsRaw: Array<any> = [
      HexString.ensure(this.address).hex(),
      params.name ?? aggregator.name,
      params.metadata ?? aggregator.metadata,
      HexString.ensure(params.queueAddress ?? aggregator.queueAddr).hex(),
      HexString.ensure(params.crankAddress ?? aggregator.crankAddr).hex(),
      params.batchSize ?? aggregator.batchSize.toNumber(),
      params.minOracleResults ?? aggregator.minOracleResults.toNumber(),
      params.minJobResults ?? aggregator.minJobResults.toNumber(),
      params.minUpdateDelaySeconds ??
        aggregator.minUpdateDelaySeconds.toNumber(),
      params.startAfter ?? aggregator.startAfter.toNumber(),
      params.varianceThreshold
        ? Number(vtMantissa)
        : aggregator.varianceThreshold.value.toNumber(),
      params.varianceThreshold ? vtScale : aggregator.varianceThreshold.dec,
      params.forceReportPeriod ?? aggregator.forceReportPeriod.toNumber(),
      params.expiration ?? aggregator.expiration.toNumber(), // @ts-ignore
      params.disableCrank ?? false, // @ts-ignore
      params.historySize ?? 0, // @ts-ignore
      params.readCharge ?? aggregator.readCharge.toNumber(),
      params.rewardEscrow
        ? HexString.ensure(params.rewardEscrow).hex()
        : HexString.ensure(aggregator.rewardEscrow).hex(),
      params.readWhitelist ?? aggregator.readWhitelist,
      params.limitReadsToWhitelist ?? aggregator.limitReadsToWhitelist,
      params.authority ?? aggregator.authority,
    ];
    return await sendAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::aggregator_set_configs_action::run`,
      paramsRaw,
      [params.coinType ?? "0x1::aptos_coin::AptosCoin"] // TODO
    );
  }

  static watch(
    client: AptosClient,
    switchboardAddress: MaybeHexString,
    callback: EventCallback,
    pollingIntervalMs = 1000
  ): AptosEvent {
    const switchboardHexString = HexString.ensure(switchboardAddress);
    const event = new AptosEvent(
      client,
      switchboardHexString,
      `${switchboardHexString.hex()}::switchboard::State`,
      "aggregator_update_events",
      pollingIntervalMs
    );
    event.onTrigger(callback);
    return event;
  }

  static async shouldReportValue(
    value: Big,
    aggregator: types.Aggregator
  ): Promise<boolean> {
    if ((aggregator.latestConfirmedRound?.numSuccess ?? 0) === 0) {
      return true;
    }
    const timestamp = new BN(Math.round(Date.now() / 1000), 10);
    const startAfter = new BN(aggregator.startAfter, 10);
    if (startAfter.gt(timestamp)) {
      return false;
    }
    const varianceThreshold: Big = new AptosDecimal(
      aggregator.varianceThreshold.value.toString(10),
      aggregator.varianceThreshold.dec,
      Boolean(aggregator.varianceThreshold.neg)
    ).toBig();
    const latestResult: Big = new AptosDecimal(
      aggregator.latestConfirmedRound.result.value.toString(),
      aggregator.latestConfirmedRound.result.dec,
      Boolean(aggregator.latestConfirmedRound.result.neg)
    ).toBig();
    const forceReportPeriod = new BN(aggregator.forceReportPeriod, 10);
    const lastTimestamp = new BN(
      aggregator.latestConfirmedRound.roundOpenTimestamp,
      10
    );
    if (lastTimestamp.add(forceReportPeriod).lt(timestamp)) {
      return true;
    }

    let diff = safeDiv(latestResult, value);
    if (diff.abs().gt(1)) {
      diff = safeDiv(value, latestResult);
    }
    // I dont want to think about variance percentage when values cross 0.
    // Changes the scale of what we consider a "percentage".
    if (diff.lt(0)) {
      return true;
    }
    const change = new Big(1).minus(diff);
    return change.gt(varianceThreshold);
  }
}

export class JobAccount {
  constructor(
    readonly client: AptosClient,
    readonly address: MaybeHexString,
    readonly switchboardAddress: MaybeHexString
  ) {}

  async loadData(): Promise<types.Job> {
    const data = (
      await this.client.getAccountResource(
        this.address,
        `${HexString.ensure(this.switchboardAddress).hex()}::job::Job`
      )
    ).data;
    return types.Job.fromMoveStruct(data as any);
  }

  async loadJob(): Promise<OracleJob> {
    const data = await this.loadData();

    // on-chain hex encoded base64 -> base64 -> Uint8Array -> OracleJob
    const job = OracleJob.decodeDelimited(
      Buffer.from(Buffer.from(data.data).toString(), "base64")
    );
    return job;
  }

  /**
   * Initialize a JobAccount
   * @param client
   * @param account
   * @param params JobInitParams initialization params
   */
  static async init(
    client: AptosClient,
    account: AptosAccount,
    params: JobInitParams,
    switchboardAddress: MaybeHexString
  ): Promise<[JobAccount, string]> {
    const tx = await sendAptosTx(
      client,
      account,
      `${switchboardAddress}::job_init_action::run`,
      [
        params.name,
        params.metadata,
        HexString.ensure(params.authority).hex(),
        params.data,
      ]
    );

    return [new JobAccount(client, account.address(), switchboardAddress), tx];
  }

  /**
   * Initialize a JobAccount
   * @param client
   * @param account
   * @param params JobInitParams initialization params
   */
  static initTx(
    client: AptosClient,
    account: MaybeHexString,
    params: JobInitParams,
    switchboardAddress: MaybeHexString
  ): [JobAccount, Types.TransactionPayload] {
    const tx = getAptosTx(`${switchboardAddress}::job_init_action::run`, [
      params.name,
      params.metadata,
      HexString.ensure(params.authority).hex(),
      params.data,
    ]);

    return [new JobAccount(client, account, switchboardAddress), tx];
  }
}

export class CrankAccount {
  constructor(
    readonly client: AptosClient,
    readonly address: MaybeHexString,
    readonly switchboardAddress: MaybeHexString,
    readonly coinType: MoveStructTag = "0x1::aptos_coin::AptosCoin"
  ) {}

  /**
   * Initialize a Crank
   * @param client
   * @param account account that will be the authority of the Crank
   * @param params CrankInitParams initialization params
   */
  static async init(
    client: AptosClient,
    account: AptosAccount,
    params: CrankInitParams,
    switchboardAddress: MaybeHexString
  ): Promise<[CrankAccount, string]> {
    const tx = await sendAptosTx(
      client,
      account,
      `${switchboardAddress}::crank_init_action::run`,
      [HexString.ensure(params.queueAddress).hex()],
      [params.coinType ?? "0x1::aptos_coin::AptosCoin"]
    );

    return [
      new CrankAccount(
        client,
        account.address(),
        switchboardAddress,
        params.coinType ?? "0x1::aptos_coin::AptosCoin"
      ),
      tx,
    ];
  }

  /**
   * Push an aggregator to a Crank
   * @param params CrankPushParams
   */
  async push(account: AptosAccount, params: CrankPushParams): Promise<string> {
    return await sendAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::crank_push_action::run`,
      [
        HexString.ensure(this.address).hex(),
        HexString.ensure(params.aggregatorAddress).hex(),
      ],
      [this.coinType ?? "0x1::aptos_coin::AptosCoin"]
    );
  }

  pushTx(
    account: MaybeHexString,
    params: CrankPushParams
  ): Types.TransactionPayload {
    return getAptosTx(
      `${this.switchboardAddress}::crank_push_action::run`,
      [
        HexString.ensure(this.address).hex(),
        HexString.ensure(params.aggregatorAddress).hex(),
      ],
      [this.coinType ?? "0x1::aptos_coin::AptosCoin"]
    );
  }

  /**
   * Pop an aggregator off the Crank
   */
  async pop(account: AptosAccount, pop_idx?: number): Promise<string> {
    return await sendAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::crank_pop_action::run`,
      [HexString.ensure(this.address).hex(), pop_idx ?? 0],
      [this.coinType]
    );
  }

  /**
   * Pop many aggregators off the Crank
   */
  async pop_n(account: AptosAccount, pop_list: number[]): Promise<string> {
    return await sendAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::crank_pop_n_action::run`,
      [HexString.ensure(this.address).hex(), pop_list],
      [this.coinType]
    );
  }

  async loadData(): Promise<types.Crank> {
    const data = (
      await this.client.getAccountResource(
        HexString.ensure(this.address).hex(),
        `${this.switchboardAddress}::crank::Crank`
      )
    ).data;
    return types.Crank.fromMoveStruct(data as any);
  }
}

export class OracleAccount {
  constructor(
    readonly client: AptosClient,
    readonly address: MaybeHexString,
    readonly switchboardAddress: MaybeHexString,
    readonly coinType: MoveStructTag = "0x1::aptos_coin::AptosCoin"
  ) {}

  /**
   * Initialize a Oracle
   * @param client
   * @param account
   * @param params Oracle initialization params
   */
  static async init(
    client: AptosClient,
    account: AptosAccount,
    params: OracleInitParams,
    switchboardAddress: MaybeHexString
  ): Promise<[OracleAccount, string]> {
    const seed = params.seed
      ? HexString.ensure(HexString.ensure(params.seed))
      : new AptosAccount().address();
    const resource_address = generateResourceAccountAddress(
      HexString.ensure(account.address()),
      bcsAddressToBytes(HexString.ensure(seed))
    );

    const tx = await sendAptosTx(
      client,
      account,
      `${switchboardAddress}::oracle_init_action::run`,
      [
        params.name,
        params.metadata,
        HexString.ensure(params.authority).hex(),
        HexString.ensure(params.queue).hex(),
        HexString.ensure(seed).hex(),
      ],
      [params.coinType ?? "0x1::aptos_coin::AptosCoin"]
    );

    return [
      new OracleAccount(
        client,
        resource_address,
        switchboardAddress,
        params.coinType ?? "0x1::aptos_coin::AptosCoin"
      ),
      tx,
    ];
  }

  async loadData(): Promise<types.Oracle> {
    const oracleTypes = new Set([
      `${this.switchboardAddress}::oracle::Oracle`,
      `${this.switchboardAddress}::oracle::OracleData`,
      `${this.switchboardAddress}::oracle::OracleConfig`,
    ]);
    const datas = await this.client.getAccountResources(this.address);

    const metrics = datas.find(
      (data) =>
        data.type === `${this.switchboardAddress}::oracle::OracleMetrics`
    );

    const oracleData = datas.filter((resource) =>
      oracleTypes.has(resource.type)
    );

    oracleData.push({
      type: "",
      data: {
        // @ts-ignore
        metrics: metrics.data,
      },
    });

    // merge queue data
    const data = oracleData.reduce(
      (prev, curr) => ({ ...prev, ...curr.data }),
      {}
    );

    return types.Oracle.fromMoveStruct(data as any);
  }

  /**
   * Oracle Heartbeat Action
   */
  async heartbeat(account: AptosAccount): Promise<string> {
    return await sendAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::oracle_heartbeat_action::run`,
      [HexString.ensure(this.address).hex()],
      [this.coinType]
    );
  }

  /**
   * Oracle Bulk Save Results Action
   */
  async saveManyResult(
    account: AptosAccount,
    params: OracleSaveResultParams[]
  ): Promise<string> {
    const aggregator_addrs: MaybeHexString[] = [];
    const oracle_addrs: MaybeHexString[] = [];
    const oracle_idxs: number[] = [];
    const errors: boolean[] = [];
    const value_nums: string[] = [];
    const value_scale_factors: number[] = [];
    const value_negs: boolean[] = [];
    const jobs_checksums: MaybeHexString[] = [];
    const min_response_nums: string[] = [];
    const min_response_scale_factors: number[] = [];
    const min_response_negs: boolean[] = [];
    const max_response_nums: string[] = [];
    const max_response_scale_factors: number[] = [];
    const max_response_negs: boolean[] = [];

    for (let param of params) {
      const {
        mantissa: valueMantissa,
        scale: valueScale,
        neg: valueNeg,
      } = AptosDecimal.fromBig(param.value);
      const {
        mantissa: minResponseMantissa,
        scale: minResponseScale,
        neg: minResponseNeg,
      } = AptosDecimal.fromBig(param.minResponse);
      const {
        mantissa: maxResponseMantissa,
        scale: maxResponseScale,
        neg: maxResponseNeg,
      } = AptosDecimal.fromBig(param.maxResponse);

      aggregator_addrs.push(param.aggregatorAddress);
      oracle_addrs.push(param.oracleAddress);
      oracle_idxs.push(param.oracleIdx);
      errors.push(param.error);
      value_nums.push(valueMantissa);
      value_scale_factors.push(valueScale);
      value_negs.push(valueNeg);
      jobs_checksums.push(param.jobsChecksum);
      min_response_nums.push(minResponseMantissa);
      min_response_scale_factors.push(minResponseScale);
      min_response_negs.push(minResponseNeg);
      max_response_nums.push(maxResponseMantissa);
      max_response_scale_factors.push(maxResponseScale);
      max_response_negs.push(maxResponseNeg);
    }

    return sendAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::oracle_save_result_action::run`,
      [
        this.address,
        aggregator_addrs.map((addr) => addr),
        oracle_idxs.map((idx) => idx),
        errors.map((err) => err),
        value_nums.map((val) => Number(val)),
        value_scale_factors.map((scale) => scale),
        value_negs.map((neg) => neg),
        jobs_checksums.map((checksum) =>
          HexString.ensure(checksum).toUint8Array()
        ),
        min_response_nums.map((val) => Number(val)),
        min_response_scale_factors.map((scale) => scale),
        min_response_negs.map((neg) => neg),
        max_response_nums.map((val) => Number(val)),
        max_response_scale_factors.map((scale) => scale),
        max_response_negs.map((neg) => neg),
      ],
      [this.coinType ?? "0x1::aptos_coin::AptosCoin"],
      200
    );
  }
}

export class OracleQueueAccount {
  constructor(
    readonly client: AptosClient,
    readonly address: MaybeHexString,
    readonly switchboardAddress: MaybeHexString,
    readonly coinType: MoveStructTag = "0x1::aptos_coin::AptosCoin"
  ) {}

  /**
   * Initialize an OracleQueueAccount
   * @param client
   * @param account
   * @param params OracleQueueAccount initialization params
   */
  static async init(
    client: AptosClient,
    account: AptosAccount,
    params: OracleQueueInitParams,
    switchboardAddress: MaybeHexString
  ): Promise<[OracleQueueAccount, string]> {
    const tx = await sendAptosTx(
      client,
      account,
      `${switchboardAddress}::oracle_queue_init_action::run`,
      [
        HexString.ensure(params.authority).hex(),
        params.name,
        params.metadata,
        params.oracleTimeout,
        params.reward,
        params.minStake,
        params.slashingEnabled,
        params.varianceToleranceMultiplierValue,
        params.varianceToleranceMultiplierScale,
        params.feedProbationPeriod,
        params.consecutiveFeedFailureLimit,
        params.consecutiveOracleFailureLimit,
        params.unpermissionedFeedsEnabled,
        params.unpermissionedVrfEnabled,
        params.lockLeaseFunding,
        params.enableBufferRelayers,
        params.maxSize,
        params.save_confirmation_reward ?? 0,
        params.save_reward ?? 0,
        params.open_round_reward ?? 0,
        params.slashing_penalty ?? 0,
      ],
      [params.coinType ?? "0x1::aptos_coin::AptosCoin"]
    );

    return [
      new OracleQueueAccount(
        client,
        account.address(),
        switchboardAddress,
        params.coinType ?? "0x1::aptos_coin::AptosCoin"
      ),
      tx,
    ];
  }

  async setConfigs(
    account: AptosAccount,
    params: OracleQueueSetConfigsParams
  ): Promise<string> {
    return await sendAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::oracle_queue_set_configs_action::run`,
      [
        this.address,
        params.name,
        params.metadata,
        HexString.ensure(params.authority).hex(),
        params.oracleTimeout,
        params.reward,
        params.minStake,
        params.slashingEnabled,
        params.varianceToleranceMultiplierValue,
        params.varianceToleranceMultiplierScale,
        params.feedProbationPeriod,
        params.consecutiveFeedFailureLimit,
        params.consecutiveOracleFailureLimit,
        params.unpermissionedFeedsEnabled,
        params.lockLeaseFunding,
        params.maxSize,
        params.save_confirmation_reward ?? 0,
        params.save_reward ?? 0,
        params.open_round_reward ?? 0,
        params.slashing_penalty ?? 0,
      ],
      [params.coinType ?? "0x1::aptos_coin::AptosCoin"]
    );
  }

  async loadData(): Promise<types.OracleQueue> {
    const queueTypes = new Set([
      `${this.switchboardAddress}::oracle_queue::OracleQueue<${
        this.coinType ?? "0x1::aptos_coin::AptosCoin"
      }>`,
      `${this.switchboardAddress}::oracle_queue::OracleQueueData`,
      `${this.switchboardAddress}::oracle_queue::OracleQueueConfig`,
    ]);
    const datas = await this.client.getAccountResources(this.address);
    const queueData = datas.filter((resource) => queueTypes.has(resource.type));

    // merge queue data
    const data = queueData.reduce(
      (prev, curr) => ({ ...prev, ...curr.data }),
      {}
    );
    return types.OracleQueue.fromMoveStruct(data as any);
  }
}

/**
 * Leases are kept in a LeaseManager resource on the same account that an Aggregator
 * exists on.
 */
export class LeaseAccount {
  constructor(
    readonly client: AptosClient,
    readonly address: MaybeHexString /* aggregator account address */,
    readonly switchboardAddress: MaybeHexString,
    readonly coinType: MoveStructTag = "0x1::aptos_coin::AptosCoin"
  ) {}

  /**
   * Initialize a LeaseAccount
   * @param client
   * @param account account that will be the authority of the LeaseAccount
   * @param params LeaseInitParams initialization params
   */
  static async init(
    client: AptosClient,
    account: AptosAccount,
    params: LeaseInitParams,
    switchboardAddress: MaybeHexString
  ): Promise<[LeaseAccount, string]> {
    const tx = await sendAptosTx(
      client,
      account,
      `${switchboardAddress}::lease_init_action::run`,
      [
        HexString.ensure(params.aggregatorAddress).hex(),
        HexString.ensure(params.queueAddress).hex(),
        HexString.ensure(params.withdrawAuthority).hex(),
        params.initialAmount,
      ],
      [params.coinType ?? "0x1::aptos_coin::AptosCoin"]
    );

    return [
      new LeaseAccount(
        client,
        params.aggregatorAddress,
        switchboardAddress,
        params.coinType ?? "0x1::aptos_coin::AptosCoin"
      ),
      tx,
    ];
  }

  /**
   * Extend a lease
   * @param params CrankPushParams
   */
  async extend(
    account: AptosAccount,
    params: LeaseExtendParams
  ): Promise<string> {
    return await sendAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::lease_extend_action::run`,
      [HexString.ensure(this.address).hex(), params.loadAmount],
      [this.coinType]
    );
  }

  /**
   * Extend a lease tx
   * @param params CrankPushParams
   */
  extendTx(
    account: MaybeHexString,
    params: LeaseExtendParams
  ): Types.TransactionPayload {
    return getAptosTx(
      `${this.switchboardAddress}::lease_extend_action::run`,
      [HexString.ensure(this.address).hex(), params.loadAmount],
      [this.coinType]
    );
  }

  /**
   * Pop an aggregator off the Crank
   */
  async withdraw(
    account: AptosAccount,
    params: LeaseWithdrawParams
  ): Promise<string> {
    return await sendAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::lease_withdraw_action::run`,
      [
        [
          HexString.ensure(this.address).hex(),
          HexString.ensure(params.queueAddress).hex(),
          params.amount,
        ],
      ],
      [this.coinType]
    );
  }

  /**
   * Pop an aggregator off the Crank
   */
  withdrawTx(
    account: MaybeHexString,
    params: LeaseWithdrawParams
  ): Types.TransactionPayload {
    return getAptosTx(
      `${this.switchboardAddress}::lease_withdraw_action::run`,
      [
        HexString.ensure(this.address).hex(),
        HexString.ensure(params.queueAddress).hex(),
        params.amount,
      ],
      [this.coinType]
    );
  }

  /**
   * Set a lease authority
   * @param params CrankPushParams
   */
  async setAuthority(
    account: AptosAccount,
    params: LeaseSetAuthorityParams
  ): Promise<string> {
    return await sendAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::lease_set_authority_action::run`,
      [
        HexString.ensure(this.address).hex(),
        HexString.ensure(params.queueAddress).hex(),
        HexString.ensure(params.authority).hex(),
      ],
      [this.coinType]
    );
  }

  async loadData(queueAddress: MaybeHexString): Promise<types.Escrow> {
    return await EscrowManager.fetchItem(this, queueAddress);
  }
}

export class EscrowManager {
  constructor(
    readonly client: AptosClient,
    readonly address: MaybeHexString,
    readonly switchboardAddress: MaybeHexString,
    readonly coinType: MoveStructTag = "0x1::aptos_coin::AptosCoin"
  ) {}

  async loadData(): Promise<types.EscrowManager> {
    const data = (
      (await this.client.getAccountResource(
        this.address,
        `${this.switchboardAddress}::escrow::EscrowManager<${
          this.coinType ?? "0x1::aptos_coin::AptosCoin"
        }>`
      )) as any
    ).data;

    return types.EscrowManager.fromMoveStruct(data);
  }

  async fetchItem(queueAddress: MaybeHexString): Promise<types.Escrow> {
    const escrowManagerState = await this.loadData();

    const item = await this.client.getTableItem(
      escrowManagerState.escrows.handle.toString(),
      {
        key_type: `address`,
        value_type: `${this.switchboardAddress}::escrow::Escrow<${
          this.coinType ?? "0x1::aptos_coin::AptosCoin"
        }>`,
        key: HexString.ensure(queueAddress).hex(),
      }
    );

    return types.Escrow.fromMoveStruct(item);
  }

  static async fetchItem<
    T extends {
      client: AptosClient;
      address: MaybeHexString;
      switchboardAddress: MaybeHexString;
      coinType: string;
    }
  >(account: T, queueAddress: MaybeHexString): Promise<types.Escrow> {
    const escrowManager = new EscrowManager(
      account.client,
      account.address,
      account.switchboardAddress,
      account.coinType
    );

    return escrowManager.fetchItem(queueAddress);
  }
}

export class OracleWallet {
  constructor(
    readonly client: AptosClient,
    readonly address: MaybeHexString,
    readonly switchboardAddress: MaybeHexString,
    readonly coinType: MoveStructTag = "0x1::aptos_coin::AptosCoin"
  ) {}

  /**
   * Initialize an OracleWallet
   * @param client
   * @param account account that will be the authority of the OracleWallet
   * @param params OracleWalletInitParams initialization params
   */
  static async init(
    client: AptosClient,
    account: AptosAccount,
    params: OracleWalletInitParams,
    switchboardAddress: MaybeHexString
  ): Promise<[OracleWallet, string]> {
    const tx = await sendAptosTx(
      client,
      account,
      `${switchboardAddress}::oracle_wallet_init_action::run`,
      [
        HexString.ensure(params.oracleAddress),
        HexString.ensure(params.queueAddress),
      ],
      [params.coinType ?? "0x1::aptos_coin::AptosCoin"]
    );

    return [
      new OracleWallet(
        client,
        account.address(),
        switchboardAddress,
        params.coinType ?? "0x1::aptos_coin::AptosCoin"
      ),
      tx,
    ];
  }

  /**
   * Contributes to an oracle wallet
   * @param params OracleWalletContributeParams
   */
  async contribute(
    account: AptosAccount,
    params: OracleWalletContributeParams
  ): Promise<string> {
    return await sendAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::oracle_wallet_contribute_action::run`,
      [
        HexString.ensure(this.address).hex(),
        HexString.ensure(params.queueAddress).hex(),
        params.loadAmount,
      ],
      [this.coinType]
    );
  }

  /**
   * Withdraw from an OracleWallet
   */
  async withdraw(
    account: AptosAccount,
    params: OracleWalletWithdrawParams
  ): Promise<string> {
    return await sendAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::oracle_wallet_withdraw_action::run`,
      [
        [
          HexString.ensure(this.address).hex(),
          HexString.ensure(params.queueAddress).hex(),
          params.amount,
        ],
      ],
      [this.coinType]
    );
  }

  async loadData(queueAddress: MaybeHexString): Promise<any> {
    const handle = (
      (await this.client.getAccountResource(
        this.address,
        `${this.switchboardAddress}::escrow::EscrowManager<${
          this.coinType ?? "0x1::aptos_coin::AptosCoin"
        }>`
      )) as any
    ).data.escrows.handle;
    return await this.client.getTableItem(handle, {
      key_type: `address`,
      value_type: `${this.switchboardAddress}::escrow::Escrow<${
        this.coinType ?? "0x1::aptos_coin::AptosCoin"
      }>`,
      key: HexString.ensure(queueAddress).hex(),
    });
  }
}

export class Permission {
  constructor(
    readonly client: AptosClient,
    readonly switchboardAddress: MaybeHexString
  ) {}

  /**
   * Initialize a Permission
   * @param client
   * @param account
   * @param params PermissionInitParams initialization params
   */
  static async init(
    client: AptosClient,
    account: AptosAccount,
    params: PermissionInitParams,
    switchboardAddress: MaybeHexString
  ): Promise<[Permission, string]> {
    const tx = await sendRawAptosTx(
      client,
      account,
      `${switchboardAddress}::permission_init_action::run`,
      [
        BCS.bcsToBytes(
          TxnBuilderTypes.AccountAddress.fromHex(params.authority)
        ),
        BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(params.granter)),
        BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(params.grantee)),
      ]
    );

    return [new Permission(client, switchboardAddress), tx];
  }

  /**
   * Set a Permission
   */
  async set(
    account: AptosAccount,
    params: PermissionSetParams
  ): Promise<string> {
    const tx = await sendRawAptosTx(
      this.client,
      account,
      `${this.switchboardAddress}::permission_set_action::run`,
      [
        BCS.bcsToBytes(
          TxnBuilderTypes.AccountAddress.fromHex(params.authority)
        ),
        BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(params.granter)),
        BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(params.grantee)),
        BCS.bcsSerializeUint64(params.permission),
        BCS.bcsSerializeBool(params.enable),
      ]
    );
    return tx;
  }
}

function safeDiv(number_: Big, denominator: Big, decimals = 20): Big {
  const oldDp = Big.DP;
  Big.DP = decimals;
  const result = number_.div(denominator);
  Big.DP = oldDp;
  return result;
}

interface CreateFeedParams extends AggregatorInitParams {
  jobs: JobInitParams[];
  initialLoadAmount: number;
}

interface CreateOracleParams extends OracleInitParams {}

export async function createFeedTx(
  client: AptosClient,
  authority: MaybeHexString,
  params: CreateFeedParams,
  switchboardAddress: MaybeHexString
): Promise<[AggregatorAccount, Types.TransactionPayload]> {
  const seed = params.seed
    ? HexString.ensure(HexString.ensure(params.seed))
    : new AptosAccount().address();
  const resource_address = generateResourceAccountAddress(
    HexString.ensure(authority),
    bcsAddressToBytes(HexString.ensure(seed))
  );

  if (params.jobs.length > 8) {
    throw new Error(
      "Max Job limit exceeded. The create_feed_action can only create up to 8 jobs at a time."
    );
  }

  const { mantissa: vtMantissa, scale: vtScale } = AptosDecimal.fromBig(
    params.varianceThreshold ?? new Big(0)
  );

  // enforce size 8 jobs array
  let jobs =
    params.jobs.length < 8
      ? [
          ...params.jobs,
          ...new Array<JobInitParams>(8 - params.jobs.length).fill({
            name: "",
            metadata: "",
            authority: "",
            data: "",
            weight: 1,
          }),
        ]
      : params.jobs;

  return [
    new AggregatorAccount(
      client,
      resource_address,
      switchboardAddress,
      params.coinType ?? "0x1::aptos_coin::AptosCoin"
    ),
    getAptosTx(
      `${switchboardAddress}::create_feed_action::run`,
      [
        // authority will own everything
        HexString.ensure(params.authority).hex(),

        // aggregator
        params.name ?? "",
        params.metadata ?? "",
        HexString.ensure(params.queueAddress).hex(),
        params.batchSize,
        params.minOracleResults,
        params.minJobResults,
        params.minUpdateDelaySeconds,
        params.startAfter ?? 0,
        Number(vtMantissa),
        vtScale,
        params.forceReportPeriod ?? 0,
        params.expiration ?? 0,
        params.disableCrank ?? false,
        params.historySize ?? 0,
        params.readCharge ?? 0,
        params.rewardEscrow
          ? HexString.ensure(params.rewardEscrow).hex()
          : HexString.ensure(params.authority).hex(),
        params.readWhitelist ?? [],
        params.limitReadsToWhitelist ?? false,

        // lease
        params.initialLoadAmount,

        // jobs
        ...jobs.flatMap((jip) => {
          return [jip.name, jip.metadata, jip.data, jip.weight || 1];
        }),

        // crank
        HexString.ensure(params.crankAddress).hex(),

        // seed
        seed.hex(),
      ],
      [params.coinType ?? "0x1::aptos_coin::AptosCoin"]
    ),
  ];
}

// Create a feed with jobs, a lease, then optionally push the lease to the specified crank
export async function createFeed(
  client: AptosClient,
  account: AptosAccount,
  params: CreateFeedParams,
  switchboardAddress: MaybeHexString
): Promise<[AggregatorAccount, string]> {
  const [aggregator, txn] = await createFeedTx(
    client,
    account.address(),
    params,
    switchboardAddress
  );

  const tx = await simulateAndRun(client, account, txn);
  return [aggregator, tx];
}

// Create an oracle, oracle wallet, permisison, and set the heartbeat permission if user is the queue authority
export async function createOracle(
  client: AptosClient,
  account: AptosAccount,
  params: CreateOracleParams,
  switchboardAddress: MaybeHexString
): Promise<[OracleAccount, string]> {
  const seed = params.seed
    ? HexString.ensure(HexString.ensure(params.seed))
    : new AptosAccount().address();
  const resource_address = generateResourceAccountAddress(
    HexString.ensure(account.address()),
    bcsAddressToBytes(HexString.ensure(seed))
  );

  const tx = await sendAptosTx(
    client,
    account,
    `${switchboardAddress}::create_oracle_action::run`,
    [
      HexString.ensure(params.authority).hex(),
      params.name,
      params.metadata,
      HexString.ensure(params.queue).hex(),
      seed.hex(),
    ],
    [params.coinType ?? "0x1::aptos_coin::AptosCoin"]
  );

  return [
    new OracleAccount(
      client,
      resource_address,
      switchboardAddress,
      params.coinType ?? "0x1::aptos_coin::AptosCoin"
    ),
    tx,
  ];
}

export function bcsAddressToBytes(hexStr: HexString): Uint8Array {
  return BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(hexStr));
}

export function generateResourceAccountAddress(
  origin: HexString,
  seed: Uint8Array
): MaybeHexString {
  const hash = SHA3.sha3_256.create();
  const userAddressBCS = bcsAddressToBytes(origin);
  hash.update(userAddressBCS);
  hash.update(new Uint8Array([...seed, 255]));
  return `0x${hash.hex()}`;
}

export async function fetchAggregators(
  client: AptosClient,
  authority: MaybeHexString,
  switchboardAddress: MaybeHexString
): Promise<any[]> {
  const handle = (
    (await client.getAccountResource(
      switchboardAddress,
      `${switchboardAddress}::switchboard::State`
    )) as any
  ).data.aggregator_authorities.handle;
  const tableItems = await client.getTableItem(handle, {
    key_type: `address`,
    value_type: `vector<address>`,
    key: HexString.ensure(authority).hex(),
  });
  return (
    await Promise.all(
      tableItems.map((aggregatorAddress: MaybeHexString) =>
        new AggregatorAccount(
          client,
          aggregatorAddress,
          switchboardAddress
        ).loadData()
      )
    )
  ).map((aggregator: any, i) => {
    aggregator.address = tableItems[i];
    return aggregator; // map addresses back to the aggregator object
  });
}
