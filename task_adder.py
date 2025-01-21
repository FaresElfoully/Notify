import json
import requests
import sys
from datetime import datetime

def validate_task(task):
    required_fields = ['title', 'taskType', 'notificationTime', 'reminderText']
    for field in required_fields:
        if field not in task:
            return False, f"Missing required field: {field}"
    
    try:
        datetime.fromisoformat(task['notificationTime'].replace('Z', '+00:00'))
    except ValueError:
        return False, "Invalid date format. Use ISO format (e.g., 2025-01-19T13:52:00)"
    
    valid_task_types = ['Work', 'Personal', 'Shopping', 'Health', 'Other']
    if task['taskType'] not in valid_task_types:
        return False, f"Invalid task type. Must be one of: {', '.join(valid_task_types)}"
    
    return True, None

def add_task(task_json):
    try:
        # Parse the JSON input
        task = json.loads(task_json)
        
        # Validate the task
        is_valid, error = validate_task(task)
        if not is_valid:
            print(f"Error: {error}")
            return False

        # Show task details and ask for confirmation
        print("\n📋 Task Details:")
        print(f"📝 Title: {task['title']}")
        print(f"📊 Type: {task['taskType']}")
        print(f"⏰ Time: {task['notificationTime']}")
        print(f"💭 Reminder: {task['reminderText']}")
        
        confirm = input("\n✅ Do you want to add this task? (y/n): ").lower()
        if confirm != 'y':
            print("❌ Task addition cancelled")
            return False
        
        # Send the task to the API
        print("\n📤 Sending task to server...")
        response = requests.post(
            'http://192.168.1.8:5000/api/tasks',
            json=task,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 201:
            print("✅ Task added successfully!")
            task_data = response.json()
            print("\n📋 Confirmed Task Details:")
            print(f"🆔 ID: {task_data['id']}")
            print(f"📝 Title: {task_data['title']}")
            print(f"📊 Type: {task_data['task_type']}")
            print(f"⏰ Time: {task_data['notification_time']}")
            print(f"💭 Reminder: {task_data['reminder_text']}")
            return True
        else:
            print(f"❌ Error adding task: {response.text}")
            return False
            
    except json.JSONDecodeError:
        print("❌ Error: Invalid JSON format")
        return False
    except requests.RequestException as e:
        print(f"❌ Error connecting to server: {e}")
        return False
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")
        return False

def get_input():
    print("Enter your task in JSON format (press Enter twice when done):")
    lines = []
    
    # Read lines until an empty line is encountered
    while True:
        try:
            line = input()
            if line.strip() == "":
                if lines:  # Only break if we have some input
                    break
            lines.append(line)
        except EOFError:
            break
        except KeyboardInterrupt:
            print("\n⚠️ Operation cancelled")
            return None
    
    return "\n".join(lines)

def main():
    print("📝 Task Adder")
    print("=============")
    
    while True:
        json_input = get_input()
        if json_input is None:
            break
            
        if not json_input.strip():
            print("❌ No input provided")
            continue
            
        if add_task(json_input):
            add_another = input("\n➕ Would you like to add another task? (y/n): ").lower()
            if add_another != 'y':
                print("\n👋 Goodbye!")
                break
        else:
            retry = input("\n🔄 Would you like to try again? (y/n): ").lower()
            if retry != 'y':
                print("\n👋 Goodbye!")
                break
        print("\n" + "="*40 + "\n")

if __name__ == "__main__":
    main()
