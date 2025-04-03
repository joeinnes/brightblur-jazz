<script lang="ts">
	let { login = $bindable() } = $props();
</script>

<div class="bg-primary relative flex min-h-screen w-full overflow-hidden">
	<div class="fadein group absolute top-0 right-0 h-full w-full md:w-3/5">
		<div
			class="from-primary pointer-events-none absolute inset-0 z-10 bg-gradient-to-t to-transparent md:bg-gradient-to-r"
		></div>
		<img src="/demo/unblurred.jpg" alt="Unblurred example" class="h-full w-full object-cover" />
		<img
			src="/demo/blurred.jpg"
			alt="Blurred example"
			class="blurred-image absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-0"
		/>
	</div>
	<div
		class="text-primary-content z-10 flex max-w-xl flex-1 flex-col justify-end px-8 pb-4 md:justify-center md:px-12 md:py-16 lg:py-24"
	>
		<h1 class="flex items-center pb-4 text-5xl font-black md:text-6xl lg:text-7xl xl:text-8xl">
			<img src="/bb-b-w.svg" class="mr-3 h-[1em]" alt="BrightBlur Logo" />BrightBlur
		</h1>

		<p class="mt-4 text-xl font-medium md:text-2xl">Share photos with confidence.</p>
		<p class="mt-2 text-lg opacity-90">
			Protect privacy with AI-powered face blurring and selective access control.
		</p>
		<button
			class="btn btn-lg btn-outline mt-8 w-fit border-2 text-lg font-bold transition-all hover:scale-105"
			onclick={() => (login = true)}>Get Started</button
		>
	</div>
</div>

<section class="container mx-auto my-16 px-6 text-center">
	<h2 class="text-3xl font-bold md:text-4xl">Your Photos, Your Rules</h2>
	<p class="mx-auto mt-6 max-w-3xl text-lg">
		BrightBlur combines <span class="font-semibold">on-device AI</span> with
		<span class="font-semibold">end-to-end encryption</span> to detect and blur faces before upload.
		Only approved viewers can see the original images, giving you complete control over your visual privacy.
	</p>

	<div class="mt-10 flex flex-wrap justify-center gap-4">
		<div
			class="badge badge-lg badge-primary badge-outline px-4 py-3 font-medium transition-all hover:scale-105 hover:shadow-sm"
		>
			Family Photos
		</div>
		<div
			class="badge badge-lg badge-primary badge-outline px-4 py-3 font-medium transition-all hover:scale-105 hover:shadow-sm"
		>
			School Events
		</div>
		<div
			class="badge badge-lg badge-primary badge-outline px-4 py-3 font-medium transition-all hover:scale-105 hover:shadow-sm"
		>
			Group Activities
		</div>
		<div
			class="badge badge-lg badge-primary badge-outline px-4 py-3 font-medium transition-all hover:scale-105 hover:shadow-sm"
		>
			Social Gatherings
		</div>
		<div
			class="badge badge-lg badge-primary badge-outline px-4 py-3 font-medium transition-all hover:scale-105 hover:shadow-sm"
		>
			Professional Photography
		</div>
	</div>
</section>

