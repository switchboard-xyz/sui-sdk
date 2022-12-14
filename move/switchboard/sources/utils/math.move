module switchboard::math {
    use switchboard::vec_utils;
    use std::vector;

    const EINCORRECT_STD_DEV: u64 = 0;
    const ENO_LENGTH_PASSED_IN_STD_DEV: u64 = 1;
    const EMORE_THAN_9_DECIMALS: u64 = 2;
    const EINPUT_TOO_LARGE: u64 = 3;

    const MAX_DECIMALS: u8 = 9;
    const POW_10_TO_MAX_DECIMALS: u128 = 1000000000;
    const U128_MAX: u128 = 340282366920938463463374607431768211455;
    const MAX_VALUE_ALLOWED: u128 = 340282366920938463463374607431;

    struct SwitchboardDecimal has copy, drop, store { value: u128, dec: u8, neg: bool }

    public fun max_u128(): u128 {
        U128_MAX
    }

    public fun new(value: u128, dec: u8, neg: bool): SwitchboardDecimal {
        assert!(
            dec <= MAX_DECIMALS,
            EMORE_THAN_9_DECIMALS
        );
        let num = SwitchboardDecimal { value, dec, neg };

        // expand nums out 
        num.value = scale_to_decimals(&num, MAX_DECIMALS);
        num.dec = MAX_DECIMALS;

        num
    }

    public fun pow(base: u64, exp: u8): u128 {
        let result_val = 1u128;
        let i = 0;
        while (i < exp) {
            result_val = result_val * (base as u128);
            i = i + 1;
        };
        result_val
    }

    public fun unpack(num: SwitchboardDecimal): (u128, u8, bool) {
        let SwitchboardDecimal { value, dec, neg } = num;
        (value, dec, neg)
    }

    fun max(a: u8, b: u8): u8 {
        if (a > b) a else b
    }

    fun min(a: u8, b: u8): u8 {
        if (a > b) b else a
    }

    // abs(a - b)
    fun sub_abs_u8(a: u8, b: u8): u8 {
        if (a > b) {
            a - b
        } else {
            b - a
        }
    }

    public fun zero(): SwitchboardDecimal {
      SwitchboardDecimal {
        value: 0,
        dec: 0,
        neg: false
      }
    }

    public fun median(v: &mut vector<SwitchboardDecimal>): SwitchboardDecimal {
        let size = vector::length(v);
        if (size % 2 == 0) {
            let result = zero();
            let lower_idx = little_floyd_rivest(v, size / 2, 0, size - 1);
            let upper_idx = little_floyd_rivest(v, (size / 2) - 1, 0, size - 1);
            let sum = add(&lower_idx, &upper_idx);
            div(&sum, &new(2, 0, false), &mut result);
            result
        } else {
            little_floyd_rivest(v, size / 2, 0, size - 1)
        }
        
    }

    public fun std_deviation(medians: &vector<SwitchboardDecimal>, median: &SwitchboardDecimal): SwitchboardDecimal {

        // length of decimals
        let length = vector::length<SwitchboardDecimal>(medians);

        // check that there are medians passed in
        assert!(length != 0, ENO_LENGTH_PASSED_IN_STD_DEV);

        // zero out response
        let res = zero();
        let distance = zero();
        let variance = zero();

        let i = 0;
        while (i < length) {

            // get median i
            let median_i = vector::borrow<SwitchboardDecimal>(medians, i);

            // subtract the median from the result
            distance = sub(median_i, median);

            // handle overflows
            let skip = will_multiplication_overflow(distance.value, distance.value);
            if (skip) {
                i = i + 1;
                continue
            };

            // square res (copies on each operation)
            mul(
                &distance, 
                &distance,
                &mut variance
            );

            // add distance to res, write it to distance
            distance = add(&res, &variance);

            res.value = distance.value;
            res.dec = distance.dec;
            res.neg = distance.neg;

            // iterate
            i = i + 1;
        };

        // divide by length
        div(&res, &new((length as u128), 0, false), &mut distance);

        // get sqrt
        sqrt(&distance, &mut res);

        res
    }

    public fun will_multiplication_overflow(a: u128, b: u128): bool {
       b > 0 && a > MAX_VALUE_ALLOWED / b
    }

    public fun sort(v: &vector<SwitchboardDecimal>): vector<SwitchboardDecimal> {
        let size = vector::length(v);
        let alloc = vector::empty();
        if (size <= 1) {
            return *v
        };

        let (left, right) = vec_utils::esplit(v);
        let left = sort(&left);
        let right = sort(&right);
   

        loop {
            let left_len = vector::length<SwitchboardDecimal>(&left);
            let right_len = vector::length<SwitchboardDecimal>(&right);
            if (left_len != 0 && right_len != 0) {
                if (gt(vector::borrow<SwitchboardDecimal>(&right, 0), vector::borrow<SwitchboardDecimal>(&left, 0))) {
                   vector::push_back<SwitchboardDecimal>(&mut alloc, vector::remove<SwitchboardDecimal>(&mut left, 0));
                } else {
                    vector::push_back<SwitchboardDecimal>(&mut alloc, vector::remove<SwitchboardDecimal>(&mut right, 0));
                }
            } else if (left_len != 0) {
                vector::push_back<SwitchboardDecimal>(&mut alloc, vector::remove<SwitchboardDecimal>(&mut left, 0));
            } else if (right_len != 0) {
                vector::push_back<SwitchboardDecimal>(&mut alloc, vector::remove<SwitchboardDecimal>(&mut right, 0));
            } else {
                return alloc
            };
        }
    }

    public fun insertion_sort(v: &mut vector<SwitchboardDecimal>) {
        let length = vector::length(v);
        let i = 1;
        while (i < length) {
            let key = *vector::borrow<SwitchboardDecimal>(v, i);
            let j = i - 1;
            let cont = true;
            while (j >= 0 && cont && gt(vector::borrow<SwitchboardDecimal>(v, j), &key)) {
                
                 *vector::borrow_mut<SwitchboardDecimal>(v, j + 1) = *vector::borrow<SwitchboardDecimal>(v, j);
                 if (j == 0) {
                    cont = false;
                 } else {
                    j = j - 1;
                 }
            };  

            let swap_idx = if (!cont) {
                0
            } else {
                j + 1
            };
            
            *vector::borrow_mut<SwitchboardDecimal>(v, swap_idx) = key;

            i = i + 1;
        }; 
    }

    // By reference 

    fun abs_gt(val1: &SwitchboardDecimal, val2: &SwitchboardDecimal): bool {
        val1.value > val2.value
    }

    fun abs_lt(val1: &SwitchboardDecimal, val2: &SwitchboardDecimal): bool {
        val1.value < val2.value
    }

    public fun add(val1: &SwitchboardDecimal, val2: &SwitchboardDecimal): SwitchboardDecimal {
        // -x + -y
        if (val1.neg && val2.neg) {
            let sum = add_internal(val1, val2);
            sum.neg = true;
            sum
        // -x + y
        } else if (val1.neg) {
            sub_internal(val2, val1)
            
        // x + -y
        } else if (val2.neg) {
            sub_internal(val1, val2)

        // x + y
        } else {
            add_internal(val1, val2)
        }
    }

    fun add_internal(val1: &SwitchboardDecimal, val2: &SwitchboardDecimal): SwitchboardDecimal {
        new(val1.value + val2.value, MAX_DECIMALS, false)
    }

    public fun sub(val1: &SwitchboardDecimal, val2: &SwitchboardDecimal): SwitchboardDecimal {
        // -x - -y
        if (val1.neg && val2.neg) {
            let sum = add_internal(val1, val2);
            sum.neg = abs_gt(val1, val2);
            sum
        // -x - y
        } else if (val1.neg) {
            let sum = add_internal(val1, val2);
            sum.neg = true;
            sum
        // x - -y
        } else if (val2.neg) {
            add_internal(val1, val2)

         // x - y
        } else {
            sub_internal(val1, val2)
        }
    }

    fun sub_internal(val1: &SwitchboardDecimal, val2: &SwitchboardDecimal): SwitchboardDecimal {
        if (val2.value > val1.value) {
            new(val2.value - val1.value, MAX_DECIMALS, true)
        } else {
            new(val1.value - val2.value, MAX_DECIMALS, false)
        }
    }


    public fun mul(val1: &SwitchboardDecimal, val2: &SwitchboardDecimal, out: &mut SwitchboardDecimal) {
        let neg = !((val1.neg && val2.neg) || (!val1.neg && !val2.neg));
        mul_internal(val1, val2, out);
        out.neg = neg;
    }

    fun mul_internal(val1: &SwitchboardDecimal, val2: &SwitchboardDecimal, out: &mut SwitchboardDecimal) {
        let multiplied = val1.value * val2.value;
        let new_decimals = val1.dec + val2.dec;
        let multiplied_scaled = if (new_decimals < MAX_DECIMALS) {
            let decimals_underflow = MAX_DECIMALS - new_decimals;
            multiplied * pow_10(decimals_underflow)
        } else if (new_decimals > MAX_DECIMALS) {
            let decimals_overflow = new_decimals - MAX_DECIMALS;
            multiplied / pow_10(decimals_overflow)
        } else {
            multiplied
        };

        out.value = multiplied_scaled;
        out.dec = MAX_DECIMALS;
        out.neg = false;
    }

    // babylonian
    public fun sqrt(num: &SwitchboardDecimal, out: &mut SwitchboardDecimal) {
        let y = num;

        // z = y
        out.value = y.value;
        out.neg = y.neg;
        out.dec = y.dec;

        // intermediate variables for outputs
        let out1 = zero();
        let two = new(2, 0, false);
        let one = new(1, 0, false);

        // x = y / 2 + 1
        div(y, &two, &mut out1);
        let x = add(&out1, &one);

        // x < z && x != y
        while (gt(out, &x) && x.value != 0 || equals(&x, y)) {
            out.value = x.value;
            out.dec = x.dec;
            out.neg = x.neg; 

            // x = (x + (y / x))) * 0.5
            div(y, &x, &mut out1);
            let out2 = add(&out1, &x);
            div(&out2, &two, &mut x);
        }
    }

    public fun normalize(num: &mut SwitchboardDecimal) {
        while (num.value % 10 == 0 && num.dec > 0) {
            num.value = num.value / 10;
            num.dec = num.dec - 1;
        };
    }

    public fun div(val1: &SwitchboardDecimal, val2: &SwitchboardDecimal, out: &mut SwitchboardDecimal) {
        let neg = !((val1.neg && val2.neg) || (!val1.neg && !val2.neg));
        let num1_scaled_with_overflow = val1.value * POW_10_TO_MAX_DECIMALS;
        out.value = num1_scaled_with_overflow / val2.value;
        out.dec = MAX_DECIMALS;
        out.neg = neg;
    }

    public fun gt(val1: &SwitchboardDecimal, val2: &SwitchboardDecimal): bool {
        if (val1.neg && val2.neg) {
            return val1.value < val2.value
        } else if (val1.neg) {
            return false
        } else if (val2.neg) {
            return true
        };
        val1.value > val2.value
    }

    public fun lt(val1: &SwitchboardDecimal, val2: &SwitchboardDecimal): bool {
       if (val1.neg && val2.neg) {
            return val1.value > val2.value
        } else if (val1.neg) {
            return true
        } else if (val2.neg) {
            return false
        };
        val1.value < val2.value
    }

    public fun gte(val1: &SwitchboardDecimal, val2: &SwitchboardDecimal): bool {
        if (val1.neg && val2.neg) {
            return val1.value <= val2.value
        } else if (val1.neg) {
            return false
        } else if (val2.neg) {
            return true
        };
        val1.value >= val2.value
    }

    public fun lte(val1: &SwitchboardDecimal, val2: &SwitchboardDecimal): bool {
       if (val1.neg && val2.neg) {
            return val1.value >= val2.value
        } else if (val1.neg) {
            return true
        } else if (val2.neg) {
            return false
        };
        val1.value <= val2.value
    }

    public fun equals(val1: &SwitchboardDecimal, val2: &SwitchboardDecimal): bool {
        let num1 = scale_to_decimals(val1, MAX_DECIMALS);
        let num2 = scale_to_decimals(val2, MAX_DECIMALS);
        num1 == num2 && val1.neg == val2.neg
    }

    public fun scale_to_decimals(num: &SwitchboardDecimal, scale_dec: u8): u128 {
        if (num.dec < scale_dec) {
            return (num.value * pow_10(scale_dec - num.dec))
        } else {
            return (num.value / pow_10(num.dec - scale_dec))
        }
    }

    // floyd rivest https://en.wikipedia.org/wiki/Floyd%E2%80%93Rivest_algorithm
    // except only for input len < 600 
    // find `k`th smallest element where left is start index, right is end index
    public fun little_floyd_rivest(vec: &mut vector<SwitchboardDecimal>, k: u64, left: u64, right: u64): SwitchboardDecimal {
        let size = vector::length<SwitchboardDecimal>(vec);
        assert!(size < 600, EINPUT_TOO_LARGE);
        while (right > left) {
            let i = left;
            let j = right;
            let t = *vector::borrow(vec, k);

            // partition the elements between left and right around vec[k]
            // swap vec[left] and vec[k]
            vector::swap(vec, left, k);
            
            // if vec[right] > t
            if (gt(vector::borrow(vec, right), &t)) {
                vector::swap(vec, left, right);
            };

            while (i < j) {
                // swap vec[i] and vec[j]
                vector::swap(vec, i, j);
                i = i + 1;
                j = j - 1;

                while (lt(vector::borrow(vec, i), &t)) {
                    i = i + 1;
                };
                while (gt(vector::borrow(vec, j), &t)) {
                    j = j - 1;
                };
            };

            if (equals(vector::borrow(vec, left), &t)) {
                // swap vec[left] and vec[j]
                vector::swap(vec, left, j);
             } else {
                j = j + 1; // swap vec[right] and vec[j]
                vector::swap(vec, right, j);
            };

            // Adjust left and right towards the boundaries of the subset
            // containing the (k - left + 1)th smallest element.
            if (j <= k) {
                left = j + 1;
            };
            if (k <= j) {
                if (j != 0) {
                    right = j - 1;
                } else {
                    right = j;
                }
            };
        };
        
        *vector::borrow(vec, k)
    }

    // Exponents.
    const F0 : u128 = 1;
    const F1 : u128 = 10;
    const F2 : u128 = 100;
    const F3 : u128 = 1000;
    const F4 : u128 = 10000;
    const F5 : u128 = 100000;
    const F6 : u128 = 1000000;
    const F7 : u128 = 10000000;
    const F8 : u128 = 100000000;
    const F9 : u128 = 1000000000;

    // Programatic way to get a power of 10.
    fun pow_10(e: u8): u128 {
        if (e == 0) {
            F0
        } else if (e == 1) {
            F1
        } else if (e == 2) {
            F2
        } else if (e == 3) {
            F3
        } else if (e == 4) {
            F4
        } else if (e == 5) {
            F5
        } else if (e == 5) {
            F5
        } else if (e == 6) {
            F6
        } else if (e == 7) {
            F7
        } else if (e == 8) {
            F8
        } else if (e == 9) {
            F9
        } else {
            0
        }
    }

    #[test(account = @0x1)]
    public entry fun test_math() {

        let vec: vector<SwitchboardDecimal> = vector::empty();
        vector::push_back(&mut vec, new(20000012342, 0, false));
        vector::push_back(&mut vec, new(20000012341, 0, false));
        vector::push_back(&mut vec, new(20000012343, 0, false));
        vector::push_back(&mut vec, new(20000012344, 0, false));
        vector::push_back(&mut vec, new(20000012345, 0, false));
        vector::push_back(&mut vec, new(20000012346, 0, false));
        vector::push_back(&mut vec, new(20000012349, 0, false));
        vector::push_back(&mut vec, new(20000012344, 0, false));
        vector::push_back(&mut vec, new(20000012342, 0, false));
        vector::push_back(&mut vec, new(20000012341, 0, false));
        vector::push_back(&mut vec, new(20000012342, 0, false));
        vector::push_back(&mut vec, new(20000012342, 0, false));
        vector::push_back(&mut vec, new(20000012341, 0, false));
        vector::push_back(&mut vec, new(20000012344, 0, false));
        vector::push_back(&mut vec, new(20000012341, 0, false));
        vector::push_back(&mut vec, new(20000012342, 0, false));
        let median = median(&mut vec);


        let sqrt = zero();
        sqrt(&new(20000012342, 0, false), &mut sqrt);
        std::debug::print(&sqrt);

        std::debug::print(&median);
        let med = std_deviation(&mut vec, &mut median);
        std::debug::print(&med);
    }
}
