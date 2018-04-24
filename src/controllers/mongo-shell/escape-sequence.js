/*
 * dbKoda - a modern, open source code editor, for MongoDB.
 * Copyright (C) 2017-2018 Southbank Software
 *
 * This file is part of dbKoda.
 *
 * dbKoda is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * dbKoda is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with dbKoda.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * Created by joey on 14/8/17.
 */

const escapeSequence = {
  /** Null (Caret : ^@, C : \0) */
  NUL: 0x00,
  /** Start of Heading (Caret : ^A) */
  SOH: 0x01,
  /** Start of Text (Caret : ^B) */
  STX: 0x02,
  /** End of Text (Caret : ^C) */
  ETX: 0x03,
  /** End of Transmission (Caret : ^D) */
  EOT: 0x04,
  /** Enquiry (Caret : ^E) */
  ENQ: 0x05,
  /** Acknowledge (Caret : ^F) */
  ACK: 0x06,
  /** Bell (Caret : ^G, C : \a) */
  BEL: 0x07,
  /** Backspace (Caret : ^H, C : \b) */
  BS: 0x08,
  /** Character Tabulation, Horizontal Tabulation (Caret : ^I, C : \t) */
  HT: 0x09,
  /** Line Feed (Caret : ^J, C : \n) */
  LF: 0x0a,
  /** Line Tabulation, Vertical Tabulation (Caret : ^K, C : \v) */
  VT: 0x0b,
  /** Form Feed (Caret : ^L, C : \f) */
  FF: 0x0c,
  /** Carriage Return (Caret : ^M, C : \r) */
  CR: 0x0d,
  /** Shift Out (Caret : ^N) */
  SO: 0x0e,
  /** Shift In (Caret : ^O) */
  SI: 0x0f,
  /** Data Link Escape (Caret : ^P) */
  DLE: 0x10,
  /** Device Control One (XON) (Caret : ^Q) */
  DC1: 0x11,
  /** Device Control Two (Caret : ^R) */
  DC2: 0x12,
  /** Device Control Three (XOFF) (Caret : ^S) */
  DC3: 0x13,
  /** Device Control Four (Caret : ^T) */
  DC4: 0x14,
  /** Negative Acknowledge (Caret : ^U) */
  NAK: 0x15,
  /** Synchronous Idle (Caret : ^V) */
  SYN: 0x16,
  /** End of Transmission Block (Caret : ^W) */
  ETB: 0x17,
  /** Cancel (Caret : ^X) */
  CAN: 0x18,
  /** End of Medium (Caret : ^Y) */
  EM: 0x19,
  /** Substitute (Caret : ^Z) */
  SUB: 0x1a,
  /** Escape (Caret : ^[, C : \e) */
  ESC: 0x1b,
  /** File Separator (Caret : ^\) */
  FS: 0x1c,
  /** Group Separator (Caret : ^]) */
  GS: 0x1d,
  /** Record Separator (Caret : ^^) */
  RS: 0x1e,
  /** Unit Separator (Caret : ^_) */
  US: 0x1f,
  /** Space */
  SP: 0x20,
  /** Delete (Caret : ^?) */
  DEL: 0x7f
};

module.exports = escapeSequence;
