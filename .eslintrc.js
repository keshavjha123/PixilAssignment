module.exports = {
    "env": {
        "node": true,
        "es2021": true
    },
    "extends": [
        "eslint:recommended"
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "rules": {
        "no-console": "off"
    },
    // Ignore all TypeScript files
    "ignorePatterns": ["**/*.ts", "**/*.tsx", "src/**/*"]
}