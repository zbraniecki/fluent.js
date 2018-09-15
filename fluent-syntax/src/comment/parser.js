import * as AST from "./ast";
import { CommentParserStream } from "./comment_stream";

export default class FluentCommentParser {
  constructor() {
  }

  parse(source) {
    const ps = new CommentParserStream(source);

    const entries = [];

    while (ps.current()) {
      if (entries.length !== 0) {
        ps.expectChar("\n");
      }
      const entry = this.getEntry(ps);
      entries.push(entry);
    }
    return new AST.Comment(entries);
  }

  getEntry(ps) {
    ps.peekInlineWS();

    if (!ps.currentPeekIs("@")) {
      ps.resetPeek();
      return this.getText(ps);
    }
    ps.skipToPeek();
    return this.getParameter(ps);
  }

  getText(ps) {
    let content = "";
    while (ps.current()) {
      if (ps.currentIs("\n")) {
        ps.peek();
        ps.peekInlineWS();
        if (ps.currentPeekIs("@")) {
          ps.resetPeek();
          break;
        }
      }
      content += ps.current();
      ps.next();
    }
    return new AST.Text(content);
  }

  getParameter(ps) {
    ps.expectChar("@");
    const name = this.getParameterName(ps);

    switch (name) {
      case "var":
        ps.skipInlineWS();
        const variableName = this.getVariableName(ps);
        ps.skipInlineWS();
        const variableType = this.getVariableType(ps);
        ps.skipInlineWS();
        if (!ps.currentIs("-")) {
          return new AST.Variable(variableName, variableType);
        }
        ps.next();
        ps.skipInlineWS();
        const desc = this.getParameterDescription(ps);
        const [examples, trimmedDesc] = this.extractExamples(desc);
        return new AST.Variable(
          variableName,
          variableType,
          trimmedDesc,
          examples);
      default:
        ps.skipInlineWS();
        const value = this.getParameterValue(ps);
        return new AST.Parameter(name, value);
    }
  }

  getParameterName(ps) {
    let name = "";
    while (!ps.currentIs(" ")) {
      name += ps.current();
      ps.next();
    }
    return name;
  }

  getParameterValue(ps) {
    let val = "";
    let ch = ps.current();
    while (ch !== undefined && ch !== "\n") {
      val += ch;
      ch = ps.next();
    }
    return val;
  }

  getVariableName(ps) {
    ps.expectChar("$");
    let name = "";
    let ch = ps.current();
    while (ch !== undefined && ch !== " ") {
      name += ch;
      ch = ps.next();
    }
    return name;
  }

  getVariableType(ps) {
    if (!ps.currentIs("(")) {
      return null;
    }
    ps.next();
    let name = "";
    let ch = ps.current();
    while (ch !== undefined && ch !== ")") {
      name += ch;
      ch = ps.next();
    }
    ps.next();
    return name;
  }

  getParameterDescription(ps) {
    let desc = "";
    let ch = ps.current();
    while (ch !== undefined) {
      desc += ch;
      ch = ps.next();
      if (ch === "\n") {
        const ch2 = ps.peek();
        if (ch2 === "\n" || ch2 === "@") {
          break;
        }
      }
    }

    return desc;
  }

  extractExamples(str) {
    const exampleStr = "(example";
    const exampleStrLen = exampleStr.length;
    let examplePos = str.lastIndexOf(exampleStr);
    if (examplePos === -1) {
      return [[], str];
    }
    const ptr = examplePos +
      (str[examplePos + exampleStrLen] === "s" ?
        exampleStrLen + 1 : exampleStrLen);
    if (str[ptr] !== ":") {
      return [[], str];
    }
    ptr += 1;
    if (str[ptr] === " ") {
      ptr += 1;
    }
    const closePtr = str.indexOf(")", ptr);
    if (closePtr === -1) {
      return [[], str];
    }
    if (closePtr !== str.length - 1) {
      return [[], str];
    }
    const exampleSubstr = str.slice(ptr, closePtr);
    const examples = exampleSubstr.split(",").map(s => s.trim());
    if (str[examplePos - 1] === " ") {
      examplePos -= 1;
    }
    return [examples, str.substr(0, examplePos)];
  }
}
