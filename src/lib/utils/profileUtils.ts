import type { Account, ID } from 'jazz-tools';
import type { CoFeedEntry } from 'jazz-tools/dist/coValues/coFeed.js';

import type { FaceSlice, GlobalData, BrightBlurProfile, Photo } from '$lib/schema';

/**
 * Extracts all people from the global data feed
 */
export function extractAllPeople(globalData: { current?: GlobalData | null }) {
	const people = [];
	if (globalData?.current?.people) {
		for (const [, entries] of Object.entries(globalData.current.people)) {
			for (const entry of entries.all) {
				if (entry.value) {
					people.push(entry);
				}
			}
		}
	}
	return people.sort((a, b) => a.value.name.localeCompare(b.value.name));
}

/**
 * Filters people managed by the current user
 */
export function filterManagedPeople(
	allPeople: CoFeedEntry<BrightBlurProfile>[],
	currentUserId: string | undefined,
	myProfileId?: string | undefined
) {
	return allPeople.filter(
		(person) =>
			person.value &&
			person?.value?.id !== myProfileId &&
			person.value._owner &&
			person.value._owner.members &&
			person.value._owner.members.some(
				(member) => member.id === currentUserId && member.role === 'admin'
			)
	);
}

/**
 * Extracts all photos from the global data feed and sorts them by date
 */
export function extractSortedPhotos(globalData: { current?: GlobalData | null }) {
	return globalData.current?.photos
		? Object.values(globalData.current?.photos)
				.flatMap((entries) => [...(entries?.all || [])])
				.sort((a, b) => (b.madeAt > a.madeAt ? 1 : -1))
		: [];
}

/**
 * Filters photos that contain the specified person
 */
export function filterPhotosOfPerson(
	photoArray: CoFeedEntry<Photo>[],
	personId: ID<BrightBlurProfile>
) {
	return photoArray.filter((photo) => {
		return photo && photo.value?.faceSlices
			? photo?.value?.faceSlices?.filter((slice: FaceSlice | null) => {
					return slice?.person?.id === personId;
				}).length > 0
			: false;
	});
}

/**
 * Filters photos uploaded by the specified person
 */
export function filterPhotosByUploader(
	photoArray: CoFeedEntry<Photo>[],
	uploaderId: ID<Account> | undefined
) {
	if (!uploaderId) return [];
	return photoArray.filter((p) => p.by?.id === uploaderId);
}

/**
 * Formats a role string to be displayed (capitalizes first letter)
 */
export function formatRole(role: string): string {
	return role
		.split('')
		.map((el, i) => (i === 0 ? el.toUpperCase() : el))
		.join('');
}
