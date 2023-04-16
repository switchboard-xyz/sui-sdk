/**
 * Create a new Switchboard Queue
 */
import { OracleQueueAccount } from "../src/sbv2";
import {
  Ed25519Keypair,
  JsonRpcProvider,
  fromB64,
  Connection,
} from "@mysten/sui.js";
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

    const [queue, queueTxHash] = await OracleQueueAccount.init(
      provider,
      keypair,
      {
        name: "switchboard unpermissioned queue",
        authority: userAddress,
        oracleTimeout: 300000,
        reward: 0,
        unpermissionedFeedsEnabled: true,
        lockLeaseFunding: false,
        maxSize: 1000,
        coinType: "0x2::sui::SUI",
      },
      SWITCHBOARD_ADDRESS
    );

    console.log("Queue created:", queue.address);
    console.log("Queue tx hash:", queueTxHash);
    console.log(await queue.loadData());
  } catch (e) {
    console.log("errored out", e);
  }
})();
