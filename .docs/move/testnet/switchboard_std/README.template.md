<div align="center">

<!-- commonheader -->

<!-- commonheaderstop -->

# switchboard-move

> A Move module to interact with Switchboard V2 on Sui Testnet.

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
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "testnet" }
MoveStdlib = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/move-stdlib", rev = "testnet" }
SwitchboardStdLib = { git = "https://github.com/switchboard-xyz/sbv2-sui.git", subdir = "move/testnet/switchboard_std/", rev = "main"  }

[addresses]
package = "0x0"
std = "0x1"
sui =  "0x2"
switchboard =  "0x524c15a935d4c34474cdf2604ee42a6c47591d13c6ffb6b678f6b7eaffba12fe"
```

## Usage

<!-- usage -->

<!-- usagestop -->
