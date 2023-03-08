import {
  EventType,
  getObjectExistsResponse,
  getObjectFields,
  JsonRpcProvider,
  Keypair,
  MoveCallTransaction,
  RawSigner,
  SignableTransaction,
  SignerWithProvider,
  SubscriptionId,
  SuiEventEnvelope,
  SuiExecuteTransactionResponse,
} from "@mysten/sui.js";
import { OracleJob } from "@switchboard-xyz/common";
import Big from "big.js";
import BN from "bn.js";

export const SWITCHBOARD_DEVNET_ADDRESS = ``;
export const SWITCHBOARD_TESTNET_ADDRESS = ``;
export const SWITCHBOARD_MAINNET_ADDRESS = ``;

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

export interface AggregatorSaveResultParams {
  oracleAddress: string;
  oracleIdx: number;
  queueAddress: string;
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
  readWhitelist?: string[];
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
}

export interface OracleQueueSetConfigsParams {
  name: string;
  authority: string;
  oracleTimeout: number;
  reward: number;
  unpermissionedFeedsEnabled: boolean;
  lockLeaseFunding: boolean;
  coinType?: string;
}

export interface LeaseExtendParams {
  queueAddress: string;
  loadCoinId: string;
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
}

export interface PermissionSetParams {
  queueId: string;
  objectId: string; // oracle or aggregator object id
  authority: string;
  granter: string;
  grantee: string;
  permission: SwitchboardPermission;
  enable: boolean;
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
  txn: SignableTransaction,
  debug?: boolean
): Promise<SuiExecuteTransactionResponse> {
  const txnRequest = await signer.dryRunTransaction(txn);
  if (txnRequest.status.error) {
    throw new Error(txnRequest.status.error);
  }
  if (debug) {
    console.info(txnRequest);
  }
  return signer.signAndExecuteTransaction(txn);
}

/**
 * Generates an sui tx for client
 * @param method sui module method
 * @param args Arguments for method (converts numbers to strings)
 * @param typeArgs Arguments for type_args
 * @returns
 */
export function getSuiMoveCall(
  method: string,
  args: Array<any> = [],
  typeArgs: Array<string> = [],
  gasBudget: number = 20000
): MoveCallTransaction {
  const [packageObjectId, module, fn] = method.split("::");
  const payload: MoveCallTransaction = {
    packageObjectId,
    module,
    function: fn,
    typeArguments: typeArgs,
    arguments: args,
    gasBudget,
  };
  return payload;
}

/**
 * Events on Sui
 */
export class SuiEvent {
  intervalId?: SubscriptionId;
  constructor(
    readonly provider: JsonRpcProvider,
    readonly pkg: string,
    readonly moduleName: string,
    readonly eventType: EventType = "MoveEvent",
    readonly moveEvent?: string
  ) {}

  async onTrigger(
    callback: EventCallback,
    errorHandler?: (error: unknown) => void
  ) {
    try {
      this.intervalId = await this.provider.subscribeEvent(
        {
          All: [
            { Package: this.pkg },
            { Module: this.moduleName },
            { EventType: this.eventType },
            this.moveEvent && { MoveEventType: this.moveEvent },
          ].filter((ev) => ev),
        },
        (event: SuiEventEnvelope) => {
          try {
            callback(event);
          } catch (e) {}
        }
      );
      return this.intervalId;
    } catch (e) {}
  }

