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
  OracleAccount,
} from "../lib/cjs";
import {
  Ed25519Keypair,
  JsonRpcProvider,
  getObjectFields,
  Network,
} from "@mysten/sui.js";
import * as fs from "fs";
import fetch from "node-fetch";

// devnet address
const SWITCHBOARD_ADDRESS = "0xf21242fa1bf7adea92c1d01a392c045d1192e5bf";
const QUEUE_ADDRESS = "0x4be684c370a3db8811125bd19096bc43ed0739ed";
const CRANK_ADDRESS = "0x69da62384b7134af63bedeee615db9c4ce183b8f";
const ORACLE_ADDRESS = "0x863ec1f8c141e529dcfc51eacd643d231d5f5bf8";

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

    const queue = new OracleQueueAccount(
      provider,
      QUEUE_ADDRESS,
      SWITCHBOARD_ADDRESS
    );

    const oracle = new OracleAccount(
      provider,
      ORACLE_ADDRESS,
      SWITCHBOARD_ADDRESS
    );

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

    openRoundEventListener = await onAggregatorOpenRound(
      new JsonRpcProvider("wss://fullnode.devnet.sui.io:443"),
      async (e) => {
        console.log(e);
        try {
          const dataId = e.event.newObject.objectId;
          const result = await provider.getObject(dataId);
          const fields = getObjectFields(result);

          // only handle updates for this aggregator
          if (fields.oracle !== oracle.address) {
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
            const tx = await agg.saveResult(keypair, {
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
  } catch (e) {
    console.log("errored out from the start", e);
  }
})();

const x = setInterval(() => {}, 30000);
