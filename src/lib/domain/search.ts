import { Schema } from 'effect';
import { states } from './schema.ts';

/** What the search dialog knows of each entry. Every page can search, so it fetches these from /search.json. */
export const SearchRecords = Schema.Array(
	Schema.Struct({
		slug: Schema.String,
		name: Schema.String,
		aliases: Schema.Array(Schema.String),
		repo: Schema.String,
		category: Schema.String,
		state: Schema.Literals(states)
	})
);
