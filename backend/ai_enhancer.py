from groq import Groq
import json
from datetime import datetime, timedelta
import re
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class TaskEnhancer:
    def __init__(self, api_key):
        self.client = Groq(api_key=api_key)
        logger.info("TaskEnhancer initialized with API key")
        
    def parse_relative_time(self, text, current_time):
        """Parse relative time expressions and convert them to absolute time"""
        try:
            text = text.lower()
            logger.debug(f"Parsing relative time from text: {text}")
            
            # Extract numbers and time units
            time_patterns = {
                r'(\d+)\s*(minute|minutes|min|mins)': ('minutes', 1),
                r'(\d+)\s*(hour|hours|hr|hrs)': ('hours', 1),
                r'(\d+)\s*(day|days)': ('days', 1),
                r'(\d+)\s*(week|weeks)': ('days', 7),
                r'(\d+)\s*(month|months)': ('days', 30),
                r'half\s*(hour|hr)': ('minutes', 30),
                r'quarter\s*(hour|hr)': ('minutes', 15),
                r'an?\s*(hour|hr)': ('hours', 1),
                r'a\s*(minute|min)': ('minutes', 1),
            }
            
            target_time = current_time
            found_time = False
            
            # Check for relative time expressions
            for pattern, (unit, multiplier) in time_patterns.items():
                matches = re.finditer(pattern, text)
                for match in matches:
                    found_time = True
                    if match.group(1) if len(match.groups()) > 1 else '1':
                        amount = int(match.group(1)) if len(match.groups()) > 1 else 1
                        delta = timedelta(**{unit: amount * multiplier})
                        target_time = current_time + delta
                        logger.debug(f"Found time pattern: {pattern}, amount: {amount}, unit: {unit}")
            
            if found_time:
                logger.info(f"Calculated target time: {target_time}")
            else:
                logger.info("No relative time found in text")
                
            return target_time if found_time else None
            
        except Exception as e:
            logger.error(f"Error parsing relative time: {str(e)}")
            return None

    def create_prompt(self, user_input):
        try:
            current_time = datetime.now()
            logger.debug(f"Creating prompt with current time: {current_time}")
            
            target_time = self.parse_relative_time(user_input, current_time)
            
            if target_time:
                time_str = target_time.strftime("%Y-%m-%dT%H:%M:%S")
                logger.debug(f"Using calculated target time: {time_str}")
            else:
                time_str = current_time.strftime("%Y-%m-%dT%H:%M:%S")
                logger.debug(f"Using current time: {time_str}")
                
            prompt = f"""Convert the following natural language text into a JSON object with enhanced human-like title and reminder text with appropriate emojis. The current time is {current_time.strftime("%Y-%m-%d %H:%M:%S")}.

Input text: {user_input}

Time Calculation Rules:
1. For relative times (e.g., "in 10 minutes", "after 2 hours"):
   - Calculate the exact future time from current time
   - Use {time_str} as the reference time
2. For specific times (e.g., "at 3pm", "tomorrow at 9"):
   - Convert to the nearest future occurrence
3. For recurring times (e.g., "every day at 10am"):
   - Set the next occurrence from current time

Task Enhancement Rules:
1. Make the title personal and engaging:
   - Add relevant emojis
   - Keep it concise but descriptive
   Example: "Take Medicine 💊" → "Time for Your Daily Vitamins! 💊✨"

2. Create a friendly reminder message:
   - Use conversational language
   - Include encouraging words
   - Add relevant emojis
   Example: "Medicine time" → "Hey! 👋 Time to take your daily vitamins! 💊 Stay healthy! 🌟"

3. Choose the most appropriate task type:
   - Personal: family, leisure, self-care
   - Work: meetings, deadlines, projects
   - Shopping: groceries, purchases
   - Health: medicine, exercise, appointments
   - Other: anything else

4. Time Formatting:
   - Use ISO format (YYYY-MM-DDTHH:MM:SS)
   - Be precise with minutes and seconds
   - Account for timezone (current time zone is +02:00)

5. Language Matching:
   - If input is in Arabic, respond in Arabic
   - Otherwise, respond in English
   - Always include emojis regardless of language

Example output:
{{"title": "Help Mom Time! 🤝❤️", "taskType": "Personal", "notificationTime": "{time_str}", "reminderText": "Time to help your wonderful mom! 🌟 Show her some love and support! ❤️"}}

Respond only with a valid JSON object, no additional text or formatting."""

            logger.debug("Prompt created successfully")
            return prompt
            
        except Exception as e:
            logger.error(f"Error creating prompt: {str(e)}")
            raise

    def enhance_task(self, user_input):
        try:
            logger.info(f"Enhancing task with input: {user_input}")
            
            messages = [
                {
                    "role": "system",
                    "content": "You are a helpful assistant that converts natural language task descriptions into structured JSON with enhanced, human-like content and appropriate emojis. You specialize in precise time calculations and creating engaging notifications."
                },
                {
                    "role": "user",
                    "content": self.create_prompt(user_input)
                }
            ]

            logger.debug("Making API call to Groq")
            completion = self.client.chat.completions.create(
                model="gemma2-9b-it",
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
                top_p=1,
                stream=False,
                stop=None
            )

            response = completion.choices[0].message.content.strip()
            logger.debug(f"Raw API response: {response}")
            
            # Validate JSON response
            try:
                json_response = json.loads(response)
                logger.debug(f"Parsed JSON response: {json_response}")
                
                required_fields = ['title', 'taskType', 'notificationTime', 'reminderText']
                for field in required_fields:
                    if field not in json_response:
                        error_msg = f"Missing required field: {field}"
                        logger.error(error_msg)
                        raise ValueError(error_msg)
                        
                logger.info("Task enhanced successfully")
                return json_response
                
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON response from AI: {e}")
                logger.error(f"Response content: {response}")
                raise ValueError(f"Invalid JSON response from AI: {str(e)}")

        except Exception as e:
            logger.error(f"Error enhancing task: {str(e)}")
            raise Exception(f"Error enhancing task: {str(e)}")
