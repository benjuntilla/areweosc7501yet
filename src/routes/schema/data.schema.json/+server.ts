import { json } from '@sveltejs/kit';
import data from '../../../../schema/data.schema.json';

export const prerender = true;

export const GET = () => json(data);
