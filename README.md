# TypeScript Template Language Service Adapter

Framework for decorating a TypeScript language service with additional support for languages embedded inside of template strings.

## Contributing

To build, you'll need [Git](https://git-scm.com/downloads) and [Node.js](https://nodejs.org/).

First, [fork](https://help.github.com/articles/fork-a-repo/) the typescript-template-string-language-service-adapter repo and clone your fork:

```bash
git clone https://github.com/YOUR_GITHUB_ACCOUNT_NAME/typescript-template-string-language-service-adapter.git
cd typescript-template-string-language-service-adapter
```

Then install dev dependencies:

```bash
npm install
```

The plugin is written in [TypeScript](http://www.typescriptlang.org). The source code is in the `src/` directory with the compiled JavaScript output to the `lib/` directory. Kick off a build using the `compile` script:

```bash
npm run compile
```

And then run the end to end tests with the `e2e` script:

```bash
(cd e2e && npm install)
npm run e2e
```

You can submit bug fixes and features through [pull requests](https://help.github.com/articles/about-pull-requests/). To get started, first checkout a new feature branch on your local repo:

```bash
git checkout -b my-awesome-new-feature-branch
```

Make the desired code changes, commit them, and then push the changes up to your forked repository:

```bash
git push origin my-awesome-new-feature-branch
```

Then [submit a pull request](https://help.github.com/articles/creating-a-pull-request/
) against the Microsoft typescript-template-string-language-service-adapterrepository.

Please also see our [Code of Conduct](CODE_OF_CONDUCT.md).


## Credits

Code originally forked from: https://github.com/Quramy/ts-graphql-plugin