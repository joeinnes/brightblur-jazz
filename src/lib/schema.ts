import { Account, Profile, co, CoMap, CoList, Group, CoFeed, ImageDefinition } from 'jazz-tools';

export class BrightBlurProfile extends Profile {
	name = co.string;
	avatar = co.optional.ref(ImageDefinition);
	user = co.optional.ref(Account);
	isDeleted = co.optional.boolean;
}

export class BrightBlurAccount extends Account {
	// Override the base Account.profile property with our BrightBlurProfile
	profile = co.ref(BrightBlurProfile);
	root = co.ref(BrightBlurAccountRoot);

	// Create a default profile for every registered user
	async migrate(this: BrightBlurAccount) {
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

		if (this.root === undefined) {
			this.root = BrightBlurAccountRoot.create({
				myCommunities: ListOfCommunities.create([]),
				myContacts: ListOfContacts.create([])
			});
		}
		await this.ensureLoaded({
			resolve: {
				root: {
					myCommunities: true,
					myContacts: true
				}
			}
		});
		if (this.root === null) return;
		if (!this.root.myContacts) {
			this.root.myContacts = ListOfContacts.create([]);
		}

		if (!this.root.myCommunities || this.root.myCommunities.length === 0) {
			this.root.myCommunities = ListOfCommunities.create([]);
			const communityGroup = Group.create();
			const community = Community.create(
				{
					name: 'My Community',
					description: 'This is my community'
				},
				{
					owner: communityGroup
				}
			);
			this.root.myCommunities.push(community);
		}
	}
}

export class BrightBlurAccountRoot extends CoMap {
	myCommunities = co.ref(ListOfCommunities);
	myContacts = co.ref(ListOfContacts); // This is here so the user can discover what communities they are a part of.
}

export class Photo extends CoMap {
	faceSlices = co.optional.ref(ListOfFaceSlices);
	image = co.ref(ImageDefinition);
	isDeleted = co.optional.boolean;
}

export class FeedOfPhotos extends CoFeed.Of(co.ref(Photo)) {}
export class FeedOfProfiles extends CoFeed.Of(co.ref(BrightBlurProfile)) {}

export class Community extends CoMap {
	name = co.string;
	description = co.string;
	image = co.optional.ref(ImageDefinition);
	isDeleted = co.optional.boolean;
}

export class ListOfCommunities extends CoList.Of(co.ref(Community)) {
	get sorted() {
		return this.toSorted((a, b) => {
			if (a?.name === undefined || b?.name === undefined) return 0;
			return a.name.localeCompare(b.name);
		});
	}
}
export class ListOfContacts extends CoList.Of(co.ref(BrightBlurProfile)) {
	get sorted() {
		return this.toSorted((a, b) => {
			if (a?.name === undefined || b?.name === undefined) return 0;
			return a.name.localeCompare(b.name);
		});
	}
}

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
	isDeleted = co.optional.boolean;
}

export class ListOfFaceSlices extends CoList.Of(co.ref(FaceSlice)) {
	get sorted() {
		return this.toSorted((a, b) => {
			if (a?.person?.name === undefined || b?.person?.name === undefined) return 0;
			return a.person?.name.localeCompare(b.person.name);
		});
	}
}