<section class="bg-base-200 py-16">
	<div class="container mx-auto px-6">
		<h2 class="text-center text-3xl font-bold md:text-4xl">
			How BrightBlur Safeguards Your Memories
		</h2>

		<div class="mx-auto mt-8 max-w-4xl">
			<div class="bg-base-100 mb-6 rounded-xl p-6 shadow-md">
				<h3 class="mb-4 text-xl font-bold">Privacy in Five Simple Steps</h3>
				<ol class="space-y-4">
					<li class="flex gap-3">
						<div
							class="bg-primary text-primary-content flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold"
						>
							1
						</div>
						<div>
							<p class="font-semibold">Capture your moment</p>
							<p class="opacity-80">Take photos naturally—just as you always have.</p>
						</div>
					</li>
					<li class="flex gap-3">
						<div
							class="bg-primary text-primary-content flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold"
						>
							2
						</div>
						<div>
							<p class="font-semibold">Private AI processing</p>
							<p class="opacity-80">
								Our technology detects and blurs faces directly on your device—your original photos
								never leave your control.
							</p>
						</div>
					</li>
					<li class="flex gap-3">
						<div
							class="bg-primary text-primary-content flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold"
						>
							3
						</div>
						<div>
							<p class="font-semibold">Personalize permissions</p>
							<p class="opacity-80">
								Tag and identify faces to create custom privacy settings for each person in your
								photos.
							</p>
						</div>
					</li>
					<li class="flex gap-3">
						<div
							class="bg-primary text-primary-content flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold"
						>
							4
						</div>
						<div>
							<p class="font-semibold">Secure encryption</p>
							<p class="opacity-80">
								Unblurred faces are protected with state-of-the-art encryption before
								upload—completely inaccessible without proper authorization.
							</p>
						</div>
					</li>
					<li class="flex gap-3">
						<div
							class="bg-primary text-primary-content flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold"
						>
							5
						</div>
						<div>
							<p class="font-semibold">Intelligent sharing</p>
							<p class="opacity-80">
								Share freely knowing that each viewer sees only what you've permitted them to
								see—all managed seamlessly behind the scenes.
							</p>
						</div>
					</li>
				</ol>
			</div>

			<div class="bg-base-100 rounded-xl p-6 shadow-md">
				<h3 class="mb-4 text-xl font-bold">See It In Action</h3>
				<p class="mb-4">
					Meet Alice, a kindergarten teacher who captures a precious moment of Bobby, Charlie,
					Danny, and Emily during their school play:
				</p>

				<div class="border-primary/20 space-y-3 border-l-4 pl-4">
					<p>
						• <span class="font-medium">Bobby's and Charlie's families</span> trust each other, so both
						sets of parents see both children clearly.
					</p>

					<p>
						• <span class="font-medium">Bobby's grandparents</span> only have permission for Bobby, so
						they see just their grandchild's face unblurred.
					</p>

					<p>
						• <span class="font-medium">Danny's family</span>, new to the school, sees only their
						own child unblurred while enjoying the group photo.
					</p>

					<p>
						• <span class="font-medium">Emily's parents</span> chose maximum privacy, so her face remains
						protected for everyone outside her immediate family.
					</p>
				</div>

				<p class="mt-4 text-sm opacity-70">
					As the photographer, Alice maintains access to the original photo while respecting each
					family's privacy choices.
				</p>
			</div>
		</div>
	</div>
</section>

<section class="container mx-auto my-16 px-6">
	<h2 class="mb-8 text-3xl font-bold md:text-4xl">For Parents & Guardians</h2>

	<div class="grid gap-8 md:grid-cols-2">
		<div class="bg-base-200 rounded-xl p-6 shadow-lg">
			<h3 class="mb-3 text-xl font-bold">Worried about sharing photos of your child online?</h3>
			<p>
				BrightBlur automatically blurs faces, and only people you approve can see your child's face
				unblurred. You decide who gets access—friends, family, or just specific people.
			</p>
		</div>

		<div class="bg-base-200 rounded-xl p-6 shadow-lg">
			<h3 class="mb-3 text-xl font-bold">Don't trust Big Tech with your child's image?</h3>
			<p>
				Neither do we. BrightBlur never collects or stores unblurred photos. Our AI runs directly on
				your device, and end-to-end encryption ensures that even we can't see or use your child's
				face.
			</p>
		</div>

		<div class="bg-base-200 rounded-xl p-6 shadow-lg">
			<h3 class="mb-3 text-xl font-bold">
				Tired of being the 'difficult one' when saying no to photo sharing?
			</h3>
			<p>
				BrightBlur makes it easy: Others can upload group photos, and your child's face stays
				blurred unless you allow it. No more awkward conversations—your preferences are built right
				into the app.
			</p>
		</div>

		<div class="bg-base-200 rounded-xl p-6 shadow-lg">
			<h3 class="mb-3 text-xl font-bold">Don't want your child to avoid being in photos?</h3>
			<p>
				Now they don't have to! With BrightBlur, kids can be in as many photos as they like, and you
				stay in control of who sees them.
			</p>
		</div>
	</div>
</section>

<section class="container mx-auto my-16 px-6">
	<h2 class="mb-8 text-3xl font-bold md:text-4xl">For Teachers & Caregivers</h2>

	<div class="grid gap-8 md:grid-cols-2">
		<div class="bg-base-200 rounded-xl p-6 shadow-lg">
			<h3 class="mb-3 text-xl font-bold">
				Want to share classroom moments while respecting privacy?
			</h3>
			<p>
				BrightBlur handles the complexity for you. Simply upload your photos, and our AI
				automatically blurs all faces. Parents control their own privacy settings—no more manual
				editing or worrying about consent forms for each photo.
			</p>
		</div>

		<div class="bg-base-200 rounded-xl p-6 shadow-lg">
			<h3 class="mb-3 text-xl font-bold">No time for complex privacy management?</h3>
			<p>
				We've made it effortless. Just capture your photo, tag the children, and share. BrightBlur
				automatically applies each family's preferences, so you can focus on creating memorable
				experiences instead of managing permissions.
			</p>
		</div>
	</div>
