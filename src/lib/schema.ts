import { Account, Profile, co, FileStream, CoMap, CoList, Group, CoFeed } from 'jazz-tools';

export class BrightBlurProfile extends Profile {
	name = co.string;
	avatar = co.optional.ref(FileStream);
	user = co.optional.ref(Account);
}

export class ListOfProfiles extends CoList.Of(co.ref(BrightBlurProfile)) {}
export class BrightBlurAccount extends Account {
	profiles = co.ref(ListOfProfiles);
	// Override the base Account.profile property with our BrightBlurProfile
	profile = co.ref(BrightBlurProfile);

	// Create a default profile for every registered user
	async migrate(this: BrightBlurAccount) {
		if (!this.profiles || this.profiles.length === 0) {
			const profileOwnershipGroup = Group.create();
			profileOwnershipGroup.addMember('everyone', 'reader');
			const newProfile = BrightBlurProfile.create(
				{
					name: '',
					user: this
				},
				{
					owner: profileOwnershipGroup
				}
			);
			if (!this.profiles) {
				this.profiles = ListOfProfiles.create([]);
			}
			this.profiles.push(newProfile);
			// Set the profile property to the newly created profile
			this.profile = newProfile;
		}
	}
}

export class Photo extends CoMap {
	faceSlices = co.optional.ref(ListOfFaceSlices);
	file = co.ref(FileStream);
}

export class FeedOfPhotos extends CoFeed.Of(co.ref(Photo)) {}
export class FeedOfProfiles extends CoFeed.Of(co.ref(BrightBlurProfile)) {}

export class GlobalData extends CoMap {
	photos = co.ref(FeedOfPhotos);
	people = co.ref(FeedOfProfiles);
}

export class FaceSlice extends CoMap {
	x = co.number;
	y = co.number;
	height = co.number;
	width = co.number;
	person = co.ref(BrightBlurProfile);
	file = co.ref(FileStream);
}

export class ListOfFaceSlices extends CoList.Of(co.ref(FaceSlice)) {}
