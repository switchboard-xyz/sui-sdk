<div align="center">
  <a href="#">
    <img height="170" src="https://github.com/switchboard-xyz/sbv2-core/raw/main/website/static/img/icons/switchboard/avatar.svg" />
  </a>

  <h1>@switchboard-xyz/sui.js</h1>

  <p>A Typescript client to interact with Switchboard V2 on Sui.</p>

  <p>
	  <a href="https://www.npmjs.com/package/@switchboard-xyz/sui.js">
      <img alt="NPM Badge" src="https://img.shields.io/github/package-json/v/switchboard-xyz/sbv2-sui?color=red&filename=javascript%2Fsui.js%2Fpackage.json&label=%40switchboard-xyz%2Fsui.js&logo=npm">
    </a>
  </p>

  <p>
    <a href="https://discord.gg/switchboardxyz">
      <img alt="Discord" src="https://img.shields.io/discord/841525135311634443?color=blueviolet&logo=discord&logoColor=white">
    </a>
    <a href="https://twitter.com/switchboardxyz">
      <img alt="Twitter" src="https://img.shields.io/twitter/follow/switchboardxyz?label=Follow+Switchboard" />
    </a>
  </p>

  <h4>
    <strong>Npm: </strong><a href="https://www.npmjs.com/package/@switchboard-xyz/sui.js">npmjs.com/package/@switchboard-xyz/sui.js</a>
  </h4>
  <h4>
    <strong>Typedocs: </strong><a href="https://docs.switchboard.xyz/api/@switchboard-xyz/sui.js">docs.switchboard.xyz/api/@switchboard-xyz/sui.js</a>
  </h4>
  <h4>
    <strong>Sbv2 Sui SDK: </strong><a href="https://github.com/switchboard-xyz/sbv2-sui">github.com/switchboard-xyz/sbv2-sui</a>
  </h4>
</div>

## Install

```bash
npm i --save @switchboard-xyz/sui.js
```

## Usage

### Creating Feeds

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
