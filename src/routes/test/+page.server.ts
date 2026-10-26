import { highlight } from '#lib/server/highlight.ts';
import { Effect } from 'effect';

const snippet = String.raw`# prints "supported" if your terminal answers the 7501 query
sh -c 'old=$(stty -g); stty raw -echo min 0 time 5
  printf "\033]7501;?\033\\\033[c" >/dev/tty
  r=$(dd bs=256 count=1 </dev/tty 2>/dev/null); stty "$old"
  case $r in *7501*) echo supported;; *) echo "not yet";; esac'`;

export const load = () =>
	Effect.runPromise(
		highlight(snippet, 'shellscript').pipe(Effect.map((html) => ({ snippet, html })))
	);
