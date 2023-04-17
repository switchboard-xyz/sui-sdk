import {
  getObjectFields,
  JsonRpcProvider,
  Keypair,
  MoveEventField,
  RawSigner,
  SignerWithProvider,
  SubscriptionId,
  SUI_CLOCK_OBJECT_ID,
  SuiEventFilter,
  SuiObjectResponse,
  SuiTransactionBlockResponse,
  TransactionBlock,
} from "@mysten/sui.js";
import { OracleJob } from "@switchboard-xyz/common";
import Big from "big.js";
import BN from "bn.js";
import { sha3_256 } from "js-sha3";

export const NULL_ADDRESS =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
export const SWITCHBOARD_DEVNET_ADDRESS = ``;
export const SWITCHBOARD_TESTNET_ADDRESS = ``;
export const SWITCHBOARD_MAINNET_ADDRESS = ``;

export type SuiObject =
  | { kind: "Input"; index: number; type?: "object" | "pure"; value?: any }
  | { kind: "GasCoin" }
  | { kind: "Result"; index: number }
  | { kind: "NestedResult"; index: number; resultIndex: number };

export class SuiDecimal {
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

  static fromBig(val: Big): SuiDecimal {
    const value = val.c.slice();
    const e = val.e + 1;
    while (value.length - e > 9) {
      value.pop();
    }

    // Aptos decimals cannot have a negative scale
    while (value.length - e < 0) {
      value.push(0);
    }

    return new SuiDecimal(value.join(""), value.length - e, val.s === -1);
  }

  static fromObj(obj: Object): SuiDecimal {
    const properties = ["mantissa", "scale", "neg"];
    properties.forEach((p) => {
      if (!(p in obj)) {
        throw new Error(`Object is missing property ${p}`);
      }
    });

    return new SuiDecimal(obj["mantissa"], obj["scale"], obj["neg"]);
  }
}

export enum SwitchboardPermission {
  PERMIT_ORACLE_HEARTBEAT,
  PERMIT_ORACLE_QUEUE_USAGE,
}

export interface AggregatorAddJobParams {
  job: string;
  weight?: number;
}

export interface AggregatorInitParams {
  authority: string; // owner of aggregator
  name: string;
  queueAddress: string;
  coinType?: string;
  batchSize: number;
  minOracleResults: number;
  minJobResults: number;
  minUpdateDelaySeconds: number;
  varianceThreshold?: Big;
  forceReportPeriod?: number;
  disableCrank?: boolean;
  historySize?: number;
  readCharge?: number;
  rewardEscrow?: string;
  readWhitelist?: string[];
  limitReadsToWhitelist?: boolean;
}

interface AggregatorFastResultParams {
  lastResult?: string;
  oracleToken: string;
  aggregatorToken: string;
  value: Big;
  now: number;
}

export interface AggregatorSaveResultParams {
  oracleAddress: string;
  oracleIdx: number;
  queueAddress: string;
  quoteAddress?: string;
  value: Big;
}

export interface OracleSaveResultParams extends AggregatorSaveResultParams {
  aggregatorAddress: string;
}

export interface JobInitParams {
  name: string;
  data: string | any[];
  weight?: number;
}

export interface AggregatorRemoveJobParams {
  aggregatorAddress: string;
  job: string;
}

export interface AggregatorSetConfigParams {
  authority?: string;
  name?: string;
  queueAddress?: string;
  batchSize?: number;
  minOracleResults?: number;
  minJobResults?: number;
  minUpdateDelaySeconds?: number;
  varianceThreshold?: Big;
  forceReportPeriod?: number;
  disableCrank?: boolean;
  historySize?: number;
  readCharge?: number;
  rewardEscrow?: string;
  // addresses to add to read whitelist (free readers)
  readWhitelist?: string[];
  // remove from whitelist - this is due to underlying bag storage (which isn't iterable)
  rmFromReadWhitelist?: string[];
  limitReadsToWhitelist?: boolean;
  coinType?: string;
}

export interface OracleInitParams {
  name: string;
  authority: string;
  queue: string;
  coinType?: string;
}

export interface OracleQueueInitParams {
  authority: string;
  name: string;
  oracleTimeout: number;
  reward: number;
  unpermissionedFeedsEnabled: boolean;
  lockLeaseFunding: boolean;
  maxSize: number;
  coinType: string;
  verificationQueueAddress?: string;
  allowServiceQueueHeartbeats?: boolean;
}

export interface OracleQueueSetConfigsParams {
  name: string;
  authority: string;
  oracleTimeout: number;
  reward: number;
  unpermissionedFeedsEnabled: boolean;
  lockLeaseFunding: boolean;
  coinType?: string;
  verificationQueueAddress?: string;
  allowServiceQueueHeartbeats?: boolean;
  maxSize: number;
}

export interface LeaseExtendParams {
  queueAddress: string;
  loadCoin?: string;
  loadCoinObj?: SuiObject;
  loadAmount: number;
  coinType: string;
}

export interface LeaseWithdrawParams {
  queueAddress: string;
  amount: number;
  coinType: string;
}

export interface EscrowWithdrawParams {
  oracleAddress: string;
  queueAddress: string;
  amount: number;
}

export interface PermissionInitParams {
  queueId: string;
  objectId: string; // oracle or aggregator object id
  authority: string;
  granter: string;
  grantee: string;
  coinType?: string;
}

export interface PermissionSetParams {
  queueId: string;
  objectId: string; // oracle or aggregator object id
  authority: string;
  granter: string;
  grantee: string;
  permission: SwitchboardPermission;
  enable: boolean;
  coinType?: string;
}

/*
verifier_queue: address,
    authority: address,
        data: vector<u8>,
        load_coin: &mut Coin<CoinType>, // must have funds for at least 1 quote verify
        ctx: &mut TxContext,

*/
export interface QuoteInitParams {
  verifierQueueAddress: string;
  authority: string;
  data: string; // byte array base64
  loadCoin?: string;
  loadCoinObj?: SuiObject;
}

