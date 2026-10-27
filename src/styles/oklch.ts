import { Schema } from 'effect';

export const Oklch = Schema.Struct({
	colorSpace: Schema.Literal('oklch'),
	components: Schema.Tuple([Schema.Finite, Schema.Finite, Schema.Finite]),
	alpha: Schema.optionalKey(Schema.Finite)
});
