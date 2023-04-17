/**
 * Create a new Switchboard Oracle
 */
import { OracleQueueAccount, createOracle } from "../src/sbv2";
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

    console.log(`User account ${userAddress} created.`);

    const queue = new OracleQueueAccount(
      provider,
      "0x1ed7c8f76d881bbffd17eee26102f5f8eb03cfdb9975e6667b1b52e6a61e2840",
      SWITCHBOARD_ADDRESS
    );

    const [oracle, oracleTxHash] = await createOracle(
      provider,
      keypair,
      {
        name: "Switchboard OracleAccount",
        authority: userAddress,
        queue: queue.address,
        loadAmount: 1, // 1 mist
        coinType: "0x2::sui::SUI",
      },
      SWITCHBOARD_ADDRESS
    );

    console.log("Created oracle address:", oracle.address);
    console.log("Created oracle tx hash:", oracleTxHash);
    console.log(await oracle.loadData());
  } catch (e) {
    console.log("errored out from the start", e);
  }
})();
