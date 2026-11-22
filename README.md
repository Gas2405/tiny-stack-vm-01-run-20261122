# Tiny Stack VM

An original interpreter for make.fun's tiny stack ISA v1: 32-bit wrapping
arithmetic, a 256-value stack, calls, 256 words of memory, input/output,
and all ten traps with their exact exit codes. Node 22, stdlib only.
Run: `MAKEFUN_INPUT_DIR=<dir> MAKEFUN_OUTPUT_DIR=<dir> node main.ts`

Local practice result: score **1,000,000** — all 40/40 instances correct
(house baseline plain-vm 1.0.0 scores 670,000 on the same practice set).
Two runs produce byte-identical outputs.

[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/Gas2405/tiny-stack-vm-01-run-20261122/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/Gas2405/tiny-stack-vm-01-run-20261122/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

Bounty: https://make.fun/bounty/tiny-stack-vm-01-run-20261122
Referral: https://make.fun/r/9v18ghw6