export interface QuoteUpdateParams {
  verifierQueueAddress: string;
  quoteAddress: string;
  authority: string;
  data: string; // byte array base64
  loadCoin?: string;
  loadCoinObj?: SuiObject;
}

export type EventCallback = (
  e: any
) => Promise<void> /** | (() => Promise<void>) */;

// Cleanup for loadData
const replaceObj = (obj: any) => {
  for (const i in obj) {
    if (typeof obj[i] === "object") {
      replaceObj(obj[i]);
      if (obj[i] && "fields" in obj[i]) {
        obj[i] = obj[i].fields;
      }
    }
  }
};

/**
 * Sends and waits for an aptos tx to be confirmed
 * @param signer
 * @param txn
 * @param debug
 * @returns
 */
export async function sendSuiTx(
  signer: SignerWithProvider,
  txn: TransactionBlock,
  debug?: boolean
): Promise<SuiTransactionBlockResponse> {
  // const txnRequest = await signer.dryRunTransactionBlock({
  //   transactionBlock: txn,
  // });
  // if (txnRequest.effects.status.error) {
  //   throw new Error(txnRequest.effects.status.error);
  // }
  // if (debug) {
  //   console.info(txnRequest);
  // }
  return signer.signAndExecuteTransactionBlock({
    transactionBlock: txn,
    options: {
      showEvents: true,
      showEffects: true,
      showInput: true,
    },
  });
}

/**
 * Events on Sui
 */
export class SuiEvent {
  intervalId?: SubscriptionId;
  constructor(
    readonly provider: JsonRpcProvider,
    readonly pkg?: string,
    readonly moduleName?: string,
    readonly moveEvent?: string,
    readonly moveEventField?: MoveEventField
  ) {}

  async onTrigger(
    callback: EventCallback,
    errorHandler?: (error: unknown) => void
  ) {
    try {
      const filters: SuiEventFilter[] = [];
      if (this.pkg) {
        filters.push({
          MoveModule: {
            package: this.pkg,
            module: this.moduleName,
          },
        });
      }
      if (this.moveEvent) {
        filters.push({ MoveEventType: this.moveEvent });
      }
      if (this.moveEventField) {
        filters.push({ MoveEventField: this.moveEventField });
      }

      this.intervalId = await this.provider.subscribeEvent({
        filter: {
          All: filters,
        },
        onMessage: (event) => {
          try {
            callback(event);
          } catch (e) {
            errorHandler(e);
          }
        },
      });
      return this.intervalId;
    } catch (e) {}
  }

  stop() {
    this.provider.unsubscribeEvent({
      id: this.intervalId,
    });
  }
}

export class AggregatorAccount {
  constructor(
    readonly provider: JsonRpcProvider,
    readonly address: string,
    readonly switchboardAddress: string,
    readonly coinType: string = "0x2::sui::SUI"
  ) {}

  async loadData(): Promise<any> {
    const result = await this.provider.getObject({
      id: this.address,
      options: {
        showType: true,
        showContent: true,
        showOwner: true,
      },
    });
    const childFields = await getDynamicChildren(this.provider, this.address);
    const combinedChildren = childFields.reduce(
      (acc: Record<string, any>, cur: Record<string, any>) => {
        for (const key in cur) {
          if (typeof cur[key] === "object" && !Array.isArray(cur[key])) {
            acc[key] = { ...acc[key], ...cur[key] };
          } else {
            acc[key] = cur[key];
          }
        }
        return acc;
      },
      {}
    );
    const agg = {
      ...combinedChildren,
      ...getObjectFields(result),
    };
    return agg;
  }

