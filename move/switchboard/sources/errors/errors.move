module switchboard::errors {
    
    public fun Generic(): u64 { 0 }

    public fun StateNotFound(): u64 { 1 }
    public fun QueueNotFound(): u64 { 2 }
    public fun OracleNotFound(): u64 { 3 }
    public fun JobNotFound(): u64 { 4 }
    public fun CrankNotFound(): u64 { 5 }
    public fun AggregatorNotFound(): u64 { 6 }
    public fun LeaseNotFound(): u64 { 7 }
    public fun OracleWalletNotFound(): u64 { 8 }

    public fun StateAlreadyExists(): u64 { 9 }
    public fun QueueAlreadyExists(): u64 { 10 }
    public fun OracleAlreadyExists(): u64 { 11 }
    public fun JobAlreadyExists(): u64 { 12 }
    public fun CrankAlreadyExists(): u64 { 13 }
    public fun AggregatorAlreadyExists(): u64 { 14 }
    public fun LeaseAlreadyExists(): u64 { 15 }
    public fun OracleWalletAlreadyExists(): u64 { 16 }

    public fun InvalidAuthority(): u64 { 17 }
    public fun PermissionDenied(): u64 { 18 }
    public fun CrankDisabled(): u64 { 19 }

    public fun OracleMismatch(): u64 { 20 }
    public fun JobsChecksumMismatch(): u64 { 21 }
    public fun OracleAlreadyResponded(): u64 { 22 }
    public fun InvalidArgument(): u64 { 23 }

    public fun CrankNotReady(): u64 { 24 }
    public fun CrankEmpty(): u64 { 25 }
    public fun LeaseInactive(): u64 { 26 }
    public fun AggregatorLocked(): u64 { 27 }
    
    public fun InsufficientCoin(): u64 { 28 }
    public fun LeaseInsufficientCoin(): u64 { 29 }
    public fun OracleWalletInsufficientCoin(): u64 { 30 }

    public fun AggregatorInvalidBatchSize(): u64 { 31 }
    public fun AggregatorInvalidMinOracleResults(): u64 { 32 }
    public fun AggregatorInvalidUpdateDelay(): u64 { 33 }
    public fun AggregatorIllegalRoundOpenCall(): u64 { 34 }
    public fun AggregatorInvalidMinJobs(): u64 { 35}
    public fun AggregatorQueueNotReady(): u64 { 36 }

    public fun ResourceAlreadyExists(): u64 { 37 }
    public fun PermissionAlreadyExists(): u64 { 38 }
}
