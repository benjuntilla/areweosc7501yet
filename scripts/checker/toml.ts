import { Toml, TomlLocalDate, TomlOffsetDateTime } from '@effected/toml';
import { Array, DateTime, Effect, Schema, Struct, UndefinedOr } from 'effect';
import { Entry } from '../../src/lib/domain/schema.ts';

// Entry encodes dates as strings, which TOML would quote. A hand-written day decodes to
// midnight UTC, so an instant at exactly midnight is written as a day.
const tomlDate = (iso: string) => {
	const { year, month, day, hour, minute, second, millisecond } = DateTime.toPartsUtc(
		DateTime.makeUnsafe(iso)
	);
	return hour === 0 && minute === 0 && second === 0 && millisecond === 0
		? new TomlLocalDate({ year, month, day })
		: new TomlOffsetDateTime({
				year,
				month,
				day,
				hour,
				minute,
				second,
				nanosecond: millisecond * 1_000_000,
				offsetMinutes: 0
			});
};

/** An entry file in schema key order. oxfmt has the last word on layout. */
export const writeEntry = (entry: Entry) =>
	Schema.encodeEffect(Entry)(entry).pipe(
		Effect.map(
			Struct.evolve({
				last_checked_date: tomlDate,
				github: UndefinedOr.map(Struct.evolve({ latest_release_date: UndefinedOr.map(tomlDate) })),
				history: Array.map(Struct.evolve({ date: tomlDate }))
			})
		),
		Effect.flatMap((e) => Toml.stringify(e))
	);