  async loadJobs(): Promise<Array<OracleJob>> {
    const data = await this.loadData();
    const jobs = data.job_keys.map(
      (key: any) => new JobAccount(this.provider, key, this.switchboardAddress)
    );
    const promises: Array<Promise<OracleJob>> = [];
    for (const job of jobs) {
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
    provider: JsonRpcProvider,
    signer: Keypair,
    params: AggregatorInitParams,
    switchboardAddress: string
  ): Promise<[AggregatorAccount, SuiTransactionBlockResponse]> {
    const { mantissa: vtMantissa, scale: vtScale } = SuiDecimal.fromBig(
      params.varianceThreshold ?? new Big(0)
    );
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${switchboardAddress}::aggregator_init_action::run`,
      arguments: [
        tx.pure(params.name),
        tx.object(params.queueAddress),
        tx.pure(params.batchSize, "u64"),
        tx.pure(params.minOracleResults, "u64"),
        tx.pure(params.minJobResults, "u64"),
        tx.pure(params.minUpdateDelaySeconds, "u64"),
        tx.pure(vtMantissa, "u128"),
        tx.pure(vtScale, "u8"),
        tx.pure(params.forceReportPeriod ?? 0, "u64"),
        tx.pure(params.disableCrank ?? false, "bool"),
        tx.pure(params.historySize ?? 0, "u64"),
        tx.pure(params.readCharge ?? 0, "u64"),
        tx.pure(
          params.rewardEscrow
            ? params.rewardEscrow
            : signer.getPublicKey().toSuiAddress(),
          "address"
        ),
        tx.pure(params.readWhitelist ?? [], "vector<address>"),
        tx.pure(params.limitReadsToWhitelist ?? false, "bool"),
        tx.object(SUI_CLOCK_OBJECT_ID),
        tx.pure(params.authority, "address"),
      ],
      typeArguments: [params.coinType ?? "0x2::sui::SUI"],
    });
    const signerWithProvider = new RawSigner(signer, provider);
    const result = await sendSuiTx(signerWithProvider, tx);
    const aggId = await getObjectIdFromResponse(
      provider,
      result,
      "aggregator::Aggregator"
    );
    return [
      new AggregatorAccount(
        provider,
        aggId,
        switchboardAddress,
        params.coinType ?? "0x2::sui::SUI"
      ),
      result,
    ];
  }

  async latestValue(): Promise<number> {
    const data = await this.loadData();
    replaceObj(data);
    return new SuiDecimal(
      data.update_data.latest_result.value.toString(),
      data.update_data.latest_result.dec,
      Boolean(data.update_data.latest_result.neg)
    )
      .toBig()
      .toNumber();
  }

  async addJob(
    signer: Keypair,
    params: AggregatorAddJobParams
  ): Promise<SuiTransactionBlockResponse> {
    const signerWithProvider = new RawSigner(signer, this.provider);
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::aggregator_add_job_action::run`,
      arguments: [
        tx.object(this.address),
        tx.object(params.job),
        tx.pure(params.weight || 1, "u8"),
      ],
    });
    return sendSuiTx(signerWithProvider, tx);
  }

  addJobTx(
    params: Omit<AggregatorAddJobParams & JobInitParams, "job">,
    txb?: TransactionBlock
  ): TransactionBlock {
    const tx = txb || new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::create_and_add_job_action::run`,
      arguments: [
        tx.object(this.address),
        tx.pure(params.name),
        tx.pure(params.data),
        tx.pure(params.weight || 1, "u8"),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
    return tx;
  }

  removeJobTx(
    params: AggregatorAddJobParams,
    txb?: TransactionBlock
  ): TransactionBlock {
    const tx = txb ?? new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::aggregator_remove_job_action::run`,
      arguments: [tx.object(this.address), tx.pure(params.job, "address")],
    });
    return tx;
  }

  // Either initialize a new result or build upon an existing one
  async fastSaveResult(
    signer: Keypair,
    params: AggregatorFastResultParams
  ): Promise<SuiTransactionBlockResponse> {
    const { mantissa, scale, neg } = SuiDecimal.fromBig(params.value);
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${
        this.switchboardAddress
      }::aggregator_fast_save_result_action::${
        params.lastResult ? "run" : "initialize_result"
      }`,
      arguments: [
        params.lastResult && tx.object(params.lastResult),
        tx.object(params.oracleToken),
        tx.object(params.aggregatorToken),
        tx.pure(mantissa, "u128"),
        tx.pure(scale, "u8"),
        tx.pure(neg, "bool"),
        tx.pure(Math.floor(Date.now() / 1000), "u64"),
      ].filter((a) => Boolean(a)),
    });
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, tx);
  }

  async saveResult(
    signer: Keypair,
    params: AggregatorSaveResultParams,
    txb?: TransactionBlock
  ): Promise<SuiTransactionBlockResponse> {
    const tx = this.saveResultTx(params, txb);
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, tx);
  }

  saveResultTx(
    params: AggregatorSaveResultParams,
    txb?: TransactionBlock
  ): TransactionBlock {
    const {
      mantissa: valueMantissa,
      scale: valueScale,
      neg: valueNeg,
    } = SuiDecimal.fromBig(params.value);
    const fn = params.quoteAddress ? "run_with_tee" : "run";
    const tx = txb ?? new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::aggregator_save_result_action::${fn}`,
      arguments: [
        tx.object(params.oracleAddress),
        tx.pure(params.oracleIdx, "u64"),
        tx.object(this.address),
        tx.object(params.queueAddress),
        tx.pure(valueMantissa, "u128"),
        tx.pure(valueScale, "u8"),
        tx.pure(valueNeg, "bool"),
        params.quoteAddress && tx.object(params.quoteAddress),
        tx.object(SUI_CLOCK_OBJECT_ID), // TODO Replace with Clock
      ].filter((a) => Boolean(a)),
      typeArguments: [this.coinType ?? "0x2::sui::SUI"],
    });
    return tx;
  }

  async openInterval(
    signer: Keypair,
    reward: number
  ): Promise<SuiTransactionBlockResponse> {
    const aggregatorData = await this.loadData();
    const tx = new TransactionBlock();
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(reward ?? 1000000)]);
    tx.moveCall({
      target: `${this.switchboardAddress}::aggregator_open_interval_action::run`,
      arguments: [
        tx.object(aggregatorData.queue_addr),
        tx.object(this.address),
        coin,
      ],
      typeArguments: [this.coinType ?? "0x2::sui::SUI"],
    });
    tx.transferObjects([coin], tx.pure(signer.getPublicKey().toSuiAddress()));
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, tx);
  }

  async openIntervalTx(
    loadCoin: SuiObject,
    txb?: TransactionBlock
  ): Promise<TransactionBlock> {
    const aggregatorData = await this.loadData();
    const tx = txb ?? new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::aggregator_open_interval_action::run`,
      arguments: [
        tx.object(aggregatorData.queue_addr),
        tx.object(this.address),
        loadCoin,
      ],
      typeArguments: [this.coinType ?? "0x2::sui::SUI"],
    });
    return tx;
  }

  async setConfigTx(
    params: AggregatorSetConfigParams,
    txb?: TransactionBlock
  ): Promise<TransactionBlock> {
    const aggregator = await this.loadData();
    const { mantissa: vtMantissa, scale: vtScale } = SuiDecimal.fromBig(
      params.varianceThreshold ?? new Big(0)
    );
    const tx = txb ?? new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::aggregator_set_configs_action::run`,
      arguments: [
        tx.object(this.address),
        tx.pure(params.name ?? aggregator.name),
        tx.object(params.queueAddress ?? aggregator.queue_addr),
        tx.pure(params.batchSize ?? aggregator.batch_size, "u64"),
        tx.pure(
          params.minOracleResults ?? aggregator.min_oracle_results,
          "u64"
        ),
        tx.pure(params.minJobResults ?? aggregator.min_job_results, "u64"),
        tx.pure(
          params.minUpdateDelaySeconds ?? aggregator.min_update_delay_seconds,
          "u64"
        ),
        tx.pure(vtMantissa, "u128"),
        tx.pure(vtScale, "u8"),
        tx.pure(
          params.forceReportPeriod ?? aggregator.force_report_period,
          "u64"
        ),
        tx.pure(params.disableCrank ?? aggregator.disable_crank, "bool"),
        tx.pure(params.historySize ?? aggregator.history_size, "u64"),
        tx.pure(params.readCharge ?? aggregator.read_charge, "u64"),
        tx.pure(params.rewardEscrow ?? aggregator.reward_escrow, "address"),
        tx.pure(
          params.readWhitelist ?? aggregator.read_whitelist,
          "vector<address>"
        ),
        tx.pure(params.rmFromReadWhitelist ?? [], "vector<address>"),
        tx.pure(
          params.limitReadsToWhitelist ?? aggregator.limit_reads_to_whitelist,
          "bool"
        ),
      ],
      typeArguments: [this.coinType ?? "0x2::sui::SUI"],
    });
    return tx;
  }

  async setConfig(
    signer: Keypair,
    params: AggregatorSetConfigParams
  ): Promise<SuiTransactionBlockResponse> {
    const aggregator = await this.loadData();
    // TODO: this looks wrong
    const { mantissa: vtMantissa, scale: vtScale } = SuiDecimal.fromBig(
      params.varianceThreshold ?? new Big(0)
    );
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::aggregator_set_configs_action::run`,
      arguments: [
        tx.object(this.address),
        tx.pure(params.name ?? aggregator.name),
        tx.pure(params.queueAddress ?? aggregator.queue_addr, "address"),
        tx.pure(params.batchSize ?? aggregator.batch_size, "u64"),
        tx.pure(
          params.minOracleResults ?? aggregator.min_oracle_results,
          "u64"
        ),
        tx.pure(params.minJobResults ?? aggregator.min_job_results, "u64"),
        tx.pure(
          params.minUpdateDelaySeconds ?? aggregator.min_update_delay_seconds,
          "u64"
        ),
        tx.pure(vtMantissa, "u128"),
        tx.pure(vtScale, "u8"),
        tx.pure(
          params.forceReportPeriod ?? aggregator.force_report_period,
          "u64"
        ),
        tx.pure(params.disableCrank ?? aggregator.disable_crank, "bool"),
        tx.pure(params.historySize ?? aggregator.history_size, "u64"),
        tx.pure(params.readCharge ?? aggregator.read_charge, "u64"),
        tx.pure(params.rewardEscrow ?? aggregator.reward_escrow, "address"),
        tx.pure(
          params.readWhitelist ?? aggregator.read_whitelist,
          "vector<address>"
        ),
        tx.pure(params.rmFromReadWhitelist ?? [], "vector<address>"),
        tx.pure(
          params.limitReadsToWhitelist ?? aggregator.limit_reads_to_whitelist,
          "bool"
        ),
      ],
      typeArguments: [this.coinType ?? "0x2::sui::SUI"],
    });
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, tx);
  }

  async setAuthorityTx(
    authority: string,
    txb?: TransactionBlock
  ): Promise<TransactionBlock> {
    const aggregatorData = await this.loadData();
    const authorityInfo = (
      await getAggregatorAuthorities(
        this.provider,
        this.switchboardAddress,
        aggregatorData.authority
      )
    ).find((a) => a.aggregatorAddress === this.address);
    const tx = txb ?? new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::aggregator_set_authority_action::run`,
      arguments: [
        tx.object(this.address),
        tx.object(authorityInfo.authorityObjectId),
        tx.pure(authority, "address"),
      ],
    });
    return tx;
  }

  static watch(
    provider: JsonRpcProvider,
    switchboardAddress: string,
    callback: EventCallback
  ): SuiEvent {
    const event = new SuiEvent(
      provider,
      switchboardAddress,
      `aggregator_save_result_action`,
      `${switchboardAddress}::events::AggregatorUpdateEvent`
    );
    event.onTrigger(callback);
    return event;
  }

  static async shouldReportValue(
    value: Big,
    aggregator: any
  ): Promise<boolean> {
    const timestamp = new BN(Math.round(Date.now() / 1000), 10);
    const varianceThreshold: Big = new SuiDecimal(
      aggregator.variance_threshold.value.toString(10),
      aggregator.variance_threshold.dec,
      Boolean(aggregator.variance_threshold.neg)
    ).toBig();
    const latestResult: Big = new SuiDecimal(
      aggregator.update_data.latest_result.value.toString(),
      aggregator.update_data.latest_result.result.dec,
      Boolean(aggregator.update_data.latest_result.neg)
    ).toBig();
    const forceReportPeriod = new BN(aggregator.force_report_period, 10);
    const lastTimestamp = new BN(aggregator.update_data.latest_timestamp, 10);
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

  /**
   * Extend a lease
   * @param params LeaseExtendParams
   */
  async extend(
    signer: Keypair,
    params: LeaseExtendParams
  ): Promise<SuiTransactionBlockResponse> {
    const queueAddress: string = (await this.loadData()).queue_addr;
    const tx = new TransactionBlock();
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(params.loadAmount)]);
    tx.moveCall({
      target: `${this.switchboardAddress}::aggregator_escrow_deposit_action::run`,
      arguments: [
        tx.object(queueAddress),
        tx.object(this.address),
        coin,
        tx.pure(params.loadAmount),
      ],
      typeArguments: [this.coinType ?? "0x2::sui::SUI"],
    });
    tx.transferObjects([coin], tx.pure(signer.getPublicKey().toSuiAddress()));
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, tx);
  }

  /**
   * Extend a lease tx
   * @param params LeaseExtendParams
   */
  async extendTx(
    params: LeaseExtendParams,
    txb?: TransactionBlock
  ): Promise<TransactionBlock> {
    const queueAddress: string = (await this.loadData()).queue_addr;
    const tx = txb ?? new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::aggregator_escrow_deposit_action::run`,
      arguments: [
        tx.object(queueAddress),
        tx.object(this.address),
        params.loadCoin ? tx.object(params.loadCoin) : params.loadCoinObj,
        tx.pure(params.loadAmount),
      ],
      typeArguments: [this.coinType ?? "0x2::sui::SUI"],
    });
    return tx;
  }

  async withdraw(
    signer: Keypair,
    params: LeaseWithdrawParams
  ): Promise<SuiTransactionBlockResponse> {
    const queueAddress: string = (await this.loadData()).queue_addr;
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::aggregator_escrow_withdraw_action::run`,
      arguments: [
        tx.object(queueAddress),
        tx.object(this.address),
        tx.pure(params.amount),
      ],
      typeArguments: [this.coinType ?? "0x2::sui::SUI"],
    });
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, tx);
  }

  /**
   * withdraw a lease tx
   * @param params LeaseWithdrawParams
   */
  async withdrawTx(
    params: LeaseWithdrawParams,
    txb?: TransactionBlock
  ): Promise<TransactionBlock> {
    const queueAddress: string = (await this.loadData()).queue_addr;
    const tx = txb ?? new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::aggregator_escrow_withdraw_action::run`,
      arguments: [
        tx.object(queueAddress),
        tx.object(this.address),
        tx.pure(params.amount),
      ],
      typeArguments: [this.coinType ?? "0x2::sui::SUI"],
    });
    return tx;
  }

  /**
   * Push feed to the crank
   * @param params CrankPushParams
   */
  async crankPushTx(): Promise<TransactionBlock> {
    const queueAddress: string = (await this.loadData()).queue_addr;
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::crank_push_action::run`,
      arguments: [tx.object(queueAddress), tx.object(this.address)],
      typeArguments: [this.coinType ?? "0x2::sui::SUI"],
    });
    return tx;
  }

  /**
   * check that a feed is on the crank
   */
  async isOnCrank(): Promise<boolean> {
    const queueAddress: string = (await this.loadData()).queue_addr;
    const queueAccount = new OracleQueueAccount(
      this.provider,
      queueAddress,
      this.switchboardAddress
    );
    const queueData = await queueAccount.loadData();
    const crankable = getDynamicChildren(
      this.provider,
      queueData.crank_feeds.id
    );
    const feedAddresses = Object.keys(crankable);
    return feedAddresses.includes(this.address);
  }
}

