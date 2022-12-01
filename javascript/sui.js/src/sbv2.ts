import { OracleJob } from "@switchboard-xyz/common";
import Big from "big.js";
import BN from "bn.js";
import {
  Ed25519Keypair,
  JsonRpcProvider,
  SignableTransaction,
  UnserializedSignableTransaction,
  getObjectFields,
  SuiEventEnvelope,
  MoveCallTransaction,
  RawSigner,
  SignerWithProvider,
  SuiExecuteTransactionResponse,
  Network,
  SubscriptionId,
  Keypair,
} from "@mysten/sui.js";
import * as SHA3 from "js-sha3";
export { OracleJob, IOracleJob } from "@switchboard-xyz/common";
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
    let e = val.e + 1;
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
  PERMIT_VRF_REQUESTS,
}

export interface AggregatorAddJobParams {
  job: string;
  weight?: number;
}

export interface AggregatorInitParams {
  authority: string; // owner of aggregator
  name?: string;
  metadata?: string;
  queueAddress: string;
  crankAddress: string;
  coinType: string;
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
  readWhitelist?: string[];
  limitReadsToWhitelist?: boolean;
  seed?: string;
}

export interface AggregatorSaveResultParams {
  oracleAddress: string;
  oracleIdx: number;
  error: boolean;
  // this should probably be automatically generated
  value: Big;
  jobsChecksum: string;
  minResponse: Big;
  maxResponse: Big;
}

export interface OracleSaveResultParams extends AggregatorSaveResultParams {
  aggregatorAddress: string;
}

export interface JobInitParams {
  name: string;
  metadata: string;
  authority: string;
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
  queueAddress?: string;
  crankAddress?: string;
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
  rewardEscrow?: string;
  readWhitelist?: string[];
  limitReadsToWhitelist?: boolean;
  coinType?: string;
}

export interface AggregatorSetFeedRelayParams {
  aggregator_addr: string;
  relay_authority: string; // user that has authority to oracle public keys
  oracle_keys: string[];
}

// set_feed_relay_oracle_keys
export interface AggregatorSetFeedRelayOracleKeys {
  aggregator_addr: string;
  oracle_keys: string[];
}

export interface CrankInitParams {
  queueAddress: string;
  coinType: string;
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
  authority: string;
  queue: string;
  coinType: string;
  seed?: string;
}

export interface OracleQueueInitParams {
  authority: string;
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
  coinType: string;
}

export interface OracleQueueSetConfigsParams {
  name: string;
  metadata: string;
  authority: string;
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
  coinType: string;
}

export interface LeaseInitParams {
  queue: string;
  withdrawAuthority: string;
  initialAmount: number;
  coinType: string;
}

export interface LeaseExtendParams {
  queueAddress: string;
  loadAmount: number;
}

export interface LeaseWithdrawParams {
  queueAddress: string;
  amount: number;
}

export interface LeaseSetAuthorityParams {
  queueAddress: string;
  authority: string;
}

export interface EscrowInitParams {
  oracleAddress: string;
  queueAddress: string;
  coinType: string;
}

export interface EscrowContributeParams {
  oracleAddress: string;
  queueAddress: string;
  loadAmount: number;
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
  let txnRequest = await signer.dryRunTransaction(txn);
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
  gasBudget: number = 10000
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
 * Poll Events on Sui
 */
export class SuiEvent {
  intervalId?: SubscriptionId;
  constructor(
    readonly provider: JsonRpcProvider,
    readonly pkg: string,
    readonly moduleName: string,
    readonly eventType: string
  ) {}

  async onTrigger(
    callback: EventCallback,
    errorHandler?: (error: unknown) => void
  ) {
    this.intervalId = await this.provider.subscribeEvent(
      {
        All: [
          { EventType: "MoveEvent" },
          { Package: this.pkg },
          { Module: this.moduleName },
          { MoveEventType: this.eventType },
        ],
      },
      (event: SuiEventEnvelope) => {
        try {
          callback(event);
        } catch (e) {
          errorHandler(e);
        }
      }
    );
    return this.intervalId;
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
    const childResults = await this.provider.getObjectsOwnedByAddress(
      this.address
    );
    const childFields = (
      await Promise.all(
        childResults.map(async (res) => {
          const data = await this.provider.getObject(res.objectId);
          return getObjectFields(data);
        })
      )
    ).reduce((obj, curr) => ({ ...obj, ...curr }), {});
    const agg = {
      ...childFields,
      ...getObjectFields(result),
    };
    return agg;
  }

