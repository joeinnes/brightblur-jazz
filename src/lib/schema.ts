import { Account, Profile, co, FileStream, CoMap, CoList, Group, CoFeed } from 'jazz-tools';

export class BrightBlurAccount extends Account {
	profile = co.ref(BrightBlurProfile);

	// Create a person for every registered user
	async migrate(this: BrightBlurAccount) {
		const { profile } = await this.ensureLoaded({
			profile: {}
		});

		if (profile.person === undefined) {
			const personGroup = Group.create();
			personGroup.addMember('everyone', 'reader');
			const person = Person.create(
				{
					name: profile.name,
					user: this
				},
				{ owner: personGroup }
			);
			profile.person = person;
		}
	}
}

export class BrightBlurProfile extends Profile {
	name = co.string;
	avatar = co.optional.ref(FileStream);
	person = co.optional.ref(Person);
}

export class Person extends CoMap {
	name = co.string;
	faceSlices = co.optional.ref(ListOfFaceSlices);
	avatar = co.optional.ref(FileStream);
	user = co.optional.ref(Account);
}

export class FeedOfPeople extends CoFeed.Of(co.ref(Person)) {}

export class Photo extends CoMap {
	faceSlices = co.optional.ref(ListOfFaceSlices);
	file = co.ref(FileStream);
}

export class FeedOfPhotos extends CoFeed.Of(co.ref(Photo)) {}

export class GlobalData extends CoMap {
	photos = co.ref(FeedOfPhotos);
	people = co.ref(FeedOfPeople);
}

export class FaceSlice extends CoMap {
	x = co.number;
	y = co.number;
	height = co.number;
	width = co.number;
	person = co.ref(Person);
	file = co.ref(FileStream);
}

export class ListOfFaceSlices extends CoList.Of(co.ref(FaceSlice)) {}
