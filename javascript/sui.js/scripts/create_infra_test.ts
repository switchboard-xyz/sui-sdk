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
  SuiEvent,
  EventCallback,
  createFeed,
  OracleAccount,
  createOracle,
} from "../src/sbv2";
import {
  Ed25519Keypair,
  JsonRpcProvider,
  testnetConnection,
  fromB64,
  Connection,
  TransactionBlock,
} from "@mysten/sui.js";
import { OracleJob } from "@switchboard-xyz/common";
import * as fs from "fs";
import { SWITCHBOARD_ADDRESS, RPC } from "./common";

const onAggregatorUpdate = (
  client: JsonRpcProvider,
  cb: EventCallback
): SuiEvent => {
  return AggregatorAccount.watch(
    new JsonRpcProvider(testnetConnection),
    SWITCHBOARD_ADDRESS,
    cb
  );
};

const updateEventListener = onAggregatorUpdate(
  new JsonRpcProvider(testnetConnection),
  async (e) => {
    console.log(`NEW RESULT:`, JSON.stringify(e));
  }
);

async function onAggregatorOpenInterval(
  provider: JsonRpcProvider,
  callback: EventCallback
): Promise<SuiEvent> {
  const event = new SuiEvent(
    provider,
    SWITCHBOARD_ADDRESS,
    `aggregator_open_interval_action`,
    `MoveEvent`,
    `${SWITCHBOARD_ADDRESS}::events::AggregatorOpenIntervalEvent`
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
    const connection = new Connection({
      fullnode: RPC,
    });
    // connect to Devnet
    const provider = new JsonRpcProvider(connection);
    let keypair: Ed25519Keypair | null = null;

    // if file extension ends with yaml
    try {
      const parsed = fs.readFileSync("./sui-secret.txt");
      let str = fromB64(parsed.toString()).slice(1);
      keypair = Ed25519Keypair.fromSecretKey(str);
    } catch (_e) {
      console.log(_e);
    }

    // create new user
    const userAddress = keypair.getPublicKey().toSuiAddress();

    // try {
    //   // get tokens from the DevNet faucet server
    //   const tx = await provider.requestSuiFromFaucet(
    //     keypair.getPublicKey().toSuiAddress()
    //   );
    //   console.log(tx);
    // } catch (e) {
    //   console.log(e);
    // }

    console.log(`User account ${userAddress} created + funded.`);

    // const [queue, queueTxHash] = await OracleQueueAccount.init(
    //   provider,
    //   keypair,
    //   {
    //     name: "switchboard unpermissioned queue",
    //     authority: userAddress,
    //     oracleTimeout: 300000,
    //     reward: 0,
    //     unpermissionedFeedsEnabled: true,
    //     lockLeaseFunding: false,
    //     maxSize: 1000,
    //     coinType: "0x2::sui::SUI",
    //   },
    //   SWITCHBOARD_ADDRESS
    // );

    /**
     
    0x05cfa5efd53ff059d04b7d39ab37ceb384b00b755d31d14bf7ff6260dca9062d
{
  authority: '0xc9c8e0d738d7f090144847b38a8283fbe8050923875771b8c315a461721c04a4',
  created_at: '1681597751',
  escrows: {
    id: {
      id: '0xbd8c934cd64c5caf935dc629064b24ace6d509d5b0070f572a73dca709f6f18a'
    },
    size: '1'
  },
  id: {
    id: '0x44ffa55891669c2b377d75a6f7932f2f70556cac5772870e988207a79352fa47'
  },
  name: [
    '83',  '119', '105', '116',
    '99',  '104', '98',  '111',
    '97',  '114', '100', '32',
    '79',  '114', '97',  '99',
    '108', '101', '65',  '99',
    '99',  '111', '117', '110',
    '116'
  ],
  num_rows: '0',
  queue_addr: '0x738e508cf1eb3387c51ba9efe415adafe9e5eb5bad45fdad4a03ea0b51dafad3',
  token_addr: '0xe0b70bac6fcf0ad866689da7cb670295b5b47412cb90209227b58f95343af212'
}
     * 
     * 
     */

    const queue = new OracleQueueAccount(
      provider,
      "0x738e508cf1eb3387c51ba9efe415adafe9e5eb5bad45fdad4a03ea0b51dafad3",
      SWITCHBOARD_ADDRESS
    );

    // const [oracle, oracleTxHash] = await createOracle(
    //   provider,
    //   keypair,
    //   {
    //     name: "Switchboard OracleAccount",
    //     authority: userAddress,
    //     queue:
    //       "0x738e508cf1eb3387c51ba9efe415adafe9e5eb5bad45fdad4a03ea0b51dafad3", //
    //     loadCoin: coin,
    //     loadAmount: 1, // 1 mist
    //     coinType: "0x2::sui::SUI",
    //   },
    //   SWITCHBOARD_ADDRESS
    // );
    const oracle = new OracleAccount(
      provider,
      "0x44ffa55891669c2b377d75a6f7932f2f70556cac5772870e988207a79352fa47",
      SWITCHBOARD_ADDRESS
    );
    console.log(await oracle.loadData());
    //console.log(`Oracle ${oracle.address} created. tx hash: ${oracleTxHash}`);

    // wait 10s
    // await new Promise((r) => setTimeout(r, 10000));

    // first heartbeat
    // const heartbeatTxHash = await oracle.heartbeat(keypair, queue.address);
    // console.log("First Heartbeat Tx Hash:", heartbeatTxHash);

    // get oracle index
    const oracleIdx = await queue.findOracleIdx(oracle.address);

    // heartbeat every 30 seconds
    // setInterval(async () => {
    //   try {
    //     const heartbeatTxHash = await oracle.heartbeat(keypair, queue.address);
    //     console.log("Heartbeat Tx Hash:", heartbeatTxHash);
    //   } catch (e) {
    //     console.log(e, "failed heartbeat");
    //   }
    // }, 30000);

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
        name: "BTC/USD",
        authority: userAddress,
        queueAddress: queue.address,
        batchSize: 1,
        minJobResults: 1,
        minOracleResults: 1,
        minUpdateDelaySeconds: 5,
        varianceThreshold: new Big(0),
        forceReportPeriod: 0,
        coinType: "0x2::sui::SUI",
        initialLoadAmount: 1,
        jobs: [
          {
            name: "BTC/USD",
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

    openRoundEventListener = await onAggregatorOpenInterval(
      new JsonRpcProvider(testnetConnection),
      async (e) => {
        console.log(e);
        console.log(`JSON:`, JSON.stringify(e, null, 2));
        try {
          const fields = e.event.moveEvent.fields;
          // only handle updates for this aggregator
          if (fields.aggregator_address !== aggregator.address) {
            return;
          }

          const agg = new AggregatorAccount(
            provider,
            fields.aggregator_address,
            SWITCHBOARD_ADDRESS
          );

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
              oracleAddress: oracle.address,
              oracleIdx: oracleIdx,
              queueAddress: queue.address,
              value: new Big(json.result),
            });
            console.log("save result tx:", tx);
          } catch (e) {
            console.log(e);
          } // errors will happen when task runner returns them
        } catch (e) {
          console.log(e);
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
        const tx = new TransactionBlock();
        await aggregator.openInterval(keypair, 10);
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

async function getCoinObject(
  provider: JsonRpcProvider,
  user: string
): Promise<string> {
  const coins = await provider.getAllCoins({ owner: user });
  return coins.data.pop()?.coinObjectId;
}