  async loadJobs(): Promise<Array<OracleJob>> {
    const data = await this.loadData();
    const jobs = data.jobKeys.map(
      (key: any) => new JobAccount(this.provider, key, this.switchboardAddress)
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
        params.name ?? "",
        params.metadata ?? "",
        params.queueAddress,
        params.crankAddress,
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
      const txEffects = result.EffectsCert.effects.effects;
      const aggId = txEffects.sharedObjects.pop();
      if (!aggId) {
        return;
      }

      return [
        new AggregatorAccount(
          provider,
          aggId.objectId,
          switchboardAddress,
          params.coinType ?? "0x2::sui::SUI"
        ),
        result,
      ];
    }

    throw new Error("No Aggregator Data Created.");
  }

  async latestValue(): Promise<number> {
    const data = await this.loadData();
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
    const {
      mantissa: minResponseMantissa,
      scale: minResponseScale,
      neg: minResponseNeg,
    } = SuiDecimal.fromBig(params.minResponse);
    const {
      mantissa: maxResponseMantissa,
      scale: maxResponseScale,
      neg: maxResponseNeg,
    } = SuiDecimal.fromBig(params.maxResponse);

    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_save_result_action::run`,
      [
        params.oracleAddress,
        this.address,
        params.oracleIdx,
        params.error,
        valueMantissa,
        valueScale,
        valueNeg,
        params.jobsChecksum,
        minResponseMantissa,
        minResponseScale,
        minResponseNeg,
        maxResponseMantissa,
        maxResponseScale,
        maxResponseNeg,
      ],
      [this.coinType ?? "0x2::sui::SUI"]
    );

    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });
  }

  async openRound(
    signer: Keypair,
    jitter?: number
  ): Promise<SuiExecuteTransactionResponse> {
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_open_round_action::run`,
      [this.address, jitter ?? 1],
      [this.coinType]
    );

    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });
  }

  openRoundTx(): SignableTransaction {
    const txData = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_open_round_action::run`,
      [this.address, 1],
      [this.coinType ?? "0x2::sui::SUI"]
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
        params.metadata ?? aggregator.metadata,
        params.queueAddress ?? aggregator.queueAddr,
        params.crankAddress ?? aggregator.crankAddr,
        params.batchSize ?? aggregator.batchSize.toNumber(),
        params.minOracleResults ?? aggregator.minOracleResults.toNumber(),
        params.minJobResults ?? aggregator.minJobResults.toNumber(),
        params.minUpdateDelaySeconds ??
          aggregator.minUpdateDelaySeconds.toNumber(),
        params.startAfter ?? aggregator.startAfter.toNumber(),
        params.varianceThreshold
          ? vtMantissa
          : aggregator.varianceThreshold.value.toString(),
        params.varianceThreshold ? vtScale : aggregator.varianceThreshold.dec,
        params.forceReportPeriod ?? aggregator.forceReportPeriod.toNumber(),
        params.expiration ?? aggregator.expiration.toNumber(), // @ts-ignore
        params.disableCrank ?? false, // @ts-ignore
        params.historySize ?? 0, // @ts-ignore
        params.readCharge ?? aggregator.readCharge.toNumber(),
        params.rewardEscrow ? params.rewardEscrow : aggregator.rewardEscrow,
        params.readWhitelist ?? aggregator.readWhitelist,
        params.limitReadsToWhitelist ?? aggregator.limitReadsToWhitelist,
        params.authority ?? aggregator.authority,
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
        params.metadata ?? aggregator.metadata,
        params.queueAddress ?? aggregator.queueAddr,
        params.crankAddress ?? aggregator.crankAddr,
        params.batchSize ?? aggregator.batchSize.toNumber(),
        params.minOracleResults ?? aggregator.minOracleResults.toNumber(),
        params.minJobResults ?? aggregator.minJobResults.toNumber(),
        params.minUpdateDelaySeconds ??
          aggregator.minUpdateDelaySeconds.toNumber(),
        params.startAfter ?? aggregator.startAfter.toNumber(),
        params.varianceThreshold
          ? vtMantissa
          : aggregator.varianceThreshold.value.toString(),
        params.varianceThreshold ? vtScale : aggregator.varianceThreshold.dec,
        params.forceReportPeriod ?? aggregator.forceReportPeriod.toNumber(),
        params.expiration ?? aggregator.expiration.toNumber(), // @ts-ignore
        params.disableCrank ?? false, // @ts-ignore
        params.historySize ?? 0, // @ts-ignore
        params.readCharge ?? aggregator.readCharge.toNumber(),
        params.rewardEscrow ? params.rewardEscrow : aggregator.rewardEscrow,
        params.readWhitelist ?? aggregator.readWhitelist,
        params.limitReadsToWhitelist ?? aggregator.limitReadsToWhitelist,
        params.authority ?? aggregator.authority,
      ]
    );
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: txData,
    });
  }

  static watch(
    provider: JsonRpcProvider,
    switchboardAddress: string,
    callback: EventCallback,
    pollingIntervalMs = 1000
  ): SuiEvent {
    const event = new SuiEvent(
      provider,
      switchboardAddress,
      `${switchboardAddress}::switchboard::State`,
      "aggregator_update_events"
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

    // TODO: Fix this
    const job = OracleJob.decodeDelimited(
      Buffer.from(Buffer.from(data.data).toString(), "base64")
    );
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
      params.metadata,
      params.authority,
      params.data,
    ]);

    const signerWithProvider = new RawSigner(signer, provider);
    const result = await sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });

    if ("EffectsCert" in result) {
      const txEffects = result.EffectsCert.effects.effects;
      const jobId = txEffects.sharedObjects.pop();
      if (!jobId) {
        return;
      }

      return [
        new JobAccount(provider, jobId.objectId, switchboardAddress),
        result,
      ];
    }

    throw new Error("No Job Data Created.");
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
      params.metadata,
      params.authority,
      params.data,
    ]);
    return {
      kind: "moveCall",
      data: tx,
    };
  }
}

export class CrankAccount {
  constructor(
    readonly provider: JsonRpcProvider,
    readonly address: string,
    readonly switchboardAddress: string,
    readonly coinType: string = "0x2::sui::SUI"
  ) {}

  /**
   * Initialize a Crank
   * @param client
   * @param account account that will be the authority of the Crank
   * @param params CrankInitParams initialization params
   */
  static async init(
    provider: JsonRpcProvider,
    signer: Keypair,
    params: CrankInitParams,
    switchboardAddress: string
  ): Promise<[CrankAccount, SuiExecuteTransactionResponse]> {
    const txData = getSuiMoveCall(
      `${switchboardAddress}::crank_init_action::run`,
      [params.queueAddress],
      [params.coinType ?? "0x2::sui::SUI"]
    );

    const signerWithProvider = new RawSigner(signer, provider);
    const result = await sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: txData,
    });

    if ("EffectsCert" in result) {
      const txEffects = result.EffectsCert.effects.effects;
      const crankId = txEffects.sharedObjects.pop();
      if (!crankId) {
        return;
      }

      return [
        new CrankAccount(provider, crankId.objectId, switchboardAddress),
        result,
      ];
    }

    throw new Error("No Job Data Created.");
  }

  /**
   * Push an aggregator to a Crank
   * @param params CrankPushParams
   */
  async push(
    signer: Keypair,
    params: CrankPushParams
  ): Promise<SuiExecuteTransactionResponse> {
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::crank_push_action::run`,
      [this.address, params.aggregatorAddress],
      [this.coinType ?? "0x2::sui::SUI"]
    );
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });
  }

  pushTx(params: CrankPushParams): SignableTransaction {
    return {
      kind: "moveCall",
      data: getSuiMoveCall(
        `${this.switchboardAddress}::crank_push_action::run`,
        [this.address, params.aggregatorAddress],
        [this.coinType ?? "0x2::sui::SUI"]
      ),
    };
  }

  /**
   * Pop an aggregator off the Crank
   */
  async pop(
    signer: Keypair,
    pop_idx?: number
  ): Promise<SuiExecuteTransactionResponse> {
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::crank_pop_action::run`,
      [this.address, pop_idx ?? 0],
      [this.coinType]
    );
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });
  }

  async loadData(): Promise<any> {
    const result = await this.provider.getObject(this.address);
    const crank = getObjectFields(result);
    return { ...crank };
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
      [params.name, params.metadata, params.authority, params.queue],
      [params.coinType ?? "0x2::sui::SUI"]
    );

    const signerWithProvider = new RawSigner(signer, provider);
    const result = await sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });

    if ("EffectsCert" in result) {
      const txEffects = result.EffectsCert.effects.effects;
      const oracleId = txEffects.sharedObjects.pop();
      if (!oracleId) {
        return;
      }

      return [
        new OracleAccount(
          provider,
          oracleId.objectId,
          switchboardAddress,
          params.coinType ?? "0x2::sui::SUI"
        ),
        result,
      ];
    }

    throw new Error("No Oracle Data Created.");
  }

  async loadData(): Promise<any> {
    const result = await this.provider.getObject(this.address);
    const childResults = await this.provider.getObjectsOwnedByAddress(
      this.address
    );
    const childFields = (
      await Promise.all(
        childResults.map(async (res) => {
          const data = await this.provider.getObject(res.objectId);
          return getObjectFields(data);
        })
      )
    ).reduce((obj, curr) => ({ ...obj, ...curr }), {});
    const oracleData = {
      ...childFields,
      ...getObjectFields(result),
    };
    return oracleData;
  }

  /**
   * Oracle Heartbeat Action
   */
  async heartbeat(signer: Keypair): Promise<SuiExecuteTransactionResponse> {
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::oracle_heartbeat_action::run`,
      [this.address],
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
      [params.coinType ?? "0x2::sui::SUI"]
    );

    const signerWithProvider = new RawSigner(signer, provider);
    const result = await sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });

    if ("EffectsCert" in result) {
      const txEffects = result.EffectsCert.effects.effects;
      const queueId = txEffects.sharedObjects.pop();
      if (!queueId) {
        return;
      }

      return [
        new OracleQueueAccount(
          provider,
          queueId.objectId,
          switchboardAddress,
          params.coinType ?? "0x2::sui::SUI"
        ),
        result,
      ];
    }

    throw new Error("No Oracle Queue Data Created.");
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
        params.metadata,
        params.authority,
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
    const childResults = await this.provider.getObjectsOwnedByAddress(
      this.address
    );
    const childFields = (
      await Promise.all(
        childResults.map(async (res) => {
          const data = await this.provider.getObject(res.objectId);
          return getObjectFields(data);
        })
      )
    ).reduce((obj, curr) => ({ ...obj, ...curr }), {});
    const queueData = {
      ...childFields,
      ...getObjectFields(result),
    };
    return queueData;
  }
}