  stop() {
    this.provider.unsubscribeEvent(this.intervalId);
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
    const result = await this.provider.getObject(this.address);
    const childFields = await getDynamicChildren(this.provider, this.address);
    const agg = {
      ...childFields,
      ...getObjectFields(result),
    };
    replaceObj(agg);
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
  ): Promise<[AggregatorAccount, SuiExecuteTransactionResponse]> {
    const { mantissa: vtMantissa, scale: vtScale } = SuiDecimal.fromBig(
      params.varianceThreshold ?? new Big(0)
    );

    const tx = getSuiMoveCall(
      `${switchboardAddress}::aggregator_init_action::run`,
      [
        params.name,
        params.queueAddress,
        `${params.batchSize}`,
        `${params.minOracleResults}`,
        `${params.minJobResults}`,
        `${params.minUpdateDelaySeconds}`,
        vtMantissa,
        `${vtScale}`,
        `${params.forceReportPeriod ?? 0}`,
        params.disableCrank ?? false,
        `${params.historySize ?? 0}`,
        `${params.readCharge ?? 0}`,
        params.rewardEscrow
          ? params.rewardEscrow
          : signer.getPublicKey().toSuiAddress(),
        params.readWhitelist ?? [],
        params.limitReadsToWhitelist ?? false,
        params.authority,
      ],
      [params.coinType ?? "0x2::sui::SUI"]
    );
    const signerWithProvider = new RawSigner(signer, provider);
    const result = await sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });

    if ("EffectsCert" in result) {
      throw new Error("EffectsCert in result of Aggregator Init");
    } else {
      const txEffects =
        "effects" in result.effects &&
        "events" in result.effects.effects &&
        result.effects.effects.events;
      let aggId: string;
      txEffects?.forEach((obj) => {
        if (
          "newObject" in obj &&
          obj.newObject.objectType.endsWith(`aggregator::Aggregator`)
        ) {
          aggId = obj.newObject.objectId;
        }
      });

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
  }

  async latestValue(): Promise<number> {
    const data = await this.loadData();
    replaceObj(data);
    return new SuiDecimal(
      data.latestConfirmedRound.result.value.toString(),
      data.latestConfirmedRound.result.dec,
      Boolean(data.latestConfirmedRound.result.neg)
    )
      .toBig()
      .toNumber();
  }

  async addJob(
    signer: Keypair,
    params: AggregatorAddJobParams
  ): Promise<SuiExecuteTransactionResponse> {
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_add_job_action::run`,
      [this.address, params.job, params.weight || 1]
    );
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });
  }

  addJobTx(params: AggregatorAddJobParams): SignableTransaction {
    const txData = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_add_job_action::run`,
      [this.address, params.job, params.weight || 1]
    );
    return {
      kind: "moveCall",
      data: txData,
    };
  }

  removeJobTx(params: AggregatorAddJobParams): SignableTransaction {
    const txData = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_remove_job_action::run`,
      [this.address, params.job]
    );
    return {
      kind: "moveCall",
      data: txData,
    };
  }

  async saveResult(
    signer: Keypair,
    params: AggregatorSaveResultParams
  ): Promise<SuiExecuteTransactionResponse> {
    const {
      mantissa: valueMantissa,
      scale: valueScale,
      neg: valueNeg,
    } = SuiDecimal.fromBig(params.value);

    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_save_result_action::run`,
      [
        params.oracleAddress,
        `${params.oracleIdx}`,
        this.address,
        params.queueAddress,
        valueMantissa,
        `${valueScale}`,
        valueNeg,
        `${Math.floor(Date.now() / 1000)}`, // TODO Replace with Clock
      ],
      [this.coinType ?? "0x2::sui::SUI"]
    );
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });
  }

  async openInterval(
    signer: Keypair,
    loadCoin: string
  ): Promise<SuiExecuteTransactionResponse> {
    const aggregatorData = await this.loadData();
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_open_interval_action::run`,
      [aggregatorData.queue_addr, this.address, loadCoin],
      [this.coinType]
    );
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });
  }

  async openIntervalTx(loadCoin: string): Promise<SignableTransaction> {
    const aggregatorData = await this.loadData();
    const txData = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_open_interval_action::run`,
      [aggregatorData.queue_addr, this.address, loadCoin],
      [this.coinType]
    );
    return {
      kind: "moveCall",
      data: txData,
    };
  }

  async setConfigTx(
    params: AggregatorSetConfigParams
  ): Promise<SignableTransaction> {
    const aggregator = await this.loadData();
    const { mantissa: vtMantissa, scale: vtScale } = SuiDecimal.fromBig(
      params.varianceThreshold ?? new Big(0)
    );
    const txData = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_set_configs_action::run`,
      [
        this.address,
        params.name ?? aggregator.name,
        params.queueAddress ?? aggregator.queue_addr,
        `${params.batchSize ?? aggregator.batch_size}`,
        `${params.minOracleResults ?? aggregator.min_oracle_results}`,
        `${params.minJobResults ?? aggregator.min_job_results}`,
        `${
          params.minUpdateDelaySeconds ?? aggregator.min_update_delay_seconds
        }`,
        `${
          params.varianceThreshold
            ? vtMantissa
            : aggregator.variance_threshold.value
        }`,
        `${
          params.varianceThreshold ? vtScale : aggregator.variance_threshold.dec
        }`,
        `${params.forceReportPeriod ?? aggregator.force_report_period}`,
        params.disableCrank ?? aggregator.disable_crank,
        `${params.historySize ?? aggregator.history_limit}`,
        `${params.readCharge ?? aggregator.read_charge}`,
        params.rewardEscrow ? params.rewardEscrow : aggregator.reward_escrow,
        params.readWhitelist ?? aggregator.read_whitelist,
        params.limitReadsToWhitelist ?? aggregator.limit_reads_to_whitelist,
      ],
      [params.coinType ?? "0x2::sui::SUI"] // TODO
    );

    return {
      kind: "moveCall",
      data: txData,
    };
  }

  async setConfig(
    signer: Keypair,
    params: AggregatorSetConfigParams
  ): Promise<SuiExecuteTransactionResponse> {
    const aggregator = await this.loadData();
    // TODO: this looks wrong
    const { mantissa: vtMantissa, scale: vtScale } = SuiDecimal.fromBig(
      params.varianceThreshold ?? new Big(0)
    );
    const txData = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_set_configs_action::run`,
      [
        this.address,
        params.name ?? aggregator.name,
        params.queueAddress ?? aggregator.queue_addr,
        `${params.batchSize ?? aggregator.batch_size}`,
        `${params.minOracleResults ?? aggregator.min_oracle_results}`,
        `${params.minJobResults ?? aggregator.min_job_results}`,
        `${
          params.minUpdateDelaySeconds ?? aggregator.min_update_delay_seconds
        }`,
        `${
          params.varianceThreshold
            ? vtMantissa
            : aggregator.variance_threshold.value
        }`,
        `${
          params.varianceThreshold ? vtScale : aggregator.variance_threshold.dec
        }`,
        `${params.forceReportPeriod ?? aggregator.force_report_period}`,
        params.disableCrank ?? aggregator.disable_crank,
        `${params.historySize ?? aggregator.history_limit}`,
        `${params.readCharge ?? aggregator.read_charge}`,
        params.rewardEscrow ? params.rewardEscrow : aggregator.reward_escrow,
        params.readWhitelist ?? aggregator.read_whitelist,
        params.limitReadsToWhitelist ?? aggregator.limit_reads_to_whitelist,
        params.authority ?? aggregator.authority,
      ]
    );
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: txData,
    });
  }

  async setAuthorityTx(authority: string): Promise<SignableTransaction> {
    const aggregatorData = await this.loadData();
    const authorityInfo = (
      await getAggregatorAuthorities(this.provider, aggregatorData.authority)
    ).find((a) => a.aggregatorAddress === this.address);
    const txData = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_set_authority_action::run`,
      [this.address, authorityInfo.authorityObjectId, authority],
      [this.coinType]
    );
    return {
      kind: "moveCall",
      data: txData,
    };
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
      `MoveEvent`,
      `${switchboardAddress}::events::AggregatorUpdateEvent`
    );
    event.onTrigger(callback);
    return event;
  }

  static async shouldReportValue(
    value: Big,
    aggregator: any
  ): Promise<boolean> {
    if ((aggregator.latestConfirmedRound?.numSuccess ?? 0) === 0) {
      return true;
    }
    const timestamp = new BN(Math.round(Date.now() / 1000), 10);
    const startAfter = new BN(aggregator.startAfter, 10);
    if (startAfter.gt(timestamp)) {
      return false;
    }
    const varianceThreshold: Big = new SuiDecimal(
      aggregator.varianceThreshold.value.toString(10),
      aggregator.varianceThreshold.dec,
      Boolean(aggregator.varianceThreshold.neg)
    ).toBig();
    const latestResult: Big = new SuiDecimal(
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

  /**
   * Extend a lease
   * @param params LeaseExtendParams
   */
  async extend(
    signer: Keypair,
    params: LeaseExtendParams
  ): Promise<SuiExecuteTransactionResponse> {
    const queueAddress: string = (await this.loadData()).queue_addr;
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_escrow_deposit_action::run`,
      [queueAddress, this.address, params.loadCoinId, params.loadAmount],
      [this.coinType]
    );
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });
  }

  /**
   * Extend a lease tx
   * @param params LeaseExtendParams
   */
  async extendTx(params: LeaseExtendParams): Promise<SignableTransaction> {
    const queueAddress: string = (await this.loadData()).queue_addr;
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_escrow_deposit_action::run`,
      [queueAddress, this.address, params.loadCoinId, params.loadAmount],
      [this.coinType]
    );
    return {
      kind: "moveCall",
      data: tx,
    };
  }

  async withdraw(
    signer: Keypair,
    params: LeaseWithdrawParams
  ): Promise<SuiExecuteTransactionResponse> {
    const queueAddress: string = (await this.loadData()).queue_addr;
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_escrow_withdraw_action::run`,
      [queueAddress, this.address, params.amount],
      [this.coinType]
    );
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });
  }

  /**
   * withdraw a lease tx
   * @param params LeaseWithdrawParams
   */
  async withdrawTx(
    account: string,
    params: LeaseWithdrawParams
  ): Promise<SignableTransaction> {
    const queueAddress: string = (await this.loadData()).queue_addr;
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_escrow_withdraw_action::run`,
      [queueAddress, this.address, params.amount],
      [this.coinType]
    );
    return {
      kind: "moveCall",
      data: tx,
    };
  }

  /**
   * Push feed to the crank
   * @param params CrankPushParams
   */
  async crankPushTx(): Promise<SignableTransaction> {
    const queueAddress: string = (await this.loadData()).queue_addr;
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::crank_push_action::run`,
      [queueAddress, this.address],
      [this.coinType]
    );
    return {
      kind: "moveCall",
      data: tx,
    };
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
    return (
      queueData.crank_feeds.findIndex((f: string) => f === this.address) !== -1
    );
  }
}

