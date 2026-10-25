# Are We OSC 7501 Yet?

Which terminals and programs support OSC 7501, the Program Status Protocol. Live at [areweosc7501yet.com](https://areweosc7501yet.com).

Each project is one TOML file in [`data/entries/`](data/entries). A weekly check refreshes stars and releases and opens a PR when a state changes. Spotted something out of date? Open an issue or a PR against its file.

The data is also at [`/data.json`](https://areweosc7501yet.com/data.json), described by [`schema/data.schema.json`](schema/data.schema.json).

## Running it

```sh
pnpm install
pnpm dev
```

See [CLAUDE.md](CLAUDE.md) for the other commands and the conventions.

## License

Code is [MIT](LICENSE). Data is [CC0](data/LICENSE).
