/*
 * Base class for all Fluent AST nodes.
 *
 * All productions described in the ASDL subclass BaseNode, including Span and
 * Annotation.
 *
 */
class BaseNode {
  constructor() {}
}

/*
 * Base class for AST nodes which can have Spans.
 */
class SyntaxNode extends BaseNode {
  // addSpan(start, end) {
  //   this.span = new Span(start, end);
  // }
}

export class Comment extends SyntaxNode {
  constructor(body = []) {
    super();
    this.type = "Comment";
    this.body = body;
  }
}

/*
 * An abstract base class for useful elements of Comment.body.
 */
export class Entry extends SyntaxNode {}

export class Text extends Entry {
  constructor(content) {
    super();
    this.type = "Text";
    this.content = content;
  }
}

export class Parameter extends Entry {
  constructor(name, value) {
    super();
    this.type = "Parameter";
    this.name = name;
    this.value = value;
  }
}

export class Variable extends Parameter {
  constructor(name, type = null, description = null, examples = []) {
    super("variable", name);
    this.description = description;
    this.variableType = type;
    this.examples = examples;
  }
}
