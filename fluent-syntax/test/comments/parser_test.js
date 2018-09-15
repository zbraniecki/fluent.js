import assert from "assert";

import { FluentCommentParser } from "../../src/comment";

suite("Comment Parser", function() {
  setup(() => {
    this.parser = new FluentCommentParser();
  });

  test("semanticless single line comment", () => {
    const input = "foo";
    const output = {
      type: "Comment",
      body: [
        {
          type: "Text",
          content: "foo"
        }
      ]
    };

    const ast = this.parser.parse(input);
    assert.deepEqual(ast, output);
  });

  test("semanticless multi line comment", () => {
    const input = "foo is foo\nand more foo";
    const output = {
      type: "Comment",
      body: [
        {
          type: "Text",
          content: "foo is foo\nand more foo"
        }
      ]
    };

    const ast = this.parser.parse(input);
    assert.deepEqual(ast, output);
  });

  test("comment with a variable", () => {
    const input = "foo is foo\n  @var $name - Foo\nand more foo";
    const output = {
      type: "Comment",
      body: [
        {
          type: "Text",
          content: "foo is foo"
        },
        {
          type: "Parameter",
          name: "variable",
          value: "name",
          description: "Foo\nand more foo",
          variableType: null,
          examples: [],
        },
      ]
    };

    const ast = this.parser.parse(input);
    assert.deepEqual(ast, output);
  });

  test("two variables", () => {
    const input = "foo is foo\n@var $name - Foo\n@var $args - list of arguments";
    const output = {
      type: "Comment",
      body: [
        {
          type: "Text",
          content: "foo is foo"
        },
        {
          type: "Parameter",
          name: "variable",
          value: "name",
          description: "Foo",
          variableType: null,
          examples: [],
        },
        {
          type: "Parameter",
          name: "variable",
          value: "args",
          description: "list of arguments",
          variableType: null,
          examples: [],
        },
      ]
    };

    const ast = this.parser.parse(input);
    assert.deepEqual(ast, output);
  });

  test("two multiline variables", () => {
    const input = "foo is foo\n@var $name - Foo\nsecond line of $name description\n@var $args - list of arguments\nand a second line";
    const output = {
      type: "Comment",
      body: [
        {
          type: "Text",
          content: "foo is foo"
        },
        {
          type: "Parameter",
          name: "variable",
          value: "name",
          description: "Foo\nsecond line of $name description",
          variableType: null,
          examples: [],
        },
        {
          type: "Parameter",
          name: "variable",
          value: "args",
          description: "list of arguments\nand a second line",
          variableType: null,
          examples: [],
        },
      ]
    };

    const ast = this.parser.parse(input);
    assert.deepEqual(ast, output);
  });

  test("examples", () => {
    const input = "@var $name - User name (examples: \"John\", \"Mary\")";
    const output = {
      type: "Comment",
      body: [
        {
          type: "Parameter",
          name: "variable",
          value: "name",
          description: "User name",
          variableType: null,
          examples: [
            "\"John\"",
            "\"Mary\""
          ],
        },
      ]
    };

    const ast = this.parser.parse(input);
    assert.deepEqual(ast, output);
  });

  test("no description", () => {
    const input = "@var $name";
    const output = {
      type: "Comment",
      body: [
        {
          type: "Parameter",
          name: "variable",
          value: "name",
          description: null,
          variableType: null,
          examples: [],
        },
      ]
    };

    const ast = this.parser.parse(input);
    assert.deepEqual(ast, output);
  });

  test("type", () => {
    const input = "@var $name (String)";
    const output = {
      type: "Comment",
      body: [
        {
          type: "Parameter",
          name: "variable",
          value: "name",
          description: null,
          variableType: "String",
          examples: [],
        },
      ]
    };

    const ast = this.parser.parse(input);
    assert.deepEqual(ast, output);
  });

  test("type, desc & examples", () => {
    const input = "@var $name (String) - User Name (example: \"Nick\", \"Oliver\")";
    const output = {
      type: "Comment",
      body: [
        {
          type: "Parameter",
          name: "variable",
          value: "name",
          description: "User Name",
          variableType: "String",
          examples: [
            "\"Nick\"",
            "\"Oliver\"",
          ],
        },
      ]
    };

    const ast = this.parser.parse(input);
    assert.deepEqual(ast, output);
  });

  test("revision", () => {
    const input = "@revision 1";
    const output = {
      type: "Comment",
      body: [
        {
          type: "Parameter",
          name: "revision",
          value: "1",
        },
      ]
    };

    const ast = this.parser.parse(input);
    assert.deepEqual(ast, output);
  });
});
