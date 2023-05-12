<div align="center">

<!-- commonheader -->

<!-- commonheaderstop -->

# switchboard-move

> A Move module to interact with Switchboard V2 on Sui Mainnet.

</div>

## Build

```bash
sui move compile
```

## Install

Add the following to your `Move.toml`.

```toml
[package]
name = "Package"
version = "0.0.1"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "mainnet" }
MoveStdlib = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/move-stdlib", rev = "mainnet" }
SwitchboardStdLib = { git = "https://github.com/switchboard-xyz/sbv2-sui.git", subdir = "move/mainnet/switchboard_std/", rev = "main"  }


[addresses]
package = "0x0"
std = "0x1"
sui =  "0x2"
switchboard =  "0x08d79f4d920b03d88faca1e421af023a87fbb1e4a6fd200248e6e9998d09e470"
```

## Usage

<!-- usage -->

<!-- usagestop -->
