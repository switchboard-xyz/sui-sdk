module switchboard_std::switchboard {
    use sui::transfer;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};

    const VERSION: u64 = 1;

    struct AdminCap has key {
        id: UID,
    }

    fun init(ctx: &mut TxContext) {
        let admin = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin, tx_context::sender(ctx));
    }

    public fun version(): u64 {
        VERSION
    }

}