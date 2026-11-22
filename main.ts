// Tiny Stack VM: original interpreter for make.fun's tiny stack ISA v1.
// Usage: MAKEFUN_INPUT_DIR=<dir> MAKEFUN_OUTPUT_DIR=<dir> node main.ts
// Node 22, stdlib only. Deterministic: no clock, no randomness.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const IN = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const SM = 256, CM = 64, MW = 256, SL = 1e6, OM = 65536;
// [byte, imm, pops, pushes] for every opcode.
const T: [number, number, number, number][] = [
  [0, 0, 0, 0], [1, 1, 0, 1], [2, 4, 0, 1], [3, 0, 1, 0], [4, 0, 1, 2],
  [5, 0, 2, 2], [6, 0, 2, 3], [7, 0, 3, 3], [16, 0, 2, 1], [17, 0, 2, 1],
  [18, 0, 2, 1], [19, 0, 2, 1], [20, 0, 2, 1], [21, 0, 2, 1], [22, 0, 2, 1],
  [23, 0, 1, 1], [24, 0, 2, 1], [25, 0, 2, 1], [26, 0, 2, 1], [27, 0, 1, 1],
  [28, 0, 2, 1], [29, 0, 2, 1], [30, 0, 2, 1], [32, 0, 2, 1], [33, 0, 2, 1],
  [34, 0, 2, 1], [48, 2, 0, 0], [49, 2, 1, 0], [50, 2, 1, 0], [51, 2, 0, 0],
  [52, 0, 0, 0], [64, 0, 1, 1], [65, 0, 2, 0], [80, 0, 1, 0], [81, 0, 1, 0],
  [82, 0, 0, 1], [83, 0, 1, 0],
];
// Flat tables: IM 255 = unknown opcode.
const IM = new Uint8Array(256).fill(255), PP = new Uint8Array(256), PS = new Uint8Array(256);
for (const [b, i, p, q] of T) { IM[b] = i; PP[b] = p; PS[b] = q; }

function run(p: Buffer, inp: Buffer) {
  const n = p.length, d = new Int32Array(SM);
  let sp = 0;
  const c = new Int32Array(CM);
  let cp = 0;
  const m = new Int32Array(MW), o = new Uint8Array(OM);
  let ol = 0, ip = 0, pc = 0, st = 0;
  const fin = (e: number) => ({ out: o.subarray(0, ol), exit: e });
  for (;;) {
    if (st === SL) return fin(10);
    if (pc < 0 || pc >= n) return fin(9);
    const op = p[pc], im = IM[op];
    if (im === 255) return fin(5);
    const pp = PP[op], ps = PS[op];
    if (pc + im >= n) return fin(9);
    st++;
    const nx = pc + 1 + im;
    if (sp < pp) return fin(2);
    if (sp - pp + ps > SM) return fin(3);
    pc = nx;
    switch (op) {
      case 0: return fin(0);
      case 1: d[sp++] = (p[nx - 1] << 24) >> 24; break; // PUSH8 sign-extends
      case 2: d[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break;
      case 3: sp--; break;
      case 4: d[sp] = d[sp - 1]; sp++; break;
      case 5: { const t = d[sp - 1]; d[sp - 1] = d[sp - 2]; d[sp - 2] = t; break; }
      case 6: d[sp] = d[sp - 2]; sp++; break;
      case 7: { const a = d[sp - 3]; d[sp - 3] = d[sp - 2]; d[sp - 2] = d[sp - 1]; d[sp - 1] = a; break; }
      case 23: d[sp - 1] = -d[sp - 1] | 0; break; // NEG: -INT_MIN stays INT_MIN
      case 27: d[sp - 1] = ~d[sp - 1]; break;
      case 16: case 17: case 18: case 19: case 20: case 21: case 22:
      case 24: case 25: case 26: case 28: case 29: case 30: case 32: case 33: case 34: {
        const b = d[sp - 1], a = d[sp - 2];
        let r: number;
        switch (op) {
          case 16: r = (a + b) | 0; break;
          case 17: r = (a - b) | 0; break;
          case 18: r = Math.imul(a, b); break; // low 32 bits, exact
          case 19: if (!b) return fin(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; break;
          case 20: if (!b) return fin(4); r = b === -1 ? 0 : (a % b) | 0; break;
          case 21: if (!b) return fin(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; break;
          case 22: if (!b) return fin(4); r = ((a >>> 0) % (b >>> 0)) | 0; break;
          case 24: r = a & b; break;
          case 25: r = a | b; break;
          case 26: r = a ^ b; break;
          case 28: r = a << (b & 31); break;
          case 29: r = a >> (b & 31); break; // arithmetic
          case 30: r = (a >>> (b & 31)) | 0; break; // logical
          case 32: r = a === b ? 1 : 0; break;
          case 33: r = a < b ? 1 : 0; break;
          default: r = (a >>> 0) < (b >>> 0) ? 1 : 0; break;
        }
        sp -= 2; d[sp++] = r; break;
      }
      case 48: case 49: case 50: { // JMP/JZ/JNZ: signed offset from next
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        let take = op === 48;
        if (op !== 48) { const v = d[--sp]; take = op === 49 ? v === 0 : v !== 0; }
        if (take) pc = nx + rel;
        break;
      }
      case 51: // CALL: unsigned target, push next address
        if (cp === CM) return fin(7);
        c[cp++] = nx; pc = p[nx - 2] | (p[nx - 1] << 8); break;
      case 52: // RET
        if (!cp) return fin(8);
        pc = c[--cp]; break;
      case 64: { const a = d[sp - 1]; if (a < 0 || a >= MW) return fin(6); d[sp - 1] = m[a]; break; }
      case 65: { const a = d[sp - 1], v = d[sp - 2]; if (a < 0 || a >= MW) return fin(6); sp -= 2; m[a] = v; break; }
      case 80: { const t = String(d[sp - 1]); if (ol + t.length > OM) return fin(11); sp--; for (let i = 0; i < t.length; i++) o[ol++] = t.charCodeAt(i); break; }
      case 81: if (ol + 1 > OM) return fin(11); o[ol++] = d[--sp] & 255; break;
      case 82: d[sp++] = ip < inp.length ? inp[ip++] : -1; break; // IN: -1 when exhausted
      default: return fin(d[--sp] & 255); // EXIT: low byte
    }
  }
}

for (const e of readdirSync(IN, { withFileTypes: true })) {
  if (!e.isDirectory()) continue;
  const id = e.name;
  let p: Buffer;
  try { p = readFileSync(join(IN, id, 'program.bin')); } catch { continue; }
  let inp: Buffer;
  try { inp = readFileSync(join(IN, id, 'input.bin')); } catch { inp = Buffer.alloc(0); }
  const { out, exit } = run(p, inp);
  mkdirSync(join(OUT, id), { recursive: true });
  writeFileSync(join(OUT, id, 'stdout.bin'), out);
  writeFileSync(join(OUT, id, 'exit.txt'), exit + '\n');
}
