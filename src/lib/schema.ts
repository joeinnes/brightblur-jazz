import { Account, Profile, co, CoMap, CoList, Group, CoFeed, ImageDefinition } from 'jazz-tools';

export class BrightBlurProfile extends Profile {
	name = co.string;
	avatar = co.optional.ref(ImageDefinition);
	user = co.optional.ref(Account);
}

export class BrightBlurAccount extends Account {
	// Override the base Account.profile property with our BrightBlurProfile
	profile = co.ref(BrightBlurProfile);
	root = co.ref(BrightBlurAccountRoot);

	// Create a default profile for every registered user
	async migrate(this: BrightBlurAccount) {
		this.ensureLoaded({
			resolve: {
				root: true,
				profile: true
			}
		});
		if (!this.profile) {
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
			// Set the profile property to the newly created profile
			this.profile = newProfile;
		}
		if (!this.root) {
			this.root = BrightBlurAccountRoot.create({
				myCommunities: ListOfCommunities.create([])
			});
		}
		if (!this.root.myCommunities) {
			this.root.myCommunities = ListOfCommunities.create([]);
		}
		if (this.root.myCommunities.length === 0) {
			const communityGroup = Group.create();
			const community = Community.create({
				name: 'My Community',
				description: 'This is my community',
				photos: FeedOfPhotos.create([], { owner: communityGroup }),
				members: FeedOfProfiles.create([], { owner: communityGroup })
			});
			this.root.myCommunities.push(community);
		}
	}
}

export class BrightBlurAccountRoot extends CoMap {
	myCommunities = co.ref(ListOfCommunities); // This is here so the user can discover what communities they are a part of.
}

export class Photo extends CoMap {
	faceSlices = co.optional.ref(ListOfFaceSlices);
	image = co.ref(ImageDefinition);
}

export class FeedOfPhotos extends CoFeed.Of(co.ref(Photo)) {}
export class FeedOfProfiles extends CoFeed.Of(co.ref(BrightBlurProfile)) {}

export class Community extends CoMap {
	name = co.string;
	description = co.string;
	image = co.optional.ref(ImageDefinition);
	photos = co.ref(FeedOfPhotos);
	members = co.ref(FeedOfProfiles);
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
	image = co.ref(ImageDefinition);
}

export class ListOfFaceSlices extends CoList.Of(co.ref(FaceSlice)) {}