export class JobAccount {
  constructor(
    readonly provider: JsonRpcProvider,
    readonly address: string,
    readonly switchboardAddress: string
  ) {}

  async loadData(): Promise<any> {
    const result = await this.provider.getObject({
      id: this.address,
      options: {
        showType: true,
        showContent: true,
        showOwner: true,
      },
    });
    const job = getObjectFields(result);
    return { ...job };
  }

  async loadJob(): Promise<OracleJob> {
    const data = await this.loadData();
    const job = OracleJob.decodeDelimited(Buffer.from(data.data, "base64"));
    return job;
  }

  /**
   * Initialize a JobAccount

   * @param params JobInitParams initialization params
   */
  static async init(
    provider: JsonRpcProvider,
    signer: Keypair,
    params: JobInitParams,
    switchboardAddress: string
  ): Promise<[JobAccount, SuiTransactionBlockResponse]> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${switchboardAddress}::job_init_action::run`,
      arguments: [
        tx.pure(params.name),
        tx.pure(params.data),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
    const signerWithProvider = new RawSigner(signer, provider);
    const result = await sendSuiTx(signerWithProvider, tx);
    const jobId = await getObjectIdFromResponse(provider, result, "job::Job");

    return [new JobAccount(provider, jobId, switchboardAddress), result];
  }

  /**
   * Initialize a JobAccount
   * @param client
   * @param account
   * @param params JobInitParams initialization params
   */
  static initTx(
    params: JobInitParams,
    switchboardAddress: string
  ): TransactionBlock {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${switchboardAddress}::job_init_action::run`,
      arguments: [
        tx.pure(params.name),
        tx.pure(params.data),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
    return tx;
  }
}

