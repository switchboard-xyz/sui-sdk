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
  OracleAccount,
  getTableData,
  sendSuiTx,
} from "../src/sbv2";
import {
  Ed25519Keypair,
  JsonRpcProvider,
  testnetConnection,
  fromB64,
  Connection,
  TransactionBlock,
  RawSigner,
} from "@mysten/sui.js";
import { OracleJob } from "@switchboard-xyz/common";
import * as fs from "fs";
import { SWITCHBOARD_ADDRESS, RPC } from "./common";

const onAggregatorUpdate = (cb: EventCallback): SuiEvent => {
  return AggregatorAccount.watch(
    new JsonRpcProvider(testnetConnection),
    SWITCHBOARD_ADDRESS,
    cb
  );
};

const updateEventListener = onAggregatorUpdate(async (e) => {
  console.log(`NEW RESULT:`, JSON.stringify(e));
});

async function onAggregatorOpenInterval(
  provider: JsonRpcProvider,
  callback: EventCallback
): Promise<SuiEvent> {
  const event = new SuiEvent(
    provider,
    SWITCHBOARD_ADDRESS,
    `aggregator_open_interval_action`,
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

    const userAddress = keypair.getPublicKey().toSuiAddress();
    console.log(`User account ${userAddress} loaded`);

    const queue = new OracleQueueAccount(
      provider,
      "0x1ed7c8f76d881bbffd17eee26102f5f8eb03cfdb9975e6667b1b52e6a61e2840",
      SWITCHBOARD_ADDRESS
    );

    const oracle = new OracleAccount(
      provider,
      "0x1869b5617d2c503851037a25c3ba7a0911a7a084853b9f9d8a7a145c4a03422c",
      SWITCHBOARD_ADDRESS
    );

    // heartbeat every 30 seconds
    setInterval(async () => {
      try {
        const heartbeatTxHash = await oracle.heartbeat(keypair, queue.address);
        console.log("Heartbeat Tx Hash:", heartbeatTxHash);
      } catch (e) {
        console.log(e, "failed heartbeat");
      }
    }, 30000);

    // heartbeat every 30 seconds
    setInterval(async () => {
      try {
        // grab fresh queue data
        const queueData = await queue.loadData();

        // grab feeds
        const crankableFeeds = Object.keys(
          await getTableData<string, boolean>(provider, queueData.crank_feeds)
        );

        // get oracle index in queue
        const oracleIdx = await queue.findOracleIdx(oracle.address);

        // create a transaction to batch updates
        const tx = new TransactionBlock();

        // loop through feeds and try to crank
        for (let address of crankableFeeds) {
          const aggregator = new AggregatorAccount(
            provider,
            address,
            SWITCHBOARD_ADDRESS
          );

          // grab the feed data
          const feed = await aggregator.loadData();

          let nextAllowedUpdateTimeSeconds = parseInt(
            feed.next_allowed_update_time
          );
          let nowSeconds = Date.now() / 1000;

          // get oracle index
          console.log("Oracle IDX is:", oracleIdx);

          // get the current index of the queue at the snapshot
          const currIdx = parseInt(queueData.curr_idx);

          // get the feed batch size
          const batchSize = parseInt(queueData.batch_size);

          // calculate the start and end index of the batch
          const queueSize = parseInt(queueData.data.contents.size);
          const startIdx = currIdx;
          const endIdx = (currIdx + batchSize) % queueSize;

          // check if oracle is in the batch size range
          const isOracleAllowedToCrank =
            (oracleIdx >= startIdx && oracleIdx <= endIdx) ||
            (startIdx > endIdx &&
              (oracleIdx >= startIdx || oracleIdx <= endIdx));

          // since this test queue should have dead oracles, ignore this check
          console.log("Is oracle is allowed to crank:", isOracleAllowedToCrank);

          // check if we should try and update the feed
          if (nextAllowedUpdateTimeSeconds < nowSeconds) {
            const jobs: OracleJob[] = await aggregator.loadJobs();

            // simulate a fetch
            // @ts-ignore
            const response = await fetch(
              `https://api.switchboard.xyz/api/test`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobs }),
              }
            );
            if (!response.ok)
              console.error(`[Task runner] Error testing jobs json.`);

            try {
              console.log(
                `Saving result for ${Buffer.from(feed.name, "base64")} ${
                  aggregator.address
                }`
              );
              const json: any = await response.json();
              console.log("result:", json.result);

              // try save result
              aggregator.saveResultTx(
                {
                  oracleAddress: oracle.address,
                  oracleIdx: oracleIdx,
                  queueAddress: queue.address,
                  value: new Big(json.result),
                },
                tx
              );
            } catch (e) {
              console.log(e);
            } // errors will happen when task runner returns them
          }
        }

        // send the transaction block
        const signerWithProvider = new RawSigner(keypair, provider);
        const result = await sendSuiTx(signerWithProvider, tx);
        console.log("Save results hash:", result);
      } catch (e) {
        console.log(e, "no crankin this time");
      }
    }, 15000);
  } catch (e) {
    console.log("errored out from the start", e);
  }
})();