/**
 * Escrow for Aggregator
 */
export class AggregatorEscrow {
  constructor(
    readonly provider: JsonRpcProvider,
    readonly address: string /* aggregator account address */,
    readonly switchboardAddress: string,
    readonly coinType: string = "0x2::sui::SUI"
  ) {}

  /**
   * Extend a lease
   * @param params CrankPushParams
   */
  async extend(
    signer: Keypair,
    params: LeaseExtendParams
  ): Promise<SuiExecuteTransactionResponse> {
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_escrow_deposit_action::run`,
      [this.address, params.loadAmount],
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
   * @param params CrankPushParams
   */
  extendTx(account: string, params: LeaseExtendParams): SignableTransaction {
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::aggregator_escrow_deposit_action::run`,
      [this.address, params.loadAmount],
      [this.coinType]
    );
    return {
      kind: "moveCall",
      data: tx,
    };
  }

  async loadData(queueAddress: string): Promise<any> {}
}

export class OracleEscrow {
  constructor(
    readonly provider: JsonRpcProvider,
    readonly address: string,
    readonly switchboardAddress: string,
    readonly coinType: string = "0x2::sui::SUI"
  ) {}

  /**
   * Contributes to an oracle wallet
   * @param params OracleEscrowContributeParams
   */
  async contribute(
    signer: Keypair,
    params: LeaseExtendParams
  ): Promise<SuiExecuteTransactionResponse> {
    const tx = getSuiMoveCall(
      `${this.switchboardAddress}::oracle_escrow_deposit_action::run`,
      [this.address, params.loadAmount],
      [this.coinType]
    );
    const signerWithProvider = new RawSigner(signer, this.provider);
    return sendSuiTx(signerWithProvider, {
      kind: "moveCall",
      data: tx,
    });
  }

