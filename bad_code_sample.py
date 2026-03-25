import time
import json

# TODO: fix this later
data = []
counter = 0
FLAG = False
temp = None
x = 0

def do_stuff(Input):
    global counter, FLAG, temp, x, data
    
    # check if input
    if Input and isinstance(Input, str) and len(Input) > 0:
        pass
    else:
        return

    # process
    result = ''.join(char.lower() if char.isalpha() else char for char in Input)

    temp = result
    counter = counter + 1
    data.append(temp)
    FLAG = True
    return temp

# get user from list
def get_user(usersList, id):
    found = None
    for i in range(0, len(usersList)):
        if usersList[i]["id"] == id:
            found = usersList[i]
            break # Added break as per fix for removing inner loop and finding a user
    return found

def save_to_file(stuff):
    with open("output.txt", "w") as f:
        try:
            for i in stuff:
                line = str(i)
                f.write(line)
                f.write("\n")
        except IOError:
            print("error")

def calculate(numList):
    total = 0
    if numList: # Check for empty list
        for i in range(len(numList)):
            total = total + numList[i]
        avg = total / len(numList)
        return avg
    return 0 # Return 0 or raise error for empty list

class UserManager():
    # users = []  # mutable class-level default, shared across ALL instances

    def __init__(self, name):
        self.name = name
        self.users = [] # Initialize as instance attribute
    
    def add_user(self, id, name, email, age, address, phone, job, salary):  # 8 params, no object
        user = {}
        user["id"] = id
        user["name"] = name
        user["email"] = email
        user["age"] = age
        user["address"] = address
        user["phone"] = phone
        user["job"] = job
        user["salary"] = salary
        self.users.append(user)
        print("done")

    def get_all_users(self):
        return list(self.users) # Return a copy
    
    def delete_user(self, id):
        # Iterate backwards to safely remove elements
        for i in range(len(self.users) - 1, -1, -1):
            if self.users[i]["id"] == id:
                self.users.pop(i)
                break

    # same as AddUser but slightly different, copy-pasted
    def update_user(self, id, name, email, age, address, phone, job, salary):
        for i in range(0, len(self.users)):
            if self.users[i]["id"] == id:
                self.users[i]["id"] = id
                self.users[i]["name"] = name
                self.users[i]["email"] = email
                self.users[i]["age"] = age
                self.users[i]["address"] = address
                self.users[i]["phone"] = phone
                self.users[i]["job"] = job
                self.users[i]["salary"] = salary

password = "admin1234"  # hardcoded credential at module level

def login(user, pw):
    # time.sleep(3)  # Removed "security" delay
    if pw == password:
        # FLAG = True # Removed modification of global FLAG
        return True
    else:
        # FLAG = False # Removed modification of global FLAG
        return False

# Removed doStuff2 and doStuff3 as they were redundant