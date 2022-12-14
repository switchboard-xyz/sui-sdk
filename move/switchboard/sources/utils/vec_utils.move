module switchboard::vec_utils {
    use std::option::{Self, Option};
    use std::vector;

    /// Allocate a new vector of a specific size, setting fields to the default
    /// value.
    public fun new_sized<T: copy + drop>(size: u64, v: T): vector<T> {
      let alloc = vector::empty();
      while (vector::length(&alloc) < size) {
        vector::push_back(&mut alloc, copy v);
      };
      alloc
    }

    /// Split vector at a specific index
    public fun split<T: copy + drop>(v: &vector<T>, idx: u64): (vector<T>, vector<T>) {
      let left = vector::empty();
      let right = vector::empty();
      let i = 0;
      while (i < vector::length(v)) {
        if (i < idx) {
          vector::push_back(&mut left, *vector::borrow(v, i));
        } else {
          vector::push_back(&mut right, *vector::borrow(v, i));
        };
        i = i + 1;
      };
      (left, right)
    }

    /// Evenly split a copy of the vector
    public fun esplit<T: copy + drop>(v: &vector<T>): (vector<T>, vector<T>) {
      split(v, vector::length(v) / 2)
    }

    /// Unwrap a vector of Optionals.
    public fun unwrap<T: copy + drop>(v: &vector<Option<T>>): vector<T> {
      let alloc: vector<T> = vector::empty();
      let i = 0;
      while (i < vector::length(v)) {
        let item: Option<T> = *vector::borrow(v, i);
        if (option::is_some(&item)) {
          vector::push_back(&mut alloc, option::extract(&mut item));
        };
        i = i + 1;
      };
      alloc
    }

    public fun sum_flags(v: &vector<bool>): u64 {
      let r = 0;
      let i = 0;
      while (i < vector::length(v)) {
        if (*vector::borrow(v, i) == true) {
          r = r + 1;
        };
        i = i + 1;
      };
      r
    }

}
