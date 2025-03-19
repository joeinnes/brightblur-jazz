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
	root = co.ref(BrightBlurAccountRoot);

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

export class BrightBlurAccountRoot extends CoMap {
	myCommunities = co.ref(ListOfCommunities); // This is here so the user can discover what communities they are a part of.
}

export class Image extends CoMap {
	size = co.number; // Changed from width to size to represent the width of the image (320, 1024, 2048, 4096, or original)
	file = co.ref(FileStream);
}
export class ListOfImages extends CoList.Of(co.ref(Image)) {}

export class Photo extends CoMap {
	faceSlices = co.optional.ref(ListOfFaceSlices);
	images = co.ref(ListOfImages);
}

export class FeedOfPhotos extends CoFeed.Of(co.ref(Photo)) {}
export class FeedOfProfiles extends CoFeed.Of(co.ref(BrightBlurProfile)) {}

export class Community extends CoMap {
	name = co.string;
	description = co.string;
}

export class ListOfCommunities extends CoList.Of(co.ref(Community)) {}

export class GlobalData extends CoMap {
	photos = co.ref(FeedOfPhotos);
	people = co.ref(FeedOfProfiles);
}

export class FaceSlice extends CoMap {
	x = co.number;
	y = co.number;
	height = co.number;
	width = co.number;
	person = co.optional.ref(BrightBlurProfile);
	images = co.ref(ListOfImages); // Changed from ListOfImages to co.ref(ListOfImages)
}

export class ListOfFaceSlices extends CoList.Of(co.ref(FaceSlice)) {}
