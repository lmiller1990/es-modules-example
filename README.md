## React 18 Support

React 18 has changed their mounting API ever so slightly:

```js
// Before
import { render } from 'react-dom';
const container = document.getElementById('app');
render(<App />, container);

// After
import { createRoot } from 'react-dom/client';
const container = document.getElementById('app');
const root = createRoot(container);
root.render(<App />);
```

This causes big headaches for libraries attempting to support multiple major versions of React!

## Why?

Our React adapter:

https://github.com/cypress-io/cypress/blob/2880092c6048eabc7f8f193485705cbd5b592001/npm/react/src/mount.ts#L99

```js
import * as React from 'react'
import * as ReactDOM from 'react-dom'

// ...

reactDomToUse.render(reactComponent, el)
```

We need to import a different library - either `react-dom` or `react-dom/client` - depending on their version.

## The Options

### Multiple Version

Traditionally, the way a breaking change is handled is to release a new major version. Eg many Vue plugins:

| Vue version | Vue Test Utils version |
|---- | --- |
| 2.x | 1.x |
| 3.x | 2.x |

Cypress, which uses Test Utils, also followed suit. Since we bundle Test Utils, we had to have two libraries:

| Vue version | Cypress Adapter |
|---- | --- |
| 2.x | `cypress/vue2` |
| 3.x | `cypress/vue` |

#### Pros

- Code is simple - assume a single version

#### Cons

- More overhead for users
- Problematic if a minor or patch introduces a breaking change 
  - Unlikely due to semver, but possible since we do some non-standard things


### Handle All Cases in 1 Library

An alternative is handle all versions/use cases in a single library. This is what `@cypress/webpack-dev-server` does.

Example: https://github.com/cypress-io/cypress/blob/develop/npm/webpack-dev-server/src/CypressCTWebpackPlugin.ts#L123-L136

```js
private addCompilationHooks = (compilation: Webpack45Compilation) => {
  this.compilation = compilation

  /* istanbul ignore next */
  if ('NormalModule' in this.webpack) {
    // Webpack 5
    const loader = (this.webpack as typeof webpack).NormalModule.getCompilationHooks(compilation).loader

    loader.tap('CypressCTPlugin', this.addLoaderContext)
  } else {
    // Webpack 4
    compilation.hooks.normalModuleLoader.tap('CypressCTPlugin', this.addLoaderContext)
  }
};
```

#### Pros

- Simple for users - no need to mess around with version incompatibility, etc.
- "It just works!"

#### Cons

- Lose some type safety, since you cannot type multiple conflicting APIs
- Difficult to main - more overhead
  - Complexity increases over time as more major versions come out, need to aggressively deprecate 


We support the last two majors right now, so webpack 4 + 5, webpack-dev-server 3 + 4

| Webpack version | Webpack Dev Server version |
|---- | --- |
| 4.x | 3.x |
| 4.x | 4.x |
| 5.x | 3.x |
| 5.x | 4.x |

Now we must support 4 combinations in the same code path.

## Philosophy - Volunteer vs Professional OSS

As a volunteer maintainer of Vue, Testing Library, Vue Jest, etc, I always opt for making **my** life easier. It's just for fun, so if it feels like a chore, I won't want to do it anymore.

In our case, though, we tend to the second option - we are not volunteers working on a FOSS project, we are engineers working on a production grade, best-in-class test runner. So, unless there's a significant reason not to, we should always handle the complexity internally, and expose a clean API to the user. Rather than having many developers struggle to configure complex tools they don't need to know about, we do it, since it's our business to know about these tools.


## The Solution

There's several ways to consume native ES Modules. Like the rest of JavaScript, they are not statically analyzed, but consumed in a JIT manner. From [the 2015 article](https://hacks.mozilla.org/2015/08/es6-in-depth-modules/) before ES Modules were finalized:


- All flavors of import and export are allowed only at toplevel in a module. There are no conditional imports or exports, and you can’t use import in function scope.
- All of a module’s dependencies must be loaded, parsed, and linked eagerly, before any module code runs. There’s no syntax for an import that can be loaded lazily, on demand.
- There is no error recovery for import errors. An app may have hundreds of modules in it, and if anything fails to load or link, nothing runs. You can’t import in a try/catch block. (The upside here is that because the system is so static, webpack can detect those errors for you at compile time.)

Seems like a deal breaker?

```js
import ReactDOM from 'react-dom/client'
```

This will fail if the module does not exist. This will haul execution! The solution is a dynamic module:

```js
try {
  import ReactDOM from 'react-dom/client'
} catch (e) {
 // You can't do this either
}
```

Again, from the article:

- The system is quite nice as long as your needs are static. But you can imagine needing a little hack sometimes, right? That’s why whatever module-loading system you use will have a programmatic API to go alongside ES6’s static import/export syntax. For example, webpack includes an API.

`import`, the statement: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import

Luckily, things have changed since 2015. 

## Dynamic Modules!

Now, we have dynamic imports, as inspired by tools like webpack:


```js
import('./dynamic-module').then(mod => ...)
```

These can be nested in conditionals, and work in `try/catch`:

```js
try {
  const reactDomImport = react.version > 17 
    ? () = import('react-dom/client')
    : () = import('react-dom/client')
  await reactDomImport()

} catch (e) {
  // ...
}
```

This works fine with native ESM. Bundlers are a different story.
