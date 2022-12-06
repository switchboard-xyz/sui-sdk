/**
 * Creates a new account, inititalizes a Switchboard Resource Account on it
 *
 * Using that it should:
 *
 * DEMO --
 * Creates a new Aggregator
 * Creates a new Job (ftx btc/usd),
 * Adds Job to Aggregator
 * Push Aggregator to Crank
 */
import Big from "big.js";
import { Buffer } from "buffer";
import {
  AggregatorAccount,
  OracleAccount,
  JobAccount,
  OracleQueueAccount,
  CrankAccount,
  OracleJob,
  SuiEvent,
  EventCallback,
  createFeed,
  createOracle,
} from "../lib/cjs";
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
import * as fs from "fs";

// devnet addr
const SWITCHBOARD_ADDRESS = "0x17408e6e3d6e4e1abeba9e4f4d4d067e2f402d6a";

const onAggregatorUpdate = (
  client: JsonRpcProvider,
  cb: EventCallback,
  pollIntervalMs: number = 1000
): SuiEvent => {
  return AggregatorAccount.watch(
    client,
    SWITCHBOARD_ADDRESS,
    cb,
    pollIntervalMs
  );
};

const onAggregatorOpenRound = (
  client: JsonRpcProvider,
  cb: EventCallback,
  pollIntervalMs: number = 1000
) => {
  const event = new SuiEvent(
    client,
    SWITCHBOARD_ADDRESS,
    `events`,
    "AggregatorOpenRoundEvent"
  );
  event.onTrigger(cb);
  return event;
};

