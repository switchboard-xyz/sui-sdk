module switchboard_feed_parser::switchboard_feed_parser {
    use switchboard::aggregator::{Self, Aggregator}; // For reading aggregators
    use switchboard::math;
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID};
    use sui::transfer;
    
    const EAGGREGATOR_INFO_EXISTS:u64 = 0;
    const ENO_AGGREGATOR_INFO_EXISTS:u64 = 1;

    /*
      Num 
      {
        neg: bool,   // sign
        dec: u8,     // scaling factor
        value: u128, // value
      }

      where decimal = neg * value * 10^(-1 * dec) 
    */
    struct AggregatorInfo has store, key {
        id: UID,
        aggregator_addr: address,
        latest_result: u128,
        latest_result_scaling_factor: u8,
        round_id: u128,
        latest_timestamp: u64,
    }

    // add AggregatorInfo resource with latest value + aggregator address
    public entry fun log_aggregator_info(
        feed: &Aggregator, 
        ctx: &mut TxContext
    ) {       
        let (latest_result, latest_timestamp, round_id) = aggregator::latest_value(feed);
        
        // get latest value 
        let (value, scaling_factor, _neg) = math::unpack(latest_result); 
        transfer::transfer(
            AggregatorInfo {
                id: object::new(ctx),
                latest_result: value,
                latest_result_scaling_factor: scaling_factor,
                aggregator_addr: aggregator::aggregator_address(feed),
                latest_timestamp,
                round_id,
            }, 
            tx_context::sender(ctx)
        );
    }
}
