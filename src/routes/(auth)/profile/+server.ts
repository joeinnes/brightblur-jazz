import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	// TODO: get worker, tell worker to lookup the posted ID covalue, validate it and stick it into a List of Profiles.
	return new Response();
};
