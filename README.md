# RandoBot - A general purpose bot that suit my usages.
## Available features
### Chatbot
A chatbot system adopted from [pollinations.ai](https://pollinations.ai/). Right now the chatbot model that the site use is GPT-5 nano model. You can create new a new text channel for your personal chatbot, which pertain chat history data as well. The command is `/chatbot`

__Parameters__
1. `action`: 
    - `start` to initialize the chatbot system. When the chatbot system has started, the bot will receive any message from user and try to respond back as soon as possible. However, any message that has been sent when the bot is processing to respond back will not be received by the bot.
    - `stop` to disable the chatbot behavior.
2. `scope`:
    - `current` enable the chatbot behavior to the current text channel that the command is executed
    - `private` create a new text channel for your personal chatbot.
3. `chatname`: set the new text channel name for `private` scope only

### Image Creation
Create a new image according to the prompt given by user. You can also set the image height and width too. The command is `/image`

__Parameters__
1. `prompt`: a prompt to create an image.
2. `width`: specify width for the image (Default is 1024)
3. `height`: specify height for the image (Default is 1024)

### Admin Special Commands
Powerful commands that are only permitted to guild's owner, user with "Administrator" permission, and other permitted user. The command is `/admin`

\<Explain more about this later\>

### Miscellaneous
- `/date`: reply user back with today's date
- `/rm`: show list of users in each role
- `/help`: view each command details

## Version Release Log
__Current Version: 0.0.0__

### *v0.0.0* 
- Publish the bot's source code to github
- Features implemented as shown above in [Available features](#available-features) (80% documented)