module switchboard::aggregator {
    use switchboard::math::{Self, SwitchboardDecimal};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::dynamic_object_field;
    use std::vector;

    struct Aggregator has key {
        id: UID,

        // Aggregator Config Data
        authority: address, 
        queue_addr: address,
        crank_addr: address,
        batch_size: u64,
        min_oracle_results: u64,
        min_update_delay_seconds: u64,
        is_locked: bool,

        // Aggregator Optional Configs
        name: vector<u8>,
        metadata: vector<u8>,
        history_limit: u64,
        variance_threshold: SwitchboardDecimal,
        force_report_period: u64,
        min_job_results: u64,
        expiration: u64,
        start_after: u64,
        crank_disabled: bool,

        // Aggregator State
        crank_row_count: u64,
        next_allowed_update_time: u64,
        consecutive_failure_count: u64,

        // created at timestamp seconds
        created_at: u64,

        // Aggregator Read Configs
        read_charge: u64,
        reward_escrow: address,
        read_whitelist: vector<address>,
        limit_reads_to_whitelist: bool,

        // Aggregator Update Data
        update_data: SlidingWindow,

        // DYNAMIC FIELDS -----
        // b"history": AggregatorHistoryData,
        // b"jobs_data": AggregatorJobData 
    }

    struct SlidingWindowElement has store, drop {
        oracle_key: address,
        value: SwitchboardDecimal,
        rid: u128, // round id this update was assigned
        timestamp: u64
    }

    struct SlidingWindow has key, store {
        id: UID,
        data: vector<SlidingWindowElement>,
        rid: u128, // latest round id
        latest_result: SwitchboardDecimal,
        latest_timestamp: u64,
    }

    struct AggregatorHistoryData has key, store {
        id: UID,
        data: vector<AggregatorHistoryRow>,
        history_write_idx: u64,
    }

    struct AggregatorHistoryRow has drop, copy, store {
        value: SwitchboardDecimal,
        timestamp: u64,
        round_id: u128,
    }

    struct AggregatorJobData has key, store {
        id: UID,
        job_keys: vector<address>,
        job_weights: vector<u8>,
        jobs_checksum: vector<u8>,
    }

    struct AggregatorRoundCap has key, store {
        id: UID,
        rid: u128,
        aggregator: address,
        oracle: address,
        jobs_checksum: vector<u8>,
    }

    struct AggregatorResult has key {
        id: UID,
        aggregator: address,
        timestamp: u64,
        result: SwitchboardDecimal,
        rid: u128,
        oracle: address,
    }

    // --- Initialization
    fun init(_ctx: &mut TxContext) {}

    public(friend) fun new(
        name: vector<u8>,
        metadata: vector<u8>,
        queue_addr: address,
        crank_addr: address,
        batch_size: u64,
        min_oracle_results: u64,
        min_job_results: u64,
        min_update_delay_seconds: u64,
        start_after: u64,
        variance_threshold: SwitchboardDecimal,
        force_report_period: u64,
        expiration: u64,
        disable_crank: bool,
        history_limit: u64,
        read_charge: u64,
        reward_escrow: address,
        read_whitelist: vector<address>,
        limit_reads_to_whitelist: bool,
        created_at: u64,
        authority: address,
        ctx: &mut TxContext
    ): Aggregator {
        let id = object::new(ctx);
        
        let history_id = object::new(ctx);
        dynamic_object_field::add(&mut id, b"history", AggregatorHistoryData {
            id: history_id,
            data: vector::empty(),
            history_write_idx: 0,
        });
        let job_data_id = object::new(ctx);
        dynamic_object_field::add(&mut id, b"job_data", AggregatorJobData {
            id: job_data_id,
            job_keys: vector::empty(),
            job_weights: vector::empty(),
            jobs_checksum: vector::empty(),
        });

        Aggregator {
            id,
            authority, 
            queue_addr,
            crank_addr,
            batch_size,
            min_oracle_results,
            min_update_delay_seconds,
            is_locked: false,
            name,
            metadata,
            history_limit,
            variance_threshold,
            force_report_period,
            min_job_results,
            expiration,
            start_after,
            crank_disabled: disable_crank,
            crank_row_count: 0,
            next_allowed_update_time: 0,
            consecutive_failure_count: 0,
            read_charge,
            reward_escrow,
            read_whitelist,
            limit_reads_to_whitelist,
            created_at,
            update_data: SlidingWindow {
                id: object::new(ctx),
                data: vector::empty(),
                rid: 0,
                latest_timestamp: created_at,
                latest_result: math::zero(),
            }
        }
    }

    public fun share_aggregator(aggregator: Aggregator) {
        transfer::share_object(aggregator);
    }

    public fun share_aggregator_result(result: AggregatorResult) {
        transfer::share_object(result);
    }

    public fun latest_value(aggregator: &Aggregator): (SwitchboardDecimal, u64, u128) {
        (
            aggregator.update_data.latest_result, 
            aggregator.update_data.latest_timestamp,
            aggregator.update_data.rid
        )
    }

    public fun batch_size(aggregator: &Aggregator): u64 {
        aggregator.batch_size
    }

    public fun min_oracle_results(aggregator: &Aggregator): u64 {
        aggregator.min_oracle_results
    }

    public fun can_open_round(aggregator: &Aggregator, now: u64): bool {
        now >= aggregator.start_after &&
        now >= aggregator.next_allowed_update_time
    }

    public fun has_authority(aggregator: &Aggregator, ctx: &TxContext): bool {
        aggregator.authority == tx_context::sender(ctx)
    }

    public fun queue_address(aggregator: &Aggregator): address {
        aggregator.queue_addr
    }

    public fun crank_address(aggregator: &Aggregator): address {
        aggregator.crank_addr
    }

    public fun is_locked(aggregator: &Aggregator): bool {
        aggregator.is_locked
    }

    public fun job_keys(aggregator: &Aggregator): vector<address> {
        let job_data = dynamic_object_field::borrow<vector<u8>, AggregatorJobData>(&aggregator.id, b"job_data");
        job_data.job_keys
    }

    public fun aggregator_address(aggregator: &Aggregator): address {
        object::uid_to_address(&aggregator.id)
    }
    
    public fun crank_disabled(aggregator: &Aggregator): bool {
        aggregator.crank_disabled
    }

    public fun crank_row_count(aggregator: &Aggregator): u64 {
        aggregator.crank_row_count
    }

    public fun cap_belongs_to_aggregator(aggregator: &Aggregator, cap: &AggregatorRoundCap): bool {
        aggregator_address(aggregator) == cap.aggregator
    }

    public fun read_aggregator_result(result: &AggregatorResult): (
        u128,
        SwitchboardDecimal,
        u64,
        address
    ) {
        (
            result.rid,
            result.result,
            result.timestamp,
            result.oracle
        )
    }

    public fun rid(aggregator: &Aggregator): u128 {
        aggregator.update_data.rid
    }
}