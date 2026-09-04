import random


PERSON = "Precious"
MAX_ROUNDS = 5

SCENARIOS = [
	{
		"story": "A sleepy dragon blocks the path to a treasure chest.",
		"choices": [
			("Sing it a lullaby", 2, "The dragon curls up and starts snoring."),
			("Challenge it to a dance", 3, "The dragon loves your footwork and joins your quest."),
			("Run away dramatically", -1, "You escape, but leave your backpack behind."),
		],
	},
	{
		"story": "A mysterious vending machine offers one magical snack.",
		"choices": [
			("Choose the glowing cupcake", 3, "It tastes like victory and gives you extra energy."),
			("Pick the suspicious broccoli", 1, "It is surprisingly delicious. Tiny victory!"),
			("Shake the machine", -2, "The machine shakes back. You lose a few points."),
		],
	},
	{
		"story": "A friendly ghost asks for help finding its favourite hat.",
		"choices": [
			("Search the library", 2, "You find the hat hiding inside a history book."),
			("Ask the moon", 3, "The moon points you toward a glittering hat stand."),
			("Offer it your hat", 1, "The ghost smiles and gives you a spooky high-five."),
		],
	},
	{
		"story": "A giant cat is sitting on the only bridge across the river.",
		"choices": [
			("Offer a gentle head scratch", 3, "The cat purrs and makes room for you."),
			("Build a snack bridge", 2, "It works, although the bridge gets eaten halfway across."),
			("Meow confidently", -1, "The cat is unimpressed by your pronunciation."),
		],
	},
	{
		"story": "A tiny robot has lost its instruction manual in a field of daisies.",
		"choices": [
			("Follow the trail of loose screws", 3, "You find the manual under a very suspicious flower."),
			("Ask the daisies politely", 2, "The daisies rustle and reveal exactly where it is."),
			("Invent a new manual", -1, "The robot now believes it is a toaster. Oops."),
		],
	},
]


def ask_for_choice():
	"""Return a valid choice number from 1 to 3."""
	while True:
		answer = input("Choose 1, 2, or 3: ").strip()
		if answer in {"1", "2", "3"}:
			return int(answer) - 1
		print("Please choose one of the three numbered options.")


def play_game():
	score = 0
	hearts = 3
	scenarios = random.sample(SCENARIOS, k=MAX_ROUNDS)

	print("\n=== PRECIOUS'S ADVENTURE ===")
	print("Make choices, collect points, and keep your three hearts safe!\n")

	for round_number, scenario in enumerate(scenarios, start=1):
		print(f"Round {round_number}/{MAX_ROUNDS} | Score: {score} | Hearts: {'❤️ ' * hearts}")
		print(scenario["story"])
		for choice_number, choice in enumerate(scenario["choices"], start=1):
			print(f"  {choice_number}. {choice[0]}")

		choice_index = ask_for_choice()
		_, points, result = scenario["choices"][choice_index]
		score += points
		if points < 0:
			hearts -= 1
		print(f"\n{result} ({points:+d} points)\n")

		if hearts == 0:
			print("The adventure ends here, but Precious can always try again!")
			break

	print(f"Final score: {score}")
	if score >= 11:
		print("Legendary! Precious is ready for the grand finale.")
	elif score >= 5:
		print("Great quest! The adventure was a success.")
	else:
		print("A wonderfully chaotic adventure. Every hero gets a rematch.")


def main():
	while True:
		play_game()
		replay = input("\nPlay again? (y/n): ").strip().lower()
		if replay != "y":
			print("Thanks for playing Precious's Adventure!")
			break


if __name__ == "__main__":
	main()