# err-tree

`err-tree` is destined to help create complex error hierarchy & more readable errors.

It supports:

* Creating error hierarchy properly inheriting from the base Error object
* Easy internationalization of the error messages (i18next support embbed in)
* Error pretty printing
* Print a file exerpt of the file causing the error
    - With a customizable exerpt selection algorithm

Here is the rendering of an error message in the console:

![err-tree rendering](https://bytebucket.org/lsystems/err-tree/raw/tip/docs/images/err-tree-complex-beautifier.png)

err-tree is fully tested with mocha and code coverage is reported at 100% by istanbul. I will make my best to keep it that way.

## Creating new error types using the `errTree` function

`err-tree` is a function allowing you to create errors easily. Its prototype looks like:

```js
errTree(NewError[, BaseError = errTree.BasicError][, options = {}]);
```

### `NewError`

*String* or *Function*

`NewError` can be either a `String` or a constructor `Function`. If it is a `String` it will create a constructor `Function` with its value as a name. `errTree('myError')` will create a valid `myError` constructor.

```js
// Using a String
var MyError = errTree('MyError');

// Using a Function
var MyError2 = errTree(function MyError2() /* name is mandatory here */ {
  // do not forget to call the parent's constructor
  errTree.BasicError.apply(this, arguments);
});
```

### `BaseError`

*Optional* / *Function*

`BaseError` should contain a valid error created using `errTree()` or properly inheriting from `errTree.BasicError`. It defaults to `errTree.BasicError` itself if not provided.

```js
// Inherits fron errTree.BasicError
var MyError = errTree('MyError');
// Inherits from MyError
var MyError2 = errTree(function MyError2() /* name is mandatory here */ {
  // do not forget to call the parent's constructor
  MyError.apply(this, arguments);
}, MyError);
```

### `options`

*Optional* / *Object*

`options` are additional options you can provide for creating you error. Each option, if not set, will inherit the value of its first error parent that sets it (ultimately using the `errTree.BasicError` value if it was not set anywhere in the tree).

```js
// Inherits fron errTree.BasicError
var MyError = errTree('MyError', {
  // hide from the subtree the 500 value from BasicError
  // use 404 instead
  defaultCode: 404
});
// Inherits from MyError
var MyError2 = errTree(function MyError2() /* name is mandatory here */ {
  // do not forget to call the parent's constructor
  MyError.apply(this, arguments);
}, MyError, {
  // hide from the subtree the null value from BasicError
  // use 'my:error2' instead
  defaultNs: 'my:error2'
  // here defaultsCode is 404 because it inherits from MyError
});
```

Each option will be described below:

#### `options.defaultCode`

*Integer*

This options should be an `Integer`. `errTree.BasicError` has a `defaultCode` set at `500`.

You can use a `code` to better classify your errors. When creating an error, a `code` can always optionnaly be specified. If it is not provided, then `options.defaultCode` will be used.

We recommend if you do not have a scheme for classifying errors to try to stick with the `HTTP` error code nomenclature which is why `errTree.BasicError` defaults to `500`.

#### `options.defaultNs`

*String*

This option should be a `String`. To specify sub namespaces, use `:` like in `my:sub:namespace`. `errTree.BasicError` defaults to `''` (no namespace).

Each error can be created with a namespace (by default it does not have one) which can be used to contextualize where the error is thrown (by which piece of code). The namespace can be pretty printed with the error.

#### `options.beautifier`

*Function*

This option should define a valid beautifier. You can use one of the provided beautifiers (`default` and `complex`). To create one of those, you can use `errTree.beautifiers.get(name, options)`.

Beautifiers are responsible to make the error look good at printing time. More information on them and their configuration below.

Defaults to the internal `default` beautifier.

#### `options.messageHandler`

*Function*

This option should define a valid message handler. You can use one of the provided message handlers (`default` and `i18next`). To create one of those, you can use `errTree.messageHandlers.get(name, options)`.

Message handlers are responsible to finalize the error message in any way deemed useful (for example, the `i18next` message handler uses `i18next` to translate the message and embed in it any useful data).

Defaults to the internal `default` message handler.

#### `options.selectExerpt`

*Integer* or *String* or *Array of String* or *Function*

Some beautifiers may want to print a file exerpt of where the error happened. The problem is that the error is often created in a piece of code by a safeguard but the real error is caused by an invalid code in a previous call in the stack.

This option allows you to configure how the proper stack line is chosen to create the file exerpt.

It can be one of the following:
- an `Integer` (starts from `0`) that is the index of the line of the stack to use
- a `String` or an `Array of String`, that will be used to find a line of the stack containing a file matching (using `minimatch`) the provided pattern (or patterns).
- a `Function` taking as a parameter a context line object (see `errTree.parseStack` documentation below) returning a `Boolean`. The first line for which the function returns `true` will be used

In all cases, if no line is found using the provided value, it will select the first line.

This option defaults to `!node_modules/` in `errTree.BasicError`.

## Creating new error types manually

You can always define your errors completely manually (though this is not the recommended way) by doing so:

```js
var _ = require('lodash');
var util = require('util');
var errTree = require('err-tree');

function MyError() {
  errTree.BasicError.apply(this, arguments);
}
util.inherits(MyError, errTree.BasicError);
_.extend(MyError.prototype, {
  // options (defaultCode, defaultNs, …)
  // selectExerpt can only be a function, other formats are not handled
});
MyError.assert = errTree.createAssert(MyError);
```

## Instantiating errors

If you do not customize the error arguments by providing a specific constructor to `errTree()` or by creating your error manually, all errors inheriting from `errTree.BasicError` have a constructor matching the one in `errTree.BasicError`. It looks like `Error([namespace,] message[, code, [data, [devData]]])`.

```js
var errTree = require('err-tree');

var CustomNotFoundError = errTree('CustomNotFoundError', {defaultCode: 404});

// This error will use code = 404 (default value used before)
throw new CustomNotFoundError('my:lib', 'Data not found', {
  // some request data
}, {
  userPassword: 'password'
});

// This error will use code = 501
throw new CustomNotFoundError('my:lib2', 'Data not found', 501);
```

### `namespace`

*Optional* / *String*

The actual namespace the error is associated with. Defaults to `defaultNs`.

### `message`

*String*

The message associated to the error before it is handled by the error's message handler.

### `code`

*Optional* / *Integer*

The numeric code associated with the error. It defaults to `defaultCode`.

### `data`

*Optional* / *Object*

Data that should be associated with the error. It will be accessible in `err.data` and can be used by the error's message handler to create the final error message.

#### `data.origilalError`

*Optional* / *Error*

If provided, the renderer will use the stack of the provided error instead of its own stack. This can be pretty useful to use the stack of the original call after an async callback.

```js
function myAsyncFunction(cb) {
  var orig = new Error(); // If you build an errTree error here it will
                          // be more performant

  process.nextTick(function() {
    // something bad happen, so we decide to throw, the stack printed will
    // be the one containing the myAsyncFunction call
    throw new MyCustomError('message', {originalError: orig});
  });
}
```

### `devData`

*Optional* / *Object*

Likely sensitive data that should be associated to the error only when not in production. This is achieved by merging `data` and `devData` together when `process.env.NODE_ENV` is not equal to `production`.

## Beautifiers

### `default`

The `default` beautifier renders nearly exactly the stack as v8 does. The only major difference is that the namespace is inserted before the error message if one is specified. If anything else looks different it is likely a bug.

![err-tree default beautifier](https://bytebucket.org/lsystems/err-tree/raw/tip/docs/images/err-tree-default-beautifier.png)

It takes no option an an instance can be retrieved as easily as :

```js
errTree.beautifiers.get('default');
```

### `complex`

The `complex` beautifier is allowing for a much more complex usage. Colors, file exerpt, …. It is configurable using the `options` parameter:

```js
errTree.beautifiers.get('complex', {
  // do we use colors?
  colors: true,
  // do we add a file exerpt to the rendering?
  exerpt: true,
  // how many lines of code before the line of the stack in the exerpt
  exerptBefore: 3,
  // how many lines of code after the line of the stack in the exerpt
  exerptAfter: 3
})
```

![err-tree complex beautifier](https://bytebucket.org/lsystems/err-tree/raw/tip/docs/images/err-tree-complex-beautifier.png)

## Message handlers

### `default`

The `default` message handlers is an identity function (for now). It takes no options.

```js
errTree.messageHandlers.get('default');
```

### `i18next`

The `i18next` message handler is there to allow easy internationalization of error message.

This can look like:

```js
var MyError = errTree('MyError');

throw new MyError('some:ns', 'error_msg_key', {some: data}, {someDev: data});
```

It uses a single `i18next` option (for now) (to pass to it the `i18next` instance to use):

```js
errTree.messageHandlers.get('i18next', {i18next: myInitializedI18next})
```

For now, error messages are looked up in the `errors` locale namespace in this manner (lets take the previous example to illustrate the process):

- look for `errors:some.ns.MyError.error_msg_key`
- if it is not found, remove one namespace to look for `errors:some.MyError.error_msg_key`
- continuing on the same scheme with `errors:MyError.error_msg_key`
- then look for the message the same way without the error name: `errors:some.ns.error_msg_key`
- start poping out namespaces again: `errors:some.error_msg_key`
- and so on: `errors:error_msg_key`
- if it is not found at all: resolves `errors:key_not_found`

Translations are always passed the `data` (+`devData`) extended with:

- `ns`: `'errors'` (to force `i18next` to look into the `errors` namespace)
- `err.ns`: the namespace associated with the error
- `err.code`: the code associated with the error
- `err.strCode`: the key provided as a message to create the error
- `data`: `data` (+`devData`) in case the extension might have hidden something in the original data object
- `defaultValue`: `''` (to get an empty string if translation fails)
- `context`: `'dev'` (only set if `process.env.NODE_ENV` is not equal to `production`)

Here is a valid locale json file for the previous example:

```json
{
  "some": {
    "MyError": {
      "error_msg_key": "an error occured during __some__",
      "error_msg_key_dev": "an error occured during __some__ (with __someDev__)"
    }
  }
}
```

## Assertions

To help you write some safeguards in your file, an assert method is added on each error method created using `errTree()`. You can write the following:

```js
MyError.assert(myVarible === true, 'my:ns', 'message', 404, {}, {});
```

This will throw a MyError created with the arguments following the condition if it is `false`.

## Default beautifier & message handler

You can set a default beautifier & message handler by calling the following methods:

```js
// named form
errTree.setDefaultBeautifier('complex', options);
errTree.setDefaultMessageHandler('i18next', options);

// function form
errTree.setDefaultBeautifier(myBeautifier, options); // only onError in options
errTree.setDefaultMessageHandler(myMessageHandler);
```

**Be careful**: setting a default message handler can have unexpected effects on other libraries using `errTree` that you might be using and is **not recommended**. We advise you to use a base error for all your errors (like `MyAppError`). It would set a default message handler for all your errors without any risk of breaking anything else.

`setDefaultBeautifier` also accepts a specific option `onError` that sets the beautifier on all errors, even those not inheriting `errTree.BasicError`. This option modifies the node `Error` type and thus must be used with extreme caution.

```js
errTree.setDefaultBeautifier('complex', {onError: true});
console.log(new Error('message')); // pretty printed with complex
```

## Unhandled exception

`errTree` comes with a bundled exception handler that will print better uncatched exceptions:

![err-tree exception handler](https://bytebucket.org/lsystems/err-tree/raw/tip/docs/images/err-tree-exception-handler.png)

To activate it (it is not by default) use:

```js
errTree.useUncaughtExceptionHandler();
```

**Important**: this exception handler calls `process.exit(8)` like node would do for an uncatched exception and there is no way (for now) to disable this so if you want an exception handlers that keeps your software alive, you will have to write your own.

## Exposed internal APIs

`errTree` exposes most of its internal logic just in case it might be useful to write plugins or an other error handling library.

### `parseStack`

Using `errTree.parseStack` you can parse any v8 stack and get an array of objects instead.

Lines not relative to the stack itself (error message and such) are ignored.

Each object in the array may contain the following:

- `fn`: the function name in which the line is
- `as`: an alias for the function (its real name?)
- `path`: the path of the file containing the line
- `dirname`: the dirname of the file stated above
- `rootpath`: the dirname part from the cwd
- `basepath`: the cwd if file is in a subdirectory of cwd
- `basename`: the filename without the path to it
- `line`: the line number
- `column`: the column number

```js
var parsedStack = errTree.parseStack(err.stack);
```

### `fileExerpt`

This renders a file exerpt given a line of a stack (as an object like the one retuned by `errTree.parseStack`). It can also take the following options:

- `colors`: (defaults to `true`) wether or not to put colors in the exerpt
- `exerptBefore`: (defaults to `3`) the number of lines before the referenced one in the exerpt
- `exerptAfter`: (defaults to `3`) the number of lines after the referenced one in the exerpt

```js
var exerpt = errTree.fileExerpt(errTree.parseStack(err.stack)[0], {colors: false});
```

### `createAssert`

It creates an assert function throwing a new instance of a given object when its first argument is false.

```js
var assert = errTree.createAssert(Error);

assert(false, 'my message', …); // throws a new Error('my message', …
```

## Creating your own beautifiers & message handlers

In this section we will discuss how to personalize your errors even more by writing your own beautifiers & message handlers.

### Beautifiers

A beautifier is simply a function taking an error as argument and returning a string that should contain exactly (stack comprised) how the error should look like.

Here is a simple example:

```js
function myBeautifier(err) {
  return err.name + ': ' + err.message;
}

var MyError = errTree('MyError', {beautifier: myBeautifier});
```

This will produce errors with no stack looking like:

```
MyError: <error message>
```

**Note:** message handlers are executed before beautifiers so you can be confident that `err.message` contains the final message. Also you can always access the parsed stack in `err.parsedStack`.

### Message handlers

A message handler is a simple function taking an error as an argument and returning a new message to use.

Here is a simple example:

```js
function myMessageHandler(err) {
  return 'super simple handler − ' + err.message;
}

var MyError = errTree('MyError', {messageHandler: myMessageHandler});
```

This will add `super simple handler − ` as a prefix to all messages.
