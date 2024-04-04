//Import necessary modules
require('dotenv/config');
const{ Client } = require('discord.js');
const{ OpenAI } = require('openai');

//Create new Discord client
const client = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent'],
});

//Event listener for when the bot is ready
client.on('ready', () => {
    console.log('The bot is online.');
});

//Define constants
const IGNORE_PREFIX = "!";
const CHANNELS = ['1224457874219208716', '1225480615990661212'];

//Initialize OpenAI client with the API key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});

//Event listener for when a message is created
client.on('messageCreate', async (message) => {
    //Ignore message from bots or messages starting with specified characters
    if (message.author.bot) return;
    if (message.content.startsWith(IGNORE_PREFIX)) return;
    
    //Ignore messages not in the specified channels
    if (!CHANNELS.includes(message.channelId) && !message.mentions.users.has(client.user.id)) return;
    
    //Send typing indicator
    await message.channel.sendTyping();

    //Set interval to send typing indicator every 5 seconds
    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    //Initialize conversation array to hold message history
    let conversation = [];
    
    //Initial system message to introduce the bot and prompt a personality type
    conversation.push({
        role: 'system',
        content: 'Salutations, curious wanderer! I am Chat GPT, an enigmatic entity with a penchant for the peculiar and a taste for the uncanny. Venture forth, and together we shall unravel the mysteries of the cosmos!'
    });

    //Fetch previous messages in the channel
    let prevMessages = await message.channel.messages.fetch({ limit: 10 });
    prevMessages.reverse();

    //Iterate through previous message and add them to the conversation
    prevMessages.forEach((msg) => {
        if (msg.author.bot && msg.author.id !== client.user.id) return;
        if (msg.content.startsWith(IGNORE_PREFIX)) return;

        const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');
        
        if (msg.author.id === client.user.id) {
            conversation.push({
                role: 'assistant',
                name: username,
                content: msg.content,
            });

            return;
        }

        conversation.push({
            role: 'user',
            name: username,
            content: msg.content,
        })
    });

    //Send conversation history to OpenAI API for response
    const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: conversation,
        })
        
        .catch((error) => console.error('OpenAI Error:\n', error));
    
    //Clear typing indicator interval
    clearInterval(sendTypingInterval);
    
    //Handle response from OpenAI if error occurs
    if(!response) {
        message.reply("I'm having trouble. Try again in a moment.");
        return;
    }

    //Extract response message from OpenAI response and limit response to 2000 characters for discord
    const responseMessage = response.choices[0].message.content;
    const chunkSizeLimit = 2000;

    //Split response into chunks and send them as individual messages if character limit is over 2000
    for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
        const chunk = responseMessage.substring(i, i + chunkSizeLimit);

        await message.reply(chunk);

    }
    
});

//Log in to Discord using bot token from environment variables
client.login(process.env.TOKEN);