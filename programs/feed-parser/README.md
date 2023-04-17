<div align="center">
  <a href="#">
    <img height="170" src="https://github.com/switchboard-xyz/sbv2-core/raw/main/website/static/img/icons/switchboard/avatar.svg" />
  </a>

  <h1>sbv2-sui / feed-parser</h1>
  <p>An example contract reading the price of a Switchboard V2 data feed on-chain.</p>
  <p>
    <a href="https://discord.gg/switchboardxyz">
      <img alt="Discord" src="https://img.shields.io/discord/841525135311634443?color=blueviolet&logo=discord&logoColor=white">
    </a>
    <a href="https://twitter.com/switchboardxyz">
      <img alt="Twitter" src="https://img.shields.io/twitter/follow/switchboardxyz?label=Follow+Switchboard" />
    </a>
  </p>

  <h4>
    <strong>Sbv2 Sui SDK: </strong><a href="https://github.com/switchboard-xyz/sbv2-sui">github.com/switchboard-xyz/sbv2-sui</a>
  </h4>
</div>

## Usage

Build the example program

- deployed at [https://explorer.sui.io/object/0x744f0744f0a5f26afcc89bda6ad5af5e9e58df751f830be8be33945b40dbb175](https://explorer.sui.io/object/0x744f0744f0a5f26afcc89bda6ad5af5e9e58df751f830be8be33945b40dbb175)
- try it with a sample input BTC/USD feed (Aggregator address: 0x39d373d9df51d15fc0ed75b0dff7ae7f62cd148fe96343a900939cc34201cdfe)

```bash
sui move compile

# skip dependency verification because we're only pulling in a binding (not the full source)
sui client publish --gas-budget 100000000 --skip-dependency-verification
```
