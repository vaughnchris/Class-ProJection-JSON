export const pythonReference = [
  {
    category: "Syntax & Output",
    title: "print() Function",
    description: "Used to output text or variables to the console.",
    codeExample: `print("Hello, World!")\n\nname = "Alice"\nprint("Hello,", name)\n\n# Formatting with f-strings\nage = 25\nprint(f"My name is {name} and I am {age} years old.")`
  },
  {
    category: "Syntax & Output",
    title: "Variables & Data Types",
    description: "Variables store data. Python automatically assigns the data type based on the value.",
    codeExample: `x = 10          # Integer (int)\ny = 3.14        # Float (float)\nname = "Bob"    # String (str)\nis_active = True # Boolean (bool)`
  },
  {
    category: "Syntax & Output",
    title: "input() Function",
    description: "Reads a line of text from the user. Always returns a string, so you must convert it to a number if needed.",
    codeExample: `name = input("What is your name? ")\nprint("Hello", name)\n\n# Converting to an integer\nage_str = input("How old are you? ")\nage = int(age_str)\nprint("Next year you will be", age + 1)`
  },
  {
    category: "Control Flow",
    title: "if/elif/else Statements",
    description: "Executes different blocks of code based on conditions.",
    codeExample: `score = 85\n\nif score >= 90:\n    print("Grade: A")\nelif score >= 80:\n    print("Grade: B")\nelse:\n    print("Grade: C")`
  },
  {
    category: "Control Flow",
    title: "for Loops",
    description: "Iterates over a sequence (like a list, string, or range).",
    codeExample: `# Looping through a range of numbers (0 to 4)\nfor i in range(5):\n    print(i)\n\n# Looping through a list\nfruits = ["apple", "banana", "cherry"]\nfor fruit in fruits:\n    print(fruit)`
  },
  {
    category: "Control Flow",
    title: "while Loops",
    description: "Repeats a block of code as long as a condition is true.",
    codeExample: `count = 0\nwhile count < 3:\n    print("Count is:", count)\n    count += 1  # Equivalent to count = count + 1`
  },
  {
    category: "Data Structures",
    title: "Lists",
    description: "An ordered, mutable collection of items.",
    codeExample: `colors = ["red", "green", "blue"]\n\n# Accessing elements\nprint(colors[0])  # "red"\n\n# Adding items\ncolors.append("yellow")\n\n# Removing items\ncolors.remove("green")\n\n# Length of list\nprint(len(colors))`
  },
  {
    category: "Data Structures",
    title: "Dictionaries",
    description: "A collection of key-value pairs.",
    codeExample: `student = {\n    "name": "Alice",\n    "age": 20,\n    "major": "Computer Science"\n}\n\n# Accessing a value\nprint(student["name"])\n\n# Adding or updating a value\nstudent["gpa"] = 3.8\n\n# Checking if a key exists\nif "age" in student:\n    print("Age is recorded")`
  },
  {
    category: "Functions",
    title: "Defining Functions (def)",
    description: "Functions are reusable blocks of code that perform a specific task.",
    codeExample: `def greet(name):\n    return f"Hello, {name}!"\n\nmessage = greet("Alice")\nprint(message)\n\n# Function with default arguments\ndef add(a, b=5):\n    return a + b\n\nprint(add(10))     # Output: 15\nprint(add(10, 20)) # Output: 30`
  },
  {
    category: "Built-in Functions",
    title: "String Methods",
    description: "Common methods used to manipulate text.",
    codeExample: `text = "  Hello World  "\n\nprint(text.strip())       # "Hello World" (removes whitespace)\nprint(text.lower())       # "  hello world  "\nprint(text.upper())       # "  HELLO WORLD  "\nprint(text.replace("World", "Python")) # "  Hello Python  "\n\nwords = "apple,banana,cherry".split(",")\nprint(words) # ['apple', 'banana', 'cherry']`
  },
  {
    category: "Libraries",
    title: "math Module",
    description: "Provides access to mathematical functions.",
    codeExample: `import math\n\nprint(math.sqrt(16))  # 4.0\nprint(math.pi)        # 3.141592653589793\nprint(math.ceil(4.2)) # 5\nprint(math.floor(4.8)) # 4`
  },
  {
    category: "Libraries",
    title: "random Module",
    description: "Generates pseudo-random numbers.",
    codeExample: `import random\n\n# Random float between 0.0 and 1.0\nprint(random.random())\n\n# Random integer between 1 and 10 (inclusive)\nprint(random.randint(1, 10))\n\n# Pick a random item from a list\nchoices = ["rock", "paper", "scissors"]\nprint(random.choice(choices))`
  },
  {
    category: "File I/O",
    title: "Reading & Writing Files",
    description: "How to open, read from, and write to text files.",
    codeExample: `# Writing to a file\nwith open("data.txt", "w") as file:\n    file.write("Hello File!\\n")\n    file.write("Line 2")\n\n# Reading from a file\nwith open("data.txt", "r") as file:\n    content = file.read()\n    print(content)`
  },
  {
    category: "JSON Data",
    title: "json.load() - Read JSON File",
    description: "Reads a file containing a JSON document and parses it into a Python dictionary or list.",
    codeExample: `import json\n\n# Open the JSON file in read mode\nwith open("data.json", "r") as file:\n    # Load and parse the JSON\n    data = json.load(file)\n\n# Now 'data' is a standard Python dictionary!\nprint(data["classroom_name"])\nprint(data["students"][0]["name"])`
  },
  {
    category: "JSON Data",
    title: "json.dump() - Write JSON File",
    description: "Serializes a Python object (like a dict or list) and writes it into a file as JSON.",
    codeExample: `import json\n\nstudent_data = {\n    "name": "Alice",\n    "grade": 98.5,\n    "active": True\n}\n\n# Open file in write mode ('w')\nwith open("student.json", "w") as file:\n    # dump the dict. indent=4 formats it beautifully!\n    json.dump(student_data, file, indent=4)`
  },
  {
    category: "JSON Data",
    title: "json.loads() - Parse JSON String",
    description: "Parses (loads) a string containing JSON data and returns a Python dictionary or list.",
    codeExample: `import json\n\njson_string = '{"name": "Bob", "age": 21}'\n\n# Convert string to python dictionary\ndata = json.loads(json_string)\n\nprint(data["name"])  # Output: Bob\nprint(type(data))    # Output: <class 'dict'>`
  },
  {
    category: "JSON Data",
    title: "json.dumps() - Stringify Object",
    description: "Converts a Python dictionary or list into a formatted JSON string.",
    codeExample: `import json\n\nprofile = {\n    "username": "coder123",\n    "skills": ["python", "json"]\n}\n\n# Convert python dict to a clean JSON string\nraw_json = json.dumps(profile)\nprint(raw_json)\n\n# Convert with pretty printing formatting\npretty_json = json.dumps(profile, indent=2)\nprint(pretty_json)`
  }
];