  /**
   * Withdraw from an OracleEscrow
   */
  // async withdraw(
  //   account: AptosAccount,
  //   params: OracleEscrowWithdrawParams
  // ): Promise<string> {
  //   return await sendAptosTx(
  //     this.client,
  //     account,
  //     `${this.switchboardAddress}::oracle_wallet_withdraw_action::run`,
  //     [
  //       [
  //         HexString.ensure(this.address).hex(),
  //         HexString.ensure(params.queueAddress).hex(),
  //         params.amount,
  //       ],
  //     ],
  //     [this.coinType]
  //   );
  // }

  async loadData(queueAddress: string): Promise<any> {}
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
    const childResults = await this.provider.getObjectsOwnedByAddress(
      this.objectId
    );
    const childFields = (
      await Promise.all(
        childResults.map(async (res) => {
          const data = await this.provider.getObject(res.objectId);
          return getObjectFields(data);
        })
      )
    ).reduce((obj, curr) => ({ ...obj, ...curr }), {});
    const queueData = {
      ...childFields,
      ...getObjectFields(result),
    };
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
      const txEffects = result.EffectsCert.effects.effects;
      const permissionId = txEffects.created.pop();
      if (!permissionId) {
        return;
      }

      return [
        new Permission(
          provider,
          params.queueId,
          params.objectId,
          permissionId.reference.objectId,
          switchboardAddress,
          coinType ?? "0x2::sui::SUI"
        ),
        result,
      ];
    }

    throw new Error("No Permission Created.");
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
  initialLoadAmount: number;
}