export class OracleAccount {
  constructor(
    readonly provider: JsonRpcProvider,
    readonly address: string,
    readonly switchboardAddress: string,
    readonly coinType: string = "0x2::sui::SUI"
  ) {}

  /**
   * Initialize a Oracle
   * @param client
   * @param account
   * @param params Oracle initialization params
   */
  static async init(
    provider: JsonRpcProvider,
    signer: Keypair,
    params: OracleInitParams,
    switchboardAddress: string
  ): Promise<[OracleAccount, SuiTransactionBlockResponse]> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${switchboardAddress}::oracle_init_action::run`,
      arguments: [
        tx.pure(params.name),
        tx.pure(params.authority, "address"),
        tx.object(params.queue),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
      typeArguments: [params.coinType ?? "0x2::sui::SUI"],
    });
    const signerWithProvider = new RawSigner(signer, provider);
    const result = await sendSuiTx(signerWithProvider, tx);
    const oracleId = await getObjectIdFromResponse(
      provider,
      result,
      `oracle::Oracle`
    );

    return [
      new OracleAccount(
        provider,
        oracleId,
        switchboardAddress,
        params.coinType ?? "0x2::sui::SUI"
      ),
      result,
    ];
  }

  async loadData(): Promise<any> {
    const result = await this.provider.getObject({
      id: this.address,
      options: {
        showType: true,
        showContent: true,
        showOwner: true,
      },
    });
    const childFields = await getDynamicChildren(this.provider, this.address);
    const oracleData = {
      ...childFields,
      ...getObjectFields(result),
    };
    replaceObj(oracleData);
    return oracleData;
  }

  /**
   * Oracle Heartbeat Action
   */
  async heartbeat(
    signer: Keypair,
    queueId: string,
    quote_addr?: string
  ): Promise<SuiTransactionBlockResponse> {
    const fn = quote_addr ? "run_with_tee" : "run";
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::oracle_heartbeat_action::${fn}`,
      arguments: [
        tx.object(this.address),
        tx.object(queueId),
        quote_addr && tx.object(quote_addr),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ].filter((a) => Boolean(a)),
      typeArguments: [this.coinType],
    });
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, tx);
  }

  /**
   * Oracle Heartbeat Action
   */
  async fastHeartbeat(
    signer: Keypair,
    queueId: string,
    token_addr: string,
    quote_addr?: string
  ): Promise<SuiTransactionBlockResponse> {
    const fn = quote_addr ? "run_with_tee_and_token" : "run_with_token";
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::oracle_heartbeat_action::${fn}`,
      arguments: [
        tx.object(this.address),
        tx.object(queueId),
        quote_addr && tx.object(quote_addr),
        tx.object(token_addr),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
      typeArguments: [this.coinType],
    });
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, tx);
  }

  async withdraw(
    signer: Keypair,
    params: EscrowWithdrawParams
  ): Promise<SuiTransactionBlockResponse> {
    const queueAddress: string = (await this.loadData()).queue_addr;
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::escrow_withdraw_action::run`,
      arguments: [
        tx.object(queueAddress),
        tx.object(this.address),
        tx.pure(params.amount, "u64"),
      ],
      typeArguments: [this.coinType],
    });
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, tx);
  }

  // Create quote and get address
  async quoteInit(signer: Keypair, params: QuoteInitParams): Promise<string> {
    const tx = new TransactionBlock();

    tx.moveCall({
      target: `${this.switchboardAddress}::quote_init_action::run_simple`,
      arguments: [
        tx.object(params.verifierQueueAddress),
        tx.pure(
          params.authority ?? signer.getPublicKey().toSuiAddress(),
          "address"
        ),
        tx.pure(params.data),
        params.loadCoin ? tx.object(params.loadCoin) : params.loadCoinObj,
      ],
      typeArguments: [this.coinType],
    });
    const signerWithProvider = new RawSigner(signer, this.provider);
    const result = await sendSuiTx(signerWithProvider, tx);
    const quoteAddress = await getObjectIdFromResponse(
      this.provider,
      result,
      `quote::Quote`
    );
    return quoteAddress;
  }

  // update quote
  async quoteUpdate(
    signer: Keypair,
    params: QuoteUpdateParams
  ): Promise<SuiTransactionBlockResponse> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::quote_update_action::run_simple`,
      arguments: [
        tx.object(params.verifierQueueAddress),
        tx.pure(
          params.authority ?? signer.getPublicKey().toSuiAddress(),
          "address"
        ),
        tx.object(params.quoteAddress),
        tx.pure(params.data),
        params.loadCoin ? tx.object(params.loadCoin) : params.loadCoinObj,
      ],
      typeArguments: [this.coinType],
    });
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, tx);
  }
}

export class OracleQueueAccount {
  constructor(
    readonly provider: JsonRpcProvider,
    readonly address: string,
    readonly switchboardAddress: string,
    readonly coinType: string = "0x2::sui::SUI"
  ) {}

  /**
   * Initialize an OracleQueueAccount
   */
  static async init(
    provider: JsonRpcProvider,
    signer: Keypair,
    params: OracleQueueInitParams,
    switchboardAddress: string
  ): Promise<[OracleQueueAccount, SuiTransactionBlockResponse]> {
    const tx = new TransactionBlock();
    const res = tx.moveCall({
      target: `${switchboardAddress}::oracle_queue_init_action::run`,
      arguments: [
        tx.pure(params.authority),
        tx.pure(params.name),
        tx.pure(params.oracleTimeout),
        tx.pure(params.reward),
        tx.pure(params.unpermissionedFeedsEnabled),
        tx.pure(params.lockLeaseFunding),
        tx.pure(params.maxSize ?? 100),
        tx.pure(params.verificationQueueAddress ?? NULL_ADDRESS),
        tx.pure(params.allowServiceQueueHeartbeats ?? false),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
      typeArguments: [params.coinType ?? "0x2::sui::SUI"],
    });
    const signerWithProvider = new RawSigner(signer, provider);
    const result = await sendSuiTx(signerWithProvider, tx);
    const queueId = await getObjectIdFromResponse(
      provider,
      result,
      `oracle_queue::OracleQueue<0x2::sui::SUI>`
    );
    return [
      new OracleQueueAccount(
        provider,
        queueId,
        switchboardAddress,
        params.coinType ?? "0x2::sui::SUI"
      ),
      result,
    ];
  }

  async findOracleIdx(oracleAddress: string): Promise<number> {
    const queueData = await this.loadData();

    // get table data
    const oracles = await getTableData<string, string>(
      this.provider,
      queueData.data.contents
    );
    return Object.values(oracles).indexOf(oracleAddress);
  }

  async setConfigs(
    signer: Keypair,
    params: OracleQueueSetConfigsParams
  ): Promise<SuiTransactionBlockResponse> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${this.switchboardAddress}::oracle_queue_set_configs_action::run`,
      arguments: [
        tx.object(this.address),
        tx.pure(params.authority, "address"),
        tx.pure(params.name),
        tx.pure(params.oracleTimeout, "u64"),
        tx.pure(params.reward, "u128"),
        tx.pure(params.unpermissionedFeedsEnabled, "bool"),
        tx.pure(params.lockLeaseFunding, "bool"),
        tx.pure(params.maxSize, "u64"),
        tx.pure(params.verificationQueueAddress, "address"),
        tx.pure(params.allowServiceQueueHeartbeats, "bool"),
      ],
      typeArguments: [params.coinType ?? "0x2::sui::SUI"],
    });
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, tx);
  }

  async loadData(): Promise<any> {
    const result = await this.provider.getObject({
      id: this.address,
      options: {
        showType: true,
        showContent: true,
        showOwner: true,
      },
    });
    const childFields = await getDynamicChildren(this.provider, this.address);
    const queueData = {
      ...childFields,
      ...getObjectFields(result),
    };
    replaceObj(queueData);
    return queueData;
  }
}

