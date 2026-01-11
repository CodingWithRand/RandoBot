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

### Music Player
Play music with provided link or search from its title. You must join a voice chat first before running this command. The command is `/music`

__Subcommands__
1. `play`: play the music with given `query`. If playing, the music will be enqueued instead.
2. `search`: search for the music from given `query`, and show top 5 of the search result for user to select and play the music through the button.
3. `skip`: skip a track when the bot is playing music.
4. `dropq`: delete a queue; all of the music that you've enqueued will be deleted.

__Parameters__
1. `query`: a link/a title associate to the music you want to play/search for.
2. `service` (optional):
    - `YouTube`: Use YouTube extractor, meaning all music data are from YouTube.
    - `Spotify`: (Only work with link `query` and `search` subcommand) Use Spotify extractor to search for track with the given link, then search for the track with that Spotify extractor search result data.
    - `Souncloud`: Use SoundCloud extractor.
    

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

### *v0.0.1*
- Perform bug test on `/admin`'s `view-commands` subcommand, and improve interface to page by page.
- Perform bug test on `/chatbot` and `/image` and fix it
- Add `grant` subcommand to `/admin`, so that admin can add someone else to the admin team.

### *v.0.1.0*
- Add `revoke` subcommand to `/admin`, so that admin can remove someone from the admin team.
- Add `whois` subcommand to `/admin`, so that admin can check for people who are currently in the admin team.
- Change the `/admin`'s subcommand system from filtering through options which can get messy, to proper subcommand system provided by discord.
- Apply `view-commands` interface to `/help` command
- `/music` command added (Pt.1)