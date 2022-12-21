/**
 * Create a new Switchboard Queue, Oracle, Crank, and Aggregator
 *
 * Mimics feed updates.
 */
import Big from "big.js";
import { Buffer } from "buffer";
import {
  AggregatorAccount,
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
  getObjectFields,
  Network,
} from "@mysten/sui.js";
import * as fs from "fs";

// devnet address
const SWITCHBOARD_ADDRESS = "0x69da62384b7134af63bedeee615db9c4ce183b8f";

const onAggregatorUpdate = (
  client: JsonRpcProvider,
  cb: EventCallback
): SuiEvent => {
  return AggregatorAccount.watch(
    new JsonRpcProvider("wss://fullnode.devnet.sui.io:443"),
    SWITCHBOARD_ADDRESS,
    cb
  );
};

const updateEventListener = onAggregatorUpdate(
  new JsonRpcProvider("wss://fullnode.devnet.sui.io:443"),
  async (e) => {
    console.log(`NEW RESULT:`, JSON.stringify(e));
  }
);

async function onAggregatorOpenRound(
  provider: JsonRpcProvider,
  callback: EventCallback
): Promise<SuiEvent> {
  const event = new SuiEvent(
    provider,
    SWITCHBOARD_ADDRESS,
    `aggregator_open_round_action`,
    ``,
    "NewObject"
  );
  await event.onTrigger(callback, (e) => {
    console.error("exit from real open round", e);
  });
  return event;
}

let openRoundEventListener: SuiEvent;

// run it all at once
(async () => {
  try {
    // connect to Devnet
    const provider = new JsonRpcProvider(Network.DEVNET);
    let keypair: Ed25519Keypair | null = null;

    // if file extension ends with yaml
    try {
      const parsed = fs.readFileSync("./sui-secret.txt", {
        encoding: "utf8",
      });
      keypair = Ed25519Keypair.fromSecretKey(Buffer.from(parsed, "hex"));
    } catch (_e) {
      keypair = new Ed25519Keypair();
      console.log(JSON.stringify(keypair));
      fs.writeFileSync(
        "./sui-secret.txt",
        // @ts-ignore
        Buffer.from(keypair.keypair.secretKey).toString("hex")
      );
    }

    // create new user
    const userAddress = `0x${keypair.getPublicKey().toSuiAddress()}`;

    try {
      // get tokens from the DevNet faucet server
      await provider.requestSuiFromFaucet(
        keypair.getPublicKey().toSuiAddress()
      );
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
        reward: 0,
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

    console.log(
      `Oracle Queue ${queue.address} created. tx hash: ${queueTxHash}`
    );
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
        console.log(e, "failed heartbeat");
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
            data: Array.from(serializedJob1),
            weight: 1,
          },
        ],
      },
      SWITCHBOARD_ADDRESS
    );
    console.log(
      `Created AggregatorAccount and LeaseAccount resources at account address ${aggregator.address}. Tx hash ${createFeedTx}`
    );

    openRoundEventListener = await onAggregatorOpenRound(
      new JsonRpcProvider("wss://fullnode.devnet.sui.io:443"),
      async (e) => {
        console.log(e);
        try {
          const dataId = e.event.newObject.objectId;
          const result = await provider.getObject(dataId);
          const fields = getObjectFields(result);

          // fields looks like:
          // {
          //   aggregator: '0x094c02b33c386f1732b93ec18ef675428ddf7417',
          //   id: { id: '0x8f42fd792a3b33751752128983fe9f1636c1f287' },
          //   jobs_checksum: 'HS+xUEKt9h8btAEA8u0xjddh4GounAn9GCIIDGJwXNs=',
          //   oracle: '0x92f2fd4beaa2403aaca8e49a1b79a88feab0353f',
          //   rid: '1'
          // }

          // only handle updates for this aggregator
          if (fields.aggregator !== aggregator.address) {
            return;
          }

          const agg = new AggregatorAccount(
            provider,
            fields.aggregator,
            SWITCHBOARD_ADDRESS
          );
          const aggregatorData = await agg.loadData();
          // The event data includes JobAccount Pubkeys, so grab the JobAccount Data
          const jobs: OracleJob[] = await agg.loadJobs();

          // simulate a fetch
          // @ts-ignore
          const response = await fetch(`https://api.switchboard.xyz/api/test`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobs }),
          });
          if (!response.ok)
            console.error(`[Task runner] Error testing jobs json.`);
          try {
            console.log("saving result");
            const json: any = await response.json();
            // try save result
            const tx = await aggregator.saveResult(keypair, {
              capObjectId: dataId,
              oracleAddress: oracle.address,
              queueAddress: queue.address,
              value: new Big(json.result),
              jobsChecksum: aggregatorData.job_data.jobs_checksum,
            });
            console.log("save result tx:", tx);
          } catch (e) {
            console.log(e);
          } // errors will happen when task runner returns them
        } catch (e) {
          console.log("open round resp fail");
        }
      }
    );
    /**
     * Log Data Objects
     */
    console.log("logging all data objects");
    console.log(
      "AggregatorAccount:",
      JSON.stringify(await aggregator.loadData(), null, 2)
    );
    console.log("Load aggregator jobs data", await aggregator.loadJobs());
    setInterval(async () => {
      try {
        await aggregator.openRound(keypair);
        console.log("opening round");
      } catch (e) {
        console.log("failed open round", e);
      }
    }, 10000);
  } catch (e) {
    console.log("errored out from the start", e);
  }
})();
const x = setInterval(() => {}, 30000);
