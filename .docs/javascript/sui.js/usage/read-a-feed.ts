import { AggregatorAccount } from "@switchboard-xyz/sui.js";

const aggregatorAccount: AggregatorAccount = new AggregatorAccount(
  client,
  aggregator_address,
  SWITCHBOARD_ADDRESS
);

console.log(await aggregatorAccount.loadData());
