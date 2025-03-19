export const getUserHue = (userId: string | undefined): number => {
	return userId
		? userId.split('').reduce((acc: number, curr: string) => acc + curr.charCodeAt(0), 0) % 360
		: 0;
};
