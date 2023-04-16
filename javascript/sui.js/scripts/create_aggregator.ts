/**
 * Create a new Switchboard Queue, Oracle, Crank, and Aggregator
 */
import Big from "big.js";
import { Buffer } from "buffer";
import { OracleQueueAccount, createFeed } from "../src/sbv2";
import {
  Ed25519Keypair,
  JsonRpcProvider,
  fromB64,
  Connection,
} from "@mysten/sui.js";
import { OracleJob } from "@switchboard-xyz/common";
import * as fs from "fs";
import { SWITCHBOARD_ADDRESS, RPC } from "./common";

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

    console.log(`User account ${userAddress} loaded.`);

    const queue = new OracleQueueAccount(
      provider,
      "0x738e508cf1eb3387c51ba9efe415adafe9e5eb5bad45fdad4a03ea0b51dafad3",
      SWITCHBOARD_ADDRESS
    );

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
      `Created AggregatorAccount ${aggregator.address}. Tx hash ${createFeedTx}`
    );
  } catch (e) {
    console.log("errored out from the start", e);
  }
})();
