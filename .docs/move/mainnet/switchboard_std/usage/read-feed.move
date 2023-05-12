use switchboard::aggregator;
use switchboard::math;

// store latest value
struct AggregatorInfo has store, key {
    id: UID,
    aggregator_addr: address,
    latest_result: u128,
    latest_result_scaling_factor: u8,
    latest_timestamp: u64,
}

// get latest value
public entry fun save_aggregator_info(
    feed: &Aggregator,
    ctx: &mut TxContext
) {
    let (latest_result, latest_timestamp) = aggregator::latest_value(feed);

    // get latest value
    let (value, scaling_factor, _neg) = math::unpack(latest_result);
    transfer::transfer(
        AggregatorInfo {
            id: object::new(ctx),
            latest_result: value,
            latest_result_scaling_factor: scaling_factor,
            aggregator_addr: aggregator::aggregator_address(feed),
            latest_timestamp,
        },
        tx_context::sender(ctx)
    );
}