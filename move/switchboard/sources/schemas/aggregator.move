module switchboard::aggregator {
    use switchboard::math::{Self, SwitchboardDecimal};
    use switchboard::job::{Self, Job};
    use switchboard::errors;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::dynamic_object_field;
    use sui::bag::{Self, Bag};
    use sui::clock::{Self, Clock};
    use std::vector;
    
    friend switchboard::create_feed_action;
    friend switchboard::aggregator_init_action;
    friend switchboard::aggregator_open_interval_action;
    friend switchboard::aggregator_add_job_action;
    friend switchboard::aggregator_remove_job_action;
    friend switchboard::aggregator_set_configs_action;
    friend switchboard::aggregator_save_result_action;
    friend switchboard::aggregator_escrow_deposit_action;
    friend switchboard::aggregator_escrow_withdraw_action;
    friend switchboard::oracle_token_withdraw_action;
    friend switchboard::aggregator_lock_action;
    friend switchboard::aggregator_set_authority_action;
    friend switchboard::aggregator_fast_save_result_action;
    friend switchboard::crank_push_action;

    // [SHARED]
    struct Aggregator has key {
        id: UID,

        // Aggregator Config Data
        authority: address, 
        queue_addr: address,
        token_addr: address,
        batch_size: u64,
        min_oracle_results: u64,
        min_update_delay_seconds: u64,

        // Aggregator Optional Configs
        name: vector<u8>,
        history_limit: u64,
        variance_threshold: SwitchboardDecimal,
        force_report_period: u64,
        min_job_results: u64,
        crank_disabled: bool,
        crank_row_count: u8,

        // Aggregator State
        next_allowed_update_time: u64,

        // Created-at timestamp (seconds)
        created_at: u64,

        // Aggregator Read Configs
        read_charge: u64,
        reward_escrow: address,
        read_whitelist: Bag,
        limit_reads_to_whitelist: bool,

        // Aggregator Update Data
        update_data: SlidingWindow,

        // Interval / Payout Data
        interval_id: u64,
        curr_interval_payouts: u64,
        next_interval_refresh_time: u64,

        // Leases
        escrows: Bag,

        // DYNAMIC FIELDS -----
        // b"history": AggregatorHistoryData,
        // b"jobs_data": AggregatorJobData 
    }

    // [IMMUTABLE] Aggregator Config that's submitted for immutable updates
    struct AggregatorToken has key {
        id: UID,
        aggregator_addr: address,
        queue_addr: address,
        batch_size: u64,
        min_oracle_results: u64,
        min_update_delay_seconds: u64,
        created_at: u64,
        read_charge: u64,
        reward_escrow: address,
        read_whitelist: Bag,
        limit_reads_to_whitelist: bool,
    }

    // [IMMUTABLE] Results are immutable updates for each interval - the medianized result of AggregatorUpdates
    struct Result has key {
        id: UID,
        aggregator_addr: address,
        values: SlidingWindow,
        timestamp: u64,
        parent: address,
    }

    struct SlidingWindowElement has store, drop, copy {
        oracle_addr: address,
        value: SwitchboardDecimal,
        timestamp: u64
    }
    
    // [IMMUTABLE / SHARED] - shared within the Aggregator, immutable for the Result
    struct SlidingWindow has copy, store {
        data: vector<SlidingWindowElement>,
        latest_result: SwitchboardDecimal,
        latest_timestamp: u64,
    }

    // [SHARED]
    struct AggregatorHistoryData has key, store {
        id: UID,
        data: vector<AggregatorHistoryRow>,
        history_write_idx: u64,
    }

    struct AggregatorHistoryRow has drop, copy, store {
        value: SwitchboardDecimal,
        timestamp: u64,
    }

    // [SHARED]
    struct AggregatorJobData has key, store {
        id: UID,
        job_keys: vector<address>,
        job_weights: vector<u8>,
        jobs_checksum: vector<u8>,
    }

    // [OWNED]
    struct Authority has key, store {
        id: UID,
        aggregator_address: address,
    }
    
    // --- Initialization
    fun init(_ctx: &mut TxContext) {}

  
    public fun share_aggregator(aggregator: Aggregator) {
        transfer::share_object(aggregator);
    }
    

    public fun freeze_result(result: Result) {
        transfer::freeze_object(result);
    }

    public fun latest_value(aggregator: &Aggregator): (SwitchboardDecimal, u64) {
        assert!(aggregator.read_charge == 0, errors::PermissionDenied());
        (
            aggregator.update_data.latest_result, 
            aggregator.update_data.latest_timestamp,
        )
    }

    // get the latest result
    // and latest timestamp
    public fun result_data(
        result: &Result, // [immutable] update result
        aggregator: &AggregatorToken, // [immutable] aggregator config data
        clock: &Clock, // [shared] clock
        max_result_age_seconds: u64, // max result age
        ctx: &TxContext 
    ): (SwitchboardDecimal, u64) {
        assert!(
            aggregator.read_charge == 0 && aggregator.limit_reads_to_whitelist == false || 
            bag::contains(&aggregator.read_whitelist, tx_context::sender(ctx)), 
            errors::PermissionDenied()
        );
        assert!(
            result.aggregator_addr == aggregator.aggregator_addr,
            errors::InvalidArgument()
        );
        let length = vector::length(&result.values.data);
        assert!(length < aggregator.batch_size, errors::InvalidArgument());

        // make sure that every result is max age seconds old
        let i = 0;
        while (i < length) {
            let time_diff = (clock::timestamp_ms(clock) / 1000) - vector::borrow(&result.values.data, i).timestamp;
            assert!(
                time_diff < max_result_age_seconds,
                errors::InvalidArgument()
            );
            i = i + 1;
        };
        (
            result.values.latest_result, 
            result.values.latest_timestamp,
        )
    }

    public fun batch_size(aggregator: &Aggregator): u64 {
        aggregator.batch_size
    }

    public fun min_oracle_results(aggregator: &Aggregator): u64 {
        aggregator.min_oracle_results
    }

    public fun can_open_round(aggregator: &Aggregator, now: u64): bool {
        now >= aggregator.next_allowed_update_time
    }

    public fun authority(aggregator: &Aggregator): address {
        aggregator.authority
    }

    public fun has_authority(aggregator: &Aggregator, ctx: &TxContext): bool {
        aggregator.authority == tx_context::sender(ctx)
    }

    public fun authority_is_for_aggregator(authority: &Authority, aggregator: &Aggregator): bool {
        return aggregator_address(aggregator) == authority.aggregator_address
    }

    public fun queue_address(aggregator: &Aggregator): address {
        aggregator.queue_addr
    }

    public fun is_locked(aggregator: &Aggregator): bool {
        aggregator.authority == @0x0
    }

    public fun job_keys(aggregator: &Aggregator): vector<address> {
        let job_data = dynamic_object_field::borrow<vector<u8>, AggregatorJobData>(&aggregator.id, b"job_data");
        job_data.job_keys
    }

    public fun aggregator_address(aggregator: &Aggregator): address {
        object::uid_to_address(&aggregator.id)
    }

    public fun aggregator_token_address(token: &AggregatorToken): address {
        object::uid_to_address(&token.id)
    }

    public fun result_address(result: &Result): address {
        object::uid_to_address(&result.id)
    }
    
    public fun crank_disabled(aggregator: &Aggregator): bool {
        aggregator.crank_disabled
    }

    public fun curr_interval_payouts(aggregator: &Aggregator): u64 {
        aggregator.curr_interval_payouts
    }

    public fun interval_id(aggregator: &Aggregator): u64 {
        aggregator.interval_id
    }

    public fun crank_row_count(aggregator: &Aggregator): u8 {
        aggregator.crank_row_count
    }

    public fun created_at(aggregator: &Aggregator): u64 {
        aggregator.created_at
    }

    public fun aggregator_token_data(aggregator_token: &AggregatorToken): (
        address,
        address,
        u64,
        u64,
        u64,
        u64,
    ) {
        (
            aggregator_token.aggregator_addr,
            aggregator_token.queue_addr,
            aggregator_token.batch_size,
            aggregator_token.min_oracle_results,
            aggregator_token.min_update_delay_seconds,
            aggregator_token.created_at,
        )
    }

    public fun freeze_aggregator_token(
        aggregator_token: AggregatorToken
    ) {
        transfer::freeze_object(aggregator_token);
    }


}