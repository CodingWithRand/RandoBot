# ~~RandoBot~~ Daisey - v.2.1.0-1
## About me
*"Hi, I'm Daisey. My name actually comes from my owner branding. How? Well, Rand0M = Random -> Dice 🎲 -> Dicey -> Daisey 😅"<br>
"My dream is... to become useful in every aspect to you all! I would like to enhance the experience of discord user and making things convenient for you guys. In short, I aim to be a generalist! Jack of all trades! But now, I can still only do a few things, with errors here and there 🥲" <br> 
"Sorry in advance! 🙇‍♀️"*

All right, enough of all that. Basically, this is a general purpose bot. You may think of `Dyno` or `MEE6`, whatever. It's still far from being one of them.

Want to invite my bot in your server? I appreciate it, and would love to here your feedbacks in the future. Here are the invite links. <br>
__Daisey__: [Click here](https://discord.com/oauth2/authorize?client_id=1136281478322458665&permissions=8&integration_type=0&scope=bot) <br>
__ListenWDaisey__: [Click here](https://discord.com/oauth2/authorize?client_id=1066930373541503086&permissions=8&integration_type=0&scope=bot)

## Available features
### Chatbot
~~A chatbot system adopted from [pollinations.ai](https://pollinations.ai/). Right now the chatbot model that the site use is GPT-5 nano model.~~ 

A generic chatbot system with Google's *Gemini 2.5 Flash Lite* model. You can create new a new text channel for your personal chatbot, which pertain chat history data as well. The command is `/chatbot`

__Parameters__
1. `action`: 
    - `start` to initialize the chatbot system. When the chatbot system has started, the bot will receive any message from user and try to respond back as soon as possible. However, any message that has been sent when the bot is processing to respond back will not be received by the bot.
    - `stop` to disable the chatbot behavior.
2. `scope`:
    - `current` enable the chatbot behavior to the current text channel that the command is executed
    - `private` create a new text channel for your personal chatbot.
3. `chatname`: set the new text channel name for `private` scope only


### Image Creation
Create a new image according to the prompt given by user. The model used in generation is `flux` from [pollinations.ai](https://pollinations.ai/). You can also set the image height and width too. The command is `/image`

__Note:__ Right now, the limit rate is only 10 images/hour (All-user). And that is the minimum, as having more user and more stars on this repository will increase the limit. I will try to make it 10 images/hour/user in the future. (Yes, that's the best I can do to make it free.)

__Parameters__
1. `prompt`: a prompt to create an image.
2. `width`: specify width for the image (Default is 1024)
3. `height`: specify height for the image (Default is 1024)


### Music Player
Play music with provided link or search from its title. You must join a voice chat first before running this command. 3 streaming services (YouTube, Spotify, SoundCloud) are provided for users to search the music, but only YouTube and Spotify are the extractors to play the music. User can choose streaming service when using the `play` or `search` command. ~~The command is `/music`~~ Now, the music player feature has been implemented onto another bot, `ListenWDaisy`. See [musicbot.js](./src/musicbot.js) note regarding this.

__Commands__
1. `play`: play music(s) with given `query`. If playing, the music will be enqueued at the end of the queue instead.
2. `search`: search for the music from given `query`, and show top 5 of the search results for user to select and play the music through the button.
3. `skip`: skip a track when the bot is playing music.
4. `stop`: ~~delete a queue; all of the music that you've enqueued will be deleted.~~ stop the queue from playing.
5. `controller`: bot sends playback control buttons in chat, you can go to previous track, go backward 10 seconds, pause/resume the track, go forward 10 seconds, or go to the next track, respectively. ⏮️⏪▶️⏩⏭️
6. `pause`: pause a track when the bot is playing music.
7. `resume`: resume a track when the bot is playing music.
8. `save`: save the current playing queue as your playlist with given `name`.
9. `delpl`: delete the playlist from your account.
10. `list`: show all of your saved playlist.
11. `queue`: show the current playing track, and upcoming track in the queue.
12. `leave`: make the bot leave the voice channel.
13. `skipto`: skip to a specific track with the given track number.
14. `swap`: swap two tracks order in the queue with given track numbers.
15. `reorder`: move a specific track from the track number to a specific order in the queue.
16. `lookup`: look up for track information (title and author name) from given track number.
17. `forward`: forward the track with the specify `seconds` or 10 seconds as the default duration.
18. `backward`: backward the track with the specify `seconds` or 10 seconds as the default duration.
19. `playnext`: `play` command, but the `query` track(s) will be enqueued at the front, making the track be the next track to play after the current playing track.
20. `playfirst`: `playnext` command, but instead of waiting the current playing track to end, it put the current playing track before the `query` track(s) and play the `query` track.

__Parameters__
1. `query`: a link/a title associate to the music you want to play/search for.
2. `service` (optional):
    - `YouTube`: Use YouTube extractor, meaning all music data are from YouTube.
    - `Spotify`: (Only work with link `query` and `search` subcommand) Use Spotify extractor to search for track with the given link, then search for the track with that Spotify extractor search result data.
    - `Souncloud`: Use SoundCloud extractor.
3. `name` (for `save` and `delpl`): used to identify a playlist for the newly created one for `save` and the one to delete for `delpl`

__Note:__ The term `track number` means the position of order of the track in the current queue. You can view the track number when you use `/queue`.
    

### Admin Special Commands
Powerful commands that are only permitted to guild's owner, user with "Administrator" permission, and other permitted user. The command is `/admin`

__Subcommands__
1. `init`: Use for initializing the administrator console to be able to use other admin commands which are only available for certain group of users. You can use admin commands for 30 minutes after each initialization.
2. `view-commands`: Basically `/help` command with similar wording/format. Additionally, each command will have command id next to its name.
3. `del-commands`: Delete `commands` with its name/id. (In this case, it means that you will no longer be able to use the deleted command(s) in the guild.)
4. `cls`: Clear number of messages or all from the current channel. If not specified, prompt user to clear all messages in the 14-days period.
5. `grant`: Add a specific `user` or `role` to the admin list, so that they can use admin commands.
6. `revoke`: Remove a specific `user` or `role` from the admin list, so that they can no longer use admin commands.
7. `whois`: Show the list of users and roles that have been granted admin permission.

__Parameters__
1. `commands`: Command name(s) or id(s) to delete, separated by space.
2. `number-of-messages`: A number of messages to clear. Omitted if you want to clear all messages.
3. `role`: Role(s) to add to/remove from the admin list, separated by space.
4. `user`: Username(s) to add to/remove from the admin list, separated by space. Take input as Texts.


### Miscellaneous
- `/date`: reply user back with today's date
- `/rm`: show list of users in each role
- `/help`: view each command details


## Version Release Log
__Current Version: 2.1.0-1__

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
- `/music` command added (Pt.1) with subcommands `play`, `search`, `skip`, and `dropq`

### *v.1.0.0*
- Deploy the bot to [Render](https://render.com/) with [UptimeRobot](https://uptimerobot.com/) as alarm clock (every 10 minutes)
- `/music` command added (Pt.2) with subcommands `controller` and renamed `dropq` to `stop` for clarity.

### *v.1.0.1*
- Migrate JSON file database for chatbot and permission management to [MongoDB](https://www.mongodb.com/)
- Update `/chatbot` and `/image` commands from the changes of [pollinations.ai](https://pollinations.ai/). These changes has already been documented in the README file.

### *v.1.1.0*
- `/music` command added (Pt.3) with subcommands `pause`, `resume`, `save`, `delpl`, `list`, `queue`, with considering adding `forward` and `backward`

### *v.2.0.0*
- Rebranding the bot.
    1. Change the name from `RandoBot` -> `Daisey`
    2. Change profile pictures
    3. Add bot description
    4. Add bot status
- `/music` has been migrated to a new bot (ListenWDaisey) entirely to solve the youtube and soundcloud extractors not working on remote server (Render)
- Recount version
- Patch Note
> 1. Make the bot leave the voice channel on its own after 30 seconds of empty channel. (Music module)
> 2. `/leave` command added
> 3. Fix the bot initialize code.

### *v.2.1.0*
__Part 1__
- Adding the following new commands to `ListenWDaisy`, `/skipto`, `/swap`, `/reorder`, `/lookup`, `/forward`, `/backtrack`, `/playnext`, `/playfirst`
- 100% documentation (Finally lol.)


## TODO: (Upcoming updates)
- Perform deep test.
- Handle unexpect errors/exceptions (e.g. [GuildMembersTimeout]: Members didn't arrive in time.)
- Add more features to music bot. ✓