</section>

<section class="container mx-auto my-16 px-6">
	<h2 class="mb-8 text-3xl font-bold md:text-4xl">For Photographers & Event Organizers</h2>

	<div class="grid gap-8 md:grid-cols-2">
		<div class="bg-base-200 rounded-xl p-6 shadow-lg">
			<h3 class="mb-3 text-xl font-bold">
				Need to share event photos while respecting attendee privacy?
			</h3>
			<p>
				BrightBlur lets you share entire galleries while maintaining individual privacy preferences.
				Perfect for weddings, corporate events, and public gatherings where consent varies.
			</p>
		</div>

		<div class="bg-base-200 rounded-xl p-6 shadow-lg">
			<h3 class="mb-3 text-xl font-bold">Want to offer privacy as a professional service?</h3>
			<p>
				Stand out from competitors by offering privacy-first photography. Your clients can decide
				exactly who sees their images, while you maintain a streamlined workflow.
			</p>
		</div>
	</div>
</section>

<section class="from-primary/10 to-primary/5 my-16 bg-gradient-to-r py-16">
	<div class="container mx-auto px-6">
		<h2 class="mb-12 text-center text-3xl font-bold md:text-4xl">These Parents Love It</h2>

		<div class="grid gap-8 md:grid-cols-3">
			<div
				class="bg-base-100 rounded-xl p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
			>
				<div class="mb-4 flex items-center">
					<div class="avatar placeholder mr-3">
						<div class="bg-primary text-primary-content w-12 rounded-full">
							<span>JD</span>
						</div>
					</div>
					<div>
						<p class="font-bold">Jessica D.</p>
						<p class="text-sm opacity-70">Parent of two</p>
					</div>
				</div>
				<p class="italic">
					"Finally, I can let my kids be in school photos without worrying about their privacy.
					BrightBlur has been a game-changer for our family."
				</p>
				<div class="rating mt-4">
					<input type="radio" name="rating-1" class="mask mask-star-2 bg-primary" checked />
					<input type="radio" name="rating-1" class="mask mask-star-2 bg-primary" checked />
					<input type="radio" name="rating-1" class="mask mask-star-2 bg-primary" checked />
					<input type="radio" name="rating-1" class="mask mask-star-2 bg-primary" checked />
					<input type="radio" name="rating-1" class="mask mask-star-2 bg-primary" checked />
				</div>
			</div>

			// ... other testimonial cards with same styling ...
		</div>
	</div>
</section>

<section class="container mx-auto my-16 px-6 text-center">
	<h2 class="text-3xl font-bold md:text-4xl">Take Control of Your Privacy</h2>
	<p class="mx-auto mt-6 max-w-2xl text-lg">
		Join a community of privacy-conscious users who share memories without compromising security.
		BrightBlur gives you the tools to share photos on your terms.
	</p>
	<div class="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
		<button class="btn btn-primary btn-lg px-8 font-bold" onclick={() => (login = true)}>
			Get Started Now
		</button>
		<a href="#how-it-works" class="btn btn-outline btn-lg px-8"> Learn More </a>
	</div>
</section>

<footer class="bg-base-200 py-8">
	<div class="container mx-auto px-6 text-center">
		<p class="text-sm opacity-70">
			© {new Date().getFullYear()} BrightBlur. Privacy-first photo sharing.
		</p>
	</div>
</footer>

<style>
	.fadein img {
		position: absolute;
		right: 0;
		height: 100%;
		transition: all 0.5s ease;
	}

	.blurred-image {
		animation: pulse-opacity 3s infinite ease-in-out;
	}

	.group:hover .blurred-image {
		animation: none;
		opacity: 0;
	}

	@keyframes pulse-opacity {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}

	section:not(:first-child) {
		position: relative;
	}

	section:not(:first-child)::before {
		content: '';
		position: absolute;
		top: -2rem;
		left: 50%;
		transform: translateX(-50%);
		width: 80%;
		max-width: 200px;
		height: 1px;
		background: linear-gradient(to right, transparent, rgba(var(--p), 0.2), transparent);
	}

	@media (max-width: 768px) {
		.fadein img {
			object-position: 70% center;
		}
	}
</style>