interface CreateOracleParams extends OracleInitParams {}

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

  return {
    kind: "moveCall",
    data: getSuiMoveCall(
      `${switchboardAddress}::create_feed_action::run`,
      [
        // authority will own everything
        params.authority,

        // aggregator
        params.name ?? "",
        params.metadata ?? "",
        params.queueAddress,
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
        params.rewardEscrow ? params.rewardEscrow : params.authority,
        params.readWhitelist ?? [],
        params.limitReadsToWhitelist ?? false,

        // lease
        params.initialLoadAmount,

        // jobs
        ...jobs.flatMap((jip) => {
          return [jip.name, jip.metadata, jip.data, jip.weight || 1];
        }),

        // crank
        params.crankAddress,
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
    const txEffects = result.EffectsCert.effects.effects;
    const aggId = txEffects.sharedObjects.pop();
    if (!aggId) {
      return;
    }

    return [
      new AggregatorAccount(
        provider,
        aggId.objectId,
        switchboardAddress,
        params.coinType ?? "0x2::sui::SUI"
      ),
      result,
    ];
  }

  throw new Error("No aggregator data created by create feed fn.");
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
    [params.authority, params.name, params.metadata, params.queue],
    [params.coinType ?? "0x2::sui::SUI"]
  );

  const signerWithProvider = new RawSigner(signer, provider);
  const result = await sendSuiTx(signerWithProvider, {
    kind: "moveCall",
    data: tx,
  });

  if ("EffectsCert" in result) {
    const txEffects = result.EffectsCert.effects.effects;
    const oracleId = txEffects.sharedObjects.pop();
    if (!oracleId) {
      return;
    }

    return [
      new OracleAccount(
        provider,
        oracleId.objectId,
        switchboardAddress,
        params.coinType ?? "0x2::sui::SUI"
      ),
      result,
    ];
  }

  throw new Error("No oracle data created by create feed fn.");
}
