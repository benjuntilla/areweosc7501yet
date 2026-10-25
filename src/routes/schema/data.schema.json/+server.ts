import data from '../../../../schema/data.schema.json';

export const prerender = true;

export const GET = () => Response.json(data);