export class JobAccount {
  constructor(
    readonly provider: JsonRpcProvider,
    readonly address: string,
    readonly switchboardAddress: string
  ) {}

  async loadData(): Promise<any> {
    const result = await this.provider.getObject(this.address);
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
  ): Promise<[JobAccount, SuiExecuteTransactionResponse]> {
    const tx = getSuiMoveCall(`${switchboardAddress}::job_init_action::run`, [
      params.name,
      params.data,
      `${Math.floor(Date.now() / 1000)}`,
    ]);

    const signerWithProvider = new RawSigner(signer, provider);
    const result = await sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });

    if ("EffectsCert" in result) {
      throw new Error("EffectsCert found in Jobs created.");
    } else {
      const txEffects =
        "effects" in result.effects &&
        "events" in result.effects.effects &&
        result.effects.effects.events;
      let jobId: string;
      txEffects?.forEach((obj) => {
        if (
          "newObject" in obj &&
          obj.newObject.objectType.endsWith(`job::Job`)
        ) {
          jobId = obj.newObject.objectId;
        }
      });

      return [new JobAccount(provider, jobId, switchboardAddress), result];
    }
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
  ): SignableTransaction {
    const tx = getSuiMoveCall(`${switchboardAddress}::job_init_action::run`, [
      params.name,
      params.data,
      `${Math.floor(Date.now() / 1000)}`,
    ]);
    return {
      kind: "moveCall",
      data: tx,
    };
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
  ): Promise<[OracleAccount, SuiExecuteTransactionResponse]> {
    const tx = getSuiMoveCall(
      `${switchboardAddress}::oracle_init_action::run`,
      [params.name, params.authority, params.queue],
      [params.coinType ?? "0x2::sui::SUI"]
    );

    const signerWithProvider = new RawSigner(signer, provider);
    const result = await sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });

    if ("EffectsCert" in result) {
      throw new Error("EffectsCert found in Oracle creation.");
    } else {
      const txEffects =
        "effects" in result.effects &&
        "events" in result.effects.effects &&
        result.effects.effects.events;
      let oracleId: string;
      txEffects?.forEach((obj) => {
        if (
          "newObject" in obj &&
          obj.newObject.objectType.endsWith(`oracle::Oracle`)
        ) {
          oracleId = obj.newObject.objectId;
        }
      });

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
  }

  async loadData(): Promise<any> {
    const result = await this.provider.getObject(this.address);
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
    queueId: string
  ): Promise<SuiExecuteTransactionResponse> {
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::oracle_heartbeat_action::run`,
      [this.address, queueId, `${Math.floor(Date.now() / 1000)}`],
      [this.coinType]
    );
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });
  }

  async withdraw(
    signer: Keypair,
    params: EscrowWithdrawParams
  ): Promise<SuiExecuteTransactionResponse> {
    const queueAddress: string = (await this.loadData()).queue_addr;
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::oracle_escrow_withdraw_action::run`,
      [queueAddress, this.address, params.amount],
      [this.coinType]
    );
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });
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
  ): Promise<[OracleQueueAccount, SuiExecuteTransactionResponse]> {
    const tx = getSuiMoveCall(
      `${switchboardAddress}::oracle_queue_init_action::run`,
      [
        params.authority,
        params.name,
        `${params.oracleTimeout}`,
        `${params.reward}`,
        params.unpermissionedFeedsEnabled,
        params.lockLeaseFunding,
        `${params.maxSize ?? 100}`,
        `${Math.floor(Date.now() / 1000)}`,
      ],
      [params.coinType ?? "0x2::sui::SUI"]
    );

    const signerWithProvider = new RawSigner(signer, provider);
    const result = await sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });

    if ("EffectsCert" in result) {
      throw new Error("EffectsCert found in Oracle Queue creation.");
    } else {
      const txEffects =
        "effects" in result.effects &&
        "events" in result.effects.effects &&
        result.effects.effects.events;
      let queueId: string;
      txEffects?.forEach((obj) => {
        if (
          "newObject" in obj &&
          obj.newObject.objectType.endsWith(
            `oracle_queue::OracleQueue<0x2::sui::SUI>`
          )
        ) {
          queueId = obj.newObject.objectId;
        }
      });
      if (!queueId) {
        return;
      }

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
  }

  async findOracleIdx(oracleAddress: string): Promise<number> {
    const queueData = await this.loadData();
    const oracles = queueData.data;
    const idx = oracles.findIndex((o: string) => o === oracleAddress);
    return idx;
  }

  async setConfigs(
    signer: Keypair,
    params: OracleQueueSetConfigsParams
  ): Promise<SuiExecuteTransactionResponse> {
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::oracle_queue_set_configs_action::run`,
      [
        this.address,
        params.name,
        params.authority,
        `${params.oracleTimeout}`,
        `${params.reward}`,
        `${params.unpermissionedFeedsEnabled}`,
        `${params.lockLeaseFunding}`,
      ],
      [params.coinType ?? "0x2::sui::SUI"]
    );
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });
  }

  async loadData(): Promise<any> {
    const result = await this.provider.getObject(this.address);
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
    const result = await this.provider.getObject(this.objectId);
    const childResults = await this.provider.getDynamicFields(this.objectId);
    const childFields = (
      await Promise.all(
        childResults.data.map(async (res) => {
          const data = await this.provider.getObject(res.objectId);
          return getObjectFields(data);
        })
      )
    ).reduce((obj, curr) => ({ ...obj, ...curr }), {});
    const queueData = {
      ...childFields,
      ...getObjectFields(result),
    };
    replaceObj(queueData);
    return queueData;
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
  ): Promise<[Permission, SuiExecuteTransactionResponse]> {
    const tx = getSuiMoveCall(
      `${switchboardAddress}::permission_init_action::run`,
      [params.authority, params.granter, params.grantee]
    );

    const signerWithProvider = new RawSigner(signer, provider);
    const result = await sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });

    if ("EffectsCert" in result) {
      throw new Error('Permission Init: "EffectsCert" in result');
    } else {
      const txEffects =
        "effects" in result.effects &&
        "events" in result.effects.effects &&
        result.effects.effects.events;
      let permisisonId: string;
      txEffects?.forEach((obj) => {
        if (
          "newObject" in obj &&
          obj.newObject.objectType.endsWith(`permission::Permission`)
        ) {
          permisisonId = obj.newObject.objectId;
        }
      });

      if (!permisisonId) {
        return;
      }

      return [
        new Permission(
          provider,
          params.queueId,
          params.objectId,
          permisisonId,
          switchboardAddress,
          coinType ?? "0x2::sui::SUI"
        ),
        result,
      ];
    }
  }

  /**
   * Set a Permission
   */
  static async set(
    provider: JsonRpcProvider,
    signer: Keypair,
    params: PermissionSetParams,
    switchboardAddress: string
  ): Promise<SuiExecuteTransactionResponse> {
    const tx = getSuiMoveCall(
      `${switchboardAddress}::permission_set_action::run`,
      [
        params.authority,
        params.granter,
        params.grantee,
        params.permission,
        params.enable,
      ]
    );
    const signerWithProvider = new RawSigner(signer, provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });
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
  loadCoin: string;
  initialLoadAmount: number;
}

interface CreateOracleParams extends OracleInitParams {
  loadCoin: string;
  loadAmount: number;
}

export async function createFeedTx(
  params: CreateFeedParams,
  switchboardAddress: string
): Promise<SignableTransaction> {
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

  return {
    kind: "moveCall",
    data: getSuiMoveCall(
      `${switchboardAddress}::create_feed_action::run`,
      [
        params.authority,
        `${Math.floor(Date.now() / 1000)}`, // TODO: use clock resource
        params.name,
        params.queueAddress,
        `${params.batchSize}`,
        `${params.minOracleResults}`,
        `${params.minJobResults}`,
        `${params.minUpdateDelaySeconds}`,
        vtMantissa,
        `${vtScale}`,
        `${params.forceReportPeriod ?? 0}`,
        params.disableCrank ?? false,
        `${params.historySize ?? 0}`,
        `${params.readCharge ?? 0}`,
        params.rewardEscrow ?? params.authority,
        params.readWhitelist ?? [],
        params.limitReadsToWhitelist ?? false,

        params.loadCoin,
        params.initialLoadAmount.toString(),

        // jobs
        ...jobs.flatMap((jip) => {
          return [jip.name, jip.data, `${jip.weight || 1}`];
        }),
      ],
      [params.coinType ?? "0x2::sui::SUI"]
    ),
  };
}

// Create a feed with jobs, a lease, then optionally push the lease to the specified crank
export async function createFeed(
  provider: JsonRpcProvider,
  signer: Keypair,
  params: CreateFeedParams,
  switchboardAddress: string
): Promise<[AggregatorAccount, SuiExecuteTransactionResponse]> {
  const txn = await createFeedTx(params, switchboardAddress);
  const signerWithProvider = new RawSigner(signer, provider);
  const result = await sendSuiTx(signerWithProvider, txn);

  if ("EffectsCert" in result) {
    throw new Error('Create Feed: "EffectsCert" in result');
  } else {
    const txEffects =
      "effects" in result.effects &&
      "events" in result.effects.effects &&
      result.effects.effects.events;
    let aggId: string;
    txEffects?.forEach((obj) => {
      if (
        "newObject" in obj &&
        obj.newObject.objectType.endsWith(`aggregator::Aggregator`)
      ) {
        aggId = obj.newObject.objectId;
      }
    });
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
}

// Create an oracle, oracle wallet, permisison, and set the heartbeat permission if user is the queue authority
export async function createOracle(
  provider: JsonRpcProvider,
  signer: Keypair,
  params: CreateOracleParams,
  switchboardAddress: string
): Promise<[OracleAccount, SuiExecuteTransactionResponse]> {
  const tx = getSuiMoveCall(
    `${switchboardAddress}::create_oracle_action::run`,
    [
      params.name,
      params.authority,
      params.queue,
      params.loadCoin,
      `${params.loadAmount}`,
      `${Math.floor(Date.now() / 1000)}`, // TODO Replace with Clock
    ],
    [params.coinType ?? "0x2::sui::SUI"]
  );

  const signerWithProvider = new RawSigner(signer, provider);
  const result = await sendSuiTx(signerWithProvider, {
    kind: "moveCall",
    data: tx,
  });

  if ("EffectsCert" in result) {
    throw new Error('Create Oracle: "EffectsCert" in result');
  } else {
    const txEffects =
      "effects" in result.effects &&
      "events" in result.effects.effects &&
      result.effects.effects.events;
    let oracleId: string;
    txEffects?.forEach((obj) => {
      if (
        "newObject" in obj &&
        obj.newObject.objectType.endsWith(`oracle::Oracle`)
      ) {
        oracleId = obj.newObject.objectId;
      }
    });
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
}

async function getDynamicChildren(provider: JsonRpcProvider, objectId: string) {
  const childResults = await provider.getDynamicFields(objectId);
  const children = await Promise.all(
    childResults.data.map(async (res) => {
      const data = await provider.getObject(res.objectId);
      return getObjectFields(data);
    })
  );
  const r = await Promise.all(
    children.map(async (res) => {
      return res;
    })
  );
  const data = r.reduce((prev, curr) => {
    return {
      ...curr,
      ...prev,
    };
  }, {});
  return data;
}

export async function getAggregatorAuthorities(
  provider: JsonRpcProvider,
  userAddress: string
): Promise<
  {
    aggregatorAddress: string; // aggregator address
    authorityObjectId: string; // registered authority objectId for the aggregator
  }[]
> {
  const objectsOwnedByUser = await provider.getObjectsOwnedByAddress(
    userAddress
  );
  const authorityInfoObjects = objectsOwnedByUser.filter((obj) =>
    obj.type.endsWith("aggregator::Authority")
  );
  const authorityData = await provider.getObjectBatch(
    authorityInfoObjects.map((obj) => obj.objectId)
  );

  return authorityData.map((obj, idx) => {
    const resp = getObjectExistsResponse(obj);
    if ("fields" in resp.data) {
      return {
        aggregatorAddress: resp.data.fields.aggregator_address as string,
        authorityObjectId: authorityInfoObjects[idx].objectId,
      };
    } else throw new Error("Err getting Authorities");
  });
}
