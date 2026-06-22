;; Minimal learning module — compile: npm run build:wasm
(module
  (memory (export "memory") 1)

  (func (export "add") (param i32 i32) (result i32)
    local.get 0
    local.get 1
    i32.add)

  (func (export "sum_array") (param $ptr i32) (param $len i32) (result i32)
    (local $i i32)
    (local $total i32)
    (local.set $i (i32.const 0))
    (local.set $total (i32.const 0))
    (block $done
      (loop $loop
        (local.get $i)
        (local.get $len)
        (i32.ge_u)
        (br_if $done)
        (local.get $total)
        (local.get $ptr)
        (i32.load)
        (i32.add)
        (local.set $total)
        (local.get $ptr)
        (i32.const 4)
        (i32.add)
        (local.set $ptr)
        (local.get $i)
        (i32.const 1)
        (i32.add)
        (local.set $i)
        (br $loop)))
    (local.get $total))

  (func (export "sum_range") (param $n i32) (result i32)
    (local $i i32)
    (local $total i32)
    (local.set $i (i32.const 0))
    (local.set $total (i32.const 0))
    (block $done
      (loop $loop
        (local.get $i)
        (local.get $n)
        (i32.ge_u)
        (br_if $done)
        (local.get $total)
        (local.get $i)
        (i32.add)
        (local.set $total)
        (local.get $i)
        (i32.const 1)
        (i32.add)
        (local.set $i)
        (br $loop)))
    (local.get $total)))
