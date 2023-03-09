module switchboard::aggregator {
    use switchboard::math::{SwitchboardDecimal};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::dynamic_object_field;

    struct Aggregator has key {
        id: UID,

        // Aggregator Config Data
        authority: address, 
        queue_addr: address,
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

        // created at timestamp seconds
        created_at: u64,

        // Aggregator Read Configs
        read_charge: u64,
        reward_escrow: address,
        read_whitelist: vector<address>,
        limit_reads_to_whitelist: bool,

        // Aggregator Update Data
        update_data: SlidingWindow,

        // Interval / Payout Data
        interval_id: u64,
        curr_interval_payouts: u64,
        next_interval_refresh_time: u64,

        // DYNAMIC FIELDS -----
        // b"history": AggregatorHistoryData,
        // b"jobs_data": AggregatorJobData 
    }

    struct SlidingWindowElement has store, drop {
        oracle_key: address,
        value: SwitchboardDecimal,
        timestamp: u64
    }

    struct SlidingWindow has key, store {
        id: UID,
        data: vector<SlidingWindowElement>,
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
    }

    struct AggregatorJobData has key, store {
        id: UID,
        job_keys: vector<address>,
        job_weights: vector<u8>,
        jobs_checksum: vector<u8>,
    }

    struct Authority has key, store {
        id: UID,
        aggregator_address: address,
    }
    
    // --- Initialization
    fun init(_ctx: &mut TxContext) {}


    public fun share_aggregator(aggregator: Aggregator) {
        transfer::share_object(aggregator);
    }

    public fun latest_value(aggregator: &Aggregator): (SwitchboardDecimal, u64) {
        (
            aggregator.update_data.latest_result, 
            aggregator.update_data.latest_timestamp,
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
}