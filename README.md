<div align="center">
  <a href="#">
    <img src="https://github.com/switchboard-xyz/sbv2-core/raw/main/website/static/img/icons/switchboard/avatar.png" />
  </a>

  <h1>Switchboard V2</h1>

  <p>A collection of libraries and examples for interacting with Switchboard V2 on Sui.</p>

  <p>
	  <a href="https://www.npmjs.com/package/@switchboard-xyz/sui.js">
      <img alt="NPM Badge" src="https://img.shields.io/github/package-json/v/switchboard-xyz/sbv2-sui?color=red&filename=javascript%2Fsui.js%2Fpackage.json&label=%40switchboard-xyz%2Fsui.js&logo=npm" />
    </a>
  </p>

  <p>
    <a href="https://discord.gg/switchboardxyz">
      <img alt="Discord" src="https://img.shields.io/discord/841525135311634443?color=blueviolet&logo=discord&logoColor=white" />
    </a>
    <a href="https://twitter.com/switchboardxyz">
      <img alt="Twitter" src="https://img.shields.io/twitter/follow/switchboardxyz?label=Follow+Switchboard" />
    </a>
  </p>

  <h4>
    <strong>Documentation: </strong><a href="https://docs.switchboard.xyz">docs.switchboard.xyz</a>
  </h4>
</div>

## Getting Started

To get started, clone the
[sbv2-sui](https://github.com/switchboard-xyz/sbv2-sui) repository.

```bash
git clone https://github.com/switchboard-xyz/sbv2-sui
```

Then install the dependencies

```bash
cd sbv2-sui
pnpm install
```

## Program IDs

| **Network** | **Program ID**                                                       |
| ----------- | -------------------------------------------------------------------- |
| mainnet     | `0xfd2e0f4383df3ec9106326dcd9a20510cdce72146754296deed15403fcd3df8b` |
| testnet     | `0x271beaa1f36bf8812a778f0df5a7a9f67a757008512096862a128c42923671e2` |

See [switchboard.xyz/explorer](https://staging.app.switchboard.xyz/sui/mainnet) for a list of
feeds deployed on Sui.

See [app.switchboard.xyz](https://staging.app.switchboard.xyz/build/feed) to create your own Sui
feeds.

## Libraries

| **Lang**       | **Name**                                                                                                                                                                                    | **Description**                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Move [Mainnet] | [switchboard](/move/mainnet/switchboard_std/)                                                                                                                                               | Move module to deserialize and read Switchboard data feeds on sui mainnet |
| Move [Testnet] | [switchboard](/move/testnet/switchboard_std/)                                                                                                                                               | Move module to deserialize and read Switchboard data feeds on sui testnet |
| JS             | [@switchboard-xyz/sui.js](/javascript/sui.js/) <br />[[npmjs](https://www.npmjs.com/package/@switchboard-xyz/sui.js), [Typedocs](https://docs.switchboard.xyz/api/@switchboard-xyz/sui.js)] | Typescript package to interact with Switchboard V2                        |

## Example Programs

- [feed-parser-mainnet](/programs/mainnet/feed-parser/): Read a Switchboard feed on Sui Mainnet
- [feed-parser-testnet](/programs/testnet/feed-parser/): Read a Switchboard feed on Sui Testnet

## Troubleshooting

1. File a [GitHub Issue](https://github.com/switchboard-xyz/sbv2-sui/issues/new)
2. Ask a question in
   [Discord #dev-support](https://discord.com/channels/841525135311634443/984343400377647144)
