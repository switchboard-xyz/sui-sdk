<div align="center">

![Switchboard Logo](https://github.com/switchboard-xyz/sbv2-core/raw/main/website/static/img/icons/switchboard/avatar.png)

# Switchboard x Sui

> A collection of libraries and examples for interacting with Switchboard V2 on
> Sui.

[![NPM Badge](https://img.shields.io/github/package-json/v/switchboard-xyz/sbv2-sui?color=red&filename=javascript%2Fsui.js%2Fpackage.json&label=%40switchboard-xyz%2Fsui.js&logo=npm)](https://www.npmjs.com/package/@switchboard-xyz/sui.js)

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

## Addresses

The following addresses can be used with the Switchboard deployment on Sui

### Mainnet

| Account              | Address                                                              |
| -------------------- | -------------------------------------------------------------------- |
| Program ID           | `0xfd2e0f4383df3ec9106326dcd9a20510cdce72146754296deed15403fcd3df8b` |
| Program Authority    | `0xcf2d51b3ca8c23e0ba312392d213b1293a3121f691fa8e120f1a968fc2ad1c8b` |
| SwitchboardStdLib    | `0x08d79f4d920b03d88faca1e421af023a87fbb1e4a6fd200248e6e9998d09e470` |
| Permissioned Queue   | `0xea802bde1319363a27134a72a9d2f45e110fd60ef32ab2e10cdb06c973d6c64f` |
| Permissionless Queue | `0xe9324b82374f18d17de601ae5a19cd72e8c9f57f54661bf9e41a76f8948e80b5` |

### Testnet

| Account              | Address                                                              |
| -------------------- | -------------------------------------------------------------------- |
| Program ID           | `0x4247e72df58552701456293027e75237fe85a214cd050b6e0358dc5047a3fb17` |
| Program Authority    | `0xc9c8e0d738d7f090144847b38a8283fbe8050923875771b8c315a461721c04a4` |
| SwitchboardStdLib    | `0x98670585b87e06628ef2d7f7cb1e7bee8ada65b43b82997935225a7e6e21d18e` |
| Permissionless Queue | `0x955e87b8bf01e8f8a739e07c7556956108fa93aa02dae0b017083bfbe99cbd34` |

## Clients

| **Lang**   | **Name**                                                 | **Description**                                            |
| ---------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| Move       | [SwitchboardStd](move/mainnet/switchboard_std)           | A Move module to interact with Switchboard on Sui mainnet. |
| Move       | [SwitchboardStd (testnet)](move/testnet/switchboard_std) | A Move module to interact with Switchboard on Sui testnet. |
| Javascript | [@switchboard-xyz/sui.js](javascript/sui.js)             | A Typescript client to interact with Switchboard on Sui.   |

## Example Programs

| **Lang** | **Name**                                              | **Description**                         |
| -------- | ----------------------------------------------------- | --------------------------------------- |
| Move     | [feed-parser](programs/mainnet/feed-parser)           | Read a Switchboard feed on Sui"         |
| Move     | [feed-parser (testnet)](programs/testnet/feed-parser) | Read a Switchboard feed on Sui testnet" |

## Troubleshooting

1. File a [GitHub Issue](https://github.com/switchboard-xyz/sbv2-sui/issues/new)
2. Ask a question in
   [Discord #dev-support](https://discord.com/channels/841525135311634443/984343400377647144)
