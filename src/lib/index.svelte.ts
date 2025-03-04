import { GlobalData, FeedOfProfiles, FeedOfPhotos } from './schema';
import { PUBLIC_GLOBAL_DATA } from '$env/static/public';
import { Group, type ID } from 'jazz-tools';
import { useCoState } from 'jazz-svelte';

export function getGlobalData() {
	try {
		const data = useCoState(GlobalData, PUBLIC_GLOBAL_DATA as ID<GlobalData>);
		return data.current;
	} catch (e) {
		console.log(e);
		const group = Group.create();
		// group.addMember('everyone', 'reader');
		const globalData = GlobalData.create({
			photos: FeedOfPhotos.create([], { owner: group }),
			people: FeedOfProfiles.create([], { owner: group })
		});
		return useCoState(GlobalData, globalData.id);
	}
}
