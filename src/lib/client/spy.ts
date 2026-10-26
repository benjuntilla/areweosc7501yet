import { tocs } from '../toc.ts';

/** The sections scroll-spy follows: the overview's on /, the page's own table of contents elsewhere. */
export const sectionIds = (path: string, overview: ReadonlyArray<string>): ReadonlyArray<string> =>
	path === '/' ? overview : (tocs[path] ?? []).map((e) => e.id);

/** Reports the section nearest the top of the window now and on every scroll. Returns the cleanup. */
export const spy = (ids: ReadonlyArray<string>, onchange: (id: string | undefined) => void) => {
	// The overview's sections come and go with the page, so look them up on each scroll.
	const onscroll = () => {
		const sections = ids.flatMap((id) => document.querySelector(`#${CSS.escape(id)}`) ?? []);
		// A short last section never reaches the line, so the bottom of the page selects it.
		const atBottom =
			scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 1;
		const current = atBottom
			? sections.at(-1)
			: sections.findLast((s) => s.getBoundingClientRect().top < innerHeight / 3);
		onchange(current?.id);
	};
	onscroll();
	addEventListener('scroll', onscroll, { passive: true });
	return () => {
		removeEventListener('scroll', onscroll);
	};
};