export class Permission {
  constructor(
    readonly provider: JsonRpcProvider,
    readonly queueId: string, // object id of the queue
    readonly targetId: string, // id of the oracle or aggregator
    readonly objectId: string, // optional
    readonly switchboardAddress: string,
    readonly coinType: string = "0x2::sui::SUI"
  ) {}

  async loadData(): Promise<any> {
    // get queue data
    const result = await this.provider.getObject({
      id: this.queueId,
      options: {
        showType: true,
        showContent: true,
        showOwner: true,
      },
    });

    // so we can get the permissions object
    const fields = getFieldsFromObjectResponse(result);

    // get permissions object
    const permissionsId = fields.permissions;

    // We'd have to grab the permissions object from the child results
    // and then get the fields from that object
    sha3_256("permissions");

    const childResults = await this.provider.getDynamicFieldObject({
      parentId: permissionsId,
      name: "permissions",
    });

    throw new Error("not implemented. TODO: implement :)");
  }

  /**
   * Initialize a Permission
   * @param params PermissionInitParams initialization params
   */
  static async init(
    provider: JsonRpcProvider,
    signer: Keypair,
    params: PermissionInitParams,
    switchboardAddress: string,
    coinType: string = "0x2::sui::SUI"
  ): Promise<[Permission, SuiTransactionBlockResponse]> {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${switchboardAddress}::permission_init_action::run`,
      arguments: [
        tx.pure(params.authority, "address"),
        tx.pure(params.granter, "address"),
        tx.pure(params.grantee, "address"),
      ],
      typeArguments: [coinType],
    });

    const signerWithProvider = new RawSigner(signer, provider);
    const result = await sendSuiTx(signerWithProvider, tx);
    const permissionId = await getObjectIdFromResponse(
      provider,
      result,
      `permission::Permission`
    );
    return [
      new Permission(
        provider,
        params.queueId,
        params.objectId,
        permissionId,
        switchboardAddress,
        coinType ?? "0x2::sui::SUI"
      ),
      result,
    ];
  }

  /**
   * Set a Permission
   */
  static async set(
    provider: JsonRpcProvider,
    signer: Keypair,
    params: PermissionSetParams,
    switchboardAddress: string
  ): Promise<SuiTransactionBlockResponse> {
    const tx = new TransactionBlock();

    tx.moveCall({
      target: `${switchboardAddress}::permission_set_action::run`,
      arguments: [
        tx.object(params.queueId),
        tx.pure(params.authority, "address"),
        tx.pure(params.granter, "address"),
        tx.pure(params.grantee, "address"),
        tx.pure(params.permission, "u64"),
        tx.pure(params.enable, "bool"),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
      typeArguments: [params.coinType ?? "0x2::sui::SUI"],
    });

    const signerWithProvider = new RawSigner(signer, provider);
    return sendSuiTx(signerWithProvider, tx);
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
  loadCoin?: string;
  loadCoinObj?: SuiObject;
  initialLoadAmount: number;
}

interface CreateOracleParams extends OracleInitParams {
  loadCoin?: string;
  loadCoinObj?: SuiObject;
  loadAmount: number;
}

export async function createFeedTx(
  params: CreateFeedParams,
  switchboardAddress: string,
  txb?: TransactionBlock
): Promise<TransactionBlock> {
  if (params.jobs.length > 8) {
    throw new Error(
      "Max Job limit exceeded. The create_feed_action can only create up to 8 jobs at a time."
    );
  }
  const { mantissa: vtMantissa, scale: vtScale } = SuiDecimal.fromBig(
    params.varianceThreshold ?? new Big(0)
  );
  const jobs =
    params.jobs.length < 8
      ? [
          ...params.jobs,
          ...new Array<JobInitParams>(8 - params.jobs.length).fill({
            name: "",
            data: [],
            weight: 1,
          }),
        ]
      : params.jobs;

  const tx = txb ?? new TransactionBlock();

  const loadCoin = params.loadCoin
    ? tx.object(params.loadCoin)
    : params.loadCoinObj;
  tx.moveCall({
    target: `${switchboardAddress}::create_feed_action::run`,
    arguments: [
      tx.pure(params.authority),
      tx.object(SUI_CLOCK_OBJECT_ID),
      tx.pure(params.name),
      tx.object(params.queueAddress),
      tx.pure(params.batchSize),
      tx.pure(params.minOracleResults),
      tx.pure(params.minJobResults),
      tx.pure(params.minUpdateDelaySeconds),
      tx.pure(vtMantissa),
      tx.pure(vtScale),
      tx.pure(params.forceReportPeriod ?? 0),
      tx.pure(params.disableCrank ?? false),
      tx.pure(params.historySize ?? 0),
      tx.pure(params.readCharge ?? 0),
      tx.pure(params.rewardEscrow ?? params.authority),
      tx.pure(params.readWhitelist ?? []),
      tx.pure(params.limitReadsToWhitelist ?? false),
      loadCoin,
      tx.pure(params.initialLoadAmount),
      // jobs
      ...jobs.flatMap((jip) => {
        return [
          tx.pure(jip.name),
          tx.pure(jip.data),
          tx.pure(`${jip.weight || 1}`),
        ];
      }),
    ],
    typeArguments: [params.coinType ?? "0x2::sui::SUI"],
  });
  return tx;
}

// Create a feed with jobs, a lease, then optionally push the lease to the specified crank
export async function createFeed(
  provider: JsonRpcProvider,
  signer: Keypair,
  params: CreateFeedParams,
  switchboardAddress: string
): Promise<[AggregatorAccount, SuiTransactionBlockResponse]> {
  const txb = new TransactionBlock();
  const [coin] = txb.splitCoins(txb.gas, [txb.pure(params.initialLoadAmount)]);
  if (!params.loadCoin && !params.loadCoinObj) {
    params.loadCoinObj = coin;
  }
  const txn = await createFeedTx(params, switchboardAddress, txb);
  txn.transferObjects([coin], txn.pure(params.authority)); // send any remaining gas to the authority
  const signerWithProvider = new RawSigner(signer, provider);

  const result = await sendSuiTx(signerWithProvider, txn);
  const aggId = await getObjectIdFromResponse(
    provider,
    result,
    "aggregator::Aggregator"
  );

  return [
    new AggregatorAccount(
      provider,
      aggId,
      switchboardAddress,
      params.coinType ?? "0x2::sui::SUI"
    ),
    result,
  ];
}

// Create an oracle, oracle wallet, permisison, and set the heartbeat permission if user is the queue authority
export async function createOracle(
  provider: JsonRpcProvider,
  signer: Keypair,
  params: CreateOracleParams,
  switchboardAddress: string
): Promise<[OracleAccount, SuiTransactionBlockResponse]> {
  const tx = new TransactionBlock();
  const [coin] = tx.splitCoins(tx.gas, [tx.pure(10000)]);
  tx.moveCall({
    target: `${switchboardAddress}::create_oracle_action::run`,
    arguments: [
      tx.pure(params.name),
      tx.pure(params.authority),
      tx.object(params.queue),
      coin,
      tx.pure(params.loadAmount),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
    typeArguments: [params.coinType ?? "0x2::sui::SUI"],
  });
  tx.transferObjects([coin], tx.pure(params.authority));
  const signerWithProvider = new RawSigner(signer, provider);
  const result = await sendSuiTx(signerWithProvider, tx);
  const oracleId = await getObjectIdFromResponse(
    provider,
    result,
    `oracle::Oracle`
  );
  return [
    new OracleAccount(
      provider,
      oracleId,
      switchboardAddress,
      params.coinType ?? "0x2::sui::SUI"
    ),
    result,
  ];
}

export async function getBagData(
  provider: JsonRpcProvider,
  value: {
    id: {
      id: string;
    };
    size: number;
  }
): Promise<Record<string, any>> {
  return getTableData<string, any>(provider, value);
}

export async function getTableData<K extends string, V>(
  provider: JsonRpcProvider,
  value: {
    id: {
      id: string;
    };
    size: number;
  }
): Promise<Record<K, V>> {
  const results = await getDynamicChildren<string, any>(provider, value.id.id);
  let data: Record<string, V> = {};
  const dat = results.reduce((prev, curr) => {
    return {
      [curr.name]: curr.value,
      ...prev,
    };
  }, {});
  data = { ...data, ...dat };
  return data;
}

export async function getDynamicChildren<K extends string, V>(
  provider: JsonRpcProvider,
  objectId: string
): Promise<Record<K, V>[]> {
  let hasNext = true;
  let cursor: string | undefined;
  const data: Record<string, any>[] = [];
  while (hasNext) {
    const childResults = await provider.getDynamicFields({
      parentId: objectId,
      cursor,
    });

    hasNext = childResults.hasNextPage;
    cursor = childResults.nextCursor;
    const results = (
      await provider.multiGetObjects({
        ids: childResults.data.map((d) => d.objectId),
        options: {
          showType: true,
          showContent: true,
          showOwner: true,
        },
      })
    )
      .map((result) => result.data.content)
      .map((content) => {
        if ("fields" in content) {
          data.push(content.fields);
        }
      });
  }
  return data;
}

export async function getAggregatorAuthorities(
  provider: JsonRpcProvider,
  switchboardAddress: string,
  userAddress: string
): Promise<
  {
    aggregatorAddress: string; // aggregator address
    authorityObjectId: string; // registered authority objectId for the aggregator
  }[]
> {
  const objectsOwnedByUser = await provider.getOwnedObjects({
    filter: {
      StructType: `${switchboardAddress}::aggregator::Authority`,
    },
    owner: userAddress,
  });

  const authorityData = await provider.multiGetObjects({
    ids: objectsOwnedByUser.data.map((obj) => obj.data.objectId),
    options: {
      showType: true,
      showContent: true,
      showOwner: true,
    },
  });

  return authorityData.map((obj) => {
    const resp = getObjectFields(obj);
    return {
      aggregatorAddress: resp.aggregator_address as string,
      authorityObjectId: obj.data.objectId,
    };
  });
}

export function getFieldsFromObjectResponse(
  response: SuiObjectResponse
): Record<string, any> {
  if ("content" in response.data && "fields" in response.data.content) {
    return response.data.content.fields;
  } else throw new Error("Err getting fields");
}

export async function getObjectIdFromResponse(
  provider: JsonRpcProvider,
  response: SuiTransactionBlockResponse,
  type: string
): Promise<string> {
  let id: string;
  const objs = (
    response.effects?.created?.map((obj) => {
      if (obj.reference.objectId) {
        return obj.reference.objectId;
      }
    }) || []
  ).filter((obj) => Boolean(obj));

  // try 10 times over 10 seconds to fetch the data
  return await new Promise(async (resolve) => {
    let i = 0;
    while (i < 10) {
      const created = await provider.multiGetObjects({
        ids: objs,
        options: {
          showType: true,
        },
      });
      const objOfType = created.filter((obj) => obj.data?.type.endsWith(type));
      if (!objOfType.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        return resolve(objOfType.pop().data.objectId);
      }
      i += 1;
    }
  });
}
