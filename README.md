# Sui Switchboard SDK

[![GitHub](https://img.shields.io/badge/--181717?logo=github&logoColor=ffffff)](https://github.com/switchboard-xyz/sbv2-sui)&nbsp;
[![twitter](https://badgen.net/twitter/follow/switchboardxyz)](https://twitter.com/switchboardxyz)&nbsp;&nbsp;

A library of utility functions to interact with Switchboard Modules on Sui

## Live Deployment:

Switchboard is live on devnet at `0x69da62384b7134af63bedeee615db9c4ce183b8f`. You can begin integrating the interface right away, but the deployment is actively being worked on. Interfaces are subject to change in the coming weeks as we iterate on the project.

## Install

```
npm i --save @switchboard-xyz/sui.js
```

## Creating Feeds

```ts
import { Buffer } from "buffer";
import { OracleJob, createFeed } from "@switchboard-xyz/sui.js";
import Big from "big.js";

// devnet address
const SWITCHBOARD_ADDRESS = "0x69da62384b7134af63bedeee615db9c4ce183b8f";
const QUEUE_ADDRESS = "0x4be684c370a3db8811125bd19096bc43ed0739ed";
const CRANK_ADDRESS = "0x69da62384b7134af63bedeee615db9c4ce183b8f";

// Make Job data for btc price
const serializedJob = Buffer.from(
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
    authority: USER_ADDRESS,
    queueAddress: QUEUE_ADDRESS,
    crankAddress: CRANK_ADDRESS,
    batchSize: 1,
    minJobResults: 1,
    minOracleResults: 1,
    minUpdateDelaySeconds: 5,
    startAfter: 0,
    varianceThreshold: new Big(0),
    forceReportPeriod: 0,
    expiration: 0,
    coinType: "0x2::sui::SUI",
    initialLoadAmount: 1,
    loadCoin: USER_COIN_OBJECT_ID,
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

console.log(`Created Aggregator address ${aggregator.address}.`);
```

### Reading Feeds

```ts
import { AggregatorAccount } from "@switchboard-xyz/sui.js";

const aggregatorAccount: AggregatorAccount = new AggregatorAccount(
  client,
  aggregator_address,
  SWITCHBOARD_ADDRESS
);

console.log(await aggregatorAccount.loadData());
```

# Sui

### Move.toml

```toml
[package]
name = "Package"
version = "0.0.1"

[dependencies]
MoveStdlib = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/deps/move-stdlib", rev = "devnet" }
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework", rev = "devnet" }
switchboard = { git = "https://github.com/switchboard-xyz/sbv2-sui.git", subdir = "move/switchboard/", rev = "main"  }

[addresses]
package = "0x0"
std = "0x1"
sui =  "0x2"
switchboard =  "0x8c8b750023fbd573955c431fb4395e7e396aaca3"
```

### Reading Feeds

```move
use switchboard::aggregator;
use switchboard::math;

// store latest value
struct AggregatorInfo has store, key {
    id: UID,
    aggregator_addr: address,
    latest_result: u128,
    latest_result_scaling_factor: u8,
    round_id: u128,
    latest_timestamp: u64,
}

// get latest value
public entry fun save_aggregator_info(
    feed: &Aggregator,
    ctx: &mut TxContext
) {
    let (latest_result, latest_timestamp, round_id) = aggregator::latest_value(feed);

    // get latest value
    let (value, scaling_factor, _neg) = math::unpack(latest_result);
    transfer::transfer(
        AggregatorInfo {
            id: object::new(ctx),
            latest_result: value,
            latest_result_scaling_factor: scaling_factor,
            aggregator_addr: aggregator::aggregator_address(feed),
            latest_timestamp,
            round_id,
        },
        tx_context::sender(ctx)
    );
}
```
