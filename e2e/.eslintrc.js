/**@type {import('eslint').Linter.Config} */
// eslint-disable-next-line no-undef
module.exports = {
    root: true,
    parserOptions: {
        ecmaVersion: "latest"
    },
    env: {
        "es6": true
    },
    extends: "eslint:recommended",
    rules: {
        "no-undef": 0
    }
};