// run it all at once
(async () => {
  // connect to Devnet
  const provider = new JsonRpcProvider(Network.DEVNET);

  let keypair: Ed25519Keypair | null = null;

  // if file extension ends with yaml
  try {
    const parsed = fs.readFileSync("./sui-keypair.json", {
      encoding: "hex",
    });
    console.log(parsed);
    keypair = Ed25519Keypair.fromSecretKey(Buffer.from(parsed, "hex"));
  } catch (_e) {
    keypair = new Ed25519Keypair();
    fs.writeFileSync(
      "./sui-keypair.json",
      // @ts-ignore
      keypair.keypair.secretKey,
      { encoding: "hex" }
    );
  }

  // create new user
  const userAddress = `0x${keypair.getPublicKey().toSuiAddress()}`;

  try {
    // get tokens from the DevNet faucet server
    await provider.requestSuiFromFaucet(keypair.getPublicKey().toSuiAddress());
  } catch (e) {}

  console.log(`User account ${userAddress} created + funded.`);

  const coins = await provider.selectCoinsWithBalanceGreaterThanOrEqual(
    userAddress,
    BigInt(1000)
  );

  const coin: any = coins.pop();

  const [queue, queueTxHash] = await OracleQueueAccount.init(
    provider,
    keypair,
    {
      name: "switchboard unpermissioned queue",
      metadata: "running",
      authority: userAddress,
      oracleTimeout: 3000,
      reward: 1,
      minStake: 0,
      slashingEnabled: false,
      varianceToleranceMultiplierValue: 0,
      varianceToleranceMultiplierScale: 0,
      feedProbationPeriod: 0,
      consecutiveFeedFailureLimit: 0,
      consecutiveOracleFailureLimit: 0,
      unpermissionedFeedsEnabled: true,
      unpermissionedVrfEnabled: true,
      lockLeaseFunding: false,
      enableBufferRelayers: false,
      maxSize: 1000,
      coinType: "0x2::sui::SUI",
    },
    SWITCHBOARD_ADDRESS
  );

  console.log(`Oracle Queue ${queue.address} created. tx hash: ${queueTxHash}`);
  const [oracle, oracleTxHash] = await createOracle(
    provider,
    keypair,
    {
      name: "Switchboard OracleAccount",
      authority: userAddress,
      metadata: "metadata",
      queue: queue.address, //
      loadCoin: coin.details.reference.objectId,
      loadAmount: 0,
      coinType: "0x2::sui::SUI",
    },
    SWITCHBOARD_ADDRESS
  );
  console.log(await oracle.loadData());
  console.log(`Oracle ${oracle.address} created. tx hash: ${oracleTxHash}`);
  // first heartbeat
  const heartbeatTxHash = await oracle.heartbeat(keypair, queue.address);
  console.log("First Heartbeat Tx Hash:", heartbeatTxHash);
  // heartbeat every 30 seconds
  setInterval(async () => {
    try {
      const heartbeatTxHash = await oracle.heartbeat(keypair, queue.address);
      console.log("Heartbeat Tx Hash:", heartbeatTxHash);
    } catch (e) {
      console.log("failed heartbeat");
    }
  }, 30000);
  // create crank to catch aggregator push
  const [crank, txhash] = await CrankAccount.init(
    provider,
    keypair,
    {
      queueObjectId: queue.address,
      coinType: "0x2::sui::SUI",
    },
    SWITCHBOARD_ADDRESS
  );
  console.log(`Created crank at ${crank.address}, tx hash ${txhash}`);
  // Make JobAccount data for btc price
  const serializedJob1 = Buffer.from(
    OracleJob.encodeDelimited(
      OracleJob.create({
        tasks: [
          {
            httpTask: {
              url: "https://www.binance.us/api/v3/ticker/price?symbol=BTCUSD",
            },
          },
          {
            jsonParseTask: {
              path: "$.price",
            },
          },
        ],
      })
    ).finish()
  );
  const [aggregator, createFeedTx] = await createFeed(
    provider,
    keypair,
    {
      authority: userAddress,
      queueAddress: queue.address,
      batchSize: 1,
      minJobResults: 1,
      minOracleResults: 1,
      minUpdateDelaySeconds: 5,
      startAfter: 0,
      varianceThreshold: new Big(0),
      forceReportPeriod: 0,
      expiration: 0,
      coinType: "0x2::sui::SUI",
      crankAddress: crank.address,
      initialLoadAmount: 1,
      loadCoin: coin.details.reference.objectId,
      jobs: [
        {
          name: "BTC/USD",
          metadata: "binance",
          authority: userAddress,
          data: serializedJob1.toString("base64"),
          weight: 1,
        },
      ],
    },
    SWITCHBOARD_ADDRESS
  );
  console.log(
    `Created AggregatorAccount and LeaseAccount resources at account address ${aggregator.address}. Tx hash ${createFeedTx}`
  );
  const updatePoller = onAggregatorUpdate(provider, async (e) => {
    console.log(`NEW RESULT:`, e.data);
  });
  const onOpenRoundPoller = onAggregatorOpenRound(provider, async (e) => {
    console.log(e);
    try {
      // only handle updates for this aggregator
      if (e.data.aggregator_address !== aggregator.address) {
        return;
      }
      const agg = new AggregatorAccount(
        provider,
        e.data.aggregator_address,
        SWITCHBOARD_ADDRESS
      );
      const aggregatorData = await agg.loadData();
      // The event data includes JobAccount Pubkeys, so grab the JobAccount Data
      const jobs: OracleJob[] = await Promise.all(
        e.data.job_keys.map(async (jobKey: string) => {
          const job = new JobAccount(provider, jobKey, SWITCHBOARD_ADDRESS);
          const jobData = await job.loadJob().catch((e) => {
            console.log(e);
          });
          return jobData;
        })
      );
      // simulate a fetch
      const response = await fetch(`https://api.switchboard.xyz/api/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs }),
      });
      if (!response.ok) console.error(`[Task runner] Error testing jobs json.`);
      try {
        const json = await response.json();
        // try save result
        const tx = await aggregator.saveResult(keypair, {
          oracleAddress: oracle.address,
          oracleIdx: 0,
          error: false,
          value: new Big(json.result),
          jobsChecksum: Buffer.from(aggregatorData.jobsChecksum).toString(
            "hex"
          ),
          minResponse: new Big(json.result),
          maxResponse: new Big(json.result),
        });
        console.log("save result tx:", tx);
      } catch (e) {} // errors will happen when task runner returns them
    } catch (e) {
      console.log("open round resp fail");
    }
  });
  /**
   * Log Data Objects
   */
  console.log("logging all data objects");
  console.log(
    "AggregatorAccount:",
    JSON.stringify(await aggregator.loadData(), null, 2)
  );
  console.log("Load aggregator jobs data", await aggregator.loadJobs());
  setInterval(() => {
    try {
      aggregator.openRound(keypair);
      console.log("opening round");
    } catch (e) {
      console.log("failed open round");
    }
  }, 10000);
})();
