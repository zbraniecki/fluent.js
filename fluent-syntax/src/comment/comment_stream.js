import { ParserStream } from "../stream";
import { includes } from "../util";
import { ParseError } from "../errors";

const INLINE_WS = [" ", "\t"];

export class CommentParserStream extends ParserStream {
  skipInlineWS() {
    while (this.ch) {
      if (!includes(INLINE_WS, this.ch)) {
        break;
      }
      this.next();
    }
  }

  peekInlineWS() {
    let ch = this.currentPeek();
    while (ch) {
      if (!includes(INLINE_WS, ch)) {
        break;
      }
      ch = this.peek();
    }
  }

  expectChar(ch) {
    if (this.ch === ch) {
      this.next();
      return true;
    }

    if (ch === "\n") {
      // Unicode Character 'SYMBOL FOR NEWLINE' (U+2424)
      throw new ParseError("E0003", "\u2424");
    }

    throw new ParseError("E0003", ch);
  }
}
