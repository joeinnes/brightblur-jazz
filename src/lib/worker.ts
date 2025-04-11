import { PUBLIC_API_KEY, PUBLIC_SYNC_SERVER } from '$env/static/public';
import { startWorker } from 'jazz-nodejs';
const syncServer = PUBLIC_SYNC_SERVER as `wss://${string}` | `ws://${string}`;

export const { worker } = await startWorker({
	syncServer: `${syncServer}/?key=${PUBLIC_API_KEY}`
});
