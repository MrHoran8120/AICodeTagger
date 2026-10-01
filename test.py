def greet(name):
    print(f"Hello, {name}!")



# AI-START AI-1001
def rotate_slide(index, direction):
    if direction == "next":
        return (index + 1) % 5
    return (index - 1) % 5
# AI-END AI-1001




greet("world")

