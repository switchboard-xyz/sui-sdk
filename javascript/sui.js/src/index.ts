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
  aggregatorAddress: string;
  queueAddress: string;
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

export interface OracleWalletInitParams {
  oracleAddress: string;
  queueAddress: string;
  coinType: string;
}

export interface OracleWalletContributeParams {
  oracleAddress: string;
  queueAddress: string;
  loadAmount: number;
}

export interface OracleWalletWithdrawParams {
  oracleAddress: string;
  queueAddress: string;
  amount: number;
}

export interface PermissionInitParams {
  authority: string;
  granter: string;
  grantee: string;
}

export interface PermissionSetParams {
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
      (key) => new JobAccount(this.provider, key, this.switchboardAddress)
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
   * @param client
   * @param account
   * @param params JobInitParams initialization params
   */
  static async init(
    provider: JsonRpcProvider,
    account: AptosAccount,
    params: JobInitParams,
    switchboardAddress: string
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
    provider: JsonRpcProvider,
    account: string,
    params: JobInitParams,
    switchboardAddress: string
  ): [JobAccount, SignableTransaction] {
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
    account: AptosAccount,
    params: CrankInitParams,
    switchboardAddress: string
  ): Promise<[CrankAccount, string]> {
    const tx = await sendAptosTx(
      client,
      account,
      `${switchboardAddress}::crank_init_action::run`,
      [HexString.ensure(params.queueAddress).hex()],
      [params.coinType ?? "0x2::sui::SUI"]
    );

    return [
      new CrankAccount(
        client,
        account.address(),
        switchboardAddress,
        params.coinType ?? "0x2::sui::SUI"
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
      [this.coinType ?? "0x2::sui::SUI"]
    );
  }

  pushTx(account: string, params: CrankPushParams): SignableTransaction {
    return getAptosTx(
      `${this.switchboardAddress}::crank_push_action::run`,
      [
        HexString.ensure(this.address).hex(),
        HexString.ensure(params.aggregatorAddress).hex(),
      ],
      [this.coinType ?? "0x2::sui::SUI"]
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
    account: AptosAccount,
    params: OracleInitParams,
    switchboardAddress: string
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
      [params.coinType ?? "0x2::sui::SUI"]
    );

    return [
      new OracleAccount(
        client,
        resource_address,
        switchboardAddress,
        params.coinType ?? "0x2::sui::SUI"
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
    const aggregator_addrs: string[] = [];
    const oracle_addrs: string[] = [];
    const oracle_idxs: number[] = [];
    const errors: boolean[] = [];
    const value_nums: string[] = [];
    const value_scale_factors: number[] = [];
    const value_negs: boolean[] = [];
    const jobs_checksums: string[] = [];
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
      } = SuiDecimal.fromBig(param.value);
      const {
        mantissa: minResponseMantissa,
        scale: minResponseScale,
        neg: minResponseNeg,
      } = SuiDecimal.fromBig(param.minResponse);
      const {
        mantissa: maxResponseMantissa,
        scale: maxResponseScale,
        neg: maxResponseNeg,
      } = SuiDecimal.fromBig(param.maxResponse);

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
      [this.coinType ?? "0x2::sui::SUI"],
      200
    );
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
   * @param client
   * @param account
   * @param params OracleQueueAccount initialization params
   */
  static async init(
    provider: JsonRpcProvider,
    account: AptosAccount,
    params: OracleQueueInitParams,
    switchboardAddress: string
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
      [params.coinType ?? "0x2::sui::SUI"]
    );

    return [
      new OracleQueueAccount(
        client,
        account.address(),
        switchboardAddress,
        params.coinType ?? "0x2::sui::SUI"
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
      [params.coinType ?? "0x2::sui::SUI"]
    );
  }

  async loadData(): Promise<types.OracleQueue> {
    const queueTypes = new Set([
      `${this.switchboardAddress}::oracle_queue::OracleQueue<${
        this.coinType ?? "0x2::sui::SUI"
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
    readonly provider: JsonRpcProvider,
    readonly address: string /* aggregator account address */,
    readonly switchboardAddress: string,
    readonly coinType: string = "0x2::sui::SUI"
  ) {}

  /**
   * Initialize a LeaseAccount
   * @param client
   * @param account account that will be the authority of the LeaseAccount
   * @param params LeaseInitParams initialization params
   */
  static async init(
    provider: JsonRpcProvider,
    account: AptosAccount,
    params: LeaseInitParams,
    switchboardAddress: string
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
      [params.coinType ?? "0x2::sui::SUI"]
    );

    return [
      new LeaseAccount(
        client,
        params.aggregatorAddress,
        switchboardAddress,
        params.coinType ?? "0x2::sui::SUI"
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
  extendTx(account: string, params: LeaseExtendParams): SignableTransaction {
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
    account: string,
    params: LeaseWithdrawParams
  ): SignableTransaction {
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

  async loadData(queueAddress: string): Promise<types.Escrow> {
    return await EscrowManager.fetchItem(this, queueAddress);
  }
}

export class EscrowManager {
  constructor(
    readonly provider: JsonRpcProvider,
    readonly address: string,
    readonly switchboardAddress: string,
    readonly coinType: string = "0x2::sui::SUI"
  ) {}

  async loadData(): Promise<types.EscrowManager> {
    const data = (
      (await this.client.getAccountResource(
        this.address,
        `${this.switchboardAddress}::escrow::EscrowManager<${
          this.coinType ?? "0x2::sui::SUI"
        }>`
      )) as any
    ).data;

    return types.EscrowManager.fromMoveStruct(data);
  }

  async fetchItem(queueAddress: string): Promise<types.Escrow> {
    const escrowManagerState = await this.loadData();

    const item = await this.client.getTableItem(
      escrowManagerState.escrows.handle.toString(),
      {
        key_type: `address`,
        value_type: `${this.switchboardAddress}::escrow::Escrow<${
          this.coinType ?? "0x2::sui::SUI"
        }>`,
        key: HexString.ensure(queueAddress).hex(),
      }
    );

    return types.Escrow.fromMoveStruct(item);
  }

  static async fetchItem<
    T extends {
      provider: JsonRpcProvider;
      address: string;
      switchboardAddress: string;
      coinType: string;
    }
  >(account: T, queueAddress: string): Promise<types.Escrow> {
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
    readonly provider: JsonRpcProvider,
    readonly address: string,
    readonly switchboardAddress: string,
    readonly coinType: string = "0x2::sui::SUI"
  ) {}

  /**
   * Initialize an OracleWallet
   * @param client
   * @param account account that will be the authority of the OracleWallet
   * @param params OracleWalletInitParams initialization params
   */
  static async init(
    provider: JsonRpcProvider,
    account: AptosAccount,
    params: OracleWalletInitParams,
    switchboardAddress: string
  ): Promise<[OracleWallet, string]> {
    const tx = await sendAptosTx(
      client,
      account,
      `${switchboardAddress}::oracle_wallet_init_action::run`,
      [
        HexString.ensure(params.oracleAddress),
        HexString.ensure(params.queueAddress),
      ],
      [params.coinType ?? "0x2::sui::SUI"]
    );

    return [
      new OracleWallet(
        client,
        account.address(),
        switchboardAddress,
        params.coinType ?? "0x2::sui::SUI"
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

  async loadData(queueAddress: string): Promise<any> {
    const handle = (
      (await this.client.getAccountResource(
        this.address,
        `${this.switchboardAddress}::escrow::EscrowManager<${
          this.coinType ?? "0x2::sui::SUI"
        }>`
      )) as any
    ).data.escrows.handle;
    return await this.client.getTableItem(handle, {
      key_type: `address`,
      value_type: `${this.switchboardAddress}::escrow::Escrow<${
        this.coinType ?? "0x2::sui::SUI"
      }>`,
      key: HexString.ensure(queueAddress).hex(),
    });
  }
}

export class Permission {
  constructor(
    readonly provider: JsonRpcProvider,
    readonly switchboardAddress: string
  ) {}

  /**
   * Initialize a Permission
   * @param client
   * @param account
   * @param params PermissionInitParams initialization params
   */
  static async init(
    provider: JsonRpcProvider,
    account: AptosAccount,
    params: PermissionInitParams,
    switchboardAddress: string
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
  provider: JsonRpcProvider,
  authority: string,
  params: CreateFeedParams,
  switchboardAddress: string
): Promise<[AggregatorAccount, SignableTransaction]> {
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

  const { mantissa: vtMantissa, scale: vtScale } = SuiDecimal.fromBig(
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
      params.coinType ?? "0x2::sui::SUI"
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
      [params.coinType ?? "0x2::sui::SUI"]
    ),
  ];
}

// Create a feed with jobs, a lease, then optionally push the lease to the specified crank
export async function createFeed(
  provider: JsonRpcProvider,
  account: AptosAccount,
  params: CreateFeedParams,
  switchboardAddress: string
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
  provider: JsonRpcProvider,
  account: AptosAccount,
  params: CreateOracleParams,
  switchboardAddress: string
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
    [params.coinType ?? "0x2::sui::SUI"]
  );

  return [
    new OracleAccount(
      client,
      resource_address,
      switchboardAddress,
      params.coinType ?? "0x2::sui::SUI"
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
): string {
  const hash = SHA3.sha3_256.create();
  const userAddressBCS = bcsAddressToBytes(origin);
  hash.update(userAddressBCS);
  hash.update(new Uint8Array([...seed, 255]));
  return `0x${hash.hex()}`;
}

export async function fetchAggregators(
  provider: JsonRpcProvider,
  authority: string,
  switchboardAddress: string
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
      tableItems.map((aggregatorAddress: string) =>
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
