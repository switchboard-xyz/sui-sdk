/**
 * This example shows how to listen to all events on Sui
 */
import { SuiEvent, EventCallback } from "../src/sbv2";
import { Ed25519Keypair, JsonRpcProvider, Connection } from "@mysten/sui.js";

import { SWITCHBOARD_ADDRESS, RPC, WSS } from "./common";

async function allUpdatesListener(
  provider: JsonRpcProvider,
  callback: EventCallback
): Promise<SuiEvent> {
  const event = new SuiEvent(provider);
  await event.onTrigger(callback, (e) => {
    console.error(e);
  });
  return event;
}

// run it all at once
(async () => {
  try {
    const connection = new Connection({
      websocket: WSS,
      fullnode: RPC,
    });
    // connect to Devnet
    const provider = new JsonRpcProvider(connection);
    let keypair: Ed25519Keypair | null = null;

    await allUpdatesListener(provider, async (e) => {
      console.log(e);
    });
  } catch (e) {
    console.error(e);
  }
})